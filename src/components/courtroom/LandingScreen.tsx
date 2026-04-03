import { motion } from 'framer-motion';
import { Scale } from 'lucide-react';

interface LandingScreenProps {
  onEnter: () => void;
}

const LandingScreen = ({ onEnter }: LandingScreenProps) => {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black">
      
      {/* Photorealistic Courtroom Cinematic Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 scale-105"
        style={{ backgroundImage: 'url(/landing_bg.png)', filter: 'blur(3px)' }} 
      />
      
      {/* Vignette Overlay for readable text */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/40 to-black/95" />

      {/* Floating particles mimicking glowing dust motes */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[#D4AF37]/40 shadow-[0_0_8px_2px_rgba(212,175,55,0.4)]"
          style={{
            left: `${10 + Math.random() * 80}%`,
            top: `${10 + Math.random() * 80}%`,
          }}
          animate={{
            opacity: [0, 0.6, 0],
            y: [0, -40, -80],
            x: [0, (Math.random() - 0.5) * 30]
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        />
      ))}

      <motion.div
        initial={{ scale: 1.05, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: 'easeOut' }}
        className="relative z-10 text-center flex flex-col items-center"
      >
        {/* Sanskrit Motto */}
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 0.8 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="text-[#D4AF37] font-serif uppercase tracking-[0.3em] text-sm md:text-base mb-6 drop-shadow-lg"
        >
          Satyameva Jayate
        </motion.p>

        {/* Scale icon */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mb-8 p-5 rounded-full bg-black/40 border border-[#D4AF37]/30 backdrop-blur-md shadow-[0_0_40px_rgba(212,175,55,0.2)]"
        >
          <Scale size={64} color="#D4AF37" strokeWidth={1.5} />
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="text-6xl md:text-8xl font-serif font-bold tracking-tight"
          style={{
            color: '#D4AF37',
            textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 0 50px rgba(212,175,55,0.4)'
          }}
        >
          AI Courtroom
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.4, duration: 1 }}
          className="text-xl md:text-3xl text-gray-200 mt-6 font-serif italic font-light drop-shadow-xl"
        >
          Experience the Trial. Defend Your Rights.
        </motion.p>

        {/* Enter Button */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 2, duration: 0.8 }}
          className="mt-16"
        >
          <motion.button
            onClick={onEnter}
            whileHover={{ 
              scale: 1.05, 
              boxShadow: '0 0 50px rgba(212,175,55,0.5)',
              borderColor: 'rgba(212,175,55,0.9)',
              backgroundColor: 'rgba(0,0,0,0.8)'
            }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 backdrop-blur-lg bg-black/50 border border-[#D4AF37]/50 text-[#D4AF37] px-10 py-5 rounded-xl font-serif text-xl md:text-2xl tracking-wider cursor-pointer transition-colors duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.6)]"
          >
            <span>Enter the Court</span>
          </motion.button>
        </motion.div>

        {/* Footer legal text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 2.8, duration: 1 }}
          className="mt-16 text-xs md:text-sm text-gray-300 font-sans tracking-widest uppercase drops-shadow"
        >
          Justice Accessibility Engine
        </motion.p>
      </motion.div>
    </div>
  );
};

export default LandingScreen;
