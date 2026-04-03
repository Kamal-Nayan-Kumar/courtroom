import { motion, AnimatePresence } from "framer-motion";
import { Speaker } from "@/types/courtroom";

interface DialogueOverlayProps {
  speakerInfo: { label: string; color: string } | null;
  text: string;
  isTyping: boolean;
  waitingForUser: boolean;
  userInput: string;
  setUserInput: (v: string) => void;
  onSubmit: () => void;
  onObjection: () => void;
  onAskSuggestion: () => void;
  onStartVoiceInput: () => void;
  isListeningVoice: boolean;
  isSuggestionLoading: boolean;
}

const DialogueOverlay = ({
  speakerInfo,
  text,
  isTyping,
  waitingForUser,
  userInput,
  setUserInput,
  onSubmit,
  onObjection,
  onAskSuggestion,
  onStartVoiceInput,
  isListeningVoice,
  isSuggestionLoading,
}: DialogueOverlayProps) => {
  return (
    <div className="absolute inset-x-8 bottom-8 z-40 flex flex-col items-center pointer-events-none">
      <AnimatePresence>
        {waitingForUser ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full max-w-4xl bg-black/80 backdrop-blur-md border px-6 flex gap-3 pointer-events-auto shadow-2xl overflow-hidden rounded-md border-t-2 border-t-gold-light"
            style={{ padding: "0.75rem 1rem" }}
          >
            <input
              type="text"
              autoFocus
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              placeholder="Type your compelling argument..."
              className="flex-1 bg-transparent text-foreground text-lg md:text-xl font-serif outline-none placeholder:text-muted-foreground/50"
            />
            <button
              onClick={onStartVoiceInput}
              className={`font-bold px-4 py-2 uppercase tracking-widest rounded transition-colors border ${
                isListeningVoice
                  ? "text-red-300 border-red-400/60 bg-red-950/40"
                  : "text-gold-light border-gold-light/40 hover:bg-white/10"
              }`}
            >
              {isListeningVoice ? "Listening..." : "Voice"}
            </button>
            <button
              onClick={onAskSuggestion}
              disabled={isSuggestionLoading}
              className="text-gold-light font-bold px-4 py-2 uppercase tracking-widest disabled:opacity-40 hover:bg-white/10 rounded transition-colors border border-gold-light/40"
            >
              {isSuggestionLoading ? "Thinking..." : "AI Suggest"}
            </button>
            <button
              onClick={onSubmit}
              disabled={!userInput.trim()}
              className="text-gold-light font-bold px-4 py-2 uppercase tracking-widest disabled:opacity-30 hover:bg-white/10 rounded transition-colors"
            >
              Submit
            </button>
            <button
              onClick={onObjection}
              className="ml-2 bg-destructive/90 text-white font-black px-6 py-2 uppercase tracking-widest hover:bg-destructive shadow-[0_0_20px_hsl(0,85%,55%,0.6)]"
            >
              OBJECTION!
            </button>
          </motion.div>
        ) : speakerInfo && text ? (
          <motion.div
            key="dialogueBox"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-4xl bg-gradient-to-t from-black/95 to-black/80 backdrop-blur-md border-2 border-primary/20 rounded-md p-6 lg:p-8 shadow-2xl pointer-events-auto"
          >
            <div className={`text-sm md:text-base font-display font-bold uppercase tracking-[0.2em] mb-2 ${speakerInfo.color}`}>
              {speakerInfo.label}
            </div>
            <div className="text-xl md:text-3xl font-serif text-white/95 leading-relaxed tracking-wide min-h-[4rem]">
              {text}
              {isTyping && <span className="inline-block w-3 h-6 bg-white ml-2 animate-pulse align-middle" />}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default DialogueOverlay;
