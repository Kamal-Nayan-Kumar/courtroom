import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PlayerRole } from "@/types/courtroom";

interface RoleSelectionProps {
  onSelect: (role: PlayerRole) => void;
}

const RoleSelection = ({ onSelect }: RoleSelectionProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden font-sans p-6">
      {/* Background styling for a game-like feel */}
      <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/30 via-background to-background" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 text-center space-y-10 w-full max-w-4xl"
      >
        <h1
          className="text-4xl md:text-6xl font-display font-bold text-primary tracking-tight"
          style={{ textShadow: "0 4px 20px rgba(212,175,55,0.4)" }}
        >
          CHOOSE YOUR ROLE
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          {/* Defender Card */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect("defender")}
            className="group cursor-pointer relative bg-card border-2 border-border hover:border-gold-light rounded-xl overflow-hidden shadow-2xl transition-all duration-300 min-h-[300px] flex flex-col items-center justify-center p-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gold-light/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="text-6xl mb-6">🛡️</div>
            <h2 className="text-3xl font-display font-bold text-primary mb-4">
              DEFENDER
            </h2>
            <p className="text-muted-foreground text-center max-w-sm">
              Stand for justice, protect the innocent, and uncover the truth
              hidden in the shadows.
            </p>
          </motion.div>

          {/* Prosecutor Card */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect("prosecutor")}
            className="group cursor-pointer relative bg-card border-2 border-border hover:border-destructive rounded-xl overflow-hidden shadow-2xl transition-all duration-300 min-h-[300px] flex flex-col items-center justify-center p-8"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-destructive/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="text-6xl mb-6">⚖️</div>
            <h2 className="text-3xl font-display font-bold text-destructive mb-4">
              PROSECUTOR
            </h2>
            <p className="text-muted-foreground text-center max-w-sm">
              Press charges, present undeniable evidence, and ensure the guilty
              face the law.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default RoleSelection;
