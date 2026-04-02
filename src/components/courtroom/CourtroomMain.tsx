import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import CharacterSprite from "./CharacterSprite";
import SpeechBubble from "./SpeechBubble";
import courtroomBg from "@/assets/courtroom-bg.jpg";

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
  const [currentSpeaker, setCurrentSpeaker] = useState<Speaker>("judge");
  const [isTyping, setIsTyping] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [waitingForUser, setWaitingForUser] = useState(false);
  const [score, setScore] = useState(50);
  const [round, setRound] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [feedbackLevel, setFeedbackLevel] = useState<
    "strong" | "weak" | "no-evidence"
  >("weak");
  const [showObjection, setShowObjection] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [redFlash, setRedFlash] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [bubbleText, setBubbleText] = useState("");
  const [bubbleSpeaker, setBubbleSpeaker] = useState<Speaker>("judge");
  const chatRef = useRef<HTMLDivElement>(null);
  const typeTimeoutRef = useRef<NodeJS.Timeout>();
  const sequenceRef = useRef(false);

  const scrollToBottom = () => {
    if (chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
  };

  const typeText = useCallback(
    (text: string, speaker: Speaker): Promise<void> => {
      return new Promise((resolve) => {
        setCurrentSpeaker(speaker);
        setBubbleSpeaker(speaker);
        setIsTyping(true);
        setCurrentText("");
        setBubbleText("");
        let i = 0;
        const type = () => {
          if (i < text.length) {
            const partial = text.slice(0, i + 1);
            setCurrentText(partial);
            setBubbleText(partial);
            i++;
            typeTimeoutRef.current = setTimeout(type, 25);
          } else {
            setIsTyping(false);
            setDialogues((prev) => [
              ...prev,
              { speaker, text, timestamp: Date.now() },
            ]);
            setCurrentText("");
            // Keep bubble visible briefly after typing finishes
            setTimeout(() => setBubbleText(""), 3000);
            scrollToBottom();
            resolve();
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
    await new Promise((r) => setTimeout(r, 800));
    playGavel();

    await typeText(
      "The prosecution may present their opening argument.",
      "judge",
    );
    await new Promise((r) => setTimeout(r, 600));

    await runRound(0);
  }, [caseData, typeText]);

  const runRound = async (r: number) => {
    const aiRole = playerRole === "defender" ? "prosecutor" : "defender";
    const prosResp = getProsecutorResponse(r);
    await typeText(prosResp, aiRole);
    await new Promise((res) => setTimeout(res, 500));

    const judgeQ = getJudgeQuestion(r);
    await typeText(judgeQ, "judge");
    await new Promise((res) => setTimeout(res, 300));

    setWaitingForUser(true);
  };

  const handleUserSubmit = async () => {
    if (!userInput.trim() || !waitingForUser) return;
    setWaitingForUser(false);
    const response = userInput;
    setUserInput("");

    setDialogues((prev) => [
      ...prev,
      { speaker: playerRole, text: response, timestamp: Date.now() },
    ]);
    setBubbleSpeaker(playerRole);
    setBubbleText(response);
    setTimeout(() => setBubbleText(""), 3000);
    scrollToBottom();

    const evaluation = evaluateResponse(response);
    const newScore = Math.min(100, Math.max(0, score + evaluation.scoreDelta));

    if (evaluation.scoreDelta > 0) playScoreUp();
    else playScoreDown();

    setScore(newScore);
    setFeedback(evaluation.feedback);
    setFeedbackLevel(evaluation.level);
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 2500);

    await new Promise((r) => setTimeout(r, 600));

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
    setTimeout(() => setShaking(false), 500);
    setTimeout(() => setRedFlash(false), 400);
    setTimeout(() => setShowObjection(false), 1500);

    const bonus = Math.floor(Math.random() * 5) + 3;
    setScore((s) => Math.min(100, s + bonus));
    playScoreUp();
  };

  useEffect(() => {
    const timer = setTimeout(runSequence, 500);
    return () => {
      clearTimeout(timer);
      if (typeTimeoutRef.current) clearTimeout(typeTimeoutRef.current);
    };
  }, [runSequence]);

  const scoreColor =
    score >= 70
      ? "bg-verdict-green"
      : score >= 40
        ? "bg-primary"
        : "bg-verdict-red";

  return (
    <div
      className={`h-screen flex flex-row-reverse bg-background relative overflow-hidden ${shaking ? "screen-shake" : ""}`}
    >
      {/* Red flash overlay */}
      {redFlash && (
        <div className="absolute inset-0 red-flash z-50 pointer-events-none" />
      )}

      {/* Objection overlay */}
      <AnimatePresence>
        {showObjection && (
          <motion.div
            initial={{ scale: 3, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <span
              className="text-6xl md:text-8xl font-display font-black text-destructive"
              style={{ textShadow: "0 0 40px hsl(0 85% 55% / 0.8)" }}
            >
              OBJECTION!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT SIDEBAR - Chat Log */}
      <div className="w-80 flex-shrink-0 border-l border-border bg-card/90 backdrop-blur-sm flex flex-col z-10">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-display text-primary">
            📜 Court Transcript
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-display text-muted-foreground">
              🎯 SCORE
            </span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden border border-border">
              <motion.div
                animate={{ width: `${score}%` }}
                transition={{ type: "spring", stiffness: 100 }}
                className={`h-full ${scoreColor} rounded-full`}
              />
            </div>
            <span className="text-xs font-mono text-foreground">{score}</span>
          </div>
          <span className="text-[10px] font-display text-muted-foreground">
            ⏱ Round {Math.min(round + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}
          </span>
        </div>

        {/* Chat messages */}
        <div ref={chatRef} className="flex-1 overflow-y-auto p-3 space-y-2">
          {dialogues.map((d, i) => {
            const info = speakerInfo[d.speaker];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs"
              >
                <span className={`font-display ${info.color} font-semibold`}>
                  {info.label}:
                </span>
                <p className="text-foreground/80 font-body mt-0.5 leading-relaxed">
                  {d.text}
                </p>
              </motion.div>
            );
          })}

          {isTyping && currentText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs"
            >
              <span
                className={`font-display ${speakerInfo[currentSpeaker].color} font-semibold`}
              >
                {speakerInfo[currentSpeaker].label}:
              </span>
              <p className="text-foreground/80 font-body mt-0.5 cursor-blink">
                {currentText}
              </p>
            </motion.div>
          )}
        </div>

        {/* Feedback popup */}
        <AnimatePresence>
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-center text-xs font-body mx-3 mb-2 px-3 py-1 rounded-full ${
                feedbackLevel === "strong"
                  ? "text-verdict-green bg-verdict-green/10"
                  : feedbackLevel === "weak"
                    ? "text-primary bg-primary/10"
                    : "text-verdict-red bg-verdict-red/10"
              }`}
            >
              {feedbackLevel === "strong"
                ? "🟢"
                : feedbackLevel === "weak"
                  ? "🟡"
                  : "🔴"}{" "}
              {feedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input area */}
        <div className="p-3 border-t border-border space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUserSubmit()}
              disabled={!waitingForUser}
              placeholder={waitingForUser ? "Your argument..." : "Waiting..."}
              className="flex-1 bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground font-body placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-40"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleUserSubmit}
              disabled={!waitingForUser || !userInput.trim()}
              className="court-embossed text-primary font-display cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed px-3 py-2 text-sm"
            >
              Send
            </motion.button>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleObjection}
            disabled={!waitingForUser}
            className="w-full bg-destructive text-destructive-foreground px-4 py-2 rounded-lg font-display text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ boxShadow: "0 0 15px hsl(0 85% 55% / 0.3)" }}
          >
            🔴 OBJECTION!
          </motion.button>
        </div>
      </div>

      {/* RIGHT - Courtroom Scene */}
      <div
        className="flex-1 relative flex flex-col items-center justify-end"
        style={{
          backgroundImage: `url(${courtroomBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-background/40" />

        {/* Judge - top center */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-10">
          <SpeechBubble
            text={bubbleSpeaker === "judge" ? bubbleText : ""}
            visible={bubbleSpeaker === "judge" && !!bubbleText}
            position="top"
          />
          <CharacterSprite
            speaker="judge"
            characterId={characterStyles.judge}
            isActive={currentSpeaker === "judge"}
            className="h-44"
          />
          <span className="text-xs font-display text-primary mt-1 bg-background/70 px-2 py-0.5 rounded">
            {speakerInfo.judge.label}
          </span>
        </div>

        {/* Defender - bottom left */}
        <div className="absolute bottom-16 left-12 flex flex-col items-center z-10">
          <SpeechBubble
            text={bubbleSpeaker === "defender" ? bubbleText : ""}
            visible={bubbleSpeaker === "defender" && !!bubbleText}
            position="left"
          />
          <CharacterSprite
            speaker="defender"
            characterId={characterStyles.defender}
            isActive={currentSpeaker === "defender"}
            className="h-52"
          />
          <span className="text-xs font-display text-gold-light mt-1 bg-background/70 px-2 py-0.5 rounded">
            {speakerInfo.defender.label}
          </span>
        </div>

        {/* Prosecutor - bottom right */}
        <div className="absolute bottom-16 right-12 flex flex-col items-center z-10">
          <SpeechBubble
            text={bubbleSpeaker === "prosecutor" ? bubbleText : ""}
            visible={bubbleSpeaker === "prosecutor" && !!bubbleText}
            position="right"
          />
          <CharacterSprite
            speaker="prosecutor"
            characterId={characterStyles.prosecutor}
            isActive={currentSpeaker === "prosecutor"}
            className="h-52"
          />
          <span className="text-xs font-display text-destructive mt-1 bg-background/70 px-2 py-0.5 rounded">
            {speakerInfo.prosecutor.label}
          </span>
        </div>

        {/* Audience silhouettes */}
        <div className="absolute bottom-2 w-full text-center opacity-15 text-2xl tracking-[1em] select-none z-0">
          👤👤👤👤👤👤👤👤
        </div>
      </div>
    </div>
  );
};

export default CourtroomMain;
