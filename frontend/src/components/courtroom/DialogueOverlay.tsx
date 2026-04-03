import { motion, AnimatePresence } from "framer-motion";

interface DialogueOverlayProps {
  speakerInfo: { label: string; color: string } | null;
  text: string;
  isTyping: boolean;
  waitingForUser: boolean;
  isInputDisabled: boolean;
  userInput: string;
  suggestionItems: string[];
  onRequestSuggestion: () => void;
  onApplySuggestion: (suggestion: string) => void;
  suggestionLoading: boolean;
  isListening: boolean;
  onToggleMic: () => void;
  setUserInput: (v: string) => void;
  onSubmit: () => void;
  onObjection: () => void;
}

const DialogueOverlay = ({
  speakerInfo,
  text,
  isTyping,
  waitingForUser,
  isInputDisabled,
  userInput,
  suggestionItems,
  onRequestSuggestion,
  onApplySuggestion,
  suggestionLoading,
  isListening,
  onToggleMic,
  setUserInput,
  onSubmit,
  onObjection,
}: DialogueOverlayProps) => {
  return (
    <div className="absolute inset-x-8 bottom-8 z-40 flex flex-col items-center pointer-events-none">
      <AnimatePresence>
        {waitingForUser ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full max-w-2xl bg-black/80 backdrop-blur-md border px-4 flex gap-2 pointer-events-auto shadow-2xl overflow-hidden rounded-md border-t-2 border-t-gold-light items-center"
            style={{ padding: "0.5rem 0.75rem" }}
          >
            <input
              type="text"
              autoFocus
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              placeholder="Type your compelling argument..."
              className="flex-1 bg-transparent text-foreground text-base md:text-lg font-serif outline-none placeholder:text-muted-foreground/50 min-w-0"
            />
            <button
              onClick={onToggleMic}
              disabled={isInputDisabled}
              className={`flex-shrink-0 font-bold px-3 py-1.5 md:px-4 md:py-2 uppercase tracking-widest rounded border shadow-lg transition-all text-xs md:text-sm ${isListening ? 'bg-red-600 border-red-400 text-white animate-pulse' : 'bg-blue-600/80 border-blue-400/50 text-white hover:bg-blue-500'} disabled:opacity-40 flex items-center justify-center`}
              title="Toggle Voice Input"
            >
              {isListening ? '🎙️ LISTENING' : '🎙️ VOICE'}
            </button>
            <button
              onClick={onSubmit}
              disabled={!userInput.trim() || isInputDisabled}
              className="flex-shrink-0 text-gold-light font-bold px-2 py-1 uppercase tracking-widest disabled:opacity-30 hover:bg-white/10 rounded transition-colors text-xs md:text-sm"
            >
              Send
            </button>
            <button
              onClick={onRequestSuggestion}
              disabled={suggestionLoading || isInputDisabled}
              className="flex-shrink-0 ml-1 bg-primary/70 text-white font-bold px-2 py-1 uppercase tracking-widest hover:bg-primary disabled:opacity-40 rounded text-xs md:text-sm"
            >
              {suggestionLoading ? "Wait..." : "Hint"}
            </button>
            <button
              onClick={onObjection}
              disabled={isInputDisabled}
              className="flex-shrink-0 ml-1 bg-destructive/90 text-white font-black px-3 py-1 md:px-4 md:py-2 uppercase tracking-widest hover:bg-destructive shadow-[0_0_20px_hsl(0,85%,55%,0.6)] text-xs md:text-sm"
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
            className="w-full max-w-2xl bg-gradient-to-t from-black/95 to-black/80 backdrop-blur-md border-2 border-primary/20 rounded-md p-4 lg:p-6 shadow-2xl pointer-events-auto"
          >
            <div className={`text-xs md:text-sm font-display font-bold uppercase tracking-[0.2em] mb-1 ${speakerInfo.color}`}>
              {speakerInfo.label}
            </div>
            <div className="text-base md:text-xl font-serif text-white/95 leading-relaxed tracking-wide min-h-[2rem]">
              {text}
              {isTyping && <span className="inline-block w-2 h-4 bg-white ml-2 animate-pulse align-middle" />}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {waitingForUser && suggestionItems.length > 0 && (
        <div className="pointer-events-auto w-full max-w-2xl mt-3 rounded-md border border-primary/20 bg-black/80 p-3">
          <div className="text-[10px] uppercase tracking-widest text-primary mb-2 font-display">
            Click suggestion to use
          </div>
          <div className="space-y-2">
            {suggestionItems.map((item, idx) => (
              <button
                key={`${item}-${idx}`}
                onClick={() => onApplySuggestion(item)}
                className="w-full text-left text-sm md:text-base text-white/90 hover:text-white border border-white/10 hover:border-primary/40 rounded px-3 py-2"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DialogueOverlay;
