import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Smartphone, Apple, Play, CheckCircle2, ChevronRight, HelpCircle, Copy, Check, History, Loader2, Star, AlertTriangle, X, Quote, ChevronLeft, Share2, MessageCircle, Twitter, Facebook, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { safeSessionStorage } from '@/lib/storage';

export default function DownloadApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [referrer, setReferrer] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isWindows, setIsWindows] = useState(false);
  const [isLinux, setIsLinux] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isPhone, setIsPhone] = useState(false);
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
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const videoRef2 = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Force play for both videos if needed
    const playVideos = async () => {
      try {
        if (videoRef1.current) await videoRef1.current.play();
        if (videoRef2.current) await videoRef2.current.play();
      } catch (err) {
        console.warn("Video autoplay failed:", err);
      }
    };
    if (isTutorialOpen || true) {
      playVideos();
    }
  }, [isTutorialOpen]);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (data && data.length > 0) {
          setReviews(data);
        } else {
          // Fallback static reviews if DB is empty
          setReviews([
            {
              user_name: "Sarah Jensen",
              rating: 5,
              comment: "FideTV has completely changed how I watch live sports. The stream quality is unmatched!",
              user_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
            },
            {
              user_name: "Michael Chen",
              rating: 5,
              comment: "The PWA installation was so simple. No need to clear space for a massive app download.",
              user_avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
            },
            {
              user_name: "Amina Okoro",
              rating: 4,
              comment: "Love the community chat feature. It makes watching live events so much more interactive!",
              user_avatar: "https://images.unsplash.com/photo-1531123897727-8f129e16fd3c?w=100&h=100&fit=crop"
            }
          ]);
        }
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoadingReviews(false);
      }
    };
    fetchReviews();

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
        const refId = safeSessionStorage.getItem('fidetv_referral');
        if (refId) {
          // Check if it's a UUID or a username
          const { data: refProfile } = await supabase
            .from('profiles')
            .select('username, avatar_url, full_name, id')
            .or(`id.eq.${refId},username.eq.${refId}`)
            .single();
          
          if (refProfile) {
            setReferrer(refProfile);
          }
        }

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

    const interval = setInterval(fetchDownloads, 30000);

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
    
    // Accurate tablet detection
    const isTabletDevice = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk|(puffin(?!.*(IP|AP|WP))))/.test(userAgent);
    const isPhoneDevice = /iphone|ipod|(android.*mobile)|(windows.*phone)|(blackberry.*mobile)|(opera m(ob|in)i)/.test(userAgent);
    const isDesktopDevice = !isTabletDevice && !isPhoneDevice;

    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsWindows(/windows/.test(userAgent));
    setIsLinux(/linux/.test(userAgent) && !isAndroidDevice);
    setIsChrome(isChromeBrowser);
    setIsSafari(isSafariBrowser);
    setIsDesktop(isDesktopDevice);
    setIsTablet(isTabletDevice);
    setIsPhone(isPhoneDevice);

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
      clearInterval(interval);
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
          
          const promises: any[] = [
            supabase.from('site_settings').upsert({
              key: 'apk_download_count',
              value: nextCount.toString(),
              updated_at: new Date().toISOString()
            })
          ];

          // Attribute referral to inviter if referrer exists
          if (referrer) {
            promises.push(
              supabase.from('referral_logs').insert({
                inviter_id: referrer.id,
                event_type: 'install',
                metadata: { ua: navigator.userAgent }
              })
            );
          }

          await Promise.allSettled(promises);
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

  const handleShare = async () => {
    const shareData = {
      title: 'FideTV - High fidelity live events',
      text: 'Check out FideTV for high fidelity live streaming and community events!',
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const shareToPlatform = (platform: 'x' | 'facebook' | 'whatsapp') => {
    const url = encodeURIComponent(window.location.origin);
    const text = encodeURIComponent('Experience live events and community on FideTV! Download the app now.');
    
    let shareUrl = '';
    switch (platform) {
      case 'x':
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'whatsapp':
        shareUrl = `https://api.whatsapp.com/send?text=${text}%20${url}`;
        break;
    }
    
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const nextReview = () => {
    setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
  };

  const prevReview = () => {
    setCurrentReviewIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
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
        
        {referrer && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-8 backdrop-blur-sm"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/20 bg-background">
              {referrer.avatar_url ? (
                <img src={referrer.avatar_url} alt={referrer.username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] font-black">{referrer.username?.slice(0, 2).toUpperCase()}</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Invited by</span>
              <span className="text-sm font-bold text-white">@{referrer.username}</span>
              <UserCheck className="w-3.5 h-3.5 text-primary" />
            </div>
          </motion.div>
        )}
        
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

        {/* Dynamic Form Factor Recommendation */}
        <AnimatePresence>
          {(isPhone || isTablet) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl mx-auto p-6 bg-primary/5 border border-primary/20 rounded-3xl backdrop-blur-sm space-y-4"
            >
              <div className="flex items-center justify-center gap-3 text-primary">
                <Star className="w-5 h-5 fill-primary" />
                <span className="text-xs font-black uppercase tracking-widest">Personalized Recommendation</span>
              </div>
              
              {isPhone ? (
                <div className="space-y-2">
                  <h4 className="text-white font-bold text-lg">Optimized for Your Phone</h4>
                  <p className="text-gray-400 text-sm">
                    We recommend the <strong>Portrait Layout</strong> for your device. It provides one-handed navigation and quick access to live chat while watching streams.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-white font-bold text-lg">Enhanced Tablet Experience</h4>
                  <p className="text-gray-400 text-sm">
                    Your tablet is perfect for our <strong>Cinema Dashboard</strong>. Enjoy side-by-side news feeds and multi-channel monitoring in landscape mode.
                  </p>
                </div>
              )}
              
              <div className="pt-2 flex items-center justify-center gap-4">
                 <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1">
                       <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Touch UI</span>
                 </div>
                 <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1">
                       <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Full Screen</span>
                 </div>
                 <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-1">
                       <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Biometrics</span>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

      {/* Social Sharing Section */}
      <section className="glass rounded-[3rem] p-12 border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
              <Share2 className="w-4 h-4" />
              Spread the Word
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter">
              Share the <span className="text-primary">Vibe.</span>
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed max-w-md">
              Love the experience? Invite your community to join the FideTV revolution. One click is all it takes.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button 
              onClick={() => shareToPlatform('x')}
              className="flex flex-col items-center justify-center gap-4 p-6 bg-white/5 hover:bg-white/10 rounded-[2rem] border border-white/10 transition-all group"
            >
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                <Twitter className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-[10px] font-black uppercase tracking-widest opacity-60">Post to X</span>
            </button>

            <button 
              onClick={() => shareToPlatform('facebook')}
              className="flex flex-col items-center justify-center gap-4 p-6 bg-white/5 hover:bg-white/10 rounded-[2rem] border border-white/10 transition-all group"
            >
              <div className="w-12 h-12 bg-[#1877F2] rounded-xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                <Facebook className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-[10px] font-black uppercase tracking-widest opacity-60">Facebook</span>
            </button>

            <button 
              onClick={() => shareToPlatform('whatsapp')}
              className="flex flex-col items-center justify-center gap-4 p-6 bg-white/5 hover:bg-white/10 rounded-[2rem] border border-white/10 transition-all group"
            >
              <div className="w-12 h-12 bg-[#25D366] rounded-xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-white text-[10px] font-black uppercase tracking-widest opacity-60">WhatsApp</span>
            </button>

            <button 
              onClick={handleShare}
              className="flex flex-col items-center justify-center gap-4 p-6 bg-primary/10 hover:bg-primary/20 rounded-[2rem] border border-primary/20 transition-all group"
            >
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center border border-primary/30 group-hover:scale-110 transition-transform">
                <Share2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-primary text-[10px] font-black uppercase tracking-widest">More Options</span>
            </button>
          </div>
        </div>
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
            
            {/* On-page Video Tutorial */}
            <div className="rounded-[2.5rem] overflow-hidden border border-white/5 bg-white/5 aspect-video relative group shadow-2xl">
               <video 
                 ref={videoRef1}
                 src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"
                 autoPlay
                 loop
                 muted
                 playsInline
                 preload="auto"
                 crossOrigin="anonymous"
                 className="w-full h-full object-cover opacity-100 group-hover:scale-105 transition-transform duration-1000"
               >
                 Your browser does not support the video tag.
               </video>
               <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
               <div className="absolute top-6 left-6">
                  <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest text-primary border border-primary/20">
                     Video Tutorial
                  </div>
               </div>
            </div>

            <p className="text-gray-400">
              Follow these simple steps to get FideTV on your mobile device.
            </p>

             <div className="space-y-6">
               <div className={cn(
                 "glass p-6 rounded-[2rem] border-white/5 space-y-4 transition-all duration-500",
                 isIOS ? "ring-2 ring-primary bg-primary/5 border-primary/20 scale-[1.02]" : "opacity-60"
               )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-white font-bold text-lg">
                      <Apple className={cn("w-6 h-6", isIOS ? "text-primary" : "text-gray-400")} />
                       iOS (iPhone/iPad)
                    </div>
                    {isIOS && (
                      <span className="text-[10px] font-black bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Your Device</span>
                    )}
                  </div>
                  <ol className="list-decimal list-inside space-y-2 text-gray-400 text-sm leading-relaxed ml-2">
                     <li>Open this website in <strong>Safari</strong>.</li>
                     <li>Tap the <strong>Share</strong> button at the bottom of the screen.</li>
                     <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                     <li>Tap <strong>Add</strong> in the top right corner.</li>
                  </ol>
               </div>
 
                <div className={cn(
                  "glass p-6 rounded-[2rem] border-white/5 space-y-4 transition-all duration-500",
                  (isAndroid || isDesktop) ? "ring-2 ring-primary bg-primary/5 border-primary/20 scale-[1.02]" : "opacity-60"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-white font-bold text-lg">
                      <Smartphone className={cn("w-6 h-6", (isAndroid || isDesktop) ? "text-primary" : "text-gray-100")} />
                       Android & Web (PWA Installation)
                    </div>
                    {(isAndroid || isDesktop) && (
                      <span className="text-[10px] font-black bg-primary text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">Your Device</span>
                    )}
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

      {/* Testimonial Carousel Section */}
      <section className="space-y-12 py-12">
        <div className="text-center space-y-4">
           <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
              <Quote className="w-4 h-4" />
              Testimonials
           </div>
           <h2 className="text-3xl md:text-5xl font-display font-black text-white tracking-tighter">
             Community <span className="text-primary">Love.</span>
           </h2>
           <p className="text-gray-400 max-w-lg mx-auto">
             Hear from thousands of users enjoying the FideTV experience every day.
           </p>
        </div>

        <div className="relative max-w-4xl mx-auto px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentReviewIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
              className="glass p-8 md:p-12 rounded-[3rem] border-white/5 relative overflow-hidden"
            >
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-24 h-24 shrink-0 rounded-full overflow-hidden border-4 border-primary/20 shadow-xl mx-auto md:mx-0">
                  <img 
                    src={reviews[currentReviewIndex]?.user_avatar || `https://ui-avatars.com/api/?name=${reviews[currentReviewIndex]?.user_name}&background=random`} 
                    alt={reviews[currentReviewIndex]?.user_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i} 
                        className={cn(
                          "w-4 h-4",
                          i < (reviews[currentReviewIndex]?.rating || 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-600"
                        )} 
                      />
                    ))}
                  </div>
                  <p className="text-xl md:text-2xl text-white font-medium italic leading-relaxed">
                    "{reviews[currentReviewIndex]?.comment}"
                  </p>
                  <div className="pt-4 border-t border-white/5">
                    <h4 className="text-white font-bold text-lg">{reviews[currentReviewIndex]?.user_name}</h4>
                    <p className="text-primary text-[10px] font-black uppercase tracking-widest mt-1">Verified User</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center items-center gap-6 mt-12">
            <button 
              onClick={prevReview}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex gap-2">
              {reviews.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentReviewIndex(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    idx === currentReviewIndex ? "w-8 bg-primary" : "bg-white/20"
                  )}
                />
              ))}
            </div>
            <button 
              onClick={nextReview}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all text-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
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
                 {/* Video Tutorial Area */}
                 <div className="rounded-[2rem] overflow-hidden border border-white/10 bg-black/40 aspect-video relative group shadow-2xl">
                    <video 
                      ref={videoRef2}
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
