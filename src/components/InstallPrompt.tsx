import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed or in standalone mode
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    if (isStandaloneMode) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the prompt if we haven't dismissed it
      if (!localStorage.getItem('installPromptDismissed')) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS, show prompt if not dismissed (iOS doesn't support beforeinstallprompt)
    if (isIOSDevice && !localStorage.getItem('installPromptDismissed')) {
       // Only show after a slight delay to let the app load
       setTimeout(() => {
         setShowPrompt(true);
       }, 2500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setShowPrompt(false);
      } else {
        console.log('User dismissed the install prompt');
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('installPromptDismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-[9999]"
        >
          <div className="bg-black/90 backdrop-blur-xl p-6 rounded-[2rem] border border-primary/30 shadow-2xl shadow-primary/20 flex flex-col gap-4 relative">
            <button 
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                <Download className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 pr-6">
                <h4 className="text-white font-display font-bold text-lg leading-tight mb-1">
                  Install FideTV App
                </h4>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {isIOS 
                    ? 'Tap the share icon below and select "Add to Home Screen" to install our mobile app.' 
                    : 'Install our mobile app for the best experience and quick access to live streams.'}
                </p>
              </div>
            </div>
            
            {!isIOS && (
              <button
                onClick={handleInstall}
                className="w-full bg-white text-black px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl active:scale-95 text-center mt-2 group"
              >
                <span className="group-hover:scale-105 transition-transform inline-block">Install Now</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
