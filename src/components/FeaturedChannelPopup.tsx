import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Tv, Sparkles, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { safeLocalStorage } from '@/lib/storage';
import { useNavigate } from 'react-router-dom';

export default function FeaturedChannelPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [channel, setChannel] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLatestChannel = async () => {
      try {
        // Fetch the single most recently added active channel
        const { data, error } = await supabase
          .from('tv_channels')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!error && data) {
          setChannel(data);
          
          // Check if user has seen this specific channel's popup already
          const seenKey = `fidetv_featured_seen_${data.id}`;
          const hasSeen = safeLocalStorage.getItem(seenKey);
          
          if (!hasSeen) {
            // Delay the popup slightly for a better welcome experience
            const timer = setTimeout(() => setIsOpen(true), 1500);
            return () => clearTimeout(timer);
          }
        }
      } catch (err) {
        console.error('Error fetching featured channel for popup:', err);
      }
    };

    fetchLatestChannel();
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (channel) {
      safeLocalStorage.setItem(`fidetv_featured_seen_${channel.id}`, 'true');
    }
  };

  const handleWatch = () => {
    if (channel) {
      handleClose();
      navigate(`/live?channel=${channel.id}`);
    }
  };

  if (!channel) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="relative w-full max-w-lg bg-surface border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]"
          >
            {/* Background Glow */}
            <div className="absolute top-0 left-0 w-full h-32 bg-primary/20 blur-[60px] -z-10" />

            {/* Header Badge */}
            <div className="absolute top-6 left-6 z-20">
               <div className="bg-primary/90 backdrop-blur-md px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-xl shadow-primary/20 border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Recently Added</span>
               </div>
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 z-20 p-2.5 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-md transition-all border border-white/10 shadow-lg group"
            >
              <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
            </button>

            {/* Content Container */}
            <div className="flex flex-col">
               {/* Thumbnail Preview */}
               <div className="aspect-video relative overflow-hidden group bg-black">
                  {channel.thumbnail ? (
                    <img 
                      src={channel.thumbnail} 
                      alt={channel.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white/20">
                       <Tv className="w-16 h-16 stroke-[1]" />
                       <span className="text-[10px] font-black uppercase tracking-widest">Preview Unavailable</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent pointer-events-none" />
                  
                  {/* Play Indicator Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.button
                       whileHover={{ scale: 1.1 }}
                       whileTap={{ scale: 0.9 }}
                       onClick={handleWatch}
                       className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center shadow-2xl shadow-primary/40 group/play"
                    >
                       <Play className="w-8 h-8 fill-current ml-1" />
                    </motion.button>
                  </div>
               </div>

               {/* Text Info */}
               <div className="p-8 space-y-6 pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                       <Tv className="w-4 h-4 text-primary" />
                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted">Live Stream Channel</span>
                    </div>
                    <h2 className="text-3xl font-display font-black text-text-main tracking-tight leading-tight">
                       {channel.name}
                    </h2>
                    <p className="text-sm text-text-muted leading-relaxed line-clamp-3">
                       {channel.description || `Experience the best of ${channel.name} live on FideTV. Tune in now to join the broadcast and stay connected with professional media delivery.`}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                     <button
                       onClick={handleWatch}
                       className="flex-1 py-4.5 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 active:scale-95 group"
                     >
                       <Play className="w-4 h-4 fill-current" />
                       Watch Now
                       <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                     </button>
                     <button
                       onClick={handleClose}
                       className="px-8 py-4.5 bg-white/5 text-text-muted hover:bg-white/10 hover:text-text-main rounded-2xl border border-white/5 transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
                     >
                       Maybe Later
                     </button>
                  </div>

                  <div className="flex items-center justify-center gap-4 text-text-muted/40 text-[9px] font-black uppercase tracking-[0.2em] pt-4 border-t border-white/5">
                     <span>Instant Access</span>
                     <div className="w-1 h-1 bg-text-muted/20 rounded-full" />
                     <span>No Subscription Required</span>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
