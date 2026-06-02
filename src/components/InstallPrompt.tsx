import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { safeLocalStorage } from '@/lib/storage';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

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
      // Automatically prompt without checking local storage explicitly if we are sure it's valid to prompt
      if (!safeLocalStorage.getItem('installPromptDismissed')) {
        setTimeout(() => setShowPrompt(true), 500);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS, show prompt if not dismissed (iOS doesn't support beforeinstallprompt)
    if (isIOSDevice && !safeLocalStorage.getItem('installPromptDismissed')) {
       // Only show after a slight delay to let the app load
       setTimeout(() => {
         setShowPrompt(true);
       }, 500);
    } else if (!isIOSDevice && !safeLocalStorage.getItem('installPromptDismissed')) {
       // Always prompt if it's android/web but hasn't dismissed yet
       setTimeout(() => {
         if (!isStandaloneMode) {
           setShowPrompt(true);
         }
       }, 1000);
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
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      navigate('/download');
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    safeLocalStorage.setItem('installPromptDismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:w-80 shadow-xl z-[9999]"
        >
          <div className="bg-[#0f0f0f] p-4 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-3 relative cursor-pointer hover:bg-[#151515] transition-colors" onClick={handleInstall}>
            <button 
              onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
              className="absolute -top-2 -right-2 bg-gray-800 text-gray-400 hover:text-white rounded-full p-1.5 transition-colors shadow-lg border border-white/10"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex flex-col items-center justify-center flex-shrink-0 text-primary">
                <Download className="w-5 h-5 mb-0.5" />
                <span className="text-[8px] font-black uppercase tracking-widest leading-none">App</span>
              </div>
              <div className="flex-1 pr-2">
                <h4 className="text-white font-bold text-sm leading-tight mb-0.5">
                  Get the App
                </h4>
                <p className="text-gray-400 text-xs leading-tight line-clamp-2">
                  Fast, secure, & live streaming directly from your home screen.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
