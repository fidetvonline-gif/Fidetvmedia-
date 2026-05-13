import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { supabase } from '@/lib/supabase';
import { Event } from '@/types';
import LiveChat from '@/components/LiveChat';
import { Calendar, Users, Share2, Youtube, ExternalLink, Clock, AlertCircle, Globe, Tv, Film, MonitorPlay, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { fetchYouTubeStats, YouTubeStats, fetchRecentUploads } from '@/services/youtubeService';

import { DEFAULT_CHANNELS } from '@/constants/channels';

const Player = ReactPlayer as any;

export default function Live() {
  const [event, setEvent] = useState<Event | null>(null);
  const [dbChannels, setDbChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ytStats, setYtStats] = useState<YouTubeStats | null>(null);
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  
  const [activeChannelId, setActiveChannelId] = useState<string>('fidetv');
  const [activeTab, setActiveTab] = useState<'channels' | 'chat'>('channels');
  const [playerError, setPlayerError] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  const [isPiP, setIsPiP] = useState(false);
  const [isPiPDismissed, setIsPiPDismissed] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If the player container is not intersecting (visible), enable PiP
          if (!entry.isIntersecting) {
             setIsPiP(true);
          } else {
             setIsPiP(false);
             setIsPiPDismissed(false); // Reset dismissal when it comes back into view
          }
        });
      },
      { threshold: 0.1 }
    );

    if (playerContainerRef.current) {
      observer.observe(playerContainerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPlayerError(false);
    setIsPlayerReady(false);
  }, [activeChannelId]);

  const handlePlayerError = (e: any) => {
    console.error('Player error:', e);
    // Be more specific about errors that should trigger the error UI
    const errMsg = e?.toString() || '';
    
    // Ignore benign errors
    if (errMsg.includes('aborted') || errMsg.includes('interrupted') || errMsg.includes('NS_ERROR_DOM_MEDIA_ABORT_ERR')) {
      return;
    }
    
    setPlayerError(true);
  };

  const handlePlayerReady = () => {
    console.log('Player is ready for playback');
    setIsPlayerReady(true);
    setPlayerError(false);
  };
  useEffect(() => {
    const fetchLiveEvent = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .or('status.eq.live,status.eq.upcoming')
        .order('status', { ascending: false }) // live first
        .order('start_time', { ascending: true })
        .limit(1)
        .single();

      if (data) {
        const ev = data as Event;
        setEvent(ev);
        if (ev.youtube_id) {
          const stats = await fetchYouTubeStats(ev.youtube_id);
          setYtStats(stats);
        }
        
        const uploads = await fetchRecentUploads('UC_x5XG1OV2P6uZZ5FSM9Ttw');
        setRecentUploads(uploads);
      }
      
      // Fetch custom TV Channels
      const { data: channelsData } = await supabase
        .from('tv_channels')
        .select('*')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false });
        
      if (channelsData) {
        setDbChannels(channelsData);
      }
      
      setLoading(false);
    };

    fetchLiveEvent();

    // Listen for status changes
    const channel = supabase
      .channel('live-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, payload => {
        fetchLiveEvent();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tv_channels' }, payload => {
        fetchLiveEvent();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `Watch Live on FideTV`,
        url: url,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      alert('Stream link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const isFideTvLive = event?.status === 'live';
  const customBroadcast: any = {
    id: 'fidetv',
    name: 'Main Broadcast',
    category: 'Your Channel',
    url: event?.youtube_id ? `https://www.youtube.com/watch?v=${event.youtube_id}` : event?.stream_url,
    thumbnail: event?.thumbnail_url || 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&q=80&w=800',
    description: event?.description || 'Your live streaming channel offline.',
    isLive: isFideTvLive,
    icon: Tv,
  };

  const dynamicChannels = dbChannels.map((ch: any) => ({
    id: ch.id,
    name: ch.name,
    category: ch.category,
    thumbnail: ch.thumbnail || 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e',
    url: ch.url,
    icon: Tv, // Use a default icon since we don't have mapping in this component easily
    description: ch.description,
    isLive: ch.is_active
  }));

  const allChannels = [customBroadcast, ...dynamicChannels];
  const activeChannel = allChannels.find(c => c.id === activeChannelId) || customBroadcast;
  
  const isPlayingFideTv = activeChannel.id === 'fidetv';

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-[1920px] mx-auto lg:h-[calc(100vh-80px)] flex flex-col lg:flex-row shadow-2xl">
        
        {/* Main Watch Area */}
        <div className="flex-grow flex flex-col relative z-10 border-r border-white/5 overflow-hidden">
          {/* Signal Indicator Overlay */}
          <div className="absolute top-6 left-6 z-20 flex items-center space-x-3 pointer-events-none drop-shadow-2xl">
            <div className={cn(
              "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] flex items-center space-x-3 backdrop-blur-xl border transition-all duration-500",
              (isPlayingFideTv && isFideTvLive) || !isPlayingFideTv 
                ? "bg-red-600/90 text-white border-red-500/50" 
                : "bg-black/60 text-white border-white/10"
            )}>
              {((isPlayingFideTv && isFideTvLive) || !isPlayingFideTv) && <div className="w-2 h-2 bg-white rounded-full animate-pulse shadow-[0_0_10px_white]" />}
              <span>
                {isPlayingFideTv 
                  ? (isFideTvLive ? 'Live Broadcast' : 'Offline') 
                  : 'Live Channel'}
              </span>
            </div>
            {isPlayingFideTv && isFideTvLive && (
              <div className="hidden sm:flex px-4 py-2 bg-black/60 backdrop-blur-xl rounded-full text-[10px] font-black text-white uppercase tracking-[0.3em] border border-white/10 items-center shadow-lg transition-all">
                <div className="w-1 h-1 bg-green-500 rounded-full mr-2 shadow-[0_0_8px_#22c55e]" />
                Studio Link High
              </div>
            )}
          </div>

          {/* Player Container */}
          <div ref={playerContainerRef} className="relative w-full aspect-video lg:aspect-auto flex-grow bg-black group/player">
            <div className={cn(
               "transition-all duration-300 z-[999]",
               isPiP && !isPiPDismissed 
                 ? "fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-64 sm:w-96 aspect-video rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border-2 border-white/10 bg-black scale-100 group/pip" 
                 : "absolute inset-0 w-full h-full scale-100",
               isPiP && isPiPDismissed ? "opacity-0 pointer-events-none" : "opacity-100"
            )}>
              {isPiP && !isPiPDismissed && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsPiPDismissed(true);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-red-500 text-white rounded-full flex items-center justify-center z-[100] opacity-0 group-hover/pip:opacity-100 transition-all backdrop-blur-sm"
                  title="Close Mini-Player"
                >
                  <AlertCircle className="w-4 h-4 hidden" /> {/* Dummy icon so we can cleanly replace with an X or just use text if we want. Actually a simple text 'X' is fine here */}
                  <span className="text-xs font-bold font-sans">✕</span>
                </button>
              )}
            {playerError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111111] z-30">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-xl font-bold mb-2 text-white">Stream Unavailable</h3>
                <p className="text-white/60 text-sm mb-6 px-8 text-center italic">
                  This channel is currently having trouble loading. It might be offline or restricted in your region.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                       setPlayerError(false);
                       setActiveChannelId(activeChannelId); // Force re-render
                    }}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10 transition-all text-white"
                  >
                    Retry Loading
                  </button>
                  <a 
                    href={activeChannel.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="px-6 py-2 bg-primary hover:bg-primary/80 rounded-full text-xs font-bold uppercase tracking-widest transition-all text-white"
                  >
                    Open Source
                  </a>
                </div>
              </div>
            ) : null}

            {(!isPlayingFideTv || (isPlayingFideTv && customBroadcast.url && isFideTvLive)) ? (
              activeChannel.url?.includes('<iframe') ? (
                <div 
                  className="w-full h-full absolute inset-0 overflow-hidden" 
                >
                   <div 
                     className="w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-none"
                     dangerouslySetInnerHTML={{ 
                       __html: activeChannel.url
                         .replace(/src="([^"]+)"/, (match: string, p1: string) => {
                           const separator = p1.includes('?') ? '&' : '?';
                           return `src="${p1}${separator}autoplay=1"`;
                         })
                         .replace('<iframe', '<iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"') 
                     }} 
                   />
                </div>
              ) : (
                <Player
                  key={activeChannel.id}
                  url={activeChannel.url}
                  width="100%"
                  height="100%"
                  playing={true}
                  controls={true}
                  muted={true}
                  playsinline={true}
                  onReady={handlePlayerReady}
                  onError={handlePlayerError}
                  config={{
                    youtube: {
                      playerVars: { 
                        showinfo: 0, 
                        modestbranding: 1, 
                        rel: 0, 
                        origin: typeof window !== 'undefined' ? window.location.origin : '',
                        autoplay: 1,
                        enablejsapi: 1
                      }
                    },
                    file: {
                      attributes: {
                        controlsList: "nodownload",
                        playsInline: true,
                        autoPlay: true,
                        referrerPolicy: "no-referrer",
                        crossOrigin: "anonymous"
                      },
                      forceHLS: activeChannel.url?.toLowerCase().includes('.m3u8') || 
                               activeChannel.url?.toLowerCase().includes('playlist') || 
                               activeChannel.url?.toLowerCase().includes('/hls/'),
                      hlsOptions: {
                        enableWorker: true, // Enable worker for offloading
                        lowLatencyMode: true,
                        liveSyncDurationCount: 3, // Reduce to sync closer to live
                        manifestLoadingMaxRetry: 5,
                        levelLoadingMaxRetry: 5,
                        maxBufferLength: 30, // Limit buffer to avoid build-up
                        maxMaxBufferLength: 60,
                        xhrSetup: (xhr: any) => {
                          xhr.withCredentials = false;
                        }
                      }
                    }
                  }}
                  style={{ position: 'absolute', top: 0, left: 0 }}
                />
              )
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] overflow-hidden">
                  <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
                  {customBroadcast.thumbnail && (
                    <img src={customBroadcast.thumbnail} alt="Offline" className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />
                  
                  <div className="relative z-10 flex flex-col items-center justify-center text-center p-8 space-y-6">
                    <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-lg">
                      <Tv className="w-10 h-10 text-white/40" />
                    </div>
                    <div>
                      <h2 className="text-4xl font-display font-black tracking-tighter uppercase mb-2 text-white">Broadcast Offline</h2>
                      <p className="text-white/40 max-w-md mx-auto text-sm italic">
                        {event ? `Next Event: ${format(new Date(event.start_time), 'MMM d, yyyy @ HH:mm')}` : 'No upcoming events scheduled. Please check out other live channels.'}
                      </p>
                    </div>
                  </div>
                </div>
            )}
            </div>
            
            {/* Share action overlay */}
            <div className="absolute top-6 right-6 flex space-x-3 z-20 pointer-events-auto">
                <button 
                onClick={handleShare}
                className="p-3 bg-black/40 hover:bg-primary backdrop-blur-xl rounded-full text-white border border-white/10 transition-all opacity-0 group-hover/player:opacity-100"
                title="Share Channel"
                >
                  <Share2 className="w-5 h-5" />
                </button>
            </div>
          </div>

          {/* info bar under video */}
          <div className="h-24 lg:h-32 bg-[#0a0a0a] border-t border-white/5 flex items-center px-6 lg:px-10 shrink-0 relative overflow-hidden">
             {/* gradient flare */}
             <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[100px] rounded-full" />
             
             <div className="flex items-center justify-between w-full relative z-10 gap-x-6">
                 <div className="flex items-center gap-x-6">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 shadow-lg">
                       {activeChannel.icon ? <activeChannel.icon className="w-6 h-6 text-white/40" /> : <Tv className="w-6 h-6 text-primary" />}
                    </div>
                    <div>
                       <div className="flex items-center space-x-3 mb-1">
                          <span className="px-2 py-0.5 bg-primary/20 text-primary uppercase font-bold text-[9px] rounded tracking-wider">
                            {activeChannel.category}
                          </span>
                       </div>
                       <h2 className="text-xl lg:text-3xl font-display font-bold tracking-tight line-clamp-1 text-white">
                          {isPlayingFideTv && event?.title ? event.title : activeChannel.name}
                       </h2>
                    </div>
                 </div>

                 {isPlayingFideTv && isFideTvLive && ytStats && (
                    <div className="hidden sm:flex items-center space-x-8 px-6 py-3 bg-white/5 rounded-2xl border border-white/10">
                        <div className="flex items-center space-x-3">
                           <Users className="w-5 h-5 text-white/40" />
                           <div className="flex flex-col">
                              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Watching Now</span>
                              <span className="text-lg font-bold text-white">{ytStats.viewers}</span>
                           </div>
                        </div>
                    </div>
                 )}
             </div>
          </div>
        </div>

        {/* Sidebar / Interaction Panel */}
        <div className="w-full lg:w-[450px] xl:w-[500px] flex-shrink-0 bg-[#000000] flex flex-col h-[500px] lg:h-full z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] border-l border-white/5">
          {/* Tabs */}
          <div className="flex w-full border-b border-white/10 shrink-0">
             <button 
                onClick={() => setActiveTab('channels')}
                className={cn(
                  "flex-1 py-5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative",
                  activeTab === 'channels' ? "text-white bg-[#111111]" : "text-white/40 hover:text-white bg-[#050505]"
                )}
             >
                Channel Guide
                {activeTab === 'channels' && (
                  <motion.div layoutId="activetab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
                )}
             </button>
             <button 
                onClick={() => setActiveTab('chat')}
                className={cn(
                  "flex-1 py-5 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative flex items-center justify-center space-x-2",
                  activeTab === 'chat' ? "text-white bg-[#111111]" : "text-white/40 hover:text-white bg-[#050505]"
                )}
             >
                <span>Live Chat</span>
                <MessageSquare className="w-3 h-3" />
                {activeTab === 'chat' && (
                  <motion.div layoutId="activetab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary" />
                )}
             </button>
          </div>

          <div className="flex-grow overflow-hidden relative">
            {/* Channels List */}
            <div className={cn(
               "absolute inset-0 overflow-y-auto custom-scrollbar flex flex-col transition-all duration-300 bg-[#0a0a0a]",
               activeTab === 'channels' ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 pointer-events-none"
            )}>
              <div className="p-4 space-y-4">
                 <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-2 pt-2">Your Broadcast</h3>
                 
                 {/* Main User Channel */}
                 <button
                    onClick={() => setActiveChannelId(customBroadcast.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-2xl flex gap-x-4 items-center group transition-all duration-300 border",
                      isPlayingFideTv 
                        ? "bg-white/10 border-primary/50 shadow-[0_0_20px_rgba(242,125,38,0.15)]" 
                        : "bg-white/5 border-transparent hover:bg-white/10"
                    )}
                 >
                    <div className="w-24 h-16 rounded-lg overflow-hidden relative shrink-0 border border-white/10 shadow-lg">
                        {customBroadcast.thumbnail && <img src={customBroadcast.thumbnail} className="w-full h-full object-cover" />}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                        {isFideTvLive && (
                           <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-red-600 rounded text-[8px] font-bold text-white uppercase tracking-wider shadow-[0_0_10px_red]">
                              LIVE
                           </div>
                        )}
                    </div>
                    <div className="flex flex-col justify-center overflow-hidden">
                       <span className="text-[10px] text-primary font-bold uppercase tracking-widest mb-0.5">Primary Set</span>
                       <h4 className="text-sm font-bold text-white truncate w-full">{customBroadcast.name}</h4>
                       <p className="text-xs text-white/40 truncate w-full italic">{isPlayingFideTv && event?.title ? event.title : 'Official Stream'}</p>
                    </div>
                 </button>

                 <div className="h-px w-full bg-white/10 my-4" />
                 <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-2 pt-2">Live TV Networks</h3>

                 <div className="space-y-3">
                   {allChannels.filter(c => c.id !== 'fidetv').map((channel) => {
                     const isSelected = activeChannelId === channel.id;
                     return (
                       <button
                          key={channel.id}
                          onClick={() => setActiveChannelId(channel.id)}
                          className={cn(
                            "w-full text-left p-3 rounded-2xl flex gap-x-4 items-center group transition-all duration-300 border",
                            isSelected 
                              ? "bg-white/10 border-primary/50 shadow-[0_0_20px_rgba(242,125,38,0.15)]" 
                              : "bg-white/5 border-transparent hover:bg-white/10"
                          )}
                       >
                          <div className="w-24 h-16 rounded-lg overflow-hidden relative shrink-0 border border-white/10 shadow-lg">
                              <img src={channel.thumbnail} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                 <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                              </div>
                              {channel.isLive && (
                                <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-red-600 rounded text-[8px] font-bold text-white uppercase tracking-wider">
                                   LIVE
                                </div>
                              )}
                          </div>
                          <div className="flex flex-col justify-center overflow-hidden">
                             <div className="flex items-center space-x-1.5 mb-0.5">
                                {channel.logo ? <img src={channel.logo} className="w-4 h-4 object-contain rounded-full" alt={channel.name} /> : <channel.icon className="w-3 h-3 text-white/40" />}
                                <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{channel.category}</span>
                             </div>
                             <h4 className="text-sm font-bold text-white truncate w-full">{channel.name}</h4>
                             <p className="text-xs text-white/40 truncate w-full italic">{channel.description}</p>
                          </div>
                       </button>
                     );
                   })}
                 </div>
                 <div className="h-px w-full bg-white/10 my-4" />
                 <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40 px-2 pt-2">Recent Uploads</h3>
                 <div className="space-y-3 px-2 pb-4">
                   {recentUploads.map((video) => (
                     <a 
                       key={video.id.videoId} 
                       href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                       target="_blank"
                       rel="noreferrer"
                       className="flex gap-x-3 items-center p-2 rounded-lg hover:bg-white/5 transition-colors"
                     >
                         <img src={video.snippet.thumbnails.default.url} className="w-16 h-10 rounded object-cover" />
                         <span className="text-xs text-white truncate">{video.snippet.title}</span>
                     </a>
                   ))}
                 </div>
              </div>
            </div>

            {/* Chat View */}
            <div className={cn(
               "absolute inset-0 bg-[#0a0a0a] flex flex-col transition-all duration-300",
               activeTab === 'chat' ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 pointer-events-none"
            )}>
              {!event ? (
                 <div className="p-10 text-center flex flex-col items-center justify-center h-full">
                    <MessageSquare className="w-10 h-10 text-white/20 mb-4" />
                    <p className="text-white/40 text-sm italic">Live chat will be available when FideTV goes live.</p>
                 </div>
              ) : (
                <>
                  <div className="px-6 py-4 border-b border-white/10 bg-[#111111] shrink-0">
                     <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest text-center">
                       Chatting in: <span className="text-white">{event.title}</span>
                     </p>
                  </div>
                  <div className="flex-grow overflow-hidden relative">
                    {/* Inner chat component should inherit the dark background ideally, 
                        or we force dark theme tokens on it by wrapping in a 'dark' class if needed */}
                    <div 
                      className="h-full w-full"
                      style={{
                        '--background': '#050505',
                        '--surface': '#111111',
                        '--surface-bright': '#1a1a1a',
                        '--foreground': '#ffffff',
                        '--border-color': 'rgba(255, 255, 255, 0.1)',
                        '--border-custom': 'rgba(255, 255, 255, 0.1)'
                      } as React.CSSProperties}
                    >
                      <LiveChat eventId={event.id} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Ensure Play icon is imported
import { Play } from 'lucide-react';

