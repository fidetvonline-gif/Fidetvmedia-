import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface YouTubeVideoPlayerProps {
  videoId: string; // can be id, full url, or iframe string
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
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const getEmbedId = (idOrUrl: string) => {
    if (!idOrUrl) return '';
    let processed = idOrUrl.trim();
    if (processed.startsWith('<iframe')) {
        const match = processed.match(/src="([^"]+)"/);
        if (match) {
            processed = match[1];
        }
    }
    const match = processed.match(/(?:v=|embed\/|youtu\.be\/|\/v\/|watch\?v=|^)([a-zA-Z0-9_-]{11})(?:[?&]|$)/);
    return match ? match[1] : processed;
  };

  const finalId = getEmbedId(videoId);
  
  if (!finalId) return <div className={cn("flex items-center justify-center w-full aspect-video bg-black rounded-xl text-white", className)}>Invalid Video</div>;

  // Use standard youtube.com for best compatibility and bypass complexity that causes Error 153
  const getEmbedUrl = () => {
    const params = new URLSearchParams();
    params.set('rel', '0');
    params.set('modestbranding', '1');
    if (autoPlay) params.set('autoplay', '1');
    if (muted) params.set('mute', '1');
    
    // We explicitly OMIT enablejsapi and origin to avoid the most common causes of Error 153 
    // when hosted in nested iframes (like AI Studio preview).
    return `https://www.youtube-nocookie.com/embed/${finalId}?${params.toString()}`;
  };

  return (
    <div className={cn("relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl", className)}>
        <iframe 
            width="100%" 
            height="100%" 
            src={getEmbedUrl()}
            frameBorder="0" 
            allowFullScreen 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="no-referrer-when-downgrade"
            title="YouTube video player"
            className="w-full h-full"
        ></iframe>
    </div>
  );
};
