import { motion } from "framer-motion";

interface ScoreHUDProps {
  winChance: number;
  timerLabel: string;
}

const ScoreHUD = ({ winChance, timerLabel }: ScoreHUDProps) => {
  const scoreColor =
    winChance >= 70
      ? "bg-verdict-green"
      : winChance >= 40
        ? "bg-primary"
        : "bg-verdict-red";

  return (
    <div className="absolute top-6 left-6 z-40 pointer-events-none flex gap-6">
      <div className="bg-black/60 backdrop-blur-sm border border-white/10 px-6 py-3 rounded-md shadow-2xl flex items-center gap-4">
        <span className="text-xs font-display text-muted-foreground uppercase tracking-widest">
          Winning Chance
        </span>
        <div className="w-32 md:w-48 h-2.5 bg-black/80 rounded-full overflow-hidden border border-white/20">
          <motion.div
            animate={{ width: `${winChance}%` }}
            transition={{ type: "spring", stiffness: 100 }}
            className={`h-full ${scoreColor} rounded-full`}
            style={{ boxShadow: "0 0 10px currentColor" }}
          />
        </div>
        <span className="font-mono text-white text-sm font-bold">{winChance}%</span>
      </div>

      <div className="bg-black/60 backdrop-blur-sm border border-white/10 px-6 py-3 rounded-md shadow-2xl flex items-center gap-4">
         <span className="text-xs font-display text-muted-foreground uppercase tracking-widest">
          Timer
        </span>
        <span className="font-mono text-white text-lg font-bold">
            {timerLabel}
        </span>
      </div>
    </div>
  );
};

export default ScoreHUD;
