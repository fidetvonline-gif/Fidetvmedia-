import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Video, Copy, ExternalLink, RefreshCw, Check, AlertCircle, Info, Radio, Zap, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export default function StreamManager() {
  const [streamKey, setStreamKey] = useState<string>('');
  const [playbackUrl, setPlaybackUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Generate a mock stream key if none exists
  useEffect(() => {
    const savedKey = localStorage.getItem('fidetv_stream_key');
    if (savedKey) {
      setStreamKey(savedKey);
    } else {
      const newKey = `fide_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString(36)}`;
      setStreamKey(newKey);
      localStorage.setItem('fidetv_stream_key', newKey);
    }

    const savedUrl = localStorage.getItem('fidetv_playback_url');
    if (savedUrl) setPlaybackUrl(savedUrl);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied({ ...isCopied, [id]: true });
    setTimeout(() => setIsCopied({ ...isCopied, [id]: false }), 2000);
  };

  const handleSavePlaybackUrl = async () => {
    setIsLoading(true);
    // In a real app, we'd save this to Supabase site_settings or a dedicated streams table
    localStorage.setItem('fidetv_playback_url', playbackUrl);
    
    // Also save to Supabase site_settings so the front-end can pick it up
    await supabase.from('site_settings').upsert({
      key: 'direct_stream_hls_url',
      value: playbackUrl,
      updated_at: new Date().toISOString()
    });

    setTimeout(() => {
      setIsLoading(false);
      alert('Playback URL updated! Your direct stream is now connected to the platform.');
    }, 1000);
  };

  const rtmpServer = 'rtmps://global-live.mux.com:443/app'; // Industry standard example
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Direct OBS Streaming</h2>
          <p className="text-foreground/40 text-sm">Connect OBS directly to your platform for zero-latency broadcasting.</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Active System</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* OBS Configuration */}
          <section className="bg-surface border border-border-custom rounded-3xl p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <Radio className="w-40 h-40" />
            </div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-bold">OBS Encoder Settings</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2 block">Server URL</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-background border border-border-custom rounded-xl px-4 py-3 font-mono text-sm text-foreground/60 overflow-x-auto whitespace-nowrap">
                    {rtmpServer}
                  </div>
                  <button 
                    onClick={() => copyToClipboard(rtmpServer, 'server')}
                    className="px-4 bg-surface-bright border border-border-custom rounded-xl hover:text-primary transition-colors"
                  >
                    {isCopied['server'] ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2 block">Stream Key</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-background border border-border-custom rounded-xl px-4 py-3 font-mono text-sm text-foreground select-all">
                    {streamKey}
                  </div>
                  <button 
                    onClick={() => copyToClipboard(streamKey, 'key')}
                    className="px-4 bg-surface-bright border border-border-custom rounded-xl hover:text-primary transition-colors"
                  >
                    {isCopied['key'] ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-primary/5 border border-primary/10 rounded-2xl flex gap-4">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-foreground/70 leading-relaxed">
                <span className="font-bold text-primary">Pro Tip:</span> Use these settings in OBS under <span className="font-mono bg-primary/10 px-1 rounded">Settings &gt; Stream</span>. 
                Select <span className="font-bold">Custom</span> as the Service.
              </div>
            </div>
          </section>

          {/* Playback Configuration */}
          <section className="bg-surface border border-border-custom rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-500/10 rounded-xl">
                <Video className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-lg font-bold">Playback Connection</h3>
            </div>

            <p className="text-sm text-foreground/60 mb-6 italic">
              Once you start streaming from OBS, the ingest provider (like Mux, YouTube, or Cloudflare) will provide an HLS (.m3u8) Playback URL. Paste it here to go live on the platform.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2 block">HLS Playback URL (.m3u8)</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={playbackUrl}
                    onChange={(e) => setPlaybackUrl(e.target.value)}
                    placeholder="https://stream.provider.com/live/index.m3u8"
                    className="flex-1 bg-background border border-border-custom rounded-xl px-4 py-3 text-sm focus:border-primary outline-none transition-all font-mono"
                  />
                  <button 
                    onClick={handleSavePlaybackUrl}
                    disabled={isLoading || !playbackUrl}
                    className="px-6 bg-primary text-white font-bold rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-surface border border-border-custom rounded-3xl p-6">
            <h4 className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-4">Quick Setup Guide</h4>
            <div className="space-y-4">
              {[
                { step: 1, text: "Open OBS Studio on your computer" },
                { step: 2, text: "Go to Settings > Stream" },
                { step: 3, text: "Set Service to 'Custom'" },
                { step: 4, text: "Copy Server URL from above into 'Server'" },
                { step: 5, text: "Copy Stream Key from above into 'Stream Key'" },
                { step: 6, text: "Click 'Start Streaming' in OBS" },
                { step: 7, text: "Paste your HLS playback URL below and Connect" }
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                    {item.step}
                  </span>
                  <p className="text-xs text-foreground/60 leading-tight">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-primary border border-primary/20 rounded-3xl p-6 text-white overflow-hidden relative group">
            <Zap className="absolute -bottom-4 -right-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform duration-700" />
            <h4 className="font-bold mb-2">Need a Streaming Provider?</h4>
            <p className="text-xs text-white/70 mb-4 leading-relaxed">
              To host your own RTMP ingest and transcode to HLS automatically, we recommend using <span className="font-bold text-white">Mux Video</span> or <span className="font-bold text-white">Cloudflare Stream</span>.
            </p>
            <a 
              href="https://www.mux.com/video" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/20 hover:bg-white/30 px-3 py-2 rounded-full transition-colors"
            >
              Learn More <ExternalLink className="w-3 h-3" />
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
