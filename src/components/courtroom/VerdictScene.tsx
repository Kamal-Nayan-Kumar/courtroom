import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { playGavel } from '@/lib/sounds';

interface VerdictSceneProps {
  score: number;
  onContinue: () => void;
}

const VerdictScene = ({ score, onContinue }: VerdictSceneProps) => {
  const [stage, setStage] = useState(0);
  const win = score >= 50;

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 1500); // silence
    const t2 = setTimeout(() => { setStage(2); playGavel(); }, 3000); // gavel
    const t3 = setTimeout(() => setStage(3), 4500); // verdict
    const t4 = setTimeout(() => setStage(4), 6000); // continue button
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <div className="spotlight-effect absolute inset-0" />

      {/* Judge zoom */}
      {stage >= 1 && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1 }}
          className="text-center z-10"
        >
          <div className="text-7xl mb-4">👨‍⚖️</div>
          <p className="text-sm font-display text-muted-foreground">Judge Harmon</p>
        </motion.div>
      )}

      {/* Gavel hit text */}
      {stage >= 2 && (
        <motion.div
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="text-center mt-8 z-10"
        >
          <p className="text-2xl font-display text-muted-foreground italic">The court has reached a decision...</p>
        </motion.div>
      )}

      {/* Verdict */}
      {stage >= 3 && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 150, delay: 0.3 }}
          className="text-center mt-8 z-10"
        >
          <h2
            className={`text-5xl md:text-7xl font-display font-black ${win ? 'text-verdict-green' : 'text-verdict-red'}`}
            style={{ textShadow: win ? '0 0 40px hsl(142 60% 45% / 0.5)' : '0 0 40px hsl(0 72% 51% / 0.5)' }}
          >
            {win ? '✅ NOT GUILTY' : '❌ GUILTY'}
          </h2>
          <p className="text-xl text-muted-foreground font-body mt-4">
            Final Score: <span className="text-foreground font-mono">{score}/100</span>
          </p>
        </motion.div>
      )}

      {/* Continue */}
      {stage >= 4 && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={onContinue}
          className="court-embossed text-primary font-display mt-10 z-10 cursor-pointer"
        >
          📄 View Case Report
        </motion.button>
      )}
    </div>
  );
};

export default VerdictScene;
