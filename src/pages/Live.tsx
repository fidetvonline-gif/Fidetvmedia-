import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { supabase } from '@/lib/supabase';
import { Event } from '@/types';
import LiveChat from '@/components/LiveChat';
import { Calendar, Users, Share2, Youtube, ExternalLink, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { fetchYouTubeStats, YouTubeStats } from '@/services/youtubeService';

const Player = ReactPlayer as any;

export default function Live() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [ytStats, setYtStats] = useState<YouTubeStats | null>(null);

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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-8 border border-white/5">
          <AlertCircle className="w-10 h-10 text-gray-700" />
        </div>
        <h2 className="text-4xl font-display font-bold text-white mb-4">No Live Events Right Now</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-10 leading-relaxed">
          We're currently offline. Check back soon or follow our community for announcements on upcoming streams.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-4 glass hover:bg-white/5 text-sm font-bold uppercase tracking-widest text-white rounded-full transition-all"
        >
          Refresh Feed
        </button>
      </div>
    );
  }

  const isLive = event.status === 'live';

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-[1920px] mx-auto lg:h-[calc(100vh-80px)] flex flex-col lg:flex-row overflow-hidden">
        
        {/* Primary Player Content */}
        <div className="flex-grow flex flex-col min-h-[50vh] lg:min-h-0">
          <div className="relative flex-grow bg-black aspect-video lg:aspect-auto">
            {isLive && (event.youtube_id || event.stream_url) ? (
              <Player
                url={(event.youtube_id ? `https://www.youtube.com/watch?v=${event.youtube_id}` : event.stream_url) as any}
                width="100%"
                height="100%"
                playing={isLive}
                controls
                style={{ position: 'absolute', top: 0, left: 0 }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface overflow-hidden group">
                {event.thumbnail_url ? (
                  <img src={event.thumbnail_url} alt={event.title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-surface-bright" />
                )}
                
                <div className="relative z-10 p-8 text-center space-y-6">
                  {event.youtube_id || event.stream_url ? (
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto backdrop-blur-xl border border-white/20">
                      <Clock className="w-10 h-10 text-primary" />
                    </div>
                  ) : (
                    <Youtube className="w-16 h-16 text-gray-800 mx-auto" />
                  )}
                  <div className="space-y-2">
                    <h3 className="text-3xl font-display font-bold text-white tracking-tight">
                      {isLive ? "Stream starting soon..." : "Upcoming Live Session"}
                    </h3>
                    <p className="text-gray-400 font-medium tracking-wide max-w-sm mx-auto uppercase text-xs">
                      {format(new Date(event.start_time), 'MMMM d, yyyy @ HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Status Overlay */}
            <div className="absolute top-6 left-6 flex space-x-3 pointer-events-none">
              <div className={cn(
                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center space-x-2 shadow-2xl",
                isLive ? "bg-red-600 text-white" : "bg-primary text-white"
              )}>
                {isLive && <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />}
                <span>{isLive ? 'Live Now' : 'Upcoming'}</span>
              </div>
              <div className="px-4 py-1.5 glass rounded-full text-[10px] font-bold text-white uppercase tracking-widest leading-none flex items-center">
                {event.id.slice(0, 8)}
              </div>
            </div>
          </div>

          <div className="p-8 lg:p-12 space-y-8 bg-background border-r border-white/5 overflow-y-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-5xl font-display font-bold text-white leading-tight">
                  {event.title}
                </h1>
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{format(new Date(event.start_time), 'MMM d, yyyy • HH:mm')}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400">
                    <Users className="w-4 h-4 text-primary" />
                    <span>{ytStats ? `${ytStats.viewers} watching` : '0 watching'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button className="flex-1 md:flex-none px-6 py-3 glass rounded-xl text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-white/10 transition-all">
                  <Share2 className="w-4 h-4 text-primary" />
                  <span>Share</span>
                </button>
                {event.youtube_id && (
                  <a 
                    href={`https://youtube.com/live/${event.youtube_id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 md:flex-none px-6 py-3 bg-red-600 rounded-xl text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center space-x-2 hover:bg-red-700 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>YouTube</span>
                  </a>
                )}
              </div>
            </div>

            <div className="max-w-4xl">
              <p className="text-gray-400 leading-relaxed text-lg font-light">
                {event.description}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Chat */}
        <div className="w-full lg:w-[450px] flex-shrink-0 bg-background border-l border-white/5 p-4 lg:p-6 lg:h-full">
          <LiveChat eventId={event.id} />
        </div>
      </div>
    </div>
  );
}
