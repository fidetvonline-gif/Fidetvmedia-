
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { detectStreamType } from '@/lib/streaming';
import { analyzeChannelHealth } from '@/lib/streamValidation';
import UniversalPlayer from '@/components/streaming/UniversalPlayer';
import { DEFAULT_CHANNELS } from '@/constants/channels';
import { Activity, ShieldCheck, Zap, AlertCircle, RefreshCw, ExternalLink, Play, Signal, Tv } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SignalDebug() {
  const [dbChannels, setDbChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthResults, setHealthResults] = useState<Record<string, any>>({});
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    setLoading(true);
    const { data } = await supabase.from('tv_channels').select('*');
    if (data) setDbChannels(data);
    setLoading(false);
  };

  const allChannels = useMemo(() => {
    const base = [...DEFAULT_CHANNELS];
    dbChannels.forEach(dbCh => {
      const idx = base.findIndex(c => c.id === dbCh.id);
      const mapped = {
        id: dbCh.id,
        name: dbCh.name,
        category: dbCh.category || 'General',
        thumbnail: dbCh.thumbnail || 'https://images.unsplash.com/photo-1540655037529-dec987208707',
        url: dbCh.url,
        icon: Tv,
        description: dbCh.description || 'Channel stream.',
        isLive: true
      };
      if (idx > -1) base[idx] = mapped;
      else base.push(mapped);
    });
    return base;
  }, [dbChannels]);

  const checkHealth = async (channel: any) => {
    setRefreshing(channel.id);
    const result = await analyzeChannelHealth(channel);
    setHealthResults(prev => ({ ...prev, [channel.id]: result }));
    setRefreshing(null);
  };

  const checkAll = async () => {
    for (const ch of allChannels) {
      await checkHealth(ch);
    }
  };

  const [testPlayerChannel, setTestPlayerChannel] = useState<any>(null);

  const testStreams = [
    { id: 'test-mp4', name: 'Test MP4 (W3C)', url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
    { id: 'test-hls', name: 'Test HLS (Mux)', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
    { id: 'test-yt', name: 'Test YouTube', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-black uppercase tracking-tighter mb-6">Signal Bridge Debug</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                <h2 className="text-lg font-black uppercase tracking-widest mb-4">Phase 3: Verify Known Streams</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {testStreams.map(ts => (
                    <div key={ts.id} className="bg-black/40 rounded-xl p-4 border border-white/5">
                    <h3 className="text-sm font-bold mb-2">{ts.name}</h3>
                    <button 
                        onClick={() => {
                            setTestPlayerChannel({ name: ts.name, url: ts.url });
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary rounded-lg text-xs font-bold uppercase transition hover:bg-primary/90"
                    >
                        <Play className="w-3 h-3" />
                        Load
                    </button>
                    </div>
                ))}
                </div>
            </div>

            <div className="bg-black rounded-2xl p-2 border border-white/10 overflow-hidden">
                {testPlayerChannel ? (
                    <UniversalPlayer channel={testPlayerChannel} />
                ) : (
                    <div className="flex items-center justify-center h-full text-white/20 font-bold uppercase tracking-widest">
                        Player Idle
                    </div>
                )}
            </div>
           </div>
        </header>
        
        {/* ... existing code ... */}

        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="flex items-center justify-center p-20">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : allChannels.map(ch => {
            const type = detectStreamType(ch.url);
            const health = healthResults[ch.id];
            
            return (
              <div key={ch.id} className="bg-white/5 border border-white/5 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.07] transition-all">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-black overflow-hidden flex-shrink-0">
                    <img src={ch.thumbnail} alt="" className="w-full h-full object-cover opacity-50" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black leading-tight mb-1">{ch.name}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {type}
                      </span>
                      <span className="text-[10px] font-mono text-white/20 truncate max-w-[200px]">
                        {ch.url}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                  {health ? (
                    <>
                      <div className={cn("flex items-center gap-1.5 text-xs font-black uppercase", health.valid ? "text-green-500" : "text-primary")}>
                        {health.valid ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {health.valid ? 'Active' : 'Offline'}
                      </div>
                      <span className="text-[9px] font-mono text-white/40">
                         {health.errorMessage || `HTTP ${health.httpStatus}`}
                      </span>
                      <span className="text-[9px] font-mono text-white/20">
                         Checked: {new Date(health.lastChecked).toLocaleTimeString()}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs font-black uppercase text-white/10 italic">Unchecked</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                    <button 
                      onClick={() => checkHealth(ch)}
                      disabled={refreshing === ch.id}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
                    >
                      <RefreshCw className={cn("w-4 h-4 text-white/60", refreshing === ch.id && "animate-spin")} />
                    </button>
                    <a 
                      href={ch.url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
                    >
                      <ExternalLink className="w-4 h-4 text-white/60" />
                    </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
