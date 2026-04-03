import { motion, AnimatePresence } from 'framer-motion';

interface SpeechBubbleProps {
  text: string;
  visible: boolean;
  position: 'left' | 'right' | 'top';
  color?: string;
}

const SpeechBubble = ({ text, visible, position, color = 'bg-card' }: SpeechBubbleProps) => {
  const tailClass = position === 'left'
    ? 'after:left-[-8px] after:top-1/2 after:-translate-y-1/2 after:border-r-[10px] after:border-r-[hsl(var(--card))] after:border-t-[8px] after:border-t-transparent after:border-b-[8px] after:border-b-transparent'
    : position === 'right'
    ? 'after:right-[-8px] after:top-1/2 after:-translate-y-1/2 after:border-l-[10px] after:border-l-[hsl(var(--card))] after:border-t-[8px] after:border-t-transparent after:border-b-[8px] after:border-b-transparent'
    : 'after:bottom-[-8px] after:left-1/2 after:-translate-x-1/2 after:border-t-[10px] after:border-t-[hsl(var(--card))] after:border-l-[8px] after:border-l-transparent after:border-r-[8px] after:border-r-transparent';

  return (
    <AnimatePresence>
      {visible && text && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className={`relative ${color} border-2 border-border rounded-xl px-4 py-3 max-w-[260px] shadow-lg after:absolute after:content-[''] ${tailClass}`}
        >
          <p className="text-sm font-body text-foreground leading-snug cursor-blink">{text}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SpeechBubble;
