import { useState, useEffect, useRef, useMemo, Suspense, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useTrialStore } from "@/store/trialStore";
import { TrialWebSocketClient } from "@/lib/ws";
import {
  CaseData,
  Speaker,
  PlayerRole,
  CharacterStyles,
  CaseReport,
} from "@/types/courtroom";
import {
  requestFinalJudgment,
  requestFinalReport,
  requestTrialSuggestions,
} from "@/lib/api";
import { playGavel, playObjection } from "@/lib/sounds";
import { unlockAudioPlayback, playSarvamTts, stopAudioPlayback } from "@/lib/audio";
import DialogueOverlay from "./DialogueOverlay";
import HUD from "./HUD";
import TranscriptLog from "./TranscriptLog";
import CourtroomEnvironment from "./3d/CourtroomEnvironment";
import CharacterModel from "./3d/CharacterModel";
import CameraManager from "./3d/CameraManager";

interface CourtroomMainProps {
  caseData: CaseData;
  playerRole: PlayerRole;
  characterStyles: CharacterStyles;
  onComplete: (report: CaseReport) => void;
}

const speakerOrder: Speaker[] = ["judge", "prosecutor", "defender", "system"];

const CourtroomMain = ({
  caseData,
  playerRole,
  characterStyles,
  onComplete,
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

  const transcript = useTrialStore((s) => s.transcript);
  const currentSpeaker = useTrialStore((s) => s.activeSpeaker);
  const isTyping = useTrialStore((s) => s.aiTyping);
  const waitingForUser = useTrialStore((s) => s.waitingForUserInput);
  const currentTurn = useTrialStore((s) => s.currentTurn);
  const timerRemainingSec = useTrialStore((s) => s.hud.timerRemainingSec);
  const wsConnected = useTrialStore((s) => s.ws.status === "connected");
  const wsError = useTrialStore((s) => s.ws.error);
  const trialEnded = useTrialStore((s) => s.trialStatus === "concluded" || s.trialStatus === "deliberating");
  const phase = useTrialStore((s) => s.phase);

  const [currentText, setCurrentText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [showTranscript, setShowTranscript] = useState(true);
  const [showObjection, setShowObjection] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [redFlash, setRedFlash] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const roleSpeaker: Speaker = playerRole === "prosecutor" ? "prosecutor" : "defender";
  const timerMinutes = caseData.timerMinutes;
  const voiceGender = caseData.voiceGender;
  const caseSummary = `${caseData.title}\n${caseData.description}`;
  const timerLabel = useMemo(() => {
    const totalSeconds = Math.max(0, timerRemainingSec);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timerRemainingSec]);

  const wsClientRef = useRef<TrialWebSocketClient | null>(null);
  const finalizingRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const initializedRef = useRef(false);
  const turnQueueRef = useRef<{ speaker: Speaker, content: string, currentTurn: string, playAudio?: boolean }[]>([]);
  const isProcessingQueueRef = useRef(false);

  const processAudioQueue = useCallback(async () => {
    if (isProcessingQueueRef.current) return;
    isProcessingQueueRef.current = true;

    while (turnQueueRef.current.length > 0) {
      const turn = turnQueueRef.current.shift();
      if (!turn) continue;

      useTrialStore.getState().setActiveSpeaker(turn.speaker);
      setCurrentText(turn.content);
      useTrialStore.getState().setAiTyping(true);
      useTrialStore.getState().appendTranscript({
        speaker: turn.speaker,
        text: turn.content,
        timestamp: Date.now(),
      });
      
      if (turn.speaker === "judge") {
        playGavel();
      }

      const nextTurn = turn.currentTurn.trim() || useTrialStore.getState().currentTurn;
      useTrialStore.getState().setCurrentTurn(nextTurn);
      useTrialStore.getState().setWaitingForUserInput(nextTurn === playerRole);
      useTrialStore.getState().setAiTyping(false);

      const shouldPlayAudio = turn.playAudio ?? (
        turn.speaker !== roleSpeaker &&
        (turn.speaker === "judge" || turn.speaker === "prosecutor" || turn.speaker === "defender")
      );

      if (shouldPlayAudio && (turn.speaker === "judge" || turn.speaker === "prosecutor" || turn.speaker === "defender")) {
        try {
          await playSarvamTts({
            text: turn.content,
            voiceGender,
            speaker: turn.speaker,
          });
        } catch (err) {
          console.warn("Failed to play TTS for turn", err);
        }
      }
    }

    isProcessingQueueRef.current = false;
  }, [playerRole, roleSpeaker, voiceGender]);

  const handleIncomingTurn = useCallback(
    (parsed: { event?: string; turn?: string; content?: string; current_turn?: string }) => {
      if (parsed.event === "resumed") {
        const nextTurn = (parsed.current_turn || "").trim() || useTrialStore.getState().currentTurn;
        useTrialStore.getState().setCurrentTurn(nextTurn);
        useTrialStore.getState().setWaitingForUserInput(nextTurn === playerRole);
        return;
      }

      if (!parsed.turn || !parsed.content) return;

      const normalizedTurn = parsed.turn.toLowerCase();
      const speaker = speakerOrder.includes(normalizedTurn as Speaker)
        ? (normalizedTurn as Speaker)
        : "system";

      turnQueueRef.current.push({
        speaker,
        content: parsed.content,
        currentTurn: parsed.current_turn || "",
      });

      void processAudioQueue();
    },
    [playerRole, processAudioQueue],
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (useTrialStore.getState().transcript.length === 0) {
      const openingAnnouncement = `Case starting: ${caseData.title}. ${caseData.description}`;
      useTrialStore.getState().setActiveSpeaker("system");
      useTrialStore.getState().setAiTyping(false);
      useTrialStore.getState().appendTranscript({
        speaker: "system",
        text: openingAnnouncement,
        timestamp: Date.now(),
      });
      setCurrentText(openingAnnouncement);
    }

    const client = new TrialWebSocketClient({
      playerRole,
      caseDetails: caseSummary,
      startupMessage: `The trial is beginning. Case: ${caseData.title}.`,
      isResume: useTrialStore.getState().transcript.length > 0,
      onStatus: (status) => useTrialStore.getState().setWsStatus(status),
      onError: (error) => useTrialStore.getState().setWsError(error),
      onOpen: () => {
        void unlockAudioPlayback();
        const initialTurn = playerRole === "prosecutor" ? "defender" : "prosecutor";
        useTrialStore.getState().setCurrentTurn(initialTurn);
        useTrialStore.getState().setWaitingForUserInput(false);
      },
      onMessage: async (msg) => {
        if (msg.event === "done") {
          if (useTrialStore.getState().hud.timerRemainingSec === 0 || useTrialStore.getState().trialStatus === "concluded" || useTrialStore.getState().trialStatus === "deliberating") {
            return;
          }
          useTrialStore.getState().setWaitingForUserInput(useTrialStore.getState().currentTurn === playerRole);
          return;
        }

        if (msg.event === "turn" || (msg.turn && msg.content)) {
          await handleIncomingTurn(msg);
        }
      },
    });

    wsClientRef.current = client;
    client.connect();

    return () => {
      initializedRef.current = false;
      client.close();
      stopAudioPlayback();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [caseData.title, handleIncomingTurn, playerRole, caseSummary]);

  const handleFinalize = useCallback(async () => {
    if (finalizingRef.current || trialEnded) return;
    finalizingRef.current = true;
    setIsFinalizing(true);
    
    useTrialStore.getState().setWaitingForUserInput(false);
    useTrialStore.getState().beginDeliberation();

    if (wsClientRef.current) {
      wsClientRef.current.close();
    }
    
    try {
      const judgment = await requestFinalJudgment({
        caseData,
        transcript: useTrialStore.getState().transcript,
        playerRole,
        timerMinutes,
      });

      useTrialStore.getState().setActiveSpeaker("judge");
      setCurrentText(judgment);
      useTrialStore.getState().appendTranscript({
        speaker: "judge",
        text: judgment,
        timestamp: Date.now(),
      });
      playGavel();

      try {
        await playSarvamTts({
          text: judgment,
          voiceGender,
          speaker: "judge",
        });
      } catch (err) {
        console.warn("TTS failed for final judgment", err);
      }

      const report = await requestFinalReport({
        caseData,
        transcript: useTrialStore.getState().transcript,
        currentTurn: useTrialStore.getState().currentTurn,
      });

      onComplete(report);
      useTrialStore.getState().completeTrial(report);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to finalize trial.";
      useTrialStore.getState().setWsError(msg);
      finalizingRef.current = false;
      setIsFinalizing(false);
    }
  }, [caseData, playerRole, timerMinutes, voiceGender, onComplete, trialEnded]);

  useEffect(() => {
    if (trialEnded || phase === 'DELIBERATION' || isFinalizing) return;
    
    const interval = setInterval(() => {
      const current = useTrialStore.getState().hud.timerRemainingSec;
      if (current > 0) {
        useTrialStore.getState().setTimerRemainingSec(current - 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [trialEnded, phase, isFinalizing]);

  useEffect(() => {
    if (timerRemainingSec === 0 && phase !== 'DELIBERATION' && !isFinalizing && !finalizingRef.current && !trialEnded) {
      void handleFinalize();
    }
  }, [timerRemainingSec, phase, isFinalizing, handleFinalize, trialEnded]);

  const handleUserSubmit = async () => {
    if (!userInput.trim() || !waitingForUser || !wsClientRef.current || trialEnded) {
      return;
    }

    const text = userInput.trim();
    setUserInput("");
    useTrialStore.getState().setWaitingForUserInput(false);

    turnQueueRef.current.push({
      speaker: roleSpeaker,
      content: text,
      currentTurn: "",
    });
    void processAudioQueue();

    wsClientRef.current.send({
      message: text,
      player_role: playerRole,
      case_details: caseSummary,
    });
  };

  const handleRequestSuggestion = async () => {
    if (!waitingForUser || trialEnded) return;
    setSuggestionLoading(true);
    try {
      const items = await requestTrialSuggestions({
        caseData,
        transcript,
        currentTurn,
      });
      setSuggestions(items);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Suggestion request failed.";
      useTrialStore.getState().setWsError(message);
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleApplySuggestion = async (suggestion: string) => {
    if (!waitingForUser || trialEnded || !wsClientRef.current) return;

    setSuggestions([]);
    setUserInput("");

    useTrialStore.getState().setWaitingForUserInput(false);
    
    turnQueueRef.current.push({
      speaker: roleSpeaker,
      content: suggestion,
      currentTurn: "",
      playAudio: true,
    });
    void processAudioQueue();

    wsClientRef.current.send({
      message: suggestion,
      player_role: playerRole,
      case_details: caseSummary,
    });
  };

  const handleObjection = () => {
    if (!waitingForUser || trialEnded) return;
    playObjection();
    setShaking(true);
    setRedFlash(true);
    setShowObjection(true);

    setTimeout(() => setShaking(false), 500);
    setTimeout(() => setRedFlash(false), 400);
    setTimeout(() => setShowObjection(false), 1500);
  };

  const handleToggleMic = () => {
    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor || trialEnded || isFinalizing) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0]?.transcript || "";
        }
      }
      if (finalTranscript.trim()) {
        setUserInput((prev) => `${prev} ${finalTranscript}`.trim());
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  return (
    <div className={`flex relative w-full h-screen bg-black overflow-hidden font-sans ${shaking ? "screen-shake" : ""}`}>
      <div className="flex-1 relative h-full">
        <div className="absolute inset-0 z-0">
        <ErrorBoundary>
          <Canvas
            shadows
            camera={{ position: [0, 6, 12], fov: 45 }}
            gl={{ powerPreference: "high-performance", antialias: false, stencil: false }}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener("webglcontextlost", (e) => {
                e.preventDefault();
                useTrialStore.getState().setWsError("Graphics context lost. Please refresh.");
              });
            }}
          >
            <Suspense fallback={null}>
              <CameraManager activeSpeaker={currentSpeaker} />
              <CourtroomEnvironment />
              <CharacterModel role="judge" isTalking={currentSpeaker === "judge"} text={currentSpeaker === "judge" ? currentText : undefined} position={[0, 1.5, -11.2]} color="#3a3a4a" characterId={characterStyles.judge} />
              <CharacterModel role="defender" isTalking={currentSpeaker === "defender"} text={currentSpeaker === "defender" ? currentText : undefined} position={[8.525, 0.5, -3.243]} rotation={[0, -0.4, 0]} color="#5b483a" characterId={characterStyles.defender} />
              <CharacterModel role="prosecutor" isTalking={currentSpeaker === "prosecutor"} text={currentSpeaker === "prosecutor" ? currentText : undefined} position={[-8.525, 0.5, -3.243]} rotation={[0, 0.4, 0]} color="#4a3a3a" characterId={characterStyles.prosecutor} />
            </Suspense>
          </Canvas>
        </ErrorBoundary>
      </div>

      {redFlash && <div className="absolute inset-0 bg-red-600/40 mix-blend-multiply z-30 pointer-events-none" />}

      <AnimatePresence>
        {showObjection && (
          <motion.div
            initial={{ scale: 3, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <span className="text-7xl md:text-9xl font-display font-black text-destructive tracking-[0.1em]" style={{ textShadow: "0 0 50px hsl(0 85% 55% / 1)", WebkitTextStroke: "2px white" }}>
              OBJECTION!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-40 pointer-events-none w-full h-full">
        <HUD 
          timerLabel={timerLabel} 
          activeSpeaker={currentSpeaker} 
          phase={phase} 
        />

        <div className="absolute top-6 right-6 z-40 flex flex-col gap-2 pointer-events-auto">
          <div className="bg-black/60 border border-white/10 rounded px-3 py-2 text-xs text-white/90">
            <span className={wsConnected ? "text-green-400" : "text-yellow-300"}>
              {wsConnected ? "Live" : "Reconnecting"}
            </span>
            {isFinalizing && <span className="ml-2 text-primary">Finalizing...</span>}
          </div>
          <button 
            onClick={() => useTrialStore.getState().resetTrial()}
            className="bg-red-900/60 hover:bg-red-800/80 border border-red-500/30 rounded px-3 py-2 text-xs text-white/90 transition-colors"
          >
            End Trial
          </button>
        </div>

        {wsError && (
          <div className="absolute top-16 right-6 z-40 max-w-md bg-red-900/60 border border-red-400/30 text-red-100 text-xs px-3 py-2 rounded pointer-events-auto">
            {wsError}
          </div>
        )}

        <div className="pointer-events-auto">
          <DialogueOverlay
            speakerInfo={currentSpeaker !== "system" ? speakerInfo[currentSpeaker] : null}
            text={currentText}
            isTyping={isTyping}
            waitingForUser={waitingForUser}
            isInputDisabled={trialEnded || isFinalizing}
            userInput={userInput}
            suggestionItems={suggestions}
            suggestionLoading={suggestionLoading}
            onRequestSuggestion={handleRequestSuggestion}
            onApplySuggestion={handleApplySuggestion}
            isListening={isListening}
            onToggleMic={handleToggleMic}
            setUserInput={setUserInput}
            onSubmit={handleUserSubmit}
            onObjection={handleObjection}
          />
        </div>
      </div>
      </div>

      <TranscriptLog
        showTranscript={showTranscript}
        setShowTranscript={setShowTranscript}
        transcript={transcript}
        speakerInfo={speakerInfo}
      />
    </div>
  );
};

export default CourtroomMain;
