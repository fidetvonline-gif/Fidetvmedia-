import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { safeLocalStorage } from '@/lib/storage';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isTutorialOpen && videoRef.current) {
      videoRef.current.play().catch(err => {
        console.warn("Modal video autoplay failed:", err);
      });
    }
  }, [isTutorialOpen]);

  useEffect(() => {
    // Detect Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isSafariBrowser = /safari/.test(userAgent) && !/chrome|crios|crmo|edge|opr|opios|fb_iab|instagram/.test(userAgent);
    setIsSafari(isSafariBrowser);
    
    // Detect iOS
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);
    
    // Detect Desktop
    const isDesktopDevice = !/android|iphone|ipad|ipod/.test(userAgent);
    setIsDesktop(isDesktopDevice);

    // Check if already installed or in standalone mode
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    if (isStandaloneMode) return;

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
      setIsTutorialOpen(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    safeLocalStorage.setItem('installPromptDismissed', 'true');
  };

  return (
    <>
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
      
      {/* Guided Tutorial Modal */}
      <AnimatePresence>
        {isTutorialOpen && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTutorialOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl" 
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative w-full max-w-xl bg-surface border border-white/10 rounded-[3rem] p-10 shadow-3xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
              
              <div className="flex justify-between items-start mb-10">
                 <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">
                       Guided Setup
                    </div>
                    <h3 className="text-3xl font-display font-bold text-white tracking-tight">How to Install FideTV</h3>
                    <p className="text-gray-500 text-sm">Follow these simple steps to add FideTV to your home screen.</p>
                 </div>
                 <button 
                   onClick={() => setIsTutorialOpen(false)}
                   className="p-3 hover:bg-white/5 rounded-full transition-colors"
                 >
                    <X className="w-8 h-8 text-gray-400" />
                 </button>
              </div>

              <div className="grid gap-8">
                 {/* Video Tutorial Area */}
                  <div className="rounded-[2rem] overflow-hidden border border-white/10 bg-black/40 aspect-video relative group shadow-2xl">
                     <video 
                       ref={videoRef}
                       src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                       autoPlay
                       loop
                       muted
                       playsInline
                       preload="auto"
                       crossOrigin="anonymous"
                       className="w-full h-full object-cover opacity-100 group-hover:scale-105 transition-transform duration-700"
                     >
                       Your browser does not support the video tag.
                     </video>
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                     <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
                        <div className="space-y-1">
                           <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-widest">
                              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                              Auto-playing Tutorial
                           </div>
                           <h4 className="text-white font-bold text-lg">PWA Installation Demo</h4>
                        </div>
                        <Play className="w-10 h-10 text-white/20 group-hover:text-primary transition-colors duration-300" />
                     </div>
                  </div>

                 {isSafari || isIOS ? (
                   // Safari/iOS Instructions
                   <div className="space-y-8">
                      <div className="flex items-start gap-6 group">
                         <div className="w-14 h-14 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-2xl font-black text-primary border border-white/10 group-hover:bg-primary/20 transition-colors">1</div>
                         <div className="space-y-2">
                            <p className="text-white font-bold text-lg">Tap the Share Button</p>
                            <p className="text-gray-500 text-sm leading-relaxed">Look for the icon at the bottom of your Safari browser.</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-6 group">
                         <div className="w-14 h-14 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-2xl font-black text-primary border border-white/10 group-hover:bg-primary/20 transition-colors">2</div>
                         <div className="space-y-2">
                            <p className="text-white font-bold text-lg">Select "Add to Home Screen"</p>
                            <p className="text-gray-500 text-sm leading-relaxed">Scroll down in the options and tap the plus icon labeled "Add to Home Screen".</p>
                         </div>
                      </div>
                   </div>
                 ) : isDesktop ? (
                   // Desktop Chrome/Edge Instructions
                   <div className="space-y-8">
                      <div className="flex items-start gap-6 group">
                         <div className="w-14 h-14 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-2xl font-black text-primary border border-white/10 group-hover:bg-primary/20 transition-colors">1</div>
                         <div className="space-y-2">
                            <p className="text-white font-bold text-lg">Locate the Install Icon</p>
                            <p className="text-gray-500 text-sm leading-relaxed">Look for the install icon <Download className="inline w-4 h-4 mb-1" /> in the right side of your address bar.</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-6 group">
                         <div className="w-14 h-14 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-2xl font-black text-primary border border-white/10 group-hover:bg-primary/20 transition-colors">2</div>
                         <div className="space-y-2">
                            <p className="text-white font-bold text-lg">Click "Install"</p>
                            <p className="text-gray-500 text-sm leading-relaxed">Click the icon and select "Install" from the popup to add FideTV to your computer.</p>
                         </div>
                      </div>
                   </div>
                 ) : (
                   // Chrome/Android Instructions
                   <div className="space-y-8">
                      <div className="flex items-start gap-6 group">
                         <div className="w-14 h-14 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-2xl font-black text-primary border border-white/10 group-hover:bg-primary/20 transition-colors">1</div>
                         <div className="space-y-2">
                            <p className="text-white font-bold text-lg">Open Browser Menu</p>
                            <p className="text-gray-500 text-sm leading-relaxed">Tap the three dots in the top right corner of your Chrome browser.</p>
                         </div>
                      </div>
                      <div className="flex items-start gap-6 group">
                         <div className="w-14 h-14 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-2xl font-black text-primary border border-white/10 group-hover:bg-primary/20 transition-colors">2</div>
                         <div className="space-y-2">
                            <p className="text-white font-bold text-lg">Tap "Install App"</p>
                            <p className="text-gray-500 text-sm leading-relaxed">Select "Install App" or "Add to Home Screen" from the menu list.</p>
                         </div>
                      </div>
                   </div>
                 )}
              </div>

              <button
                onClick={() => setIsTutorialOpen(false)}
                className="w-full mt-12 py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all shadow-xl"
              >
                 Got it, Let's go!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
