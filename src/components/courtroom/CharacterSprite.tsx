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

const getCharacterImage = (speaker: Speaker, characterId?: string) => {
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
      return "hue-rotate(0deg) saturate(1)";
    case "judge-2":
      return "hue-rotate(180deg) saturate(1.5) brightness(0.9)";
    case "defender-1":
      return "hue-rotate(0deg) saturate(1)";
    case "defender-2":
      return "hue-rotate(60deg) saturate(1.8) contrast(1.1)";
    case "prosecutor-1":
      return "hue-rotate(0deg) saturate(1)";
    case "prosecutor-2":
      return "hue-rotate(220deg) brightness(1.2) saturate(0.8)";
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

  // Cinematic sizing: The characters are designed to be much larger on-screen
  // We'll give standard animated bounding boxes here, and handle massive scale in CourtroomMain's camera.

  return (
    <motion.div
      animate={{
        filter: isActive
          ? "brightness(1.15) drop-shadow(0 0 30px hsl(43 74% 49% / 0.4))"
          : "brightness(0.6) blur(1px)",
      }}
      transition={{ duration: 0.8 }}
      className={`relative flex items-end justify-center ${className}`}
    >
      <motion.img
        src={imgSrc}
        alt={speaker}
        className="h-[120%] w-auto object-contain drop-shadow-2xl origin-bottom"
        style={{ filter: hueStyle, transformOrigin: "bottom center" }}
        animate={
          isActive
            ? {
                scaleY: [1, 1.02, 1],
                rotate: [0, 0.5, 0, -0.5, 0],
                y: [0, -3, 0],
              }
            : {
                scaleY: [1, 1.01, 1], // VERY subtle breathing
              }
        }
        transition={
          isActive
            ? { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
            : { repeat: Infinity, duration: 4, ease: "easeInOut" }
        }
      />
    </motion.div>
  );
};

export default CharacterSprite;
