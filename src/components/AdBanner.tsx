import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

interface AdBannerProps {
  placement: string;
  className?: string;
}

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
      }
    } catch (err) {
      console.error('Error fetching ad:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  // Placeholder for web version when showing mobile ads
  if (ad && (ad.platform === 'android' || ad.platform === 'ios')) {
    return (
      <div className={cn("bg-surface-bright/50 border border-border-custom rounded-2xl p-4 text-center space-y-2", className)}>
        <p className="text-[9px] uppercase font-black text-foreground/20 tracking-widest">Mobile Ad Placement</p>
        <p className="text-[10px] text-foreground/40 italic">This {ad.ad_type} slot ({ad.ad_unit_id}) is active for {ad.platform} users.</p>
      </div>
    );
  }

  // Web AdSense logic (simplified for demo)
  if (ad && ad.platform === 'web' && ad.ad_type === 'adsense') {
    return (
      <div className={cn("w-full overflow-hidden bg-background border border-border-custom rounded-2xl flex items-center justify-center p-8", className)}>
         <div className="text-center space-y-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
               <ExternalLink className="w-5 h-5 text-primary" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase text-foreground tracking-widest">Google AdSense</p>
               <p className="text-[9px] text-foreground/30 italic">Live responsive unit: {ad.ad_unit_id}</p>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-24 bg-surface-bright border border-dashed border-border-custom rounded-2xl flex items-center justify-center grayscale opacity-50", className)}>
       <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/20">Ad Placement: {placement}</span>
    </div>
  );
}
