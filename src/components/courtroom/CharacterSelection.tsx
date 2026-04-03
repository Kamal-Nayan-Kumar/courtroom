import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CharacterStyles, Speaker } from "@/types/courtroom";

// Placeholders for visual reference, will be mapped in CharacterSprite component
const avatarOptions: Record<
  string,
  { id: string; name: string; emoji: string; bgClass: string }
> = {
  judge1: {
    id: "judge-1",
    name: "Justice Sharma",
    emoji: "🧑‍⚖️",
    bgClass: "from-[#D4AF37]/20",
  },
  judge2: {
    id: "judge-2",
    name: "Justice Iyer",
    emoji: "👨🏾‍⚖️",
    bgClass: "from-[#D4AF37]/20",
  },
  defender1: {
    id: "defender-1",
    name: "Advocate Verma",
    emoji: "🧑🏾‍💼",
    bgClass: "from-[#D4AF37]/20",
  },
  defender2: {
    id: "defender-2",
    name: "Advocate Singh",
    emoji: "👩🏽‍💼",
    bgClass: "from-[#D4AF37]/20",
  },
  prosecutor1: {
    id: "prosecutor-1",
    name: "Prosecutor Khan",
    emoji: "🦹🏽‍♂️",
    bgClass: "from-[#ff4444]/20",
  },
  prosecutor2: {
    id: "prosecutor-2",
    name: "Prosecutor Reddy",
    emoji: "🦹🏾‍♀️",
    bgClass: "from-[#ff4444]/20",
  },
};

interface CharacterSelectionProps {
  onComplete: (styles: CharacterStyles) => void;
}

const steps: Speaker[] = ["judge", "defender", "prosecutor"];

const CharacterSelection = ({ onComplete }: CharacterSelectionProps) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selections, setSelections] = useState<CharacterStyles>({
    judge: "judge-1",
    defender: "defender-1",
    prosecutor: "prosecutor-1",
  });

  const currentRole = steps[currentStepIndex];

  const handleSelect = (id: string) => {
    setSelections({ ...selections, [currentRole]: id });
  };

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onComplete(selections);
    }
  };

  const renderOptions = () => {
    const roles: Record<Speaker, typeof avatarOptions> = {
      judge: { opt1: avatarOptions.judge1, opt2: avatarOptions.judge2 },
      defender: {
        opt1: avatarOptions.defender1,
        opt2: avatarOptions.defender2,
      },
      prosecutor: {
        opt1: avatarOptions.prosecutor1,
        opt2: avatarOptions.prosecutor2,
      },
      system: {}, // unused
    };

    const options = roles[currentRole];
    const isSelected = (id: string) => selections[currentRole] === id;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-12 max-w-4xl mx-auto px-4">
        {[options.opt1, options.opt2].map((opt) => (
          <motion.div
            key={opt.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect(opt.id)}
            className={`cursor-pointer rounded-2xl overflow-hidden relative border-2 flex flex-col items-center p-10 backdrop-blur-xl transition-all duration-500 ${
              isSelected(opt.id)
                ? "border-[#D4AF37] bg-black/60 shadow-[0_0_40px_rgba(212,175,55,0.4)] scale-[1.02]"
                : "border-[#D4AF37]/20 bg-black/40 hover:border-[#D4AF37]/50 hover:bg-black/50"
            }`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-t ${opt.bgClass} to-transparent -z-10`}
            />
            {/* Elegant Portrait Frame */}
            <div className={`p-4 rounded-full border-4 ${isSelected(opt.id) ? 'border-[#D4AF37]' : 'border-[#D4AF37]/30'} bg-black/80 shadow-2xl mb-6 transition-all duration-300`}>
              <div
                className={`text-8xl drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] ${isSelected(opt.id) ? "scale-110" : ""} transition-transform duration-500`}
              >
                {opt.emoji}
              </div>
            </div>
            <h3 className="text-3xl font-serif font-bold text-[#D4AF37] tracking-wide mt-4 drop-shadow-md">
              {opt.name}
            </h3>
            {isSelected(opt.id) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 text-[#D4AF37] uppercase tracking-[0.3em] text-sm font-bold bg-[#D4AF37]/10 px-4 py-2 rounded-full border border-[#D4AF37]/30"
              >
                Selected
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center pt-24 pb-12 px-6 overflow-hidden relative font-sans">
      {/* Background styling matching landing page */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 scale-105"
        style={{ backgroundImage: 'url(/landing_bg.png)', filter: 'blur(4px)' }} 
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/95 via-black/60 to-black/95" />

      {/* Official Golden Timeline */}
      <div className="absolute top-0 w-full h-1 bg-[#D4AF37]/20 z-20">
        <motion.div
          className="h-full bg-gradient-to-r from-[#D4AF37]/50 to-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.8)]"
          initial={{ width: 0 }}
          animate={{
            width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentRole}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4 }}
          className="text-center w-full max-w-5xl z-10"
        >
          <div className="mb-6 text-[#D4AF37] uppercase tracking-[0.4em] text-sm font-bold opacity-80">
            Step {currentStepIndex + 1} of {steps.length}
          </div>
          <h1
            className="text-5xl md:text-7xl font-serif font-bold text-[#D4AF37] mb-4 capitalize drop-shadow-2xl"
            style={{ textShadow: "0 4px 30px rgba(212,175,55,0.3)" }}
          >
            SELECT {currentRole}
          </h1>
          <p className="text-xl text-gray-300 font-serif italic max-w-2xl mx-auto opacity-90 drop-shadow-md">
            Choose the specific persona to represent the {currentRole} on the bench.
          </p>

          {renderOptions()}

          <div className="mt-16">
            <motion.button
              onClick={nextStep}
              whileHover={{ 
                scale: 1.05, 
                boxShadow: '0 0 50px rgba(212,175,55,0.5)',
                borderColor: 'rgba(212,175,55,0.9)',
                backgroundColor: 'rgba(0,0,0,0.8)'
              }}
              whileTap={{ scale: 0.98 }}
              className="px-14 py-5 text-xl font-serif font-bold uppercase tracking-[0.2em] bg-black/60 border border-[#D4AF37]/50 text-[#D4AF37] hover:text-[#fff] backdrop-blur-md rounded-xl transition-all shadow-[0_4px_30px_rgba(0,0,0,0.5)] cursor-pointer"
            >
              {currentStepIndex === steps.length - 1
                ? "PROCEED TO CASE"
                : "CONTINUE"}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CharacterSelection;
