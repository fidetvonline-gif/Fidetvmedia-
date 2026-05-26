import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { ExternalLink, Sparkles, Tv, Smartphone, Calendar, Megaphone, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdBannerProps {
  placement: string;
  className?: string;
}

// Map each placement type to expected sizing and structure to reserve space and eliminate CLS
const placementSizing: Record<string, { minHeight: string; borderRadius: string; wrapperClass: string }> = {
  'Community Sidebar': {
    minHeight: 'min-h-[290px]',
    borderRadius: 'rounded-[2rem]',
    wrapperClass: 'w-full max-w-sm mx-auto'
  },
  'Home Portfolio Bottom': {
    minHeight: 'min-h-[240px] md:min-h-[140px]',
    borderRadius: 'rounded-[2.5rem]',
    wrapperClass: 'w-full max-w-7xl mx-auto'
  },
  'Home News Bottom': {
    minHeight: 'min-h-[240px] md:min-h-[140px]',
    borderRadius: 'rounded-[2.5rem]',
    wrapperClass: 'w-full max-w-7xl mx-auto'
  },
  'News Page Top': {
    minHeight: 'min-h-[180px] md:min-h-[120px]',
    borderRadius: 'rounded-[2.5rem]',
    wrapperClass: 'w-full max-w-7xl mx-auto'
  },
  'Admin Dashboard Top': {
    minHeight: 'min-h-[110px] md:min-h-[88px]',
    borderRadius: 'rounded-3xl',
    wrapperClass: 'w-full max-w-7xl'
  }
};

const defaultSizing = {
  minHeight: 'min-h-[96px]',
  borderRadius: 'rounded-2xl',
  wrapperClass: 'w-full'
};

export default function AdBanner({ placement, className }: AdBannerProps) {
  const [ad, setAd] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAd();
  }, [placement]);

  const fetchAd = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_units')
        .select('*')
        .eq('is_active', true)
        .eq('name', placement)
        .single();

      if (!error && data) {
        setAd(data);
      } else {
        setAd(null);
      }
    } catch (err) {
      console.error('Error fetching ad:', err);
      setAd(null);
    } finally {
      setLoading(false);
    }
  };

  const sizing = placementSizing[placement] || defaultSizing;

  // Render a responsive, low-layout-shift skeleton placeholder when loading
  if (loading) {
    return (
      <div 
        id="ad-banner-loading-skeleton"
        className={cn(
          "bg-surface/50 border border-dashed border-border-custom/40 animate-pulse flex flex-col items-center justify-center p-6 text-center space-y-2 select-none",
          sizing.minHeight,
          sizing.borderRadius,
          sizing.wrapperClass,
          className
        )}
      >
        <Tv className="w-5 h-5 text-foreground/10 animate-pulse" />
        <span className="text-[9px] font-mono tracking-widest text-foreground/20 uppercase">
          Loading Ad Unit...
        </span>
      </div>
    );
  }

  // 1. If we fetched a custom platform-specific ad unit from the Database
  if (ad) {
    if (ad.platform === 'android' || ad.platform === 'ios') {
      return (
        <div 
          id={`ad-banner-db-mobile-${ad.id}`}
          className={cn(
            "bg-surface border border-border-custom rounded-2xl p-6 text-center space-y-3 shadow-inner flex flex-col justify-center items-center", 
            sizing.minHeight, 
            sizing.wrapperClass, 
            className
          )}
        >
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary text-[8px] uppercase tracking-widest font-black">
             <Smartphone className="w-2.5 h-2.5" /> Mobile Ad Placement
          </span>
          <h4 className="text-sm font-semibold text-foreground/85 font-display">{ad.name}</h4>
          <p className="text-[10px] text-foreground/45 italic leading-relaxed">This {ad.ad_type} unit ({ad.ad_unit_id}) is active on live {ad.platform} channels.</p>
        </div>
      );
    }

    if (ad.platform === 'web' && ad.ad_type === 'adsense') {
      return (
        <div 
          id={`ad-banner-db-adsense-${ad.id}`}
          className={cn(
            "w-full overflow-hidden bg-surface rounded-[2.5rem] border border-border-custom hover:border-primary/20 transition-all shadow-sm flex items-center justify-between p-8", 
            sizing.minHeight, 
            sizing.borderRadius, 
            sizing.wrapperClass, 
            className
          )}
        >
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20 text-primary">
              <ExternalLink className="w-6 h-6" />
            </div>
            <div className="text-left">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/80">Google AdSense Partner Unit</span>
              <p className="text-base font-bold text-foreground font-display mt-0.5">{ad.name}</p>
              <p className="text-[9px] text-foreground/30 font-mono italic mt-0.5">ID: {ad.ad_unit_id}</p>
            </div>
          </div>
          <a
            href="https://google.com/adsense"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-background border border-border-custom rounded-xl text-[9px] font-black uppercase text-foreground/55 tracking-widest hover:text-foreground hover:bg-surface-bright transition-all"
          >
            Live Link
          </a>
        </div>
      );
    }
  }

  // 2. Beautiful Fallback Promotional Ads if no active DB database ad exists or table is blank
  if (placement === 'Community Sidebar') {
    return (
      <div 
        id="ad-banner-fallback-community"
        className={cn(
          "relative overflow-hidden bg-gradient-to-br from-primary/10 via-surface to-background border border-border-custom p-6 rounded-[2rem] text-center space-y-4 shadow-sm flex flex-col justify-center items-center", 
          sizing.minHeight, 
          sizing.wrapperClass, 
          className
        )}
      >
         <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
         <div className="w-10 h-10 bg-primary/25 rounded-2xl flex items-center justify-center text-primary border border-primary/30 shadow-inner">
            <Sparkles className="w-4 h-4 animate-pulse" />
         </div>
         <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground font-display uppercase tracking-tight">FideTV Premium Streams</h4>
            <p className="text-[10px] text-foreground/40 leading-relaxed italic">Unlock high bit-rate stream playback, crystal clear multi-cam, and exclusive content spaces.</p>
         </div>
         <Link to="/live" className="block w-full py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-[9px] font-black uppercase tracking-wider text-center active:scale-95 transition-all shadow-md shadow-primary/10">
            Join the Network
         </Link>
      </div>
    );
  }

  if (placement === 'Home Portfolio Bottom') {
    return (
      <div 
        id="ad-banner-fallback-portfolio"
        className={cn(
          "w-full overflow-hidden bg-gradient-to-r from-primary/10 via-surface/60 to-background border border-border-custom rounded-[2.5rem] p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm", 
          sizing.minHeight, 
          sizing.wrapperClass, 
          className
        )}
      >
         <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-14 h-14 bg-primary/25 rounded-2xl flex items-center justify-center text-primary border border-primary/30 shadow-inner shrink-0 leading-none">
               <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-xl text-center md:text-left">
               <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary text-[8px] uppercase tracking-widest font-black mb-1">FIDETV MEDIA BROADCASTING SERVICE</span>
               <h4 className="text-xl font-display font-bold text-foreground tracking-tight">Corporate and Event Multi-Cam Live Streaming</h4>
               <p className="text-xs text-foreground/40 italic">Broadcast weddings, sporting tournaments, funerals, and media conferences globally with pristine multi-camera video feed.</p>
            </div>
         </div>
         <Link to="/booking" className="px-8 py-4 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-105 active:scale-95 transition-all shrink-0 shadow-lg shadow-primary/25">
            Book Coverage
         </Link>
      </div>
    );
  }

  if (placement === 'Home News Bottom') {
    return (
      <div 
        id="ad-banner-fallback-homenews"
        className={cn(
          "w-full overflow-hidden bg-gradient-to-r from-teal-500/10 via-surface/60 to-background border border-border-custom rounded-[2.5rem] p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm", 
          sizing.minHeight, 
          sizing.wrapperClass, 
          className
        )}
      >
         <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-14 h-14 bg-teal-500/20 rounded-2xl flex items-center justify-center text-teal-500 border border-teal-500/30 shadow-inner shrink-0">
               <Smartphone className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-xl text-center md:text-left">
               <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 text-[8px] uppercase tracking-widest font-black mb-1">MOBILE APP NOW LIVE</span>
               <h4 className="text-xl font-display font-bold text-foreground tracking-tight">Download the FideTV Mobile App</h4>
               <p className="text-xs text-foreground/40 italic">Enjoy smooth video streams, breaking community posts, instant chat alerts, and offline reading options directly on your smartphone.</p>
            </div>
         </div>
         <Link to="/download" className="px-8 py-4 bg-teal-500 hover:bg-teal-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-105 active:scale-95 transition-all shrink-0 shadow-lg shadow-teal-500/20">
            Install App
         </Link>
      </div>
    );
  }

  if (placement === 'News Page Top') {
    return (
      <div 
        id="ad-banner-fallback-newstop"
        className={cn(
          "w-full overflow-hidden bg-gradient-to-r from-amber-500/10 via-surface/60 to-background border border-border-custom rounded-[2.5rem] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm", 
          sizing.minHeight, 
          sizing.wrapperClass, 
          className
        )}
      >
         <div className="flex flex-col md:flex-row items-center gap-5">
            <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/30 shadow-inner shrink-0">
               <Megaphone className="w-5 h-5" />
            </div>
            <div className="space-y-1 text-center md:text-left">
               <h4 className="text-base font-display font-bold text-foreground tracking-tight">Advertise with FideTV Global Media Network</h4>
               <p className="text-xs text-foreground/40 italic">Maximize outreach! Showcase your brand to over 18,000+ daily stream viewers and sport lovers across Nigeria and Africa.</p>
            </div>
         </div>
         <Link to="/contact" className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-[9px] rounded-2xl hover:scale-105 active:scale-95 transition-all shrink-0 shadow-lg shadow-amber-500/20">
            Partner With Us
         </Link>
      </div>
    );
  }

  if (placement === 'Admin Dashboard Top') {
    return (
      <div 
        id="ad-banner-fallback-admintop"
        className={cn(
          "w-full bg-surface-bright/70 border border-border-custom rounded-3xl p-6 flex items-center justify-between gap-4 shadow-inner", 
          sizing.minHeight, 
          sizing.wrapperClass, 
          className
        )}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 text-primary shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h5 className="text-xs font-black uppercase tracking-widest text-foreground font-display">Administrative Broadcast Terminal</h5>
            <p className="text-[10px] text-foreground/45 italic leading-relaxed">Stream feeds optimize live broadcast frames at 1080p 60fps RTMP outputs.</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-widest">SYSTEM ONLINE</span>
      </div>
    );
  }

  // General elegant fallback
  return (
    <div 
      id="ad-banner-generic-fallback"
      className={cn(
        "w-full h-24 bg-surface-bright/50 border border-dashed border-border-custom rounded-2xl flex items-center justify-between px-8 text-left", 
        sizing.minHeight, 
        sizing.wrapperClass, 
        className
      )}
    >
       <div className="flex items-center gap-3">
          <Tv className="w-5 h-5 text-foreground/20 animate-pulse" />
          <div className="text-left">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground/20">FideTV Media Network</span>
            <p className="text-[11px] font-bold text-foreground/45 tracking-tight font-display">{placement}</p>
          </div>
       </div>
       <span className="text-[8px] border border-border-custom px-2 py-1 rounded bg-background uppercase font-black tracking-widest text-foreground/25">Sponsored Promo</span>
    </div>
  );
}
