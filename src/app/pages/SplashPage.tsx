import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

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
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
                <span className="text-4xl">🛍️</span>
              </div>
            </motion.div>

            <motion.h1
              className="text-5xl md:text-6xl font-bold text-white tracking-tight"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              Jack of all Trades
            </motion.h1>

            <motion.p
              className="text-lg text-gray-400 max-w-md mx-auto"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              Your one-stop marketplace for phones, laptops & accessories
            </motion.p>

            <motion.div
              className="flex items-center justify-center gap-2 pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
