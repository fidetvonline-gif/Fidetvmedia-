import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { supabase } from '@/lib/supabase';
import { Event, EventStatus } from '@/types';
import LiveChat from '@/components/LiveChat';
import { BatchChannelImport } from '@/components/BatchChannelImport';
import { Calendar, Users, Share2, Youtube, ExternalLink, Clock, AlertCircle, Globe, Tv, Film, MonitorPlay, MessageSquare, Play, VolumeX, Volume2, Pause, Settings, Check, Video, Maximize, Minimize, Square, Layout, Heart, HelpCircle, X, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { fetchYouTubeStats, YouTubeStats, fetchRecentUploads } from '@/services/youtubeService';
import AdBanner from '@/components/AdBanner';
import { DEFAULT_CHANNELS } from '@/constants/channels';
import fidetvWorldCup from '@/assets/images/fidetv_world_cup_1780392851684.png';

import HighPerformancePlayer from '@/components/HighPerformancePlayer';

import OptimizedImage from '@/components/OptimizedImage';

const Player = ReactPlayer as any;

function getYouTubeId(url: string | undefined): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function Live() {
  const [event, setEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [dbChannels, setDbChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ytStats, setYtStats] = useState<YouTubeStats | null>(null);
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [directStreamUrl, setDirectStreamUrl] = useState<string | null>(null);
  
  const [activeChannelId, setActiveChannelId] = useState<string>('fidetv');
  const [activeTab, setActiveTab] = useState<'chat' | 'channels' | 'schedule'>('channels');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [chatMode, setChatMode] = useState<'youtube' | 'fidetv'>('youtube');
  const [playerError, setPlayerError] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'live' | 'offline' | 'connecting'>('connecting');
  const [activeChanStats, setActiveChanStats] = useState<YouTubeStats | null>(null);

  const [isPiP, setIsPiP] = useState(false);
  const [isPiPDismissed, setIsPiPDismissed] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [quality, setQuality] = useState<'Auto' | '480p' | '720p' | '1080p'>('Auto');
  const [showQualitySelector, setShowQualitySelector] = useState(false);
  const [showStreamHelp, setShowStreamHelp] = useState(false);
  const [isZapping, setIsZapping] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [presenceCount, setPresenceCount] = useState(1);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const zappingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const channelRef = useRef<any>(null);
  const isSharingRef = useRef(false);

  const isFideTvLive = event ? event.status === 'live' : true;
  const isFideTvUpcoming = event ? event.status === 'upcoming' : false;

  const [fallbackStreamUrl, setFallbackStreamUrl] = useState('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('site_settings').select('*');
      if (data) {
        const fallback = data.find(s => s.key === 'fidetv_fallback_url')?.value;
        if (fallback) setFallbackStreamUrl(fallback);
      }
    };
    fetchSettings();
  }, []);

  const customBroadcast = React.useMemo(() => {
    const ytId = event?.youtube_id && !event.youtube_id.includes('http') && !event.youtube_id.includes('<iframe') ? event.youtube_id : null;
    return {
      id: 'fidetv',
      name: (event?.title || 'FideTV Official Broadcast').replace(/SportyTV/gi, 'FideTv'),
      category: 'Official',
      url: ytId 
        ? `https://www.youtube.com/watch?v=${ytId}`
        : (event?.youtube_id || event?.stream_url || fallbackStreamUrl),
      thumbnail: event?.thumbnail_url || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : fidetvWorldCup),
      description: (event?.description || 'Watch premium official FideTV broadcasts live and exclusively.').replace(/SportyTV/gi, 'FideTv'),
      isLive: isFideTvLive,
      viewer_count: (ytStats?.viewers ? parseInt(ytStats.viewers) : undefined),
      like_count: (ytStats?.likes ? parseInt(ytStats.likes) : undefined),
      icon: Tv,
      logo: undefined as string | undefined,
    };
  }, [event, isFideTvLive, fallbackStreamUrl, ytStats]);

  const allChannels = React.useMemo(() => {
    const dynamic = dbChannels
      .filter((ch: any) => ch.is_active !== false)
      .map((ch: any) => {
        // Self-healing: If DB has stale/unstable URLs for these specific channels,
        // we use the verified mirrors from DEFAULT_CHANNELS instead.
        const verifiedMatch = DEFAULT_CHANNELS.find(d => 
          d.id === ch.id || 
          d.name.toLowerCase() === ch.name.toLowerCase()
        );

        const isUnstable = ch.url?.includes('sh-cdn.com') || 
                          ch.url?.includes('afrosportnow.com') || 
                          ch.url?.includes('limexltd.com');

        return {
          id: ch.id,
          name: ch.name,
          category: ch.category || 'General',
          thumbnail: ch.thumbnail,
          url: (isUnstable && verifiedMatch) ? verifiedMatch.url : ch.url,
          icon: Tv,
          logo: ch.logo,
          description: ch.description || 'Watch live broadcast stream.',
          isLive: ch.is_active ?? true,
          viewer_count: ch.viewer_count,
          like_count: ch.like_count,
          comment_count: ch.comment_count,
          created_at: ch.created_at
        };
      });
    
    const merged = [...dynamic];

    // Include active and upcoming events in the channels list
    const mappedEvents = events
      .filter(e => e.id !== event?.id) // Don't duplicate the primary broadcast
      .map(e => {
        const ytId = e.youtube_id && !e.youtube_id.includes('http') && !e.youtube_id.includes('<iframe') ? e.youtube_id : null;
        return {
          id: `event_${e.id}`,
          name: e.title.replace(/SportyTV/gi, 'FideTv'),
          category: 'Scheduled',
          thumbnail: e.thumbnail_url || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : fidetvWorldCup),
          url: ytId ? `https://www.youtube.com/watch?v=${ytId}` : (e.stream_url || fallbackStreamUrl),
          icon: e.status === 'live' ? Tv : Calendar,
          description: e.description.replace(/SportyTV/gi, 'FideTv'),
          isLive: e.status === 'live',
          isUpcoming: e.status === 'upcoming',
          startTime: e.start_time,
          created_at: e.created_at,
          originalEvent: e
        };
      });

    merged.push(...mappedEvents as any);

    if (directStreamUrl) {
      merged.unshift({
        id: 'direct_obs_stream',
        name: 'Direct OBS Stream',
        category: 'Pro Member',
        thumbnail: 'https://images.unsplash.com/photo-1540655037529-dec987208707?auto=format&fit=crop&q=80&w=800',
        url: directStreamUrl,
        icon: Video,
        description: 'Direct live stream from OBS Studio.',
        isLive: true,
        isDirect: true,
        created_at: new Date().toISOString()
      } as any);
    }
    
    // Sort by created_at DESC (newest first) but keeping FideTV as a special option
    const result = [customBroadcast, ...merged].sort((a: any, b: any) => {
       if (a.id === 'fidetv') return 1; // Put FideTV after newest channels if they exist
       if (b.id === 'fidetv') return -1;
       
       // Newest first
       const dateA = new Date(a.created_at || 0).getTime();
       const dateB = new Date(b.created_at || 0).getTime();
       return dateB - dateA;
    });
    return result;
  }, [dbChannels, customBroadcast, directStreamUrl]);

  const handleLike = () => {
    if (hasLiked) return;
    setHasLiked(true);
    setLikes(prev => prev + 1);
    
    // Broadcast like to other viewers via Supabase channel if chat is active
    const channelName = `live-chat-${event?.id || activeChannelId}`;
    const channel = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { emoji: '❤️' }
      });
    }
  };

  useEffect(() => {
    // Sync random likes for demo comfort if no backend persistence yet
    // In a real app, this would be fetched from Supabase
    const baseLikes = Math.floor(Math.random() * 50) + 120;
    setLikes(baseLikes);
  }, [activeChannelId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
             setIsPiP(true);
          } else {
             setIsPiP(false);
             setIsPiPDismissed(false);
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
    // Trigger zapping effect
    setIsZapping(true);
    if (zappingTimeoutRef.current) clearTimeout(zappingTimeoutRef.current);
    zappingTimeoutRef.current = setTimeout(() => {
      setIsZapping(false);
    }, 300);
    
    setPlayerError(false);
    setIsPlayerReady(false);
    setIsPlaying(true);
    setIsMuted(false);

    const activeCh = allChannels.find(c => c.id === activeChannelId) || customBroadcast;
    const isEmbed = activeCh?.url?.includes('<iframe');

    const delay = isEmbed ? 200 : 1200;

    checkStreamSignal(activeCh?.url || '');

    // Fetch live stats for the active channel if it's YouTube
    const ytId = getYouTubeId(activeCh?.url);
    if (ytId) {
      fetchYouTubeStats(ytId).then(setActiveChanStats).catch(console.error);
    } else {
      setActiveChanStats(null);
    }

    // Safety timeout: if player takes too long to signal ready, hide overlay anyway
    // so user can see if there's a play button or interaction needed
    const safetyTimer = setTimeout(() => {
      setIsPlayerReady(true);
    }, delay);

    return () => clearTimeout(safetyTimer);
  }, [activeChannelId, allChannels, customBroadcast]);

  const handlePlayerError = (e: any) => {
    console.log('[DEBUG] handlePlayerError received:', e);
    // If it's a DOMException or has a name, check if it's an AbortError
    if ((e instanceof DOMException && e.name === 'AbortError') || (e?.name === 'AbortError')) {
      return;
    }

    // Attempt to extract error from event target
    const errorTarget = e?.target as HTMLVideoElement;
    const mediaError = errorTarget?.error || e?.error;
    
    // Check for MEDIA_ERR_ABORTED (code 1) or any code indicating abort
    if (mediaError?.code === 1 || e?.code === 1 || e?.error?.code === 1 || (e as any).name === 'AbortError' || (mediaError as any)?.name === 'AbortError' || e?.code === 'ECONNABORTED' || (e as any).message?.includes('error 0') || (e as any).message?.includes('user agent')) {
      console.log('[DEBUG] Ignoring MEDI_ERR_ABORTED, AbortError or ECONNABORTED');
      return;
    }

    console.error('Player error:', e);
    // Extract message
    const errMsg = (
      e?.message || 
      mediaError?.message || 
      e?.target?.error?.message || 
      (e as any).description ||
      (typeof e === 'string' ? e : '') ||
      e?.toString() || 
      ''
    ).toLowerCase();
    
    // Ignore benign errors
    if (
      errMsg.includes('aborted') || 
      errMsg.includes('abort') || 
      errMsg.includes('fetching process') || 
      errMsg.includes('media resource') || 
      errMsg.includes('interrupted') || 
      errMsg.includes('ns_error_dom_media_abort_err') ||
      errMsg.includes('play()') ||
      errMsg.includes('prevented') ||
      errMsg.includes('interrupted by a call to pause') ||
      errMsg.includes('interrupted by a new load request') ||
      errMsg.includes('user agent') ||
      errMsg.includes('error 0')
    ) {
      console.log('[DEBUG] Ignoring suppressed benign media error:', errMsg);
      return;
    }
    
    setPlayerError(true);
    setConnectionStatus('offline');
  };

  const handlePlayerReady = () => {
    console.log('Player is ready for playback');
    setIsPlayerReady(true);
    setPlayerError(false);
    setConnectionStatus('live');
  };

  const checkStreamSignal = async (url: string) => {
    if (!url) {
      setConnectionStatus('offline');
      return;
    }

    if (url.includes('<iframe') || url.includes('limex.tv') || (!url.includes('.m3u8') && !url.includes('.mp4') && !url.includes('youtube.com') && !url.includes('youtu.be'))) {
      // For iframes and external web links, we mark as live since we can't probe them directly
      setConnectionStatus('live');
      return;
    }

    setConnectionStatus('connecting');

    // For HLS/m3u8, try to probe the manifest via our proxy to avoid CORS
    if (url.toLowerCase().includes('.m3u8')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        
        // Use our server-side proxy to check if stream is actually reachable
        const proxyUrl = `/api/proxy-stream?url=${encodeURIComponent(url)}`;
        
        const res = await fetch(proxyUrl, { 
          method: 'GET', 
          signal: controller.signal,
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        
        if (res.ok) {
          setConnectionStatus('live');
        } else {
          setConnectionStatus('offline');
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('[Live] Stream probe aborted');
        } else {
          console.warn('Stream probe failed:', err);
          setConnectionStatus('offline');
        }
      }
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      // For YouTube, it takes longer to signal ready
      // We don't probe directly due to CORS
    }
  };
  const fetchLiveEventData = React.useCallback(async (signal: AbortSignal) => {
    setLoading(true);

    // Fetch site settings for direct stream URL
    const { data: settingsData } = await supabase.from('site_settings').select('key, value');
    if (settingsData) {
      const directUrlSetting = settingsData.find(s => s.key === 'direct_stream_hls_url');
      if (directUrlSetting?.value) {
        setDirectStreamUrl(directUrlSetting.value);
      }
    }
    
    // Fetch all upcoming and live events for the schedule
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .or('status.eq.live,status.eq.upcoming')
      .order('start_time', { ascending: true });

    if (eventsData && eventsData.length > 0) {
      // Helper to compute status based on time
      const computeStatuses = (evs: Event[]) => {
        const now = new Date().getTime();
        return evs.map(ev => {
          const start = new Date(ev.start_time).getTime();
          const end = start + (4 * 60 * 60 * 1000); // 4 hour window
          
          let computedStatus: EventStatus = ev.status;
          if (now >= start && now < end) {
            computedStatus = 'live';
          } else if (now < start) {
            computedStatus = 'upcoming';
          } else {
            computedStatus = 'offline';
          }
          return { ...ev, status: computedStatus };
        }).filter(ev => ev.status !== 'offline');
      };

      const normalized = computeStatuses(eventsData as Event[]);
      setEvents(normalized);
      
      const currentEvent = normalized.find(e => e.status === 'live') || normalized[0];
      setEvent(currentEvent);
      
      if (currentEvent?.youtube_id) {
        fetchYouTubeStats(currentEvent.youtube_id).then(setYtStats).catch(console.error);
      }
      
      // If the current event has a channel ID, fetch its recent uploads
      // Use the provided example channel only as a fallback if no other content exists
      const targetChannelId = currentEvent?.youtube_channel_id || 'UC_x5XG1OV2P6uZZ5FSM9Ttw';
      fetchRecentUploads(targetChannelId, signal).then(setRecentUploads).catch(err => {
         if (err.name !== 'AbortError') console.error('Recent uploads fetch failed:', err);
      });
    } else {
      setEvents([]);
      setEvent(null);
      setYtStats(null);
      setRecentUploads([]);
    }
    
    // Fetch custom TV Channels with fallback and safety checks
    try {
      console.log('[Live] Fetching channels...');
      const [channelsRes, stableRes] = await Promise.all([
        supabase
          .from('tv_channels')
          .select('*')
          .order('order_index', { ascending: true })
          .order('created_at', { ascending: false }),
        supabase
          .from('stable_channels')
          .select('*')
          .order('created_at', { ascending: false })
      ]);
        
      const channelsData = [...(channelsRes.data || []), ...(stableRes.data || [])];
        

        
      if (channelsData.length > 0) {
        setDbChannels(channelsData);
        
        const queryParams = new URLSearchParams(window.location.search);
        const urlChannelId = queryParams.get('channel');
        
        // Selection Priority:
        // 1. URL parameter
        // 2. Most recently added active channel from DB
        // 3. FideTV default
        const channelExists = channelsData.some((c: any) => c.id === urlChannelId);
        const latestActive = channelsData.find((c: any) => c.is_active !== false);

        if (urlChannelId && (urlChannelId === 'fidetv' || channelExists)) {
          setActiveChannelId(urlChannelId);
        } else if (latestActive) {
          setActiveChannelId(latestActive.id);
        } else {
          setActiveChannelId('fidetv');
        }
      } else {
        const queryParams = new URLSearchParams(window.location.search);
        const urlChannelId = queryParams.get('channel');
        setActiveChannelId(urlChannelId || 'fidetv');
      }
    } catch (err) {
      console.error('Error fetching tv channels in live page:', err);
      const queryParams = new URLSearchParams(window.location.search);
      const urlChannelId = queryParams.get('channel');
      setActiveChannelId(urlChannelId || 'fidetv');
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchControllerRef.current = new AbortController();
    fetchLiveEventData(fetchControllerRef.current.signal);

    // Listen for status changes

    const setupRealtime = async () => {
      const channelName = 'live-events';
      
      // Ensure any existing channel is removed first
      const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
      if (existing) {
        await supabase.removeChannel(existing);
      }
      
      // Use the existing if it exists, or create new
      const channel = supabase.channel(channelName);
      channelRef.current = channel;

      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, payload => {
          console.log('[Live] Event change received:', payload);
          if (fetchControllerRef.current) fetchControllerRef.current.abort();
          fetchControllerRef.current = new AbortController();
          fetchLiveEventData(fetchControllerRef.current.signal);
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tv_channels' }, payload => {
          console.log('[Live] Channel change received:', payload);
          // Log what we received
          if (payload.eventType === 'DELETE') {
             console.log('[Live] Deleted channel ID:', payload.old.id);
          } else if (payload.eventType === 'UPDATE') {
             console.log('[Live] Updated channel ID:', payload.new.id);
          } else if (payload.eventType === 'INSERT') {
             console.log('[Live] New channel ID:', payload.new.id);
          }
          if (fetchControllerRef.current) fetchControllerRef.current.abort();
          fetchControllerRef.current = new AbortController();
          fetchLiveEventData(fetchControllerRef.current.signal);
        })
        .on('broadcast', { event: 'channel-changed' }, payload => {
          console.log('[Live] Channel broadcast/sync received:', payload);
          // Clear cache and refetch
          if (fetchControllerRef.current) fetchControllerRef.current.abort();
          fetchControllerRef.current = new AbortController();
          fetchLiveEventData(fetchControllerRef.current.signal);
          
          // If we are currently on a channel that might have been deleted as indicated by payload
          // the fetchLiveEventData will handle the redirection logic if currentExists is false
        })
        .subscribe((status) => {
          console.log('[Live] Subscription status:', status);
        });
    };

    setupRealtime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      let updatedAnyStatus = false;

      setEvents(prevEvents => {
        const updated = prevEvents.map(ev => {
          const start = new Date(ev.start_time).getTime();
          const end = start + (4 * 60 * 60 * 1000);
          
          let computedStatus: EventStatus = ev.status;
          if (now >= start && now < end) {
             computedStatus = 'live';
          } else if (now < start) {
             computedStatus = 'upcoming';
          } else {
             computedStatus = 'offline';
          }
          
          if (computedStatus !== ev.status) {
            updatedAnyStatus = true;
          }
          
          return { ...ev, status: computedStatus };
        }).filter(ev => ev.status !== 'offline');
        
        return updated;
      });

      // If we are currently watching an event, and its status might have changed,
      // the fetchLiveEventData isn't called, but the status in 'events' state is updated.
      // However, the 'event' state itself (the current one) also needs updating to trigger UI changes.
      setEvent(curr => {
        if (!curr) return null;
        const start = new Date(curr.start_time).getTime();
        const end = start + (4 * 60 * 60 * 1000);
        let status: EventStatus = curr.status;
        if (now >= start && now < end) status = 'live';
        else if (now < start) status = 'upcoming';
        else status = 'offline';
        
        if (status !== curr.status) {
          return { ...curr, status };
        }
        return curr;
      });
    }, 15000);

    return () => {
      clearInterval(interval);
      if (fetchControllerRef.current) fetchControllerRef.current.abort();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Safety timeout to ensure the UI doesn't get stuck on the loader
    const timer = setTimeout(() => {
      if (!isPlayerReady && connectionStatus !== 'offline') {
        console.log('Safety timeout: forcing player ready state');
        setIsPlayerReady(true);
        setIsZapping(false);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [activeChannelId]);

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleShare = async () => {
    if (isSharingRef.current) return;
    
    const url = window.location.href;
    if (navigator.share) {
      isSharingRef.current = true;
      try {
        await navigator.share({
          title: `Watch Live on FideTV`,
          url: url,
        });
      } catch (error) {
        // Only log if it's not a user cancellation
        if ((error as Error).name !== 'AbortError' && (error as Error).message !== 'An earlier share has not yet completed.') {
          console.error('Share failed:', error);
        }
      } finally {
        isSharingRef.current = false;
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('Stream link copied to clipboard!');
      } catch (error) {
        console.error('Clipboard copy failed:', error);
      }
    }
  };

  const handleChannelSwitch = (channelId: string, eventObj?: Event | null) => {
    if (isZapping) return;
    
    setIsZapping(true);
    setIsPlayerReady(false);
    
    if (eventObj !== undefined) {
      setEvent(eventObj);
    }
    setActiveChannelId(channelId);
    
    // Auto-scroll the page back to the top video player smoothly on mobile
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const activeChannelUrl = React.useMemo(() => {
    const activeCh = allChannels.find(c => c.id === activeChannelId) || customBroadcast;
    return activeCh?.url || '';
  }, [allChannels, activeChannelId, customBroadcast]);

  useEffect(() => {
    if (!loading && activeChannelUrl) {
      const ytId = getYouTubeId(activeChannelUrl);
      if (ytId) {
        setChatMode('youtube');
      } else {
        setChatMode('fidetv');
      }
    }
  }, [activeChannelUrl, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  const activeChannel = allChannels.find(c => c.id === activeChannelId) || customBroadcast;
  
  const currentYtId = getYouTubeId(activeChannel?.url);
  
  const isPlayingFideTv = activeChannel.id === 'fidetv';

  return (
    <div className={cn(
      "min-h-screen bg-[#050505] text-white overflow-x-hidden transition-all duration-500",
      (isTheaterMode || isZenMode) && "bg-black"
    )}>
      <div className={cn(
        "max-w-[1920px] mx-auto transition-all duration-500",
        isZenMode ? "max-w-full h-screen flex flex-col" : (isTheaterMode ? "max-w-full flex flex-col" : "lg:h-[calc(100vh-80px)] flex flex-col lg:flex-row shadow-2xl lg:overflow-hidden")
      )}>
        
        {/* Main Watch Area */}
        <div className={cn(
          "flex-grow flex flex-col relative z-10 border-white/5 overflow-y-auto custom-scrollbar transition-all duration-500 group/main",
          !isTheaterMode && !isZenMode && "border-r lg:h-full",
          isZenMode && "h-screen overflow-hidden"
        )}>
          {/* Floating Zen Mode Exit Toggle (Only visible in Zen Mode) */}
          {isZenMode && (
            <button 
              onClick={() => setIsZenMode(false)}
              className="fixed top-6 left-6 z-[100] p-3 bg-primary text-white rounded-full shadow-2xl opacity-0 group-hover/main:opacity-100 transition-opacity hover:scale-110 active:scale-95"
              title="Exit Zen Mode"
            >
              <Minimize className="w-5 h-5" />
            </button>
          )}
          {/* FideTV World Cup Campaign Match Banner */}
          {!isTheaterMode && (
            <div className="bg-[#0c0c0c] border-b border-white/5 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 relative overflow-hidden group/eventticker">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
              <div className="absolute inset-y-0 right-0 w-64 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
              
              <div className="flex items-center gap-3 relative z-10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/15 shrink-0 self-start md:self-auto">EXCLUSIVE BROADCAST</span>
                  <span className="text-xs font-bold text-white/95 uppercase tracking-wider">ALL WORLD Cup MATCHES — LIVE & FOR FREE</span>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-auto sm:ml-0 relative z-10">
                <span className="text-[10px] text-[#e0650d] bg-[#e0650d]/10 border border-[#e0650d]/20 px-2.5 py-1 rounded-lg font-black font-mono">
                  🏆 LIVE MATCH DAY
                </span>
                <span className="hidden sm:inline-flex text-[10px] text-primary uppercase font-bold tracking-widest bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-lg">
                  ★ ONLY ON FIDE TV GROUP
                </span>
              </div>
            </div>
          )}

          {/* Enhanced Signal Indicator Overlay */}
          <div className="absolute top-6 left-6 z-20 flex flex-col gap-2 pointer-events-none drop-shadow-2xl">
            <div className={cn(
              "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] flex items-center space-x-3 backdrop-blur-xl border transition-all duration-500",
              isFideTvLive 
                ? "bg-red-600/90 text-white border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)]" 
                : "bg-black/60 text-white border-white/10"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full shadow-[0_0_10px_white]",
                isFideTvLive ? "bg-white animate-pulse" : "bg-white/20"
              )} />
              <span>
                {isPlayingFideTv 
                  ? (isFideTvLive ? (connectionStatus === 'live' ? 'On Air' : connectionStatus === 'connecting' ? 'Connecting...' : 'Offline') : isFideTvUpcoming ? 'Upcoming' : 'Standby') 
                  : (activeChannel.isLive ? (connectionStatus === 'live' ? 'Network Live' : connectionStatus === 'connecting' ? 'Connecting...' : 'Offline') : 'Streaming')}
              </span>
            </div>
            {isPlayingFideTv && isFideTvLive && (
              <div className="hidden sm:flex px-3 py-1.5 bg-black/60 backdrop-blur-xl rounded-full text-[9px] font-bold text-white/70 uppercase tracking-[0.2em] border border-white/10 items-center transition-all">
                <Globe className="w-3 h-3 mr-2 text-primary" />
                Global Broadcast
              </div>
            )}
          </div>

          {/* Player Container */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            ref={playerContainerRef} 
            className={cn(
              "relative w-full bg-black group/player transition-all duration-500",
              isTheaterMode ? "aspect-[21/9] max-h-[85vh]" : "aspect-video"
            )}
          >
            <div className={cn(
               "transition-all duration-300 z-[999]",
               isPiP && !isPiPDismissed 
                 ? "fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-64 sm:w-96 aspect-video rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden border-2 border-white/10 bg-black scale-100 group/pip" 
                 : "absolute inset-0 w-full h-full scale-100",
               isPiP && isPiPDismissed ? "opacity-0 pointer-events-none" : "opacity-100"
            )}>
              {/* Zapping / Loading / Upcoming Overlay */}
            {(isZapping || !isPlayerReady || (activeChannel as any).isUpcoming) && !playerError && connectionStatus !== 'offline' && (
              <div className="absolute inset-0 z-[50] flex flex-col items-center justify-center bg-black transition-opacity duration-300 pointer-events-none">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                
                {(activeChannel as any).isUpcoming ? (
                  <div className="relative z-10 flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(242,125,38,0.1)]">
                      <Calendar className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <h3 className="text-xl font-display font-black uppercase tracking-tight mb-2 text-white">Coming Soon</h3>
                    <p className="text-white/50 text-xs max-w-xs mb-4 leading-relaxed font-bold">
                      {format(new Date((activeChannel as any).startTime), 'MMMM d, yyyy @ HH:mm')}
                    </p>
                    <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-primary">
                      Scheduled Broadcast
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <div className="w-16 h-16 border-2 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_20px_rgba(242,125,38,0.2)]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 bg-primary/10 rounded-full animate-ping" />
                      </div>
                    </div>
                    <div className="mt-6 flex flex-col items-center">
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] animate-pulse">Tuning Channel</span>
                      <div className="flex gap-1 mt-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-1 h-1 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            {playerError || connectionStatus === 'offline' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111111] z-30">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-xl font-bold mb-2 text-white">{connectionStatus === 'offline' ? 'Stream Currently Offline' : 'Playback Error'}</h3>
                <p className="text-white/60 text-sm mb-6 px-8 text-center italic">
                  {connectionStatus === 'offline' 
                    ? 'This broadcast feed is currently not transmitting. Please check the schedule for live times.' 
                    : 'This broadcast feed is currently undergoing scheduled maintenance or experiencing technical issues.'}
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                       setPlayerError(false);
                       setConnectionStatus('connecting');
                       checkStreamSignal(activeChannelUrl);
                    }}
                    className="px-8 py-3 bg-primary hover:scale-105 active:scale-95 rounded-full text-xs font-bold uppercase tracking-widest border border-primary/10 transition-all text-white shadow-lg shadow-primary/20"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            ) : null}

            {(!isPlayingFideTv || (isPlayingFideTv && customBroadcast.url)) ? (
              activeChannel.url?.includes('<iframe') ? (
                <div className="w-full h-full absolute inset-0 overflow-hidden select-none">
                   {/* Iframe content with possible YT branding - apply aggressive masking if it's a known player */}
                   <div className={cn(
                     "w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-none relative z-0",
                     (activeChannel.url.includes('youtube.com') || activeChannel.url.includes('youtu.be')) && "w-full h-full absolute"
                   )}
                     dangerouslySetInnerHTML={{ 
                       __html: activeChannel.url
                         .replace(/src="([^"]+)"/, (match: string, p1: string) => {
                           const separator = p1.includes('?') ? '&' : '?';
                           // Add modestbranding and hide controls parameters to YT iframes
                           const params = p1.includes('youtube.com') || p1.includes('youtu.be') 
                            ? 'rel=0&controls=0&iv_load_policy=3' 
                            : '';
                           return `src="${p1}${separator}autoplay=1${params ? '&' + params : ''}"`;
                         })
                         .replace('<iframe', '<iframe allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" loading="lazy" ') 
                     }} 
                   />
                   {(activeChannel.url.includes('youtube.com') || activeChannel.url.includes('youtu.be')) && (
                     <div className="absolute top-0 inset-x-0 h-[10%] bg-black z-[5] pointer-events-none" />
                   )}
                </div>
              ) : (activeChannel.url?.includes('limex.tv') || (!activeChannel.url?.includes('.m3u8') && !activeChannel.url?.includes('.mp4') && !activeChannel.url?.includes('youtube.com') && !activeChannel.url?.includes('youtu.be'))) ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a] z-20">
                   <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
                   <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center">
                     <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(242,125,38,0.1)]">
                       <MonitorPlay className="w-10 h-10 text-primary" />
                     </div>
                     <h3 className="text-2xl font-display font-black uppercase tracking-tight mb-4">External Broadcast</h3>
                     <p className="text-white/50 text-sm max-w-sm mb-10 leading-relaxed italic">
                       This provider requires viewing directly on their official platform to ensure broadcast security and full feature support.
                     </p>
                     <a 
                       href={activeChannel.url} 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="px-10 py-5 bg-primary text-white font-black rounded-2xl flex items-center gap-4 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/30 group"
                     >
                       <span>Watch Live on Official Site</span>
                       <ExternalLink className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                     </a>
                   </div>
                </div>
              ) : activeChannel.url?.toLowerCase().includes('youtube.com') || activeChannel.url?.toLowerCase().includes('youtu.be') ? (
                <div className="w-full h-full absolute inset-0 overflow-hidden select-none">
                  {/* YouTube Player with aggressive hide-branding via overflow and masks */}
                  <div className="w-full h-full absolute z-0">
                    <Player
                      url={activeChannel.url}
                      width="100%"
                      height="100%"
                      playing={isPlaying}
                      controls={false}
                      muted={isMuted}
                      playsinline={true}
                      onReady={handlePlayerReady}
                      onStart={handlePlayerReady}
                      onError={handlePlayerError}
                      config={{
                        youtube: {
                          playerVars: { 
                            rel: 0, 
                            autoplay: 1,
                            enablejsapi: 1,
                            controls: 0,
                            iv_load_policy: 3,
                          }
                        }
                      }}
                      style={{ position: 'absolute', top: 0, left: 0 }}
                    />
                  </div>

                  {/* Anti-branding Header Mask - specifically for hiding YT channel title bar */}
                  <div className="absolute top-0 inset-x-0 h-[10%] bg-black z-[5] pointer-events-none" />

                  {/* Absolute Click Interceptor Layer & Invisible Full Cover Mask */}
                  <div 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="absolute inset-x-0 top-0 bottom-14 z-10 cursor-pointer"
                  />

                  {/* Dynamic Click-to-Play/Pause or Unmute HUD Elements */}
                  {isMuted && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted(false);
                      }}
                      className="absolute z-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-4 bg-background/90 backdrop-blur-md border border-border-custom rounded-2xl flex items-center gap-3 text-xs font-black uppercase text-text-muted hover:text-white transition-all shadow-xl shadow-black/40 hover:scale-105 active:scale-95"
                    >
                      <VolumeX className="w-5 h-5 text-primary animate-bounce" />
                      <span>Click to Unmute Broadcast</span>
                    </motion.button>
                  )}

                  {/* Custom elegant white-label controls HUD */}
                  <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#0a0a0a]/95 to-transparent z-20 flex items-center justify-between px-6 pointer-events-auto">
                     <div className="flex items-center gap-4">
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           setIsPlaying(!isPlaying);
                         }}
                         className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-all active:scale-95"
                       >
                         {isPlaying ? <Pause className="w-4 h-4 fill-white text-white" /> : <Play className="w-4 h-4 fill-white text-white" />}
                       </button>

                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           setIsMuted(!isMuted);
                         }}
                         className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-colors"
                       >
                         {isMuted ? (
                           <VolumeX className="w-4 h-4 text-white/50" />
                         ) : (
                           <Volume2 className="w-4 h-4 text-white" />
                         )}
                       </button>

                       <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                         <span className="text-[9px] font-black uppercase tracking-widest text-[#f0f0f0]">FideTV Broadcast</span>
                       </div>
                     </div>

                     <div className="flex items-center gap-6">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsTheaterMode(!isTheaterMode);
                          }}
                          className="hidden sm:flex p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                          title="Theater Mode"
                        >
                          <Square className={cn("w-4 h-4", isTheaterMode && "fill-white/20")} />
                        </button>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFullscreen();
                          }}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                          title="Fullscreen"
                        >
                          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                        </button>

                        <div className="flex flex-col items-end">
                         <div className="text-[9px] font-bold text-white/40 font-mono tracking-widest uppercase mb-1">
                           Quality
                         </div>
                         <div className="relative">
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setShowQualitySelector(!showQualitySelector);
                             }}
                             className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                           >
                             <span className="text-[10px] font-bold text-white uppercase tracking-wider">{quality}</span>
                             <Settings className={cn("w-3 h-3 text-white/40 transition-transform", showQualitySelector && "rotate-90")} />
                           </button>
                           
                           <AnimatePresence>
                             {showQualitySelector && (
                               <motion.div
                                 initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                 animate={{ opacity: 1, y: 0, scale: 1 }}
                                 exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                 className="absolute bottom-full right-0 mb-2 w-32 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-xl p-1 shadow-2xl z-50 overflow-hidden"
                               >
                                 {(['Auto', '480p', '720p', '1080p'] as const).map((q) => (
                                   <button
                                     key={q}
                                     onClick={(e) => {
                                       e.stopPropagation();
                                       setQuality(q);
                                       setShowQualitySelector(false);
                                     }}
                                     className={cn(
                                       "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors",
                                       quality === q ? "bg-primary text-white" : "text-white/60 hover:bg-white/5"
                                     )}
                                   >
                                     {q}
                                     {quality === q && <Check className="w-3 h-3" />}
                                   </button>
                                 ))}
                                </motion.div>
                             )}
                           </AnimatePresence>
                         </div>
                       </div>

                       <div className="text-[9px] font-bold text-white/40 font-mono tracking-widest uppercase">
                         Direct Stream
                       </div>
                     </div>
                  </div>
                </div>
              ) : (
                <HighPerformancePlayer
                  url={activeChannel.url}
                  playing={isPlaying}
                  muted={isMuted}
                  controls={true}
                  onReady={handlePlayerReady}
                  onError={handlePlayerError}
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
          </motion.div>
            
            {/* Persistent Comfort Controls (Always available on hover for all players) */}
            <div className="absolute top-6 right-20 flex space-x-2 z-30 opacity-0 group-hover/player:opacity-100 transition-opacity">
                <button 
                  onClick={toggleFullscreen}
                  className="p-3 bg-black/40 hover:bg-primary backdrop-blur-xl rounded-full text-white border border-white/10 transition-all shadow-xl"
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => setIsTheaterMode(!isTheaterMode)}
                  className="hidden sm:flex p-3 bg-black/40 hover:bg-primary backdrop-blur-xl rounded-full text-white border border-white/10 transition-all shadow-xl"
                  title="Toggle Theater Mode"
                >
                  <Square className={cn("w-5 h-5", isTheaterMode && "fill-white/20")} />
                </button>
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

          {/* YouTube-like Metadata Section */}
          <div className={cn(
            "bg-[#050505] px-4 sm:px-6 lg:px-8 py-5 border-b border-white/5",
            isTheaterMode && "max-w-[1280px] mx-auto w-full",
            isZenMode && "hidden md:flex flex-col opacity-0 group-hover/main:opacity-100 transition-opacity fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md z-50 pointer-events-auto"
          )}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white leading-tight tracking-tight">
                  {isPlayingFideTv && event?.title ? event.title : activeChannel.name}
                </h1>
                <div className={cn(
                  "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                  connectionStatus === 'live' ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                  connectionStatus === 'connecting' ? "bg-primary/10 text-primary border border-primary/20 animate-pulse" :
                  "bg-red-500/10 text-red-500 border border-red-500/20"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", connectionStatus === 'live' ? "bg-green-500" : connectionStatus === 'connecting' ? "bg-primary" : "bg-red-500")} />
                  {connectionStatus}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                {showStreamHelp && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="w-full bg-primary/10 border border-primary/20 rounded-2xl p-4 sm:p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-primary/20 rounded-xl">
                        <HelpCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-bold text-sm mb-2 uppercase tracking-wider">Troubleshooting Live Stream</h4>
                        <ul className="text-xs text-white/70 space-y-2 list-disc pl-4">
                          <li><span className="text-white font-semibold">Blank screen?</span> Some international channels are geo-restricted to their home regions.</li>
                          <li><span className="text-white font-semibold">Constant buffering?</span> Check your connection or try the <span className="text-primary italic">Reconnect Stream</span> button in the player.</li>
                          <li><span className="text-white font-semibold">Imported channels not showing?</span> Some streams use private manifests that block embedding. We prioritize YouTube mirrors for these where available.</li>
                          <li><span className="text-white font-semibold">Browser support:</span> For the best experience, use <span className="text-white italic">Chrome or Safari</span>. Some Firefox configurations block HLS by default.</li>
                        </ul>
                      </div>
                      <button onClick={() => setShowStreamHelp(false)} className="text-white/40 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-white/10 shrink-0 bg-white/5 flex items-center justify-center">
                    {activeChannel.logo ? (
                      <img src={activeChannel.logo} className="w-full h-full object-contain" alt="" />
                    ) : (
                      <activeChannel.icon className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm sm:text-base font-bold text-white uppercase tracking-tight">{activeChannel.category || 'FideTV Channel'}</span>
                      {isPlayingFideTv && <div className="w-3 h-3 bg-primary rounded-full flex items-center justify-center"><div className="w-1 h-1 bg-white rounded-full" /></div>}
                    </div>
                    <span className="text-[10px] sm:text-xs text-white/40 font-medium">Broadcast Partner</span>
                  </div>
                </div>

                  <div className="flex items-center gap-2">
                    {/* Viewer Count integrated with Presence */}
                      <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-sm">
                        <Users className="w-3.5 h-3.5 text-white/40" />
                        <span className="text-xs font-bold text-white">
                          {activeChanStats?.viewers && activeChanStats.viewers !== '0' 
                            ? parseInt(activeChanStats.viewers).toLocaleString() 
                            : (isPlayingFideTv && isFideTvLive && ytStats ? parseInt(ytStats.viewers).toLocaleString() : presenceCount)}
                        </span>
                        <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest hidden sm:inline">Watching Live</span>
                      </div>

                    <button 
                      onClick={handleLike}
                      disabled={hasLiked}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-bold uppercase tracking-wider",
                        hasLiked ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white"
                      )}
                    >
                      <Heart className={cn("w-3.5 h-3.5", hasLiked && "fill-current animate-pulse")} />
                      <span>
                        {activeChanStats?.likes && activeChanStats.likes !== '0' 
                          ? parseInt(activeChanStats.likes).toLocaleString() 
                          : likes}
                      </span>
                    </button>

                    <button 
                      onClick={() => setShowStreamHelp(!showStreamHelp)}
                      className={cn(
                        "flex items-center justify-center p-2 rounded-full border transition-all",
                        showStreamHelp ? "bg-primary text-white border-primary" : "bg-white/5 hover:bg-white/10 border-white/10 text-white/40 hover:text-white"
                      )}
                      title="Having issues?"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={() => setIsZenMode(!isZenMode)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-bold uppercase tracking-wider hidden sm:flex",
                        isZenMode ? "bg-primary text-white border-primary" : "bg-white/5 hover:bg-white/10 border-white/10"
                      )}
                      title={isZenMode ? "Exit Zen Mode" : "Zen Mode"}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>{isZenMode ? 'Exit Zen' : 'Zen View'}</span>
                    </button>
                    
                    <button 
                      onClick={() => setIsTheaterMode(!isTheaterMode)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-bold uppercase tracking-wider hidden sm:flex",
                        isTheaterMode ? "bg-primary text-white border-primary" : "bg-white/5 hover:bg-white/10 border-white/10"
                      )}
                      title={isTheaterMode ? "Exit Theater Mode" : "Theater Mode"}
                    >
                      <Layout className="w-3.5 h-3.5" />
                      <span>{isTheaterMode ? 'Compact' : 'Wide View'}</span>
                    </button>
                    
                    <button 
                      onClick={() => {
                        if (!isFullscreen) {
                          toggleFullscreen();
                        } else {
                          toggleFullscreen();
                        }
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 border-white/10"
                      )}
                    >
                      <Maximize className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Full Size</span>
                    </button>
                    <button 
                      onClick={handleShare}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 active:bg-white/20 rounded-full border border-white/10 transition-all text-xs font-bold uppercase tracking-wider"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>
                  </div>
              </div>

              {/* Description Box - YouTube style */}
              <div className="mt-2 p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.07] transition-colors group/desc">
                 <div className="flex items-center gap-4 mb-2 text-xs font-bold text-white/80">
                   {isPlayingFideTv && isFideTvLive && <span className="text-red-500">Live now</span>}
                   <span className="text-white/40 font-medium">{activeChannel.category} Broadcast</span>
                 </div>
                 <p className="text-xs sm:text-sm text-white/60 leading-relaxed italic line-clamp-2 group-hover/desc:line-clamp-none transition-all">
                   {activeChannel.description || 'Watch high-quality live streaming content on FideTV. Join the community and participate in the discussion.'}
                 </p>
              </div>

              {/* Sidebar ad space / Sponsored content */}
              <div className="mt-4">
                <AdBanner placement="Live Event Banner" />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar / Interaction Panel */}
        {!isZenMode && (
          <div className={cn(
            "w-full lg:w-[420px] xl:w-[460px] flex-shrink-0 bg-[#070707] flex flex-col z-20 shadow-[-30px_0_60px_rgba(0,0,0,0.8)] border-l border-white/5 relative overflow-hidden transition-all duration-500",
            isTheaterMode ? "w-full lg:w-full lg:h-auto" : "h-[650px] lg:h-full"
          )}>
          {/* Tab Selection Header */}
          <div className={cn(
            "flex items-center justify-between border-b border-white/5 bg-[#0b0b0b] p-3 shrink-0",
            isTheaterMode && "w-full"
          )}>
            <div className="flex w-full bg-white/5 p-1 rounded-xl gap-1">
              <button 
                onClick={() => setActiveTab('chat')}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer",
                  activeTab === 'chat' 
                    ? "bg-white/10 text-white shadow-md border border-white/5" 
                    : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span>Chat</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('channels')}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer",
                  activeTab === 'channels' 
                    ? "bg-white/10 text-white shadow-md border border-white/5" 
                    : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
                )}
              >
                <MonitorPlay className="w-3.5 h-3.5 text-primary" />
                <span>Stations</span>
              </button>
              
              <button 
                onClick={() => setActiveTab('schedule')}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer",
                  activeTab === 'schedule' 
                    ? "bg-white/10 text-white shadow-md border border-white/5" 
                    : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
                )}
              >
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Guide</span>
              </button>
            </div>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-grow overflow-hidden relative">
            {/* Chat View */}
            {activeTab === 'chat' && (
              <div 
                className="h-full w-full"
                style={{
                  '--background': '#070707',
                  '--surface': '#111111',
                  '--surface-bright': '#1a1a1a',
                  '--foreground': '#ffffff',
                  '--border-color': 'rgba(255, 255, 255, 0.04)',
                  '--border-custom': 'rgba(255, 255, 255, 0.04)'
                } as React.CSSProperties}
              >
                <LiveChat 
                  eventId={event ? event.id : `channel_${activeChannelId}`} 
                  onPresenceUpdate={setPresenceCount}
                />
              </div>
            )}

            {/* Channels / Stations View - YouTube style sidebar list */}
            {activeTab === 'channels' && (
              <div className="h-full flex flex-col">
                {/* Category Filter */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/20 shrink-0">
                  <div className="flex overflow-x-auto custom-scrollbar gap-2 shrink-0">
                    {['All', ...Array.from(new Set(allChannels.map(c => c.category)))].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                          selectedCategory === cat 
                            ? "bg-primary text-white" 
                            : "bg-white/5 text-white/40 hover:bg-white/10"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setIsImportModalOpen(true)} className="p-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-lg">
                    <Upload className="w-4 h-4" />
                  </button>
                </div>

                {isImportModalOpen && (
                  <BatchChannelImport onClose={() => setIsImportModalOpen(false)} onImportComplete={() => {}} />
                )}

                <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-3">
                  <div className="px-1 pb-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                      {selectedCategory === 'All' ? 'Up Next / Related Channels' : `${selectedCategory} Channels`}
                    </h3>
                  </div>
                  
                  <div className="space-y-1 relative">
                    {(isZapping || !isPlayerReady) && (
                      <div className="absolute inset-0 bg-[#070707]/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center pointer-events-auto text-center p-4 rounded-xl border border-white/5">
                        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">Switching...</span>
                      </div>
                    )}
                    {/* FideTV Primary Stream */}
                    {selectedCategory === 'All' && (
                      <button
                        onClick={() => handleChannelSwitch('fidetv')}
                        disabled={isZapping || !isPlayerReady}
                        className={cn(
                          "w-full text-left p-1.5 rounded-lg flex gap-x-3 items-start group transition-all duration-200 cursor-pointer",
                          isPlayingFideTv 
                            ? "bg-white/10" 
                            : "hover:bg-white/5",
                          (isZapping || !isPlayerReady) && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="w-40 aspect-video rounded-lg overflow-hidden relative shrink-0 border border-white/10">
                          <OptimizedImage src={customBroadcast.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all" />
                          {isFideTvLive && (
                            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-red-600 rounded text-[7px] font-black uppercase tracking-wider text-white">
                               LIVE
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col overflow-hidden min-w-0 pt-0.5">
                           <h4 className="text-xs font-bold text-white line-clamp-2 leading-[1.3] group-hover:text-primary transition-colors">{customBroadcast.name}</h4>
                           <div className="flex items-center gap-1.5 mt-1">
                             <span className="text-[9px] text-white/40 font-bold uppercase tracking-tight">FideTV Official</span>
                             {isPlayingFideTv && <div className="w-2 h-2 bg-primary rounded-full" />}
                           </div>
                           <span className="text-[9px] text-white/30 mt-0.5 font-mono">{isFideTvLive ? (ytStats?.viewers || '1.2K') : 'Broadcasted'} · {customBroadcast.category}</span>
                        </div>
                      </button>
                    )}

                    {/* Other Channels - YouTube Recommendation List style */}
                    {allChannels
                      .filter(c => c.id !== 'fidetv')
                      .filter(c => selectedCategory === 'All' || c.category === selectedCategory)
                      .map((channel) => {
                      const isSelected = activeChannelId === channel.id;
                      return (
                        <button
                          key={channel.id}
                          onClick={() => handleChannelSwitch(channel.id)}
                          disabled={isZapping || !isPlayerReady}
                          className={cn(
                            "w-full text-left p-1.5 rounded-lg flex gap-x-3 items-start group transition-all duration-200 cursor-pointer",
                            isSelected 
                              ? "bg-white/10" 
                              : "hover:bg-white/5",
                            (isZapping || !isPlayerReady) && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <div className="w-40 aspect-video rounded-lg overflow-hidden relative shrink-0 border border-white/10">
                            <OptimizedImage src={channel.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                              <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            {channel.isLive && (
                              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-red-600 rounded text-[7px] font-black uppercase tracking-wider text-white">
                                 LIVE
                              </div>
                            )}
                            {(channel as any).isUpcoming && (
                              <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-primary rounded text-[7px] font-black uppercase tracking-wider text-white">
                                 COMING UP
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col overflow-hidden min-w-0 pt-0.5">
                             <h4 className="text-xs font-bold text-white line-clamp-2 leading-[1.3] group-hover:text-primary transition-colors">{channel.name}</h4>
                             <div className="flex items-center gap-1.5 mt-1">
                               <span className="text-[9px] text-white/40 font-bold tracking-tight">
                                 {(channel as any).isUpcoming ? format(new Date((channel as any).startTime), 'MMM d, HH:mm') : channel.category}
                               </span>
                               {isSelected && <div className="w-2 h-2 bg-primary rounded-full" />}
                             </div>
                             <span className="text-[9px] text-white/30 mt-0.5 font-mono flex items-center gap-2">
                               <span>
                                 {(channel as any).isUpcoming 
                                   ? 'Scheduled Broadcast' 
                                   : (channel.viewer_count 
                                     ? `${parseInt(channel.viewer_count).toLocaleString()} watching` 
                                     : 'Recommended')}
                               </span>
                               {channel.like_count > 0 && (
                                 <span className="flex items-center gap-0.5 text-red-500/60">
                                   <Heart className="w-2 h-2 fill-current" />
                                   {parseInt(channel.like_count).toLocaleString()}
                                 </span>
                               )}
                             </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Guide / Schedule View */}
            {activeTab === 'schedule' && (
              <div className="h-full overflow-y-auto custom-scrollbar p-4 space-y-6">
                <div className="pb-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Program Guide & Schedule
                  </h3>
                  <p className="text-white/40 text-[11px]">Plan ahead for upcoming premium stream matches and scheduled features on FideTV.</p>
                </div>

                <div className="space-y-3 relative">
                  {(isZapping || !isPlayerReady) && (
                    <div className="absolute inset-0 bg-[#070707]/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center pointer-events-auto text-center p-4 rounded-xl border border-white/5">
                      <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-2 shadow-[0_0_15px_rgba(242,125,38,0.2)]" />
                      <span className="text-[11px] font-black uppercase tracking-[0.25em] text-primary animate-pulse">Switching Station</span>
                      <span className="text-[9px] text-white/40 mt-1 uppercase tracking-wider leading-relaxed">Loading schedule feed...</span>
                    </div>
                  )}
                  {events.filter(e => e.id !== (activeChannel.id === 'fidetv' ? event?.id : null)).map((ev) => (
                    <div key={ev.id} className={cn(
                      "relative pl-5 border-l-2 py-2 transition-all",
                      ev.status === 'live' ? "border-primary" : "border-white/10"
                    )}>
                      <div className={cn(
                        "absolute top-4 -left-[9px] w-4 h-4 rounded-full border-4 border-[#070707] transition-transform",
                        ev.status === 'live' ? "bg-red-500 animate-pulse" : "bg-white/20"
                      )} />
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-col min-w-0">
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-[0.2em] mb-1.5 leading-none",
                            ev.status === 'live' ? "text-red-500" : "text-primary"
                          )}>
                            {ev.status === 'live' ? 'LIVE NOW' : format(new Date(ev.start_time), 'MMM d, yyyy @ HH:mm')}
                          </span>
                          <h5 className="text-xs font-bold text-white transition-colors leading-tight">{ev.title}</h5>
                          <p className="text-[10px] text-white/30 italic mt-0.5 line-clamp-1">{ev.description}</p>
                        </div>
                        {ev.status === 'live' && (
                          <button 
                            onClick={() => {
                              handleChannelSwitch('fidetv', ev);
                              setActiveTab('chat');
                            }}
                            disabled={isZapping || !isPlayerReady}
                            className={cn(
                              "px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-[8px] font-black uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-95 cursor-pointer animate-pulse shrink-0",
                              (isZapping || !isPlayerReady) && "opacity-50 cursor-not-allowed select-none"
                            )}
                          >
                            SWITCH
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {events.length === 0 && (
                    <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center text-[11px] text-white/30 italic">
                      No secondary sessions listed for today.
                    </div>
                  )}
                </div>

                {/* Video highlight feed uploads inside Sidebar Guide */}
                {recentUploads.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Recent Upload Highlights</h3>
                    <div className="grid grid-cols-2 gap-2.5">
                      {recentUploads.slice(0, 4).map((video) => (
                        <a 
                          key={video.id.videoId} 
                          href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex flex-col gap-1.5 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all group/vitem text-left"
                        >
                          <div className="aspect-video rounded-lg overflow-hidden relative border border-white/5 shrink-0">
                            <img src={video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default.url} className="w-full h-full object-cover group-hover/vitem:scale-105 transition-transform duration-300" alt="" />
                            <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover/vitem:opacity-100 transition-opacity">
                              <Play className="w-4 h-4 text-white drop-shadow" />
                            </div>
                          </div>
                          <span className="text-[10px] text-white/80 font-medium line-clamp-2 leading-snug group-hover/vitem:text-primary transition-colors">{video.snippet.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

