import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ExternalLink, Youtube, Play, ShieldAlert } from 'lucide-react';

interface YouTubeVideoPlayerProps {
  videoId: string; // can be id, full url, handle, or iframe string
  autoPlay?: boolean;
  muted?: boolean;
  onReady?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export const YouTubeVideoPlayer: React.FC<YouTubeVideoPlayerProps> = ({ 
  videoId, 
  autoPlay = true, 
  muted = false,
  onReady, 
  onError, 
  className 
}) => {
  const [useDirectLink, setUseDirectLink] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onReady) onReady();
    }, 1200);
    return () => clearTimeout(timer);
  }, [videoId, onReady]);

  const getEmbedInfo = (idOrUrl: string) => {
    if (!idOrUrl) return { embedUrl: '', officialUrl: '' };
    let processed = idOrUrl.trim();
    if (processed.startsWith('<iframe')) {
        const match = processed.match(/src="([^"]+)"/);
        if (match) {
            processed = match[1];
        }
    }

    const officialUrl = processed.startsWith('http') ? processed : `https://www.youtube.com/${processed}`;

    // If it's a channel URL or handle (e.g. @ChannelsTelevision), point to /live
    if (processed.includes('@') || processed.includes('/channel/') || processed.includes('/c/') || processed.includes('/user/')) {
      const liveUrl = officialUrl.endsWith('/live') ? officialUrl : `${officialUrl.replace(/\/$/, '')}/live`;
      return {
        embedUrl: '',
        officialUrl: liveUrl,
        isChannelUrl: true
      };
    }

    const match = processed.match(/(?:v=|embed\/|youtu\.be\/|\/v\/|watch\?v=|^)([a-zA-Z0-9_-]{11})(?:[?&]|$)/);
    const id = match ? match[1] : processed;
    
    const params = new URLSearchParams();
    params.set('rel', '0');
    params.set('modestbranding', '1');
    if (autoPlay) params.set('autoplay', '1');
    if (muted) params.set('mute', '1');

    return {
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`,
      officialUrl: `https://www.youtube.com/watch?v=${id}`,
      isChannelUrl: false
    };
  };

  const info = getEmbedInfo(videoId);
  
  if (!info.embedUrl && !info.isChannelUrl) {
    return <div className={cn("flex items-center justify-center w-full aspect-video bg-black rounded-xl text-white", className)}>Invalid Video</div>;
  }

  // If YouTube blocks embedding (common for official news livestreams), or user clicked direct watch, show official live watch card
  if (info.isChannelUrl || useDirectLink) {
    return (
      <div className={cn("relative w-full aspect-video bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col items-center justify-center p-8 text-center", className)}>
        <div className="w-16 h-16 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center mb-4 text-red-500 animate-pulse">
          <Youtube className="w-8 h-8" />
        </div>
        <h3 className="text-white text-lg font-bold mb-2">Official Live News Stream</h3>
        <p className="text-zinc-400 text-xs max-w-md mb-6 leading-relaxed">
          Broadcasters restrict direct in-app embedding to prevent ad-blocking. Watch this live broadcast directly on the official YouTube player with full chat and HD quality.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a 
            href={info.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-bold uppercase tracking-wider transition-all shadow-lg hover:scale-105 active:scale-95"
          >
            <Play className="w-4 h-4 fill-white" />
            Watch Live on YouTube
          </a>
          {useDirectLink && (
            <button 
              onClick={() => setUseDirectLink(false)}
              className="px-4 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-full text-xs font-medium transition-all border border-zinc-800"
            >
              Try In-App Player
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl group", className)}>
        <iframe 
            width="100%" 
            height="100%" 
            src={info.embedUrl}
            frameBorder="0" 
            allowFullScreen 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="no-referrer-when-downgrade"
            title="YouTube video player"
            className="w-full h-full"
            onError={() => setUseDirectLink(true)}
            onLoad={() => {
              if (onReady) onReady();
            }}
        ></iframe>
        
        {/* Watch on YouTube button overlay */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
          <button 
            onClick={() => setUseDirectLink(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/90 hover:bg-red-600 text-white rounded-lg text-xs font-medium backdrop-blur-md shadow-lg transition-all"
            title="Switch to Official View"
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>Official Watch Mode</span>
          </button>
          <a 
            href={info.officialUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/80 hover:bg-black text-white rounded-lg text-xs font-medium backdrop-blur-md border border-white/10 shadow-lg"
            title="Open on YouTube"
          >
            <ExternalLink className="w-3 h-3 text-white/60" />
          </a>
        </div>
    </div>
  );
};
