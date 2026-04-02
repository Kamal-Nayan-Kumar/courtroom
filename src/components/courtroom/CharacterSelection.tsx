import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
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
    bgClass: "from-blue-900/40",
  },
  judge2: {
    id: "judge-2",
    name: "Justice Iyer",
    emoji: "👨🏾‍⚖️",
    bgClass: "from-indigo-900/40",
  },
  defender1: {
    id: "defender-1",
    name: "Advocate Verma",
    emoji: "🧑🏾‍💼",
    bgClass: "from-emerald-900/40",
  },
  defender2: {
    id: "defender-2",
    name: "Advocate Singh",
    emoji: "👩🏽‍💼",
    bgClass: "from-amber-900/40",
  },
  prosecutor1: {
    id: "prosecutor-1",
    name: "Prosecutor Khan",
    emoji: "🦹🏽‍♂️",
    bgClass: "from-red-900/40",
  },
  prosecutor2: {
    id: "prosecutor-2",
    name: "Prosecutor Reddy",
    emoji: "🦹🏾‍♀️",
    bgClass: "from-rose-900/40",
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-10 max-w-4xl mx-auto">
        {[options.opt1, options.opt2].map((opt) => (
          <motion.div
            key={opt.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSelect(opt.id)}
            className={`cursor-pointer rounded-2xl overflow-hidden relative border-4 flex flex-col items-center p-8 transition-all ${
              isSelected(opt.id)
                ? "border-gold shadow-[0_0_30px_rgba(212,175,55,0.6)] scale-105"
                : "border-border/50 hover:border-gold/50"
            }`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-t ${opt.bgClass} to-background/5 -z-10`}
            />
            <div
              className={`text-8xl mb-6 drop-shadow-2xl ${isSelected(opt.id) ? "scale-110" : ""} transition-transform`}
            >
              {opt.emoji}
            </div>
            <h3 className="text-2xl font-display font-medium text-foreground tracking-wide mt-4">
              {opt.name}
            </h3>
            {isSelected(opt.id) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 text-gold-light uppercase tracking-widest text-sm font-bold"
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
    <div className="min-h-screen bg-background flex flex-col items-center pt-24 pb-12 px-6 overflow-hidden relative font-sans">
      <div className="absolute top-0 w-full h-1 bg-border">
        <motion.div
          className="h-full bg-gold"
          initial={{ width: 0 }}
          animate={{
            width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
          }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentRole}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
          className="text-center w-full max-w-5xl"
        >
          <div className="mb-4 text-muted-foreground uppercase tracking-widest text-sm font-bold">
            Step {currentStepIndex + 1} of {steps.length}
          </div>
          <h1
            className="text-4xl md:text-6xl font-display font-bold text-primary mb-2 capitalize"
            style={{ textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
          >
            SELECT {currentRole}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the avatar persona that will represent the {currentRole} in
            court.
          </p>

          {renderOptions()}

          <div className="mt-12">
            <Button
              onClick={nextStep}
              size="lg"
              className="px-16 py-6 text-lg font-bold uppercase tracking-widest bg-gold hover:bg-gold-light text-black transition-all shadow-xl shadow-gold/20"
            >
              {currentStepIndex === steps.length - 1
                ? "PROCEED TO CASE"
                : "CONTINUE"}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default CharacterSelection;
