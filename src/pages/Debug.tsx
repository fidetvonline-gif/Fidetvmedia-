import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Terminal, Shield, Play, AlertCircle, CheckCircle, 
  Database, Globe, Server, Activity, Bug, RefreshCw,
  Search, ExternalLink, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import UniversalPlayer from '@/components/streaming/UniversalPlayer';

export default function Debug() {
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);
  const [logs, setLogs] = useState<{time: string, type: string, msg: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerState, setPlayerState] = useState<string>('idle');
  const [playerError, setPlayerError] = useState<any>(null);

  const addLog = (type: string, msg: string) => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), type, msg }, ...prev].slice(0, 50));
    console.log(`[DEBUG PAGE] [${type}] ${msg}`);
  };

  useEffect(() => {
    const fetchChannels = async () => {
      addLog('DATABASE', 'Fetching channels from tv_channels...');
      try {
        const { data, error } = await supabase.from('tv_channels').select('*');
        if (error) throw error;
        setChannels(data || []);
        addLog('DATABASE', `Successfully loaded ${data?.length || 0} channels.`);
      } catch (err: any) {
        addLog('DATABASE_ERROR', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchChannels();
  }, []);

  const testStreams = [
    { name: 'Mux Test HLS', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', category: 'Test' },
    { name: 'Big Buck Bunny MP4', url: 'https://www.w3schools.com/html/mov_bbb.mp4', category: 'Test' },
    { name: 'YouTube Live Test', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk', category: 'Test' },
    { name: 'SportyTV HLS (Limex)', url: 'https://cdn.sh-cdn.com/sh/sportytv_ng/playlist.m3u8', category: 'Live' }
  ];

  const handleSelect = (ch: any) => {
    setSelectedChannel(ch);
    setPlayerError(null);
    setPlayerState('initializing');
    addLog('FRONTEND', `Selected channel: ${ch.name}`);
    addLog('FRONTEND', `URL: ${ch.url}`);
    
    const isYT = ch.url.includes('youtube.com') || ch.url.includes('youtu.be');
    addLog('FRONTEND', `Detected Type: ${isYT ? 'YouTube' : 'HLS/Direct'}`);
    
    if (!isYT) {
      const proxyUrl = `/api/proxy-stream?url=${encodeURIComponent(ch.url)}`;
      addLog('PROXY', `Expected internal proxy URL: ${proxyUrl}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-8 font-mono text-sm">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <Bug className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">Signal Debugging Console</h1>
              <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-1">
                FideTV Engine v1.0.4 • Deep Stream Inspection
              </p>
            </div>
          </div>
          <div className="flex gap-2">
             <button 
               onClick={() => window.location.reload()}
               className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center gap-2 transition-all"
             >
                <RefreshCw className="w-4 h-4" />
                Reload Engine
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Channel Selector */}
          <div className="lg:col-span-3 flex flex-col gap-4">
             <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-4 text-[#e24b4a]">
                   <Database className="w-4 h-4" />
                   <span className="text-[10px] font-black uppercase">Database Channels</span>
                </div>
                <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                   {loading ? (
                     <div className="animate-pulse text-white/20 text-[10px]">Querying Supabase...</div>
                   ) : channels.map(ch => (
                     <button
                       key={ch.id}
                       onClick={() => handleSelect(ch)}
                       className={cn(
                         "text-left p-2 rounded-lg text-[10px] transition-all truncate",
                         selectedChannel?.id === ch.id ? "bg-[#e24b4a] text-white" : "hover:bg-white/5 text-white/60"
                       )}
                     >
                        {ch.name}
                     </button>
                   ))}
                </div>
             </div>

             <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
                <div className="flex items-center gap-2 mb-4 text-blue-400">
                   <Activity className="w-4 h-4" />
                   <span className="text-[10px] font-black uppercase">Hardwired Tests</span>
                </div>
                <div className="flex flex-col gap-1">
                   {testStreams.map((ch, i) => (
                     <button
                       key={i}
                       onClick={() => handleSelect(ch)}
                       className={cn(
                         "text-left p-2 rounded-lg text-[10px] transition-all truncate",
                         selectedChannel?.url === ch.url ? "bg-blue-500 text-white" : "hover:bg-white/5 text-white/60"
                       )}
                     >
                        {ch.name}
                     </button>
                   ))}
                </div>
             </div>
          </div>

          {/* Player & State */}
          <div className="lg:col-span-6 flex flex-col gap-6">
              <div className="bg-black rounded-[2rem] border border-white/10 aspect-video overflow-hidden relative shadow-2xl">
                {selectedChannel ? (
                  <UniversalPlayer 
                    channel={selectedChannel}
                    autoPlay={true}
                    muted={false}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10">
                     <Play className="w-16 h-16 opacity-10" />
                     <p className="text-[10px] mt-4 font-black uppercase tracking-[0.2em]">Select Target to Begin</p>
                  </div>
                )}
              </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
                   <h3 className="text-[10px] font-black text-white/40 uppercase mb-4">Inspection Report</h3>
                   <div className="space-y-3">
                      <div className="flex justify-between">
                         <span className="text-white/20 text-[9px] uppercase">State</span>
                         <span className="text-green-400 font-bold">{playerState.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                         <span className="text-white/20 text-[9px] uppercase">Errors</span>
                         <span className={cn("font-bold", playerError ? "text-red-500" : "text-green-500")}>
                           {playerError ? 'DETECTED' : 'NONE'}
                         </span>
                      </div>
                   </div>
                </div>
                <div className="bg-white/5 rounded-2xl border border-white/10 p-5">
                   <h3 className="text-[10px] font-black text-white/40 uppercase mb-4">URL Analysis</h3>
                   <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                         <span className="text-white/20 text-[9px] uppercase">Source URL</span>
                         <span className="text-[9px] break-all text-white/60">{selectedChannel?.url || 'n/a'}</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

          {/* Logging Terminal */}
          <div className="lg:col-span-3 flex flex-col gap-4">
             <div className="bg-black/90 rounded-2xl border border-white/10 h-[600px] flex flex-col shadow-2xl">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-green-500" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-green-500">Live Telemetry</span>
                   </div>
                   <button 
                     onClick={() => setLogs([])}
                     className="text-[8px] font-bold text-white/30 hover:text-white uppercase"
                   >
                     Clear
                   </button>
                </div>
                <div className="flex-grow overflow-y-auto p-4 flex flex-col-reverse gap-3 custom-scrollbar">
                   {logs.map((log, i) => (
                     <div key={i} className="flex flex-col gap-1 border-l-2 border-white/5 pl-3 py-1">
                        <div className="flex items-center gap-2">
                           <span className="text-[8px] text-white/20">{log.time}</span>
                           <span className={cn(
                             "text-[8px] font-black px-1.5 py-0.5 rounded",
                             log.type.includes('ERROR') ? "bg-red-500/20 text-red-500" :
                             log.type === 'PROXY' ? "bg-blue-500/20 text-blue-500" :
                             log.type === 'DATABASE' ? "bg-purple-500/20 text-purple-500" :
                             "bg-green-500/20 text-green-500"
                           )}>{log.type}</span>
                        </div>
                        <p className="text-[10px] text-white/60 leading-relaxed break-words">{log.msg}</p>
                     </div>
                   ))}
                   {logs.length === 0 && (
                     <div className="h-full flex items-center justify-center opacity-20 italic">
                        No events captured yet...
                     </div>
                   )}
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
