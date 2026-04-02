import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playGavel } from '@/lib/sounds';

interface CourtroomLoadingProps {
  onComplete: () => void;
}

const stages = [
  { text: '', duration: 800 },
  { text: 'Court is now in session', duration: 2500 },
  { text: 'All rise...', duration: 1500 },
];

const CourtroomLoading = ({ onComplete }: CourtroomLoadingProps) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    let accumulated = 0;

    // Play gavel at start
    const gavelTimer = setTimeout(() => playGavel(), 400);
    timers.push(gavelTimer);

    stages.forEach((s, i) => {
      accumulated += s.duration;
      timers.push(setTimeout(() => setStage(i + 1), accumulated));
    });

    accumulated += 500;
    timers.push(setTimeout(onComplete, accumulated));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden">
      <AnimatePresence mode="wait">
        {stage === 0 && (
          <motion.div
            key="black"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background"
          />
        )}

        {stage >= 1 && stage < 3 && (
          <motion.div
            key={`stage-${stage}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6 }}
            className="text-center z-10"
          >
            <p className="text-3xl md:text-5xl font-display font-bold text-primary gold-glow">
              {stages[stage - 1]?.text || stages[stage]?.text}
            </p>
          </motion.div>
        )}

        {stage >= 3 && (
          <motion.div
            key="courtroom"
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="w-full max-w-4xl mx-auto px-4 z-10"
          >
            {/* Judge bench */}
            <div className="flex justify-center mb-12">
              <motion.div
                initial={{ y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <div className="text-5xl mb-2">👨‍⚖️</div>
                <div className="bg-court-wood px-8 py-2 rounded-md border border-border">
                  <p className="text-primary font-display text-sm">JUDGE</p>
                </div>
              </motion.div>
            </div>

            {/* Spotlight */}
            <div className="spotlight-effect absolute inset-0 pointer-events-none" />

            {/* Defender & Prosecutor */}
            <div className="flex justify-between items-end px-8">
              <motion.div
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center"
              >
                <div className="text-4xl mb-2">🧑‍💻</div>
                <div className="bg-secondary px-6 py-1 rounded-md border border-primary/30">
                  <p className="text-primary font-display text-xs">YOU (DEFENDER)</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-center"
              >
                <div className="text-4xl mb-2">🧑‍💼</div>
                <div className="bg-secondary px-6 py-1 rounded-md border border-border">
                  <p className="text-muted-foreground font-display text-xs">PROSECUTOR</p>
                </div>
              </motion.div>
            </div>

            {/* Audience */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 1 }}
              className="flex justify-center gap-2 mt-10 text-2xl"
            >
              {'👤'.repeat(8).match(/../g)?.map((_, i) => (
                <span key={i} className="opacity-40">👤</span>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CourtroomLoading;
