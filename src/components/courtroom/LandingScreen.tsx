import { motion } from 'framer-motion';

interface LandingScreenProps {
  onEnter: () => void;
}

const LandingScreen = ({ onEnter }: LandingScreenProps) => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Spotlight effect */}
      <div className="absolute inset-0 spotlight-effect" />
      
      {/* Courtroom silhouette */}
      <div className="absolute inset-0 flex items-end justify-center opacity-10">
        <div className="flex gap-4 items-end pb-20">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-primary/30 rounded-t-sm"
              style={{
                width: `${30 + Math.random() * 40}px`,
                height: `${100 + Math.random() * 200}px`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Pillars */}
      <div className="absolute left-8 top-0 bottom-0 w-12 bg-gradient-to-r from-secondary/50 to-transparent" />
      <div className="absolute right-8 top-0 bottom-0 w-12 bg-gradient-to-l from-secondary/50 to-transparent" />

      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
        className="relative z-10 text-center"
      >
        {/* Scale icon */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-7xl mb-6"
        >
          ⚖️
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="text-6xl md:text-8xl font-display font-black text-primary gold-glow tracking-tight"
        >
          AI Courtroom
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 1 }}
          className="text-xl md:text-2xl text-muted-foreground mt-4 font-body italic"
        >
          Fight your case. Understand your rights.
        </motion.p>

        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.8, duration: 0.8 }}
          className="mt-12"
        >
          <motion.button
            onClick={onEnter}
            whileHover={{ scale: 1.05, boxShadow: '0 0 40px hsl(43 74% 49% / 0.3)' }}
            whileTap={{ scale: 0.98 }}
            className="court-embossed text-primary font-display text-xl tracking-wide cursor-pointer"
          >
            🏛️ Enter Courtroom
          </motion.button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 2.5, duration: 1 }}
          className="mt-8 text-sm text-muted-foreground font-body"
        >
          Justice Accessibility Engine — Experience the trial
        </motion.p>
      </motion.div>

      {/* Ambient particles */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/20"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
          }}
          animate={{
            opacity: [0, 0.5, 0],
            y: [0, -30, -60],
          }}
          transition={{
            duration: 3 + Math.random() * 3,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  );
};

export default LandingScreen;
