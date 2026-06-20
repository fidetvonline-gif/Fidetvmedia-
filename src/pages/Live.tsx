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

import { preloadManager } from '../lib/preloadManager';

export default function Live() {
  const [dbChannels, setDbChannels] = useState<any[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('');
  const [failedChannelIds, setFailedChannelIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [directStreamUrl, setDirectStreamUrl] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        console.log('[Live] Initializing Signal Bridge...');
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        
        if (authError) {
          console.error('[Live] Auth state check failed:', authError.message);
        }

        if (session?.user?.email === 'fidetvonline@gmail.com') {
          console.log('[Live] Administrator session verified.');
          setIsAdmin(true);
        }

        // Fast fetch for first batch to unlock interaction instantly
        const fetchInitialBatch = async () => {
          let { data, error } = await supabase
            .from('tv_channels')
            .select('*')
            .eq('is_active', true)
            .order('order_index')
            .range(0, 199);
          
          // CRITICAL FALLBACK: If RLS returns 0 rows or error, try the Server Bridge
          if (error || !data || data.length === 0) {
            console.warn('[Live] Supabase access restricted or empty. Attempting Signal Bridge fallback...');
            try {
              const fallbackRes = await fetch('/api/channels');
              if (fallbackRes.ok) {
                const fallbackData = await fallbackRes.json();
                console.log(`[Live] Signal Bridge restored ${fallbackData.length} channels.`);
                return { data: fallbackData.slice(0, 200), error: null };
              }
            } catch (e) {
              console.error('[Live] Signal Bridge fallback failed:', e);
            }
          }

          if (error) {
            console.error('[Live] fetchInitialBatch encountered error:', error);
          }
          
          // ABSOLUTE FINAL FALLBACK: If we still have no data, use the hardcoded defaults
          if (!data || data.length === 0) {
            console.warn('[Live] All remote and bridge sources failed. Activating Hardcoded Safety Signals.');
            return { data: DEFAULT_CHANNELS, error: null };
          }

          return { data: data || [], error: null };
        };

        const [channelsRes, settingsRes] = await Promise.all([
          fetchInitialBatch(),
          supabase.from('site_settings').select('*')
        ]);

        if (channelsRes.error) {
          console.warn('[Live] Primary tv_channels check failed:', channelsRes.error.message);
        } else if (channelsRes.data && channelsRes.data.length > 0) {
          console.log(`[Live] Initial batch of ${channelsRes.data.length} channels loaded.`);
          setDbChannels(channelsRes.data);
          
          // Predictive Pre-connection: Warm up TLS/DNS for top providers
          try {
            const uniqueDomains = new Set<string>();
            channelsRes.data.slice(0, 30).forEach((c: any) => {
              if (c.url) {
                const domain = new URL(c.url).origin;
                uniqueDomains.add(domain);
              }
            });
            uniqueDomains.forEach(domain => preloadManager.preconnect(domain));
          } catch (e) {}

          const randomIndex = Math.floor(Math.random() * channelsRes.data.length);
          setActiveChannelId(selectedChannelIdFromQuery || channelsRes.data[randomIndex].id);

          // Background deep fetch for the rest without blocking
          (async () => {
             let allData = [...channelsRes.data];
             let rangeStart = 200;
             const rangeSize = 500; // Smaller batches for more frequent non-blocking updates
             let hasMore = channelsRes.data.length === 200;

             while (hasMore) {
                const { data, error } = await supabase
                  .from('tv_channels')
                  .select('*')
                  .eq('is_active', true)
                  .order('order_index')
                  .range(rangeStart, rangeStart + rangeSize - 1);
                
                if (error || !data || data.length === 0) {
                   hasMore = false;
                } else {
                   allData = [...allData, ...data];
                   // Only update state every 2 batches to reduce re-renders
                   if (allData.length % 2000 === 0 || data.length < rangeSize) {
                     setDbChannels([...allData]);
                   }
                   if (data.length < rangeSize) hasMore = false;
                   rangeStart += rangeSize;
                }
             }
             console.log(`[Live] Background sync complete. Total: ${allData.length} channels.`);
          })();
        }

        if (settingsRes.data) {
          const direct = settingsRes.data.find(s => s.key === 'direct_stream_hls_url')?.value;
          if (direct) setDirectStreamUrl(direct);
        }
      } catch (err: any) {
        console.error('[Live] Signal Initialization Failure:', err);
      } finally {
        setLoading(false);
      }
    };
    
    // Parse URL for specific channel deep links
    const params = new URLSearchParams(window.location.search);
    const selectedChannelIdFromQuery = params.get('ch');
    
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
    const cats = new Set(allChannels.map(c => c.category || 'General'));
    return ['Featured', ...Array.from(cats)];
  }, [allChannels]);

  const [visibleItemsPerCategory, setVisibleItemsPerCategory] = useState<Record<string, number>>({});

  const filteredChannelsByCategory = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    const query = searchQuery.toLowerCase();
    
    allChannels.forEach(c => {
      const nameMatch = c.name.toLowerCase().includes(query);
      const catMatch = (c.category || 'Live Channels').toLowerCase().includes(query);
      const countryMatch = (c.country || '').toLowerCase().includes(query);
      
      if (nameMatch || catMatch || countryMatch) {
        // Special logic: default channels without a clear category go to 'Featured'
        let cat = c.category || 'Live Channels';
        
        // If it's a default channel, move to Featured for prominence
        const isDefault = DEFAULT_CHANNELS.some(dc => dc.id === c.id);
        if (isDefault) {
          cat = 'Featured';
        }

        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(c);
      }
    });

    return grouped;
  }, [allChannels, searchQuery]);

  const sortedCategoryKeys = useMemo(() => {
    const important = ['Featured', 'Football', 'Sports', 'News', 'Movies', 'Entertainment', 'Nigerian TV'];
    return Object.keys(filteredChannelsByCategory).sort((a, b) => {
        const aIdx = important.indexOf(a);
        const bIdx = important.indexOf(b);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return a.localeCompare(b);
    });
  }, [filteredChannelsByCategory]);

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

  const playRandomChannel = () => {
    const playableChannels = allChannels.filter(c => !failedChannelIds.has(c.id));
    if (playableChannels.length > 0) {
      const randomIndex = Math.floor(Math.random() * playableChannels.length);
      setActiveChannelId(playableChannels[randomIndex].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (allChannels.length > 0) {
      // Fallback if somehow everything is marked failed, reset but this shouldn't happen usually
      const randomIndex = Math.floor(Math.random() * allChannels.length);
      setActiveChannelId(allChannels[randomIndex].id);
    }
  };

  const handleChannelError = async (id: string) => {
    console.log(`[Live] Channel ${id} failed. Tracking for session blacklist.`);
    
    // Explicit Database Diagnostic Check
    try {
      console.log(`[Diagnostic] Verifying database access for channel: ${id}...`);
      const { data, error, status, statusText } = await supabase
        .from('tv_channels')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        console.error(`[Diagnostic] Database Error Code: ${error.code}`);
        console.error(`[Diagnostic] Database Error Details: ${error.message} - ${error.details || 'No details'}`);
        if (error.code === 'PGRST116' || error.message.includes('row level security')) {
            console.error('[Diagnostic] Conclusion: Supabase Row Level Security (RLS) is likely blocking access or the row does not exist.');
        } else {
            console.error('[Diagnostic] Conclusion: Database query failed, potential connectivity or network issue.');
        }
      } else if (data) {
        console.log(`[Diagnostic] Database Check Passed. Row found for ${id}.`);
        console.log(`[Diagnostic] Row URL: ${data.url}`);
        console.log('[Diagnostic] Conclusion: Database is fully accessible. Failure is due to Media Signal Bridge or actual stream failure (e.g. CORS, offline source, HLS parser error).');
      }
    } catch (dbErr) {
       console.error('[Diagnostic] Critical Network or Try/Catch Error while reaching Supabase:', dbErr);
    }

    setFailedChannelIds(prev => new Set(prev).add(id));
    
    // Auto-skip logic with circuit breaker
    setTimeout(() => {
      // Only skip if the failed channel is still the active one
      setActiveChannelId(current => {
        if (current === id) {
          const playableChannels = allChannels.filter(c => !failedChannelIds.has(c.id) && c.id !== id);
          
          if (playableChannels.length === 0) {
            console.warn('[Live] All channels in current view failed. Resetting blacklist to try again.');
            setFailedChannelIds(new Set());
            return current;
          }
          
          const randomIndex = Math.floor(Math.random() * playableChannels.length);
          const nextChannel = playableChannels[randomIndex];
          
          console.log(`[Live] Auto-skipping to ${nextChannel.name}`);
          return nextChannel.id;
        }
        return current;
      });
    }, 2000);
  };

  const [scrolledPastPlayer, setScrolledPastPlayer] = useState(false);
  const playerSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!playerSectionRef.current) return;
      const rect = playerSectionRef.current.getBoundingClientRect();
      // If the player section's bottom is above the top of the viewport (with some buffer)
      setScrolledPastPlayer(rect.bottom < 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    <div className="flex flex-col w-full min-h-screen bg-[#0a0a0f] text-white selection:bg-[#e24b4a] selection:text-white relative">
      {/* Mini Player Overlay */}
      <AnimatePresence>
        {scrolledPastPlayer && activeChannel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 50 }}
            className="fixed bottom-8 right-4 md:right-8 w-[280px] md:w-80 aspect-video z-[100] bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-4 ring-[#e24b4a]/20"
          >
            <div className="absolute top-0 left-0 w-full p-2 bg-gradient-to-b from-black/60 to-transparent z-10">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/80 truncate px-2">
                Now Playing: {activeChannel.name}
              </p>
            </div>
            <UniversalPlayer 
              channel={activeChannel}
              autoPlay={true}
              muted={false}
              className="w-full h-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section ref={playerSectionRef} className="relative w-full pt-32 px-6 lg:px-12 flex flex-col gap-6 max-w-[1600px] mx-auto">
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
               <div className="flex items-center gap-3 mt-1">
                 <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#e24b4a]">
                   {activeChannel?.category || 'General'}
                 </span>
                 {activeChannel?.country && (
                   <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/40">
                     • {activeChannel.country}
                   </span>
                 )}
               </div>
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
                  muted={scrolledPastPlayer}
                  onError={(err) => {
                     handleChannelError(activeChannel.id);
                  }}
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
      <section className="px-6 lg:px-12 pb-12 flex flex-col gap-12">
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
          <input
            type="text"
            placeholder="Search by name, category, or country..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#e24b4a] transition-all"
          />
          
          <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar scroll-smooth">
            {sortedCategoryKeys.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  const el = document.getElementById(`cat-${cat.replace(/\s+/g, '-')}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="whitespace-nowrap px-6 py-2.5 rounded-xl bg-white/5 hover:bg-[#e24b4a] text-white/50 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 active:scale-95 hover:shadow-lg hover:shadow-[#e24b4a]/20"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

         {sortedCategoryKeys.map(category => {
            const channels = filteredChannelsByCategory[category];
            const visibleLimit = visibleItemsPerCategory[category] || 12;
            const shownChannels = channels.slice(0, visibleLimit);
            const hasMore = channels.length > visibleLimit;

            return (
              <div 
                key={category} 
                id={`cat-${category.replace(/\s+/g, '-')}`} 
                className="flex flex-col gap-6 scroll-mt-24"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black uppercase tracking-widest text-white/40">{category}</h2>
                  <span className="text-[10px] font-bold text-white/20">{channels.length} Channels</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                  {shownChannels.map((channel) => (
                    <motion.button
                      key={channel.id}
                      layout
                      onClick={() => {
                        setActiveChannelId(channel.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onMouseEnter={() => {
                        // Start preloading the stream as soon as user hovers
                        if (channel.url && (channel.stream_type === 'hls' || !channel.stream_type)) {
                          preloadManager.preloadStream(channel.url);
                        }
                      }}
                      className={cn(
                        "group relative flex flex-col bg-white rounded-[2rem] p-4 transition-all duration-500 text-left h-full",
                        activeChannelId === channel.id ? "ring-4 ring-[#e24b4a]" : "hover:scale-[1.02]"
                      )}
                    >
                      <div className="w-full aspect-[16/10] rounded-[1.5rem] overflow-hidden relative mb-4 flex-shrink-0">
                        <OptimizedImage 
                          src={channel.thumbnail || channel.logo} 
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
                      
                      <div className="flex flex-col gap-1 px-2 flex-grow">
                        <h3 className="text-sm font-black text-[#0a0a0f] leading-tight line-clamp-2">
                            {channel.name}
                        </h3>
                        {channel.country && (
                          <div className="text-[8px] font-bold text-[#e24b4a] uppercase tracking-widest mt-1">
                            {channel.country}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
                
                {hasMore && (
                  <div className="flex justify-center mt-4">
                    <button 
                      onClick={() => setVisibleItemsPerCategory(prev => ({
                        ...prev,
                        [category]: (prev[category] || 12) + 24
                      }))}
                      className="px-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white/60 text-[10px] font-black uppercase tracking-widest transition-all border border-white/5"
                    >
                      Load More in {category}
                    </button>
                  </div>
                )}
              </div>
            );
         })}
      </section>

      {/* Chat Section */}
      <section className="px-6 lg:px-12 pb-32 max-w-[1200px] mx-auto w-full relative z-10">
         <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white tracking-tighter">Global Chat</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-lg text-green-500 text-[9px] font-black uppercase tracking-widest">
               <Zap className="w-3 h-3" />
               Realtime
            </div>
         </div>
         <div className="h-[600px] w-full bg-white/5 border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-xl shadow-2xl">
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
