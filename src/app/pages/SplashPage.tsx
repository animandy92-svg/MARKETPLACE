import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import logoWhiteSvg from '../../assets/logo-white.svg';

interface SplashPageProps {
  onComplete: () => void;
}

export function SplashPage({ onComplete }: SplashPageProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const handleAnimationComplete = () => {
    if (!isVisible) {
      onComplete();
    }
  };

  return (
    <AnimatePresence onExitComplete={handleAnimationComplete}>
      {isVisible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950"
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            className="text-center space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <div className="w-64 mx-auto mb-4 flex items-center justify-center">
                <img src={logoWhiteSvg} alt="Jack of all Trades" className="w-full h-auto" />
              </div>
            </motion.div>

            <motion.div
              className="flex items-center justify-center gap-2 pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <div className="w-2 h-2 rounded-full bg-pink-400 animate-bounce [animation-delay:0ms]" />
              <div className="w-2 h-2 rounded-full bg-pink-400 animate-bounce [animation-delay:150ms]" />
              <div className="w-2 h-2 rounded-full bg-pink-400 animate-bounce [animation-delay:300ms]" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
