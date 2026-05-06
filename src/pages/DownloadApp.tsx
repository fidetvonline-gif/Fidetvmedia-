import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Download, Smartphone, Apple, Play, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DownloadApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
       alert('To install on iOS: tap the Share button at the bottom of your screen, then select "Add to Home Screen".');
    } else {
       alert('App might already be installed, or your browser does not support quick install. Check your browser menu for "Install App" or "Add to Home Screen".');
    }
  };

  return (
    <div className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-24 mb-32">
       
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-8">
        <motion.div
           initial={{ scale: 0.8, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           className="w-24 h-24 bg-primary/20 rounded-[2rem] mx-auto flex items-center justify-center border border-primary/50 shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)] mb-8"
        >
           <Download className="w-10 h-10 text-primary" />
        </motion.div>
        
        <h1 className="text-5xl md:text-7xl font-display font-black text-white tracking-tighter">
          Get the <span className="text-primary">FideTV</span> App
        </h1>
        <p className="text-gray-400 text-lg md:text-xl font-light leading-relaxed">
          Experience live events, news, and our community right from your home screen. Fast, secure, and always connected.
        </p>

        {isStandalone ? (
          <div className="inline-flex items-center gap-3 px-6 py-4 bg-green-500/10 text-green-500 rounded-2xl border border-green-500/20 font-bold uppercase tracking-widest text-sm">
             <CheckCircle2 className="w-5 h-5" />
             App is already installed
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8">
            <button 
              onClick={handleInstall}
              className="w-full sm:w-auto flex items-center justify-center gap-4 px-8 py-4 bg-white text-black hover:bg-gray-200 transition-colors rounded-2xl font-bold group"
            >
              <Apple className="w-6 h-6" />
              <div className="text-left leading-none">
                <span className="block text-[10px] uppercase font-black tracking-widest text-gray-500 mb-1">Download for</span>
                <span className="block text-lg">iOS Device</span>
              </div>
            </button>
            
            <button 
              onClick={handleInstall}
              className="w-full sm:w-auto flex items-center justify-center gap-4 px-8 py-4 bg-primary text-white hover:bg-primary-dark transition-colors rounded-2xl font-bold group shadow-xl shadow-primary/20"
            >
              <Play className="w-6 h-6 fill-current" />
              <div className="text-left leading-none">
                <span className="block text-[10px] uppercase font-black tracking-widest text-white/70 mb-1">Download for</span>
                <span className="block text-lg">Android Device</span>
              </div>
            </button>
          </div>
        )}
      </section>

      {/* FAQ & Setup Instructions */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
         <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
              <HelpCircle className="w-4 h-4" />
              Setup Guide
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter">
              How to Install
            </h2>
            <p className="text-gray-400">
              Our app installs instantly right from this website. No App Store or Play Store needed!
            </p>

            <div className="space-y-6">
               <div className="glass p-6 rounded-[2rem] border-white/5 space-y-4">
                  <div className="flex items-center gap-4 text-white font-bold text-lg">
                    <Apple className="w-6 h-6 text-gray-400" />
                     iOS (iPhone/iPad)
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-gray-400 text-sm leading-relaxed ml-2">
                     <li>Open this website in <strong>Safari</strong>.</li>
                     <li>Tap the <strong>Share</strong> button at the bottom of the screen (the square with an arrow pointing up).</li>
                     <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                     <li>Tap <strong>Add</strong> in the top right corner.</li>
                  </ol>
               </div>

               <div className="glass p-6 rounded-[2rem] border-white/5 space-y-4">
                  <div className="flex items-center gap-4 text-white font-bold text-lg">
                    <Smartphone className="w-6 h-6 text-gray-400" />
                     Android
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-gray-400 text-sm leading-relaxed ml-2">
                     <li>Open this website in <strong>Chrome</strong>.</li>
                     <li>Tap the <strong>Download Android</strong> button above, OR</li>
                     <li>Tap the browser menu (three dots) in the top right.</li>
                     <li>Select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.</li>
                     <li>Follow the prompts to install.</li>
                  </ol>
               </div>
            </div>
         </div>

         <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest">
              FAQ
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter">
              Common Questions
            </h2>

            <div className="space-y-4">
               {[
                 {
                   q: 'Is the app free?',
                   a: 'Yes! The FideTV app is completely free to download and use.'
                 },
                 {
                   q: 'Why isn\'t it in the App Store?',
                   a: 'We use Progressive Web App (PWA) technology to deliver instant updates, bypass long store review times, and ensure a seamless experience directly from our servers without consuming massive storage on your device.'
                 },
                 {
                   q: 'Do I need to update it manually?',
                   a: 'No. Whenever we push new features or design updates, your app will automatically update the next time you open it.'
                 },
                 {
                   q: 'I clicked install but nothing happened?',
                   a: 'If you are on iOS, Apple strictly blocks automatic installation prompts. You must follow the manual Safari instructions on the left. If you are on Android, check if the app is already in your app drawer.'
                 }
               ].map((item, idx) => (
                 <div key={idx} className="glass p-6 rounded-2xl border-white/5 space-y-2">
                    <h4 className="text-white font-bold">{item.q}</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">{item.a}</p>
                 </div>
               ))}
            </div>
         </div>
      </section>

    </div>
  );
}
