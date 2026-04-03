import { motion } from "framer-motion";
import { Shield, Gavel } from "lucide-react";
import { PlayerRole } from "@/types/courtroom";

interface RoleSelectionProps {
  onSelect: (role: PlayerRole) => void;
}

const RoleSelection = ({ onSelect }: RoleSelectionProps) => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden font-sans p-6">
      {/* Background styling matching landing page */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 scale-105"
        style={{ backgroundImage: 'url(/landing_bg.png)', filter: 'blur(4px)' }} 
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-black/95" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center w-full max-w-5xl"
      >
        <h1
          className="text-5xl md:text-7xl font-serif font-bold text-[#D4AF37] tracking-tight drop-shadow-2xl mb-6"
          style={{ textShadow: "0 4px 30px rgba(212,175,55,0.4)" }}
        >
          CHOOSE YOUR ROLE
        </h1>
        <p className="text-[#e5e5e5] font-serif italic text-xl tracking-wide opacity-80 mb-16">
          The scales of justice require balance. Where do you stand?
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-4">
          {/* Defender Card */}
          <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect("defender")}
            className="group cursor-pointer relative backdrop-blur-xl bg-black/40 border-2 border-[#D4AF37]/20 hover:border-[#D4AF37]/80 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_50px_rgba(212,175,55,0.25)] transition-all duration-500 min-h-[340px] flex flex-col items-center justify-center p-10"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="mb-6 p-6 rounded-full bg-black/50 border border-[#D4AF37]/30 shadow-[0_0_20px_rgba(212,175,55,0.1)] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all duration-500">
              <Shield size={64} className="text-[#D4AF37]" strokeWidth={1.5} />
            </div>
            <h2 className="text-4xl font-serif font-bold text-[#D4AF37] mb-4 tracking-wide">
              DEFENDER
            </h2>
            <p className="text-gray-300 font-serif italic text-center max-w-sm text-lg leading-relaxed group-hover:text-white transition-colors duration-300">
              Stand for justice, protect the innocent, and uncover the truth hidden in the shadows.
            </p>
          </motion.div>

          {/* Prosecutor Card */}
          <motion.div
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect("prosecutor")}
            className="group cursor-pointer relative backdrop-blur-xl bg-black/40 border-2 border-[#8b0000]/30 hover:border-[#ff4444]/80 rounded-2xl overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_50px_rgba(255,68,68,0.2)] transition-all duration-500 min-h-[340px] flex flex-col items-center justify-center p-10"
          >
            <div className="absolute inset-0 bg-gradient-to-bl from-[#ff4444]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="mb-6 p-6 rounded-full bg-black/50 border border-[#ff4444]/30 shadow-[0_0_20px_rgba(255,68,68,0.1)] group-hover:shadow-[0_0_30px_rgba(255,68,68,0.4)] transition-all duration-500">
              <Gavel size={64} className="text-[#ff4444]" strokeWidth={1.5} />
            </div>
            <h2 className="text-4xl font-serif font-bold text-[#ff4444] mb-4 tracking-wide">
              PROSECUTOR
            </h2>
            <p className="text-gray-300 font-serif italic text-center max-w-sm text-lg leading-relaxed group-hover:text-white transition-colors duration-300">
              Press charges, present undeniable evidence, and ensure the guilty face the law.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default RoleSelection;
