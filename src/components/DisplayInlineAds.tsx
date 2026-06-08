import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import DOMPurify from 'dompurify';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DisplayInlineAds() {
  const [ads, setAds] = useState<any[]>([]);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'inline_ads').single();
    if (data && data.value) {
      try {
        const parsed = JSON.parse(data.value);
        setAds(parsed.filter((a: any) => a.is_active));
      } catch (e) {
        setAds([]);
      }
    }
  };

  if (ads.length === 0) return null;

  // Render a random active ad to avoid clutter, or render all if needed
  // For now, randomly select one daily or session based. Let's just pick a random one.
  const ad = ads[Math.floor(Math.random() * ads.length)];

  if (ad.type === 'embed') {
    return (
      <ErrorBoundary>
        <div 
          className="w-full my-10 overflow-hidden flex justify-center inline-ad-container"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(ad.content, { ADD_TAGS: ['iframe'], ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'] }) }}
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-full my-10 rounded-[2.5rem] overflow-hidden border border-border-custom bg-surface group flex flex-col md:flex-row relative cursor-pointer shadow-xl" onClick={() => ad.target_url ? window.open(ad.target_url, '_blank') : null}>
         {ad.type === 'image' && ad.image_url ? (
           <img src={ad.image_url} alt={ad.content} className="w-full md:w-[40%] object-cover aspect-video md:aspect-auto group-hover:scale-105 transition-transform duration-700" />
         ) : null}
         <div className="p-8 flex items-center flex-1">
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary block">Sponsored</span>
              <p className="text-foreground font-bold tracking-tight text-lg leading-relaxed">{ad.content}</p>
            </div>
         </div>
      </div>
    </ErrorBoundary>
  );
}
