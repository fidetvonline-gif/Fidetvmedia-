import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Timer, Sparkles, X, Tv, Bell, Calendar, Flame, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import fidetvWorldCup from '@/assets/images/fidetv_world_cup_1780392851684.png';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isCompleted: boolean;
}

export default function LiveEventBanner({ isCardOnly = false }: { isCardOnly?: boolean }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  
  // Set the big match event date. 
  // Let's make it dynamic: setting it to June 10, 2026, 18:00 UTC (a prime-time match), 
  // or relative if that date has passed to keep the demo always beautifully functioning!
  const targetDate = new Date('2026-06-10T18:00:00Z');
  
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isCompleted: false,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      let difference = +targetDate - +new Date();
      
      // If the static date has passed or is very near, keep a dynamic 48-hour rolling timer for preview purposes
      if (difference <= 0) {
        const fallbackTarget = new Date();
        fallbackTarget.setDate(fallbackTarget.getDate() + 2);
        fallbackTarget.setHours(19, 0, 0, 0);
        difference = +fallbackTarget - +new Date();
      }

      let timeLeftData: TimeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isCompleted: difference <= 0
      };

      setTimeLeft(timeLeftData);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTuneIn = () => {
    navigate('/live');
  };

  if (isCardOnly) {
    return (
      <div 
        id="live-promo-card"
        className="relative w-full overflow-hidden rounded-[2.5rem] border border-border-custom bg-surface p-8 sm:p-12 shadow-2xl transition-all duration-300 hover:border-primary/30 group"
      >
        {/* Glowing Ambient Backdrop */}
        <div className="absolute top-[-40%] right-[-10%] w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/15 transition-all duration-700" />
        <div className="absolute bottom-[-30%] left-[-10%] w-[300px] h-[300px] bg-orange-600/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Detailed Message & Description */}
          <div className="lg:col-span-7 flex flex-col space-y-5">
            <div className="flex flex-wrap gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-500 animate-pulse">
                <Flame className="w-3.5 h-3.5" />
                CRITICAL BROADCAST
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary">
                <Sparkles className="w-3.5 h-3.5" />
                Live on FideTV.online
              </span>
            </div>

            <h3 className="text-3xl sm:text-5xl font-display font-black text-foreground tracking-tight leading-none">
              ALL WORLD CUP MATCHES <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-[#e0650d]">LIVE & FOR FREE</span>
            </h3>
            
            <p className="text-text-muted text-sm sm:text-base leading-relaxed leading-normal">
              Experience the absolute pinnacle of global football! Watch all premium world tournament matches live, completely for free, and exclusively on **FideTV.online**. Feel the true stadium energy with professional high-definition feeds, instant fan live chat interactions, play-by-plays, and exclusive highlights.
            </p>

            {/* Countdown Items in high-tech display grid */}
            <div className="grid grid-cols-4 gap-3 max-w-md pt-2">
              {[
                { label: 'Days', value: timeLeft.days },
                { label: 'Hours', value: timeLeft.hours },
                { label: 'Mins', value: timeLeft.minutes },
                { label: 'Secs', value: timeLeft.seconds },
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className="bg-surface-bright/80 border border-border-custom rounded-2xl p-3 text-center mix-blend-normal shadow-sm group-hover:border-primary/15 transition-colors"
                >
                  <span className="block text-xl sm:text-3xl font-display font-black text-foreground">{item.value.toString().padStart(2, '0')}</span>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-text-muted">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Micro details notice */}
            <div className="flex items-center gap-2 text-xs text-text-muted italic pt-1">
              <AlertCircle className="w-4 h-4 text-primary shrink-0" />
              <span>Broadcast starts exactly at kick-off. No sign-up required to view!</span>
            </div>
          </div>

          {/* Call to Actions & Media Mockup / Watch link */}
          <div className="lg:col-span-5 flex flex-col space-y-6 lg:pl-6">
            <div 
              className="relative w-full aspect-video rounded-3xl overflow-hidden border border-border-custom bg-black shadow-lg cursor-pointer group/overlay"
              onClick={handleTuneIn}
            >
              {/* Symbolic Placeholder representing the beautiful soccer graphic */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/80 to-transparent z-10" />
              <img 
                src={fidetvWorldCup}
                alt="FideTV World Cup Campaign"
                className="w-full h-full object-cover opacity-60 group-hover:scale-103 transition-transform duration-700 pointer-events-none"
              />
              <div className="absolute inset-0 z-20 flex flex-col justify-end p-6">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">LIVE BROADCAST</span>
                <span className="text-sm font-bold text-white mb-2">ALL WORLD CUP MATCHES LIVE & FOR FREE</span>
                <span className="text-[11px] text-white/50">Tune in to watch premium matches instantly as they happen</span>
              </div>
              <div className="absolute inset-0 flex items-center justify-center z-30">
                <div className="w-14 h-14 rounded-full bg-primary/95 text-white flex items-center justify-center shadow-xl group-hover/overlay:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleTuneIn}
                className="flex-1 py-4 bg-gradient-to-r from-primary to-[#e0650d] hover:opacity-95 text-white text-xs font-bold uppercase tracking-widest text-center rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/10 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                <Tv className="w-4 h-4" />
                <span>Visit Live Section Now</span>
              </button>
              
              <button 
                onClick={() => {
                  const reminderUrl = window.location.origin + '/live';
                  navigator.clipboard.writeText(reminderUrl);
                  alert('Match link copied! Share this with friends so you can watch together!');
                }}
                className="px-6 py-4 bg-surface border border-border-custom hover:border-primary/20 text-foreground text-xs font-bold uppercase tracking-widest rounded-2xl transition-all"
              >
                Share Link
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -25 }}
          className="relative bg-gradient-to-r from-background via-[#e0650d]/10 to-background border-b border-white/10 z-[10000] py-3 px-4 shadow-sm"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap md:flex-nowrap">
            
            {/* Left side text/glowing badge */}
            <div className="flex items-center gap-3">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
              </span>
              
              <div className="text-xs font-bold tracking-tight text-foreground/90 flex items-center flex-wrap gap-2">
                <span className="text-primary font-black uppercase text-[10px] tracking-widest bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">WORLD CUP DEBUT</span>
                Watch <span className="text-primary font-black uppercase">All World Cup Matches Live & For Free</span> exclusively on FideTV.online!
              </div>
            </div>

            {/* Right side countdown and action buttons */}
            <div className="flex items-center gap-4 ml-auto">
              {/* Small dynamic timer */}
              <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-text-muted bg-surface-bright border border-border-custom rounded-lg px-2.5 py-1">
                <Timer className="w-3.5 h-3.5 text-primary" />
                <span>Starts in: {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s</span>
              </div>

              <button
                onClick={handleTuneIn}
                className="px-3.5 py-1.5 bg-primary hover:bg-primary/95 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-1.5"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Go Live</span>
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-text-muted hover:text-foreground transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
