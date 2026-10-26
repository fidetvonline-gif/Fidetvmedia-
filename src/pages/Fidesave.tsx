import React, { useState, useEffect } from 'react';
import { 
  DownloadCloud, 
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import SaveMediaSection from '@/components/media/SaveMediaSection';

export default function Fidesave() {
  const [prefilledUrlForSave, setPrefilledUrlForSave] = useState('');
  const searchParams = new URLSearchParams(window.location.search);
  const initialUrl = searchParams.get('url');

  useEffect(() => {
    if (initialUrl) {
      setPrefilledUrlForSave(decodeURIComponent(initialUrl));
    }
  }, [initialUrl]);

  return (
    <div className="min-h-screen bg-background py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 text-primary mb-6 mx-auto border border-primary/20 shadow-inner"
          >
            <DownloadCloud size={40} />
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-display font-black text-foreground mb-4 tracking-tighter">
            Fide<span className="text-primary">Save</span> Media
          </h1>
          <p className="text-lg text-foreground/60 max-w-xl mx-auto font-medium">
            Analyze, preview, and download publicly accessible videos, audios, and images with secure high-speed streaming.
          </p>
        </div>

        <div className="space-y-10">
          <SaveMediaSection initialUrl={prefilledUrlForSave} />
        </div>

        {/* Requirements & Info Section */}
        <div className="mt-24 bg-surface-bright/50 border border-border-custom rounded-[3rem] p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Info size={24} />
            </div>
            <h3 className="text-2xl font-display font-black text-foreground tracking-tight">Access & Features</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-widest text-foreground">1. Universal Save Media</h4>
              <p className="text-xs text-foreground/50 leading-relaxed font-medium">
                Save any public media link across YouTube, TikTok, Instagram, Facebook, X, Reddit, Vimeo, and direct media files directly to your device or cloud.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-widest text-foreground">2. High Fidelity Processing</h4>
              <p className="text-xs text-foreground/50 leading-relaxed font-medium">
                Every request runs through our high-speed extraction engine to ensure you get original audio/video bitrates without compression.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
