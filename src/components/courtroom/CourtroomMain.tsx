import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  CaseData,
  DialogueEntry,
  Speaker,
  PlayerRole,
  CharacterStyles,
} from "@/types/courtroom";
import {
  getProsecutorResponse,
  getJudgeQuestion,
  getJudgeComment,
  evaluateResponse,
} from "@/lib/mockApi";
import {
  playGavel,
  playObjection,
  speakText,
  playScoreUp,
  playScoreDown,
} from "@/lib/sounds";
import DialogueOverlay from "./DialogueOverlay";
import ScoreHUD from "./ScoreHUD";
import CourtroomEnvironment from "./3d/CourtroomEnvironment";
import CharacterModel from "./3d/CharacterModel";
import CameraManager from "./3d/CameraManager";

interface CourtroomMainProps {
  caseData: CaseData;
  playerRole: PlayerRole;
  characterStyles: CharacterStyles;
  onVerdict: (score: number) => void;
}

const TOTAL_ROUNDS = 4;

const CourtroomMain = ({
  caseData,
  playerRole,
  characterStyles,
  onVerdict,
}: CourtroomMainProps) => {
  const speakerInfo: Record<Speaker, { label: string; color: string }> = {
    judge: { label: "Honorable Judge", color: "text-primary" },
    prosecutor: {
      label: playerRole === "prosecutor" ? "You (Prosecutor)" : "Prosecutor",
      color: "text-destructive",
    },
    defender: {
      label: playerRole === "defender" ? "You (Defender)" : "Defender",
      color: "text-gold-light",
    },
    system: { label: "Court", color: "text-muted-foreground" },
  };

  const [dialogues, setDialogues] = useState<DialogueEntry[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker>("system");
  const [isTyping, setIsTyping] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [score, setScore] = useState(50);
  const [round, setRound] = useState(0);

  const [showObjection, setShowObjection] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [redFlash, setRedFlash] = useState(false);

  const typeTimeoutRef = useRef<NodeJS.Timeout>();
  const sequenceRef = useRef(false);

  const getCameraState = (speaker: Speaker, objectify: boolean) => {
    if (objectify) return { scale: 1.8, x: 0, y: 0 };
    switch (speaker) {
      case "judge":
        return { scale: 1.25, x: "0%", y: "15%" };
      case "prosecutor":
        return { scale: 1.4, x: "-15%", y: "-10%" };
      case "defender":
        return { scale: 1.4, x: "15%", y: "-10%" };
      default:
        return { scale: 1, x: "0%", y: "0%" };
    }
  };

  const getSpotlightGradient = (speaker: Speaker) => {
    switch (speaker) {
      case "judge":
        return "radial-gradient(circle at 50% 20%, transparent 0%, rgba(0,0,0,0.85) 75%)";
      case "prosecutor":
        return "radial-gradient(circle at 80% 60%, transparent 0%, rgba(0,0,0,0.85) 60%)";
      case "defender":
        return "radial-gradient(circle at 20% 60%, transparent 0%, rgba(0,0,0,0.85) 60%)";
      default:
        return "radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.5) 100%)";
    }
  };

  const typeText = useCallback(
    (text: string, speaker: Speaker): Promise<void> => {
      return new Promise((resolve) => {
        setCurrentSpeaker(speaker);
        setIsTyping(true);
        setCurrentText("");

        let i = 0;
        const type = () => {
          if (i < text.length) {
            const partial = text.slice(0, i + 1);
            setCurrentText(partial);
            i++;
            typeTimeoutRef.current = setTimeout(type, 35);
          } else {
            setIsTyping(false);
            setDialogues((prev) => [
              ...prev,
              { speaker, text, timestamp: Date.now() },
            ]);
            setTimeout(() => {
              if (speaker !== "defender") {
                setCurrentText("");
                resolve();
              }
            }, 1000);

            if (speaker === "defender") resolve();
          }
        };
        type();

        if (speaker !== "system" && speaker !== playerRole) {
          speakText(text, speaker);
        }
      });
    },
    [],
  );

  const runSequence = useCallback(async () => {
    if (sequenceRef.current) return;
    sequenceRef.current = true;

    await typeText(
      `This court is now hearing the case: "${caseData.title}". A ${caseData.type.replace("-", " ")} matter of severity level ${caseData.severity}%.`,
      "judge",
    );
    await new Promise((r) => setTimeout(r, 600));
    playGavel();

    await typeText(
      "The prosecution may present their opening argument.",
      "judge",
    );
    await new Promise((r) => setTimeout(r, 600));

    await runRound(0);
  }, [caseData, typeText]);

  const runRound = async (r: number) => {
    setCurrentSpeaker("system"); // Wide shot transition
    await new Promise((res) => setTimeout(res, 800));

    const aiRole = playerRole === "defender" ? "prosecutor" : "defender";
    const prosResp = getProsecutorResponse(r);
    await typeText(prosResp, aiRole);
    await new Promise((res) => setTimeout(res, 500));

    setCurrentSpeaker("system");
    await new Promise((res) => setTimeout(res, 600));

    const judgeQ = getJudgeQuestion(r);
    await typeText(judgeQ, "judge");
    await new Promise((res) => setTimeout(res, 300));

    setCurrentSpeaker("system");
    setWaitingForUser(true);
    setCurrentSpeaker("defender");
  };

  const handleUserSubmit = async () => {
    if (!userInput.trim() || !waitingForUser) return;
    setWaitingForUser(false);
    const response = userInput;
    setUserInput("");

    await typeText(response, "defender");
    await new Promise((r) => setTimeout(r, 800));
    setCurrentText("");

    const evaluation = evaluateResponse(response);
    const newScore = Math.min(100, Math.max(0, score + evaluation.scoreDelta));

    if (evaluation.scoreDelta > 0) playScoreUp();
    else playScoreDown();

    setScore(newScore);

    setCurrentSpeaker("system");
    await new Promise((r) => setTimeout(r, 800));

    const comment = getJudgeComment();
    await typeText(comment, "judge");
    playGavel();

    const nextRound = round + 1;
    setRound(nextRound);

    if (nextRound >= TOTAL_ROUNDS) {
      await new Promise((r) => setTimeout(r, 800));
      await typeText(
        "The court has heard sufficient arguments. I will now deliver my verdict.",
        "judge",
      );
      await new Promise((r) => setTimeout(r, 1000));
      onVerdict(newScore);
    } else {
      await new Promise((r) => setTimeout(r, 500));
      await runRound(nextRound);
    }
  };

  const handleObjection = () => {
    playObjection();
    setShaking(true);
    setRedFlash(true);
    setShowObjection(true);

    // Slight pause of normal logic implies stopping the typing temporarily
    if (typeTimeoutRef.current) clearTimeout(typeTimeoutRef.current);
    window.speechSynthesis.cancel();

    setTimeout(() => setShaking(false), 500);
    setTimeout(() => setRedFlash(false), 400);
    setTimeout(() => setShowObjection(false), 1500);

    const bonus = Math.floor(Math.random() * 5) + 3;
    setScore((s) => Math.min(100, s + bonus));
    playScoreUp();
  };

  useEffect(() => {
    const timer = setTimeout(runSequence, 1500);
    return () => {
      clearTimeout(timer);
      if (typeTimeoutRef.current) clearTimeout(typeTimeoutRef.current);
    };
  }, [runSequence]);

  return (
    <div
      className={`w-full h-screen bg-black relative overflow-hidden font-sans ${shaking ? "screen-shake" : ""}`}
    >
      {/* 
        ==============================
        3D CINEMATIC CAMERA LAYER
        ==============================
      */}
      <div className="absolute inset-0 z-0">
        <ErrorBoundary>
          <Canvas
            shadows
            camera={{ position: [0, 6, 12], fov: 45 }}
            gl={{
              powerPreference: "default",
              antialias: false,
              stencil: false,
            }}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener("webglcontextlost", (e) => {
                e.preventDefault();
                console.warn("WebGL context lost");
              });
            }}
          >
            <Suspense fallback={null}>
              <CameraManager activeSpeaker={currentSpeaker} />
              <CourtroomEnvironment />

              {/* Judge Model */}
              {/* Judge Bench is at [0, 0.5, -9], args=[12, 5, 4], half-depth=2. 
                Back edge is at z=-11. We place judge slightly behind at -11.2 to avoid clipping.
                Height of floor is -2, bench is 5 tall, centered at 0.5. Top is at y=3.
                We place character essentially on the floor, or slightly above. */}
              <CharacterModel
                role="judge"
                isTalking={currentSpeaker === "judge"}
                position={[0, 1.5, -11.2]}
                color="#3a3a4a"
                characterId={characterStyles.judge}
              />

              {/* Defender Model */}
              {/* Defender Bench: position={[8, -0.5, -2]}, rotation={[0, -0.4, 0]}, args=[6, 3.5, 2.5]
                To be exactly behind the center of the desk along its local Z axis:
                x = 8 + sin(-0.4) * -1.35 ≈ 8 + (-0.389 * -1.35) = 8.525
                z = -2 + cos(-0.4) * -1.35 ≈ -2 + (0.921 * -1.35) = -3.243 */}
              <CharacterModel
                role="defender"
                isTalking={currentSpeaker === "defender"}
                position={[8.525, 0.5, -3.243]}
                rotation={[0, -0.4, 0]}
                color="#5b483a"
                characterId={characterStyles.defender}
              />

              {/* Prosecutor Model */}
              {/* Prosecutor Bench: position={[-8, -0.5, -2]}, rotation={[0, 0.4, 0]}
                x = -8 + sin(0.4) * -1.35 ≈ -8 + (0.389 * -1.35) = -8.525
                z = -2 + cos(0.4) * -1.35 ≈ -2 + (0.921 * -1.35) = -3.243 */}
              <CharacterModel
                role="prosecutor"
                isTalking={currentSpeaker === "prosecutor"}
                position={[-8.525, 0.5, -3.243]}
                rotation={[0, 0.4, 0]}
                color="#4a3a3a"
                characterId={characterStyles.prosecutor}
              />
            </Suspense>
          </Canvas>
        </ErrorBoundary>
      </div>

      {/* 
        ==============================
        OVERLAY / POST-PROCESS LAYER
        ==============================
      */}

      {/* Red flash overlay */}
      {redFlash && (
        <div className="absolute inset-0 bg-red-600/40 mix-blend-multiply z-30 pointer-events-none" />
      )}

      {/* Objection overlay */}
      <AnimatePresence>
        {showObjection && (
          <motion.div
            initial={{ scale: 3, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <span
              className="text-7xl md:text-9xl font-display font-black text-destructive tracking-[0.1em]"
              style={{
                textShadow: "0 0 50px hsl(0 85% 55% / 1)",
                WebkitTextStroke: "2px white",
              }}
            >
              OBJECTION!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-40 pointer-events-none w-full h-full">
        <ScoreHUD score={score} round={round} totalRounds={TOTAL_ROUNDS} />

        <div className="pointer-events-auto">
          <DialogueOverlay
            speakerInfo={
              currentSpeaker !== "system" ? speakerInfo[currentSpeaker] : null
            }
            text={currentText}
            isTyping={isTyping}
            waitingForUser={waitingForUser}
            userInput={userInput}
            setUserInput={setUserInput}
            onSubmit={handleUserSubmit}
            onObjection={handleObjection}
          />
        </div>
      </div>
    </div>
  );
};

export default CourtroomMain;
