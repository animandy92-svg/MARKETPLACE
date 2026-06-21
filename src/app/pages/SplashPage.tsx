import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import logoWhiteSvg from '../../assets/logo-white.svg';

interface SplashPageProps {
  onComplete: () => void;
}

const floatingDevices = [
  { emoji: '📱', x: '10%', y: '20%', delay: 0, duration: 7 },
  { emoji: '💻', x: '80%', y: '15%', delay: 0.5, duration: 8 },
  { emoji: '📲', x: '25%', y: '70%', delay: 1, duration: 6 },
  { emoji: '⌚', x: '75%', y: '65%', delay: 1.5, duration: 7.5 },
  { emoji: '🎧', x: '50%', y: '80%', delay: 0.3, duration: 9 },
  { emoji: '🖥️', x: '15%', y: '45%', delay: 0.8, duration: 6.5 },
];

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
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
          }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Animated gradient orbs */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute w-96 h-96 rounded-full opacity-20 blur-3xl"
              style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', top: '10%', left: '10%' }}
              animate={{ x: [0, 50, -30, 0], y: [0, -30, 20, 0], scale: [1, 1.2, 0.9, 1] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-80 h-80 rounded-full opacity-20 blur-3xl"
              style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)', bottom: '10%', right: '15%' }}
              animate={{ x: [0, -40, 30, 0], y: [0, 40, -20, 0], scale: [1, 0.8, 1.1, 1] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute w-72 h-72 rounded-full opacity-15 blur-3xl"
              style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              animate={{ scale: [1, 1.3, 0.85, 1], opacity: [0.15, 0.25, 0.1, 0.15] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          {/* Floating device emojis */}
          {floatingDevices.map((device, i) => (
            <motion.div
              key={i}
              className="absolute text-4xl opacity-15 select-none pointer-events-none"
              style={{ left: device.x, top: device.y }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 0.15, 0.15, 0],
                scale: [0.5, 1, 1, 0.5],
                y: [0, -20, -10, 0],
              }}
              transition={{
                delay: device.delay,
                duration: device.duration,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {device.emoji}
            </motion.div>
          ))}

          {/* Main content */}
          <motion.div
            className="text-center space-y-6 relative z-10"
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

            {/* Colorful loading dots */}
            <motion.div
              className="flex items-center justify-center gap-2 pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:0ms]" />
              <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
              <div className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-bounce [animation-delay:300ms]" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-bounce [animation-delay:450ms]" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
