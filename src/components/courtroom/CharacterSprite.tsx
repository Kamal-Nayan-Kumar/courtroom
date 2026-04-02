import { motion } from 'framer-motion';
import { Speaker } from '@/types/courtroom';
import judgeImg from '@/assets/judge.png';
import prosecutorImg from '@/assets/prosecutor.png';
import defenderImg from '@/assets/defender.png';

interface CharacterSpriteProps {
  speaker: Speaker;
  isActive: boolean;
  className?: string;
}

const sprites: Record<string, string> = {
  judge: judgeImg,
  prosecutor: prosecutorImg,
  defender: defenderImg,
};

const CharacterSprite = ({ speaker, isActive, className = '' }: CharacterSpriteProps) => {
  if (speaker === 'system') return null;

  return (
    <motion.div
      animate={{
        scale: isActive ? 1.05 : 1,
        filter: isActive ? 'brightness(1.2) drop-shadow(0 0 20px hsl(43 74% 49% / 0.5))' : 'brightness(0.8)',
      }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className={`relative ${className}`}
    >
      <motion.img
        src={sprites[speaker]}
        alt={speaker}
        className="h-full w-auto object-contain drop-shadow-2xl"
        animate={isActive ? { y: [0, -4, 0] } : {}}
        transition={isActive ? { repeat: Infinity, duration: 2, ease: 'easeInOut' } : {}}
      />
    </motion.div>
  );
};

export default CharacterSprite;
