import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, Sparkles, Megaphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { safeLocalStorage } from '@/lib/storage';
import { Link } from 'react-router-dom';

export default function PromotionPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [promoImageUrl, setPromoImageUrl] = useState<string>('');
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const fetchPromoSettings = async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .in('key', ['advertise_promo_image_url', 'enable_popup_ad']);
      
      if (!error && data) {
        const settings = data.reduce((acc: any, curr: any) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {});

        if (settings.enable_popup_ad === 'true' && settings.advertise_promo_image_url) {
          setIsEnabled(true);
          setPromoImageUrl(settings.advertise_promo_image_url);
          
          // Check if dismissed in the last 24 hours
          const lastDismissed = safeLocalStorage.getItem('fidetv_promo_last_dismissed');
          const now = Date.now();
          const oneDay = 24 * 60 * 60 * 1000;

          if (!lastDismissed || (now - parseInt(lastDismissed)) > oneDay) {
             const timer = setTimeout(() => setIsOpen(true), 3000);
             return () => clearTimeout(timer);
          }
        }
      }
    };

    fetchPromoSettings();
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    safeLocalStorage.setItem('fidetv_promo_last_dismissed', Date.now().toString());
  };

  if (!isEnabled) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-surface border border-white/10 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]"
          >
            {/* Header / Info Badge */}
            <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
               <div className="bg-primary px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg shadow-primary/20">
                  <Sparkles className="w-3 h-3 text-white" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Promotion</span>
               </div>
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-6 right-6 z-20 p-2.5 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-md transition-all border border-white/10 shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content */}
            <div className="flex flex-col">
               <div className="aspect-[4/5] relative overflow-hidden group">
                  <img 
                    src={promoImageUrl} 
                    alt="Promotional Offer" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
               </div>

               <div className="p-8 space-y-6 bg-surface relative">
                  <div className="flex gap-3">
                     <Link
                       to="/advertise"
                       onClick={handleClose}
                       className="flex-1 py-4 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-xl shadow-primary/10 active:scale-95"
                     >
                       <Megaphone className="w-4 h-4" />
                       Learn More
                     </Link>
                     <button
                       onClick={handleClose}
                       className="px-6 py-4 bg-white/5 text-gray-400 hover:bg-white/10 rounded-2xl border border-white/5 transition-all active:scale-95 flex items-center justify-center"
                     >
                       <X className="w-4 h-4" />
                     </button>
                  </div>

                  <div className="flex items-center justify-center gap-4 text-gray-600 text-[10px] font-black uppercase tracking-[0.2em] pt-2">
                     <span>FideTV Network</span>
                     <div className="w-1 h-1 bg-gray-600 rounded-full" />
                     <span>Media Marketing</span>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
