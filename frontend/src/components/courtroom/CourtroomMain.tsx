import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  CaseData,
  DialogueEntry,
  Speaker,
  PlayerRole,
  CharacterStyles,
} from "@/types/courtroom";
import {
  playGavel,
  playObjection,
  speakText,
  playScoreUp,
  stopAllSpeech,
} from "@/lib/sounds";
import DialogueOverlay from "./DialogueOverlay";
import ScoreHUD from "./ScoreHUD";
import CourtroomEnvironment from "./3d/CourtroomEnvironment";
import CharacterModel from "./3d/CharacterModel";
import CameraManager from "./3d/CameraManager";
import { generateTrialSuggestions } from "@/lib/mockApi";
import { playSarvamTts } from "@/lib/audio";

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
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);

  const typeTimeoutRef = useRef<NodeJS.Timeout>();
  const sequenceRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);
  const threadIdRef = useRef<string>(Math.random().toString(36).substring(7));

  const roundRef = useRef(round);
  const scoreRef = useRef(score);
  const transcriptRef = useRef<DialogueEntry[]>([]);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    transcriptRef.current = dialogues;
  }, [dialogues]);

  useEffect(() => {
    if (!transcriptContainerRef.current) {
      return;
    }

    transcriptContainerRef.current.scrollTop =
      transcriptContainerRef.current.scrollHeight;
  }, [dialogues, currentText, isTyping]);

  const typeText = useCallback(
    (text: string, speaker: Speaker): Promise<void> => {
      return new Promise((resolve) => {
        if (!text) {
          resolve();
          return;
        }

        if (typeTimeoutRef.current) {
          clearTimeout(typeTimeoutRef.current);
        }

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
              if (speaker !== playerRole) {
                setCurrentText("");
                resolve();
              }
            }, 1000);

            if (speaker === playerRole) resolve();
          }
        };
        type();

        if (speaker !== "system" && speaker !== playerRole) {
          void playSarvamTts({
            text,
            voiceGender: caseData.voiceGender,
            languageCode: "en-IN",
          }).then((played) => {
            if (!played) {
              speakText(text, speaker);
            }
          });
        }
      });
    },
    [playerRole, caseData.voiceGender],
  );

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl =
      window.location.hostname === "localhost"
        ? "ws://localhost:8000/api/v1/trial/stream"
        : `${protocol}//${window.location.host}/api/v1/trial/stream`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.error) {
          console.error("WebSocket Error:", data.error);
          return;
        }

        const speaker = data.currentSpeaker || data.speaker || data.turn;
        const content = data.content;
        const newScore = data.scores !== undefined ? data.scores : data.score;

        if (newScore !== undefined) {
          setScore(newScore);
        }

        if (data.event === "done" || data.type === "done" || data.done) {
          setWaitingForUser(true);
          setCurrentSpeaker(playerRole);
          return;
        }

        if (speaker && content) {
          await typeText(content, speaker as Speaker);

          if (speaker === "judge") {
            playGavel();
            if (roundRef.current < TOTAL_ROUNDS) {
              setRound((r) => r + 1);
            } else {
              await new Promise((r) => setTimeout(r, 1000));
              onVerdict(newScore !== undefined ? newScore : scoreRef.current);
            }
          }
        }
      } catch (err) {
        console.error("Failed to parse websocket message", err);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    };
  }, [playerRole, onVerdict, typeText]);

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

    const waitForWs = async () => {
      let attempts = 0;
      while ((!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) && attempts < 40) {
        await new Promise((r) => setTimeout(r, 250));
        attempts++;
      }
      return wsRef.current?.readyState === WebSocket.OPEN;
    };

    const isConnected = await waitForWs();

    if (isConnected && wsRef.current) {
      wsRef.current.send(JSON.stringify({
        message: `Initialize trial: ${caseData.description}`,
        thread_id: threadIdRef.current,
        player_role: playerRole,
        case_details: caseData.description,
      }));
    } else {
      console.error("WebSocket failed to connect after timeout");
      await typeText("Court connection failed. Please refresh the page.", "system");
      setWaitingForUser(true);
      setCurrentSpeaker(playerRole);
    }
  }, [caseData, typeText, playerRole]);

  const handleUserSubmit = async () => {
    if (!userInput.trim() || !waitingForUser) return;
    setWaitingForUser(false);
    const response = userInput;
    setUserInput("");

    await typeText(response, playerRole);
    await new Promise((r) => setTimeout(r, 800));
    setCurrentText("");

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        message: response,
        thread_id: threadIdRef.current,
        player_role: playerRole,
        case_details: caseData.description,
      }));
    } else {
      console.warn("WebSocket not ready for submit");
      setWaitingForUser(true);
    }
  };

  const handleObjection = () => {
    playObjection();
    setShaking(true);
    setRedFlash(true);
    setShowObjection(true);

    // Slight pause of normal logic implies stopping the typing temporarily
    if (typeTimeoutRef.current) clearTimeout(typeTimeoutRef.current);
    stopAllSpeech();

    setTimeout(() => setShaking(false), 500);
    setTimeout(() => setRedFlash(false), 400);
    setTimeout(() => setShowObjection(false), 1500);

    const bonus = Math.floor(Math.random() * 5) + 3;
    setScore((s) => Math.min(100, s + bonus));
    playScoreUp();

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        message: "OBJECTION!",
        thread_id: threadIdRef.current,
        player_role: playerRole,
        case_details: caseData.description,
      }));
    }
  };

  const handleAskSuggestion = async () => {
    if (!waitingForUser || isSuggestionLoading) {
      return;
    }

    setIsSuggestionLoading(true);
    try {
      const response = await generateTrialSuggestions({
        case_details: caseData.description,
        evidence_list: [],
        transcript: transcriptRef.current.map((entry) => ({
          role: entry.speaker,
          content: entry.text,
        })),
        current_turn: playerRole,
        active_objection: {},
        trial_status: "ongoing",
      });

      const suggestionText = response.suggestions.join("\n• ");
      await typeText(`Suggested strategy:\n• ${suggestionText}`, "system");
    } catch (error) {
      console.error("Failed to fetch AI suggestions", error);
      await typeText(
        "Suggestion engine is unavailable at the moment. Please proceed with your strongest factual argument.",
        "system",
      );
    } finally {
      setIsSuggestionLoading(false);
      setWaitingForUser(true);
      setCurrentSpeaker(playerRole);
    }
  };

  const handleVoiceInput = () => {
    if (!waitingForUser) {
      return;
    }

    if (recognitionRef.current && isListeningVoice) {
      recognitionRef.current.stop();
      setIsListeningVoice(false);
      return;
    }

    const SpeechRecognitionImpl =
      (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition })
        .webkitSpeechRecognition ||
      (window as Window & { SpeechRecognition?: new () => SpeechRecognition })
        .SpeechRecognition;

    if (!SpeechRecognitionImpl) {
      void typeText(
        "Voice input is not supported in this browser. Please type your argument.",
        "system",
      );
      return;
    }

    const recognition = new SpeechRecognitionImpl();
    recognitionRef.current = recognition;
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    setIsListeningVoice(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const latestIndex = event.results.length - 1;
      const spoken = event.results?.[latestIndex]?.[0]?.transcript?.trim();
      if (spoken) {
        setUserInput((existing) => (existing ? `${existing} ${spoken}` : spoken));
      }
    };

    recognition.onerror = () => {
      setIsListeningVoice(false);
    };

    recognition.onend = () => {
      setIsListeningVoice(false);
      recognitionRef.current = null;
    };

    recognition.start();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      runSequence();
    }, 1500);
    return () => {
      clearTimeout(timer);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
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

        <div className="absolute top-6 right-6 bottom-40 w-[360px] max-w-[42vw] bg-black/65 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl pointer-events-auto overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-display uppercase tracking-widest text-gold-light">
              Courtroom Transcript
            </h3>
          </div>
          <div
            ref={transcriptContainerRef}
            className="h-full overflow-y-auto px-3 py-3 space-y-3"
          >
            {dialogues.map((entry) => {
              const label = speakerInfo[entry.speaker].label;
              const color = speakerInfo[entry.speaker].color;
              const isUserSpeaker = entry.speaker === playerRole;
              return (
                <div
                  key={`${entry.timestamp}-${entry.speaker}`}
                  className={`border rounded-md px-3 py-2 ${
                    isUserSpeaker
                      ? "bg-primary/10 border-primary/30"
                      : "bg-black/45 border-white/10"
                  }`}
                >
                  <div
                    className={`text-[11px] uppercase tracking-widest font-display mb-1 ${color}`}
                  >
                    {label}
                  </div>
                <p className="text-sm text-white/90 leading-relaxed font-serif whitespace-pre-wrap">
                  {entry.text}
                </p>
              </div>
            );
            })}
            {isTyping && currentText ? (
              <div className="bg-black/45 border border-gold-light/30 rounded-md px-3 py-2">
                <div
                  className={`text-[11px] uppercase tracking-widest font-display mb-1 ${
                    currentSpeaker !== "system"
                      ? speakerInfo[currentSpeaker].color
                      : "text-muted-foreground"
                  }`}
                >
                  {currentSpeaker !== "system"
                    ? speakerInfo[currentSpeaker].label
                    : "Court"}
                </div>
                <p className="text-sm text-white/90 leading-relaxed font-serif whitespace-pre-wrap">
                  {currentText}
                </p>
              </div>
            ) : null}
          </div>
        </div>

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
            onAskSuggestion={handleAskSuggestion}
            onStartVoiceInput={handleVoiceInput}
            isListeningVoice={isListeningVoice}
            isSuggestionLoading={isSuggestionLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default CourtroomMain;
