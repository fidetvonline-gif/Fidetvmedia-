import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Save, ExternalLink } from 'lucide-react';

interface InlineAd {
  id: string;
  type: 'embed' | 'image' | 'text';
  content: string; // The text or standard HTML embed
  target_url?: string;
  image_url?: string;
  is_active: boolean;
}

export default function InlineAdsManager() {
  const [ads, setAds] = useState<InlineAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'inline_ads').single();
    if (data && data.value) {
      try {
        setAds(JSON.parse(data.value));
      } catch (e) {
        setAds([]);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await supabase.from('site_settings').upsert({
      key: 'inline_ads',
      value: JSON.stringify(ads),
      updated_at: new Date().toISOString()
    });
    setSaving(false);
    alert('Inline ads updated successfully.');
  };

  const addAd = () => {
    setAds([...ads, {
      id: crypto.randomUUID(),
      type: 'image',
      content: 'Featured Ad Title',
      is_active: true
    }]);
  };

  const updateAd = (id: string, updates: Partial<InlineAd>) => {
    setAds(ads.map(ad => ad.id === id ? { ...ad, ...updates } : ad));
  };

  const removeAd = (id: string) => {
    setAds(ads.filter(ad => ad.id !== id));
  };

  if (loading) return <div className="text-foreground/40 text-sm font-mono animate-pulse">Loading Inline Ads...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
           <h3 className="text-xl font-bold text-foreground">Inline Context Ads</h3>
           <p className="text-xs text-foreground/40 italic">These ads display directly inside content boundaries like blogs or home pages.</p>
        </div>
        <div className="flex gap-4">
           <button onClick={addAd} className="px-6 py-2 bg-background border border-border-custom hover:border-primary text-primary transition-all rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Inline Ad
           </button>
           <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-primary hover:scale-105 transition-all text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm flex items-center gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save All Changes'}
           </button>
        </div>
      </div>

      <div className="space-y-6">
        {ads.length === 0 ? (
          <div className="p-12 text-center bg-surface border border-dashed border-border-custom rounded-3xl">
            <p className="text-foreground/40 text-sm uppercase tracking-widest font-bold font-mono">No Inline Ads Created</p>
          </div>
        ) : ads.map(ad => (
          <div key={ad.id} className="bg-surface p-6 rounded-3xl border border-border-custom space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
               <div className="w-full md:w-1/4 space-y-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Ad Type</label>
                    <select 
                      value={ad.type} 
                      onChange={(e) => updateAd(ad.id, { type: e.target.value as any })}
                      className="w-full bg-background border border-border-custom p-3 rounded-xl text-sm"
                    >
                      <option value="image">Image Link</option>
                      <option value="embed">HTML / Iframe Embed</option>
                      <option value="text">Text Context</option>
                    </select>
                 </div>
                 <div className="flex items-center gap-2 pt-2">
                    <input 
                      type="checkbox" 
                      checked={ad.is_active} 
                      onChange={(e) => updateAd(ad.id, { is_active: e.target.checked })}
                      className="w-4 h-4 rounded border-border-custom text-primary bg-background"
                    />
                    <label className="text-xs text-foreground font-bold">Active</label>
                 </div>
               </div>

               <div className="flex-1 space-y-4">
                 {ad.type === 'embed' ? (
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Embed HTML snippet</label>
                      <textarea 
                        value={ad.content} 
                        onChange={(e) => updateAd(ad.id, { content: e.target.value })}
                        placeholder="<iframe src='...'></iframe>"
                        className="w-full bg-background border border-border-custom p-4 rounded-xl text-sm font-mono min-h-[100px]"
                      />
                   </div>
                 ) : (
                   <>
                     {ad.type === 'image' && (
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Image URL</label>
                          <input 
                            value={ad.image_url || ''} 
                            onChange={(e) => updateAd(ad.id, { image_url: e.target.value })}
                            placeholder="https://..."
                            className="w-full bg-background border border-border-custom p-3 rounded-xl text-sm"
                          />
                       </div>
                     )}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">{ad.type === 'text' ? 'Ad Text' : 'Caption / Alt'}</label>
                        <input 
                          value={ad.content} 
                          onChange={(e) => updateAd(ad.id, { content: e.target.value })}
                          className="w-full bg-background border border-border-custom p-3 rounded-xl text-sm"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Target Link URL</label>
                        <input 
                          value={ad.target_url || ''} 
                          onChange={(e) => updateAd(ad.id, { target_url: e.target.value })}
                          placeholder="https://..."
                          className="w-full bg-background border border-border-custom p-3 rounded-xl text-sm"
                        />
                     </div>
                   </>
                 )}
               </div>

               <div className="flex md:flex-col items-center md:items-end justify-center md:justify-start">
                  <button onClick={() => removeAd(ad.id)} className="p-3 text-foreground/40 hover:text-red-500 bg-background rounded-xl border border-border-custom transition-all" title="Remove Inline Ad">
                     <Trash2 className="w-4 h-4" />
                  </button>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
