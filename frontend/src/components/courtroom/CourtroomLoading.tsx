import { useEffect } from 'react';
import { playGavel } from '@/lib/sounds';
import { motion } from 'framer-motion';

interface CourtroomLoadingProps {
  onComplete: () => void;
}

const CourtroomLoading = ({ onComplete }: CourtroomLoadingProps) => {

  useEffect(() => {
    playGavel();
    const timer = setTimeout(() => {
      onComplete();
    }, 500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div 
      className="min-h-screen bg-court-dark flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-white text-xl animate-pulse font-serif tracking-widest">
        The Court is Assembling...
      </div>
    </motion.div>
  );
};

export default CourtroomLoading;
