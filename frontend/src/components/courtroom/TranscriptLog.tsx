import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DialogueEntry, Speaker } from "@/types/courtroom";

interface TranscriptLogProps {
  showTranscript: boolean;
  setShowTranscript: React.Dispatch<React.SetStateAction<boolean>>;
  transcript: DialogueEntry[];
  speakerInfo: Record<Speaker, { label: string; color: string }>;
}

const TranscriptLog = ({ showTranscript, setShowTranscript, transcript, speakerInfo }: TranscriptLogProps) => {
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showTranscript) return;
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [transcript, showTranscript]);

  return (
    <>
      <button
        onClick={() => setShowTranscript((prev) => !prev)}
        className="absolute bottom-6 right-6 z-50 bg-black/60 hover:bg-black/80 text-white/90 px-5 py-2.5 rounded border border-white/10 backdrop-blur-sm pointer-events-auto transition-all font-display text-xs tracking-widest uppercase hover:border-white/30"
      >
        {showTranscript ? "Hide Transcript" : "Transcript"}
      </button>

      <AnimatePresence>
        {showTranscript && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="h-full bg-black/80 backdrop-blur-xl border-l border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] z-[60] flex flex-col pointer-events-auto overflow-hidden shrink-0"
          >
            <div className="w-72 md:w-80 h-full flex flex-col">
              <div className="p-5 border-b border-white/10 flex justify-between items-center relative overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent opacity-30" />
              <span className="text-white/90 font-display text-sm font-bold tracking-[0.2em] uppercase relative z-10 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-verdict-green animate-pulse" />
                Court Record
              </span>
              <button 
                onClick={() => setShowTranscript(false)} 
                className="text-white/50 hover:text-white px-3 py-1 cursor-pointer transition-colors relative z-10"
              >
                ✕
              </button>
            </div>
            
            <div ref={transcriptRef} className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {transcript.map((d, i) => (
                <div 
                  key={`${d.timestamp}-${i}`} 
                  className="text-sm pb-6 relative group"
                >
                  <div className="absolute -left-6 top-0 bottom-0 w-0.5 bg-white/5 group-hover:bg-white/20 transition-colors" />
                  
                  <div className={`font-display font-bold text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2 ${speakerInfo[d.speaker]?.color || "text-white"}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
                    {speakerInfo[d.speaker]?.label || d.speaker}
                  </div>
                  
                  <div className="text-white/80 font-serif leading-relaxed text-[16px] pl-3">
                    {d.text}
                  </div>
                </div>
              ))}
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TranscriptLog;
