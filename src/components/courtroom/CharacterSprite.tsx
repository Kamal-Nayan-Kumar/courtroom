import { motion } from "framer-motion";
import { Speaker } from "@/types/courtroom";
import judgeImg from "@/assets/judge.png";
import prosecutorImg from "@/assets/prosecutor.png";
import defenderImg from "@/assets/defender.png";

interface CharacterSpriteProps {
  speaker: Speaker;
  isActive: boolean;
  className?: string;
  characterId?: string;
}

// Temporary mapping until real individual character sprites are added.
// It maps the chosen character ID to either their specific sprite or the fallback.
const getCharacterImage = (speaker: Speaker, characterId?: string) => {
  // If specific images existed, we would do:
  // if (characterId === 'judge-1') return judge1Img;
  // For now, we fall back to the generic sprites, but we could add tinting or just leave as is.
  const fallbackSprites: Record<string, string> = {
    judge: judgeImg,
    prosecutor: prosecutorImg,
    defender: defenderImg,
  };
  return fallbackSprites[speaker];
};

const getCharacterHueRotate = (characterId?: string) => {
  switch (characterId) {
    case "judge-1":
      return "hue-rotate(15deg)";
    case "judge-2":
      return "hue-rotate(90deg)";
    case "defender-1":
      return "hue-rotate(60deg)";
    case "defender-2":
      return "hue-rotate(180deg)";
    case "prosecutor-1":
      return "hue-rotate(0deg)";
    case "prosecutor-2":
      return "hue-rotate(-30deg)";
    default:
      return "none";
  }
};

const CharacterSprite = ({
  speaker,
  isActive,
  className = "",
  characterId,
}: CharacterSpriteProps) => {
  if (speaker === "system") return null;

  const imgSrc = getCharacterImage(speaker, characterId);
  const hueStyle = getCharacterHueRotate(characterId);

  return (
    <motion.div
      animate={{
        scale: isActive ? 1.05 : 1,
        filter: isActive
          ? "brightness(1.2) drop-shadow(0 0 20px hsl(43 74% 49% / 0.5))"
          : "brightness(0.8)",
      }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className={`relative ${className}`}
    >
      <motion.img
        src={imgSrc}
        alt={speaker}
        className="h-full w-auto object-contain drop-shadow-2xl transition-all duration-300"
        style={{ filter: hueStyle }}
        animate={isActive ? { y: [0, -4, 0] } : {}}
        transition={
          isActive ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}
        }
      />
    </motion.div>
  );
};

export default CharacterSprite;
