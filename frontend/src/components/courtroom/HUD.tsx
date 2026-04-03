import { Speaker } from "@/types/courtroom";
import { TrialPhase } from "@/store/trialStore";

interface HUDProps {
  timerLabel: string;
  activeSpeaker: Speaker;
  phase: TrialPhase;
}

const HUD = ({ timerLabel, activeSpeaker, phase }: HUDProps) => {
  return (
    <div className="absolute top-0 left-0 w-full z-40 pointer-events-none flex flex-col items-center pt-6 px-8">
      <div className="w-full max-w-4xl flex items-start justify-between gap-8">
        
        <div className="flex-1 flex flex-col items-start pt-2">
          <div className="bg-black/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded shadow-2xl relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-gold/20 to-transparent opacity-50" />
             <span className="text-[10px] font-display text-gold uppercase tracking-[0.2em] relative z-10 block mb-0.5">
              Trial Status
            </span>
            <span className="font-serif text-white/90 text-sm relative z-10">
              {phase === "DELIBERATION" ? "Judge is Deliberating" : "Court is in Session"}
            </span>
          </div>
        </div>

        <div className="flex-[2] flex flex-col items-center">
          <div className="mb-4 bg-black/90 backdrop-blur-xl border border-white/20 px-8 py-3 rounded-b-xl shadow-2xl shadow-black/50 relative border-t-0 -mt-6">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-b-xl" />
            <span className="font-mono text-3xl font-bold tracking-widest gold-glow text-white">
              {timerLabel}
            </span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-end pt-2">
           <div className="bg-black/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded shadow-2xl relative overflow-hidden text-right">
             <div className="absolute inset-0 bg-gradient-to-l from-primary/20 to-transparent opacity-50" />
             <span className="text-[10px] font-display text-primary uppercase tracking-[0.2em] relative z-10 block mb-0.5">
              Active Speaker
            </span>
            <span className="font-serif text-white/90 text-sm relative z-10 capitalize">
              {activeSpeaker}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HUD;
