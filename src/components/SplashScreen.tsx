import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function SplashScreen() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    if (hasSeenSplash) {
      setShow(false);
      return;
    }

    const timer = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem('hasSeenSplash', 'true');
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
          className="fixed inset-0 z-[99999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Animated Background Gradients overlay */}
          <div className="absolute inset-0 z-0">
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
                opacity: [0.3, 0.5, 0.3]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] mix-blend-screen" 
            />
          </div>

          {/* Flash Effect */}
          <motion.div
             initial={{ opacity: 1 }}
             animate={{ opacity: 0 }}
             transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
             className="absolute inset-0 z-50 bg-white pointer-events-none mix-blend-overlay"
          />

          <div className="relative z-10 flex flex-col items-center justify-center">
            {/* Logo Mark or Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="mb-8"
            >
              <div className="w-24 h-24 bg-primary rounded-3xl rotate-45 flex items-center justify-center shadow-[0_0_40px_rgba(var(--primary-rgb),0.4)]">
                 <div className="-rotate-45 text-white font-black text-4xl font-display">F</div>
              </div>
            </motion.div>

            {/* Text Reveal */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-center space-y-2"
            >
              <h1 className="text-white text-2xl md:text-3xl font-display font-black tracking-tight">FideTV</h1>
              <p className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.3em] font-bold">
                Powered by FideTvMedia Studio
              </p>
            </motion.div>
            
            {/* Loading Bar */}
            <motion.div 
               initial={{ width: 0, opacity: 0 }}
               animate={{ width: 200, opacity: 1 }}
               transition={{ delay: 0.8, duration: 1.5, ease: "easeInOut" }}
               className="h-1 bg-primary mt-12 rounded-full overflow-hidden relative"
            >
               <motion.div 
                 initial={{ x: "-100%" }}
                 animate={{ x: "100%" }}
                 transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                 className="absolute top-0 bottom-0 left-0 w-1/2 bg-white/50"
               />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
