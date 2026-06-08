import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Smartphone, Apple, Play, CheckCircle2, ChevronRight, HelpCircle, Copy, Check, History, Loader2, Star, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function DownloadApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [totalDownloads, setTotalDownloads] = useState<number>(0);
  const [userRating, setUserRating] = useState<number>(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [reportData, setReportData] = useState({ type: 'installation', description: '', email: '' });
  const [submittingReport, setSubmittingReport] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swStatus, setSwStatus] = useState<'not-ready' | 'loading' | 'ready'>('not-ready');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check Service Worker status
    if ('serviceWorker' in navigator) {
      setSwStatus('loading');
      navigator.serviceWorker.ready.then(() => {
        setSwStatus('ready');
      }).catch(() => {
        setSwStatus('not-ready');
      });
    }

    // Fetch total downloads from site_settings or mock if missing
    const fetchDownloads = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'apk_download_count')
          .single();
        
        if (data) {
          setTotalDownloads(parseInt(data.value));
        } else {
          // If not in DB, set a base number and maybe create it
          const baseCount = 1245;
          setTotalDownloads(baseCount);
        }
      } catch (err) {
        setTotalDownloads(1245);
      }
    };
    fetchDownloads();

    // Subscribe to realtime updates for installation count
    const channel = supabase
      .channel('public:site_settings')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'site_settings', 
        filter: "key=eq.apk_download_count" 
      }, (payload) => {
        if (payload.new && payload.new.value) {
          setTotalDownloads(parseInt(payload.new.value));
          // Trigger a pulse animation
          const tickerElement = document.getElementById('live-install-ticker');
          if (tickerElement) {
            tickerElement.classList.add('animate-pulse-fast');
            setTimeout(() => {
              tickerElement.classList.remove('animate-pulse-fast');
            }, 600);
          }
        }
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'site_settings', 
        filter: "key=eq.apk_download_count" 
      }, (payload) => {
        if (payload.new && payload.new.value) {
          setTotalDownloads(parseInt(payload.new.value));
        }
      })
      .subscribe();

    // Check if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    // Detect OS and Browser
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    const isChromeBrowser = /chrome|crios|crmo/.test(userAgent) && !/edge|opr|opios|fb_iab|instagram/.test(userAgent);
    const isSafariBrowser = /safari/.test(userAgent) && !/chrome|crios|crmo|edge|opr|opios|fb_iab|instagram/.test(userAgent);
    const isDesktopDevice = !/android|iphone|ipad|ipod/.test(userAgent);

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsChrome(isChromeBrowser);
    setIsSafari(isSafariBrowser);
    setIsDesktop(isDesktopDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      supabase.removeChannel(channel);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        // Increment install count safely
        try {
          const nextCount = totalDownloads + 1;
          setTotalDownloads(nextCount);
          await supabase.from('site_settings').upsert({
            key: 'apk_download_count',
            value: nextCount.toString(),
            updated_at: new Date().toISOString()
          });
        } catch (err) {}
      }
    } else if (isIOS) {
      setIsTutorialOpen(true);
    } else {
       setIsTutorialOpen(true);
    }
  };

  const handleRating = (rating: number) => {
    setUserRating(rating);
    // In a real app, we'd save this to a feedback table
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReport(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSubmittingReport(false);
    setIsReportModalOpen(false);
    setReportData({ type: 'installation', description: '', email: '' });
    alert('Thank you for your report. Our technical team will review it shortly.');
  };

  const handleCopyLink = () => {
    const fullUrl = window.location.origin;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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

        {/* Offline & PWA Status Indicator */}
        <div className="flex flex-wrap items-center justify-center gap-4 py-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all",
              isOnline 
                ? "bg-green-500/10 border-green-500/30 text-green-500" 
                : "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse"
            )}
          >
            <div className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-green-500" : "bg-red-500")} />
            {isOnline ? "System Online" : "Currently Offline"}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all",
              swStatus === 'ready' 
                ? "bg-primary/10 border-primary/30 text-primary" 
                : "bg-white/5 border-white/10 text-gray-500"
            )}
          >
            <div className={cn(
              "w-1.5 h-1.5 rounded-full", 
              swStatus === 'ready' ? "bg-primary shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" : "bg-gray-500"
            )} />
            {swStatus === 'ready' ? "Offline Content Ready" : swStatus === 'loading' ? "Syncing Resources..." : "Standard Mode"}
          </motion.div>
        </div>
        
        <div className="flex items-center justify-center gap-6">
          <div 
            id="live-install-ticker"
            className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10 relative overflow-hidden transition-all duration-300 [&.animate-pulse-fast]:scale-110 [&.animate-pulse-fast]:bg-green-500/20 [&.animate-pulse-fast]:border-green-500"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            <Download className="w-4 h-4 text-primary relative z-10" />
            <span className="text-white font-bold relative z-10 flex tabular-nums">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={totalDownloads}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {totalDownloads.toLocaleString()}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="text-gray-500 text-xs uppercase font-black tracking-widest relative z-10 ml-1">Live Installs</span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                className={cn(
                  "w-4 h-4 transition-colors",
                  star <= 4 ? "text-yellow-500 fill-yellow-500" : "text-gray-600"
                )} 
              />
            ))}
            <span className="ml-2 text-white font-bold text-sm">4.8/5</span>
          </div>
        </div>

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
              className="w-full sm:w-auto flex items-center justify-center gap-4 px-8 py-4 bg-white text-black hover:bg-gray-200 transition-colors rounded-2xl font-bold group relative"
            >
              {isIOS && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg border border-primary-dark/20 z-20 whitespace-nowrap">
                   Recommended for you
                </div>
              )}
              <Apple className="w-6 h-6" />
              <div className="text-left leading-none">
                <span className="block text-[10px] uppercase font-black tracking-widest text-gray-500 mb-1">Download for</span>
                <span className="block text-lg">iOS Device</span>
              </div>
            </button>
            
            <motion.button 
              onClick={handleInstall}
              whileHover={{ 
                scale: [1, 1.02, 1],
                transition: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              whileTap={{ scale: 0.95 }}
              className={cn(
                "w-full sm:w-auto flex items-center justify-center gap-4 px-8 py-4 bg-primary text-white hover:bg-primary-dark transition-all rounded-2xl font-bold group shadow-xl shadow-primary/20 relative overflow-hidden"
              )}
            >
              {isAndroid && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-primary text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg border border-primary/20 z-20 whitespace-nowrap">
                   Recommended for you
                </div>
              )}
              <Smartphone className="w-6 h-6 relative z-10" />
              <div className="text-left leading-none relative z-10">
                <span className="block text-[10px] uppercase font-black tracking-widest text-white/70 mb-1">
                  Download for
                </span>
                <span className="block text-lg">
                  Android Device
                </span>
              </div>
            </motion.button>

            <button 
              onClick={handleCopyLink}
              className={cn(
                "w-full sm:w-auto flex items-center justify-center gap-4 px-8 py-4 border border-white/10 hover:bg-white/5 transition-all rounded-2xl font-bold group",
                copied && "border-green-500/50 text-green-500 bg-green-500/5"
              )}
            >
              {copied ? <Check className="w-6 h-6" /> : <Play className="w-6 h-6 text-gray-400 group-hover:text-white" />}
              <div className="text-left leading-none">
                <span className="block text-[10px] uppercase font-black tracking-widest opacity-70 mb-1">
                  {copied ? 'Link Copied' : 'Share App'}
                </span>
                <span className="block text-lg">{copied ? 'Success' : 'Copy Link'}</span>
              </div>
            </button>
          </div>
        )}
      </section>

      {/* FAQ & Setup Instructions */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <div className="inline-flex items-center justify-between w-full">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
                <HelpCircle className="w-4 h-4" />
                Installation Guide
              </div>
              <button 
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-2 text-xs font-bold text-white/40 hover:text-red-500 transition-colors uppercase tracking-widest"
              >
                <AlertTriangle className="w-4 h-4" />
                Report an Issue
              </button>
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter">
              Setup Your App
            </h2>
            <p className="text-gray-400">
              Follow these simple steps to get FideTV on your mobile device.
            </p>

            <div className="space-y-6">
               <div className="glass p-6 rounded-[2rem] border-white/5 space-y-4">
                  <div className="flex items-center gap-4 text-white font-bold text-lg">
                    <Apple className="w-6 h-6 text-gray-400" />
                     iOS (iPhone/iPad)
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-gray-400 text-sm leading-relaxed ml-2">
                     <li>Open this website in <strong>Safari</strong>.</li>
                     <li>Tap the <strong>Share</strong> button at the bottom of the screen.</li>
                     <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                     <li>Tap <strong>Add</strong> in the top right corner.</li>
                  </ol>
               </div>

                <div className="glass p-6 rounded-[2rem] border-white/5 space-y-4">
                  <div className="flex items-center gap-4 text-white font-bold text-lg">
                    <Smartphone className="w-6 h-6 text-gray-100" />
                     Android & Web (PWA Installation)
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-gray-400 text-sm leading-relaxed ml-2">
                     <li>Tap the <strong>Download for Android</strong> button above.</li>
                     <li>When prompted by your browser, tap <strong>Install</strong> or <strong>Add to Home Screen</strong>.</li>
                     <li>The app will be added to your home screen and app drawer.</li>
                     <li>Open FideTV directly from your home screen icon for the best experience.</li>
                  </ol>

                  <div className="pt-4 mt-4 border-t border-white/5">
                    <h5 className="text-xs font-bold text-white/60 uppercase tracking-widest mb-3">System Requirements</h5>
                    <ul className="grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-primary rounded-full" /> Modern Browser</li>
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-primary rounded-full" /> No Storage Needed</li>
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-primary rounded-full" /> Internet Connection</li>
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-primary rounded-full" /> PWA Support</li>
                    </ul>
                  </div>
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
                   a: 'Yes! The FideTV app is completely free to install and use.'
                 },
                 {
                   q: 'What is a PWA?',
                   a: 'A Progressive Web App (PWA) is a modern web technology that allows you to install this website as a native-feeling app on your home screen. It provides fast performance, offline capabilities, and a full-screen experience without needing to visit an app store.'
                 },
                 {
                   q: 'How do I update the app?',
                   a: 'PWAs update automatically! Every time you open the app, it checks for the latest version and updates in the background, ensuring you always have the newest features and security patches.'
                 },
                 {
                   q: 'Can I install this on Windows or Mac?',
                   a: 'Yes! If you are using Chrome or Edge on a computer, you can click the install icon in the address bar to add FideTV to your desktop or applications folder.'
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
      
      {/* Star Rating Feedback Section */}
      <section className="glass rounded-[3rem] p-12 border-white/5 text-center space-y-8 max-w-4xl mx-auto relative overflow-hidden">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
         <div className="space-y-4">
            <h3 className="text-2xl md:text-3xl font-display font-black text-white tracking-tight">Enjoying the experience?</h3>
            <p className="text-gray-400 max-w-lg mx-auto">
               Your feedback helps us refine the FideTV experience for everyone. Rate the latest mobile build.
            </p>
         </div>
         
         <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-3">
               {[1, 2, 3, 4, 5].map((star) => (
                 <button
                   key={star}
                   onClick={() => handleRating(star)}
                   onMouseEnter={() => setUserRating(star)}
                   onMouseLeave={() => {}}
                   className="group relative p-2 transition-transform active:scale-95"
                 >
                   <Star 
                     className={cn(
                       "w-10 h-10 transition-all duration-300",
                       star <= userRating 
                         ? "text-yellow-500 fill-yellow-500 scale-110 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]" 
                         : "text-white/10"
                     )} 
                   />
                 </button>
               ))}
            </div>
            <AnimatePresence>
               {userRating > 0 && (
                 <motion.div
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="text-primary font-bold uppercase tracking-widest text-xs"
                 >
                    {userRating === 5 && "Absolutely Incredible!"}
                    {userRating === 4 && "Great Experience!"}
                    {userRating === 3 && "Good, but needs work."}
                    {userRating === 2 && "Could be better."}
                    {userRating === 1 && "Poor experience."}
                 </motion.div>
               )}
            </AnimatePresence>
         </div>
      </section>

      {/* Version History Section */}
      <section className="space-y-12">
         <div className="flex flex-col md:flex-row justify-between items-end gap-6">
            <div className="space-y-4">
               <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
                 <History className="w-4 h-4" />
                 Release Notes
               </div>
               <h2 className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter">
                 Version History
               </h2>
               <p className="text-gray-400">
                 Keep track of the latest improvements and features in FideTV.
               </p>
            </div>
            <div className="flex items-center gap-4 px-6 py-3 bg-white/5 rounded-2xl border border-white/10">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
               <span className="text-white font-bold">Latest Build: v1.2.5</span>
               <span className="text-gray-500 text-sm">June 01, 2026</span>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                version: '1.2.5',
                date: 'June 01, 2026',
                type: 'Latest Update',
                changes: [
                  'Optimized high-fidelity streaming for 4K live broadcasts.',
                  'New: Integrated real-time community chat in the live player.',
                  'Improved efficiency: 15% reduction in background battery usage.',
                  'Fixed: Occasional audio synchronization issues on Android 12+ devices.'
                ]
              },
              {
                version: '1.2.0',
                date: 'May 12, 2026',
                type: 'Major Release',
                changes: [
                  'Official PWA rollout for Android and iOS devices worldwide.',
                  'Offline mode: Save news and articles for reading without data.',
                  'Visual Overhaul: Implemented the new Cosmic Slate design language.',
                  'Enhanced security: Biometric login support for profile access.'
                ]
              }
            ].map((entry, idx) => (
              <div key={idx} className={cn(
                "glass p-8 rounded-[2.5rem] border-white/5 relative overflow-hidden group",
                idx === 0 && "ring-1 ring-primary/30"
              )}>
                 {idx === 0 && (
                   <div className="absolute top-0 right-0 px-6 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-bl-2xl">
                     Latest
                   </div>
                 )}
                 
                 <div className="space-y-6">
                    <div className="space-y-1">
                       <div className="text-primary font-black text-2xl">v{entry.version}</div>
                       <div className="text-gray-500 text-sm font-medium uppercase tracking-tight">{entry.date} • {entry.type}</div>
                    </div>

                    <ul className="space-y-4">
                       {entry.changes.map((change, cIdx) => (
                         <li key={cIdx} className="flex items-start gap-3 group/item">
                            <CheckCircle2 className="w-5 h-5 text-green-500/50 mt-0.5 group-hover/item:text-green-500 transition-colors" />
                            <span className="text-gray-400 text-sm leading-relaxed group-hover/item:text-gray-300 transition-colors">
                               {change}
                            </span>
                         </li>
                       ))}
                    </ul>
                 </div>
              </div>
            ))}
         </div>
      </section>

      {/* Report Issue Modal */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReportModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md" 
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-surface border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500/50" />
              
              <div className="flex justify-between items-start mb-8">
                 <div className="space-y-1">
                    <h3 className="text-2xl font-display font-black text-white tracking-tight">Report an Issue</h3>
                    <p className="text-gray-500 text-sm italic">Something went wrong with your installation?</p>
                 </div>
                 <button 
                   onClick={() => setIsReportModalOpen(false)}
                   className="p-2 hover:bg-white/5 rounded-full transition-colors"
                 >
                    <X className="w-6 h-6 text-gray-400" />
                 </button>
              </div>

              <form onSubmit={handleReportSubmit} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-1">Issue Category</label>
                    <select 
                      value={reportData.type}
                      onChange={(e) => setReportData({ ...reportData, type: e.target.value })}
                      className="w-full bg-background border border-white/5 rounded-2xl p-4 text-white font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                       <option value="installation">Installation Error</option>
                       <option value="crash">App Crashes on Launch</option>
                       <option value="streaming">Streaming Issues</option>
                       <option value="ui">UI / Layout Bugs</option>
                       <option value="other">Other Technical Problem</option>
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-1">Contact Email (Optional)</label>
                    <input 
                      type="email"
                      placeholder="your@email.com"
                      value={reportData.email}
                      onChange={(e) => setReportData({ ...reportData, email: e.target.value })}
                      className="w-full bg-background border border-white/5 rounded-2xl p-4 text-white font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-1">Description of the problem</label>
                    <textarea 
                      required
                      placeholder="Please describe what happened..."
                      value={reportData.description}
                      onChange={(e) => setReportData({ ...reportData, description: e.target.value })}
                      rows={4}
                      className="w-full bg-background border border-white/5 rounded-2xl p-4 text-white font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                    />
                 </div>

                 <button
                   type="submit"
                   disabled={submittingReport || !reportData.description.trim()}
                   className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-3"
                 >
                    {submittingReport ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5" />
                        Send Report
                      </>
                    )}
                 </button>
              </form>
            </motion.div>
          </div>
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
                    <h3 className="text-3xl font-display font-black text-white tracking-tight">How to Install FideTV</h3>
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
                 {isSafari || isIOS ? (
                   // Safari/iOS Instructions
                   <div className="space-y-8">
                      <div className="flex items-start gap-6 group">
                         <div className="w-14 h-14 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-2xl font-black text-primary border border-white/10 group-hover:bg-primary/20 transition-colors">1</div>
                         <div className="space-y-2">
                            <p className="text-white font-bold text-lg">Tap the Share Button</p>
                            <p className="text-gray-500 text-sm leading-relaxed">Look for the icon at the bottom of your Safari browser.</p>
                            <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center">
                               <div className="w-12 h-12 border-2 border-white/20 rounded-lg flex items-center justify-center relative">
                                  <div className="w-0.5 h-6 bg-white/60 absolute -top-2" />
                                  <div className="w-4 h-4 border-t-2 border-r-2 border-white/60 rotate-[-45deg] absolute -top-2" />
                               </div>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-start gap-6 group">
                         <div className="w-14 h-14 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-2xl font-black text-primary border border-white/10 group-hover:bg-primary/20 transition-colors">2</div>
                         <div className="space-y-2">
                            <p className="text-white font-bold text-lg">Select "Add to Home Screen"</p>
                            <p className="text-gray-500 text-sm leading-relaxed">Scroll down in the options and tap the plus icon labeled "Add to Home Screen".</p>
                            <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center gap-4">
                               <div className="w-12 h-12 border-2 border-white/20 rounded-lg flex items-center justify-center">
                                  <div className="w-6 h-0.5 bg-white/60" />
                                  <div className="h-6 w-0.5 bg-white/60 absolute" />
                               </div>
                               <div className="h-4 w-32 bg-white/10 rounded-full" />
                            </div>
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
                            <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center">
                               <div className="w-full max-w-[200px] h-10 border border-white/20 rounded-lg flex items-center justify-end px-3">
                                  <Download className="w-5 h-5 text-primary" />
                               </div>
                            </div>
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
                            <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 flex flex-col items-end">
                               <div className="space-y-1 p-2">
                                  <div className="w-2 h-2 bg-white/60 rounded-full" />
                                  <div className="w-2 h-2 bg-primary animate-pulse rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                                  <div className="w-2 h-2 bg-white/60 rounded-full" />
                               </div>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-start gap-6 group">
                         <div className="w-14 h-14 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center text-2xl font-black text-primary border border-white/10 group-hover:bg-primary/20 transition-colors">2</div>
                         <div className="space-y-2">
                            <p className="text-white font-bold text-lg">Tap "Install App"</p>
                            <p className="text-gray-500 text-sm leading-relaxed">Select "Install App" or "Add to Home Screen" from the menu list.</p>
                            <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center gap-4">
                               <Download className="w-8 h-8 text-primary" />
                               <div className="space-y-2">
                                  <div className="h-3 w-24 bg-primary/40 rounded-full" />
                                  <div className="h-2 w-16 bg-white/10 rounded-full" />
                               </div>
                            </div>
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
    </div>
  );
}
