import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import LiveChat from '@/components/LiveChat';
import { BatchChannelImport } from '@/components/BatchChannelImport';
import { 
  Users, Share2, Tv, RefreshCw,
  Signal, Activity, Video, X, Upload, Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_CHANNELS } from '@/constants/channels';
import { mergeChannels } from '@/lib/channelUtils';
import OptimizedImage from '@/components/OptimizedImage';
import UniversalPlayer from '@/components/streaming/UniversalPlayer';

const formatChannelUrl = (url: string) => {
  if (!url) return '';
  if (url.length === 11 && !url.includes('/') && !url.includes('.')) {
    return `https://www.youtube.com/watch?v=${url}`;
  }
  return url;
};

export default function Live() {
  const [dbChannels, setDbChannels] = useState<any[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [directStreamUrl, setDirectStreamUrl] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email === 'fidetvonline@gmail.com') setIsAdmin(true);

        const [channelsRes, settingsRes] = await Promise.all([
          supabase.from('tv_channels').select('*').eq('is_active', true).limit(100),
          supabase.from('site_settings').select('*')
        ]);

        if (channelsRes.data && channelsRes.data.length > 0) {
          setDbChannels(channelsRes.data);
          setActiveChannelId(channelsRes.data[0].id);
        } else if (DEFAULT_CHANNELS.length > 0) {
          setActiveChannelId(DEFAULT_CHANNELS[0].id);
        }

        if (settingsRes.data) {
          const direct = settingsRes.data.find(s => s.key === 'direct_stream_hls_url')?.value;
          if (direct) setDirectStreamUrl(direct);
        }
      } catch (err) {
        console.error('Init failure:', err);
        if (DEFAULT_CHANNELS.length > 0) setActiveChannelId(DEFAULT_CHANNELS[0].id);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const allChannels = useMemo(() => {
    let base = mergeChannels(DEFAULT_CHANNELS, dbChannels);

    if (directStreamUrl) {
      base.unshift({
        id: 'pro-direct',
        name: 'Direct Studio Stream',
        category: 'Pro Member',
        thumbnail: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30',
        url: formatChannelUrl(directStreamUrl),
        icon: Video,
        description: 'Direct live stream from OBS Studio.',
        isLive: true
      });
    }
    return base;
  }, [dbChannels, directStreamUrl]);

  const categories = useMemo(() => {
    return ['All', ...new Set(allChannels.map(c => c.category))];
  }, [allChannels]);

  const filteredChannels = useMemo(() => {
    if (categoryFilter === 'All') return allChannels;
    return allChannels.filter(c => c.category === categoryFilter);
  }, [allChannels, categoryFilter]);

  const activeChannel = useMemo(() => 
    allChannels.find(c => c.id === activeChannelId) || allChannels[0]
  , [allChannels, activeChannelId]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Watch ${activeChannel?.name} on FideTV`, url: window.location.href });
      } catch (e) { console.error(e); }
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center bg-[#0a0a0f] gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-[#e24b4a]/10 border-t-[#e24b4a] rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-[#e24b4a]/20 rounded-full animate-pulse" />
          </div>
        </div>
        <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Initializing Signal...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-full bg-[#0a0a0f] text-white selection:bg-[#e24b4a] selection:text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative w-full pt-6 px-6 lg:px-12 flex flex-col gap-6 max-w-[1600px] mx-auto">
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
               <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-[#e24b4a] rounded flex items-center gap-2 shadow-[0_0_20px_rgba(226,75,74,0.3)]">
                     <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-white">On Air</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-none">
                     {activeChannel?.name}
                  </h1>
               </div>
               <p className="text-sm text-white/40 max-w-2xl font-medium">
                  {activeChannel?.description}
               </p>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={handleShare} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">
                  <Share2 className="w-5 h-5 text-white/60" />
               </button>
               <button onClick={() => setRefreshKey(prev => prev + 1)} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5">
                  <RefreshCw className={cn("w-5 h-5 text-white/60", refreshKey > 0 && "animate-spin")} />
               </button>
            </div>
         </div>

         {/* Cinematic Stage - Replaced with UniversalPlayer */}
         <div className="w-full max-w-[1200px] mx-auto">
            {activeChannel ? (
               <UniversalPlayer 
                  key={`${activeChannel.id}-${refreshKey}`}
                  channel={activeChannel} 
               />
            ) : (
               <div className="w-full aspect-video rounded-[2rem] bg-black border border-white/5 flex flex-col items-center justify-center gap-6 text-white/10">
                  <Signal className="w-24 h-24 stroke-[1px] animate-pulse" />
                  <h3 className="text-xl font-black uppercase tracking-widest">No Signal Identified</h3>
               </div>
            )}
         </div>
      </section>

      {/* Stat Bar */}
      <section className="px-6 lg:px-12 py-8">
         <div className="w-full bg-white/5 border border-white/5 rounded-[2rem] p-6 lg:px-12 flex flex-wrap items-center justify-between gap-8">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-[#e24b4a]/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#e24b4a]" />
               </div>
               <div className="flex flex-col">
                  <span className="text-2xl font-black text-white">{Math.floor(Math.random() * 5000 + 2000).toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Live Viewers</span>
               </div>
            </div>
            
            <div className="w-px h-12 bg-white/5 hidden md:block" />

            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <Tv className="w-6 h-6 text-blue-500" />
               </div>
               <div className="flex flex-col">
                  <span className="text-2xl font-black text-white">{allChannels.length}</span>
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Active Channels</span>
               </div>
            </div>

            <div className="w-px h-12 bg-white/5 hidden md:block" />

            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-green-500" />
               </div>
               <div className="flex flex-col">
                  <span className="text-2xl font-black text-white">24+</span>
                  <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Shows Today</span>
               </div>
            </div>

            {isAdmin && (
               <button 
                 onClick={() => setIsImportModalOpen(true)}
                 className="flex items-center gap-3 px-6 py-4 bg-[#e24b4a] hover:bg-[#e24b4a]/90 rounded-2xl text-white transition-all shadow-lg shadow-[#e24b4a]/20 font-black uppercase tracking-widest text-[10px]"
               >
                  <Upload className="w-4 h-4" />
                  Admin Control
               </button>
            )}
         </div>
      </section>

      {/* Channel Section */}
      <section className="px-6 lg:px-12 pb-12 flex flex-col gap-8">
         <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-black uppercase tracking-widest text-white/80">Discover Channels</h2>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-4 custom-scrollbar">
               {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border",
                      categoryFilter === cat 
                        ? "bg-[#e24b4a] text-white border-[#e24b4a] shadow-lg shadow-[#e24b4a]/20" 
                        : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white"
                    )}
                  >
                     {cat}
                  </button>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredChannels.slice(0, 12).map((channel) => (
               <motion.button
                 key={channel.id}
                 layout
                 onClick={() => {
                   setActiveChannelId(channel.id);
                   window.scrollTo({ top: 0, behavior: 'smooth' });
                 }}
                 className={cn(
                   "group relative flex flex-col bg-white rounded-[2rem] p-4 transition-all duration-500 text-left",
                   activeChannelId === channel.id ? "ring-4 ring-[#e24b4a]" : "hover:scale-[1.02]"
                 )}
               >
                  <div className="w-full aspect-[16/10] rounded-[1.5rem] overflow-hidden relative mb-4">
                     <OptimizedImage 
                       src={channel.thumbnail} 
                       className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" 
                     />
                     <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                     <div className="absolute top-4 left-4">
                        <div className="px-2.5 py-1 bg-[#e24b4a] rounded-lg flex items-center gap-1.5 shadow-lg">
                           <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                           <span className="text-[8px] font-black uppercase tracking-widest text-white">Live</span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 px-2">
                     <span className="text-[10px] font-black text-[#e24b4a] uppercase tracking-widest opacity-60">
                        {channel.category}
                     </span>
                     <h3 className="text-lg font-black text-[#0a0a0f] leading-tight line-clamp-1">
                        {channel.name}
                     </h3>
                     <p className="text-xs text-[#0a0a0f]/40 font-medium line-clamp-1 mt-1">
                        {channel.description}
                     </p>
                  </div>
               </motion.button>
            ))}
         </div>
      </section>

      {/* Chat Section */}
      <section className="px-6 lg:px-12 pb-20 max-w-[1200px] mx-auto w-full">
         <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white tracking-tighter">Global Chat</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-lg text-green-500 text-[9px] font-black uppercase tracking-widest">
               <Zap className="w-3 h-3" />
               Realtime
            </div>
         </div>
         <div className="h-[600px] w-full bg-white/5 border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-xl">
            <LiveChat eventId={`ch_${activeChannelId}`} />
         </div>
      </section>

      {/* Admin Import Modal */}
      {isAdmin && isImportModalOpen && (
         <div className="fixed inset-0 bg-[#0a0a0f]/95 z-[200] flex items-center justify-center p-8 backdrop-blur-2xl">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="w-full max-w-4xl max-h-[90vh] bg-white rounded-[3rem] p-10 flex flex-col relative overflow-hidden text-[#0a0a0f]"
            >
               <button onClick={() => setIsImportModalOpen(false)} className="absolute top-8 right-8 p-3 hover:bg-black/5 rounded-2xl transition-all">
                  <X className="w-6 h-6" />
               </button>
               <h2 className="text-3xl font-black uppercase tracking-tighter mb-8">Channel Ingest Console</h2>
               <div className="flex-grow overflow-y-auto custom-scrollbar pr-4">
                  <BatchChannelImport 
                    onClose={() => setIsImportModalOpen(false)} 
                    onImportComplete={() => {
                        setIsImportModalOpen(false);
                        window.location.reload();
                    }} 
                  />
               </div>
            </motion.div>
         </div>
      )}
    </div>
  );
}
