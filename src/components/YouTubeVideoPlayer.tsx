import React, { useState, useEffect } from 'react';
import ReactPlayer from 'react-player';
import { AlertCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const Player = ReactPlayer as any;

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
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className={cn("relative w-full aspect-video bg-black rounded-xl overflow-hidden", className)}>
        <iframe 
            width="100%" 
            height="100%" 
            src={`https://www.youtube-nocookie.com/embed/${finalId}?rel=0&modestbranding=1${autoPlay ? '&autoplay=1' : ''}`}
            frameBorder="0" 
            allowFullScreen 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="YouTube video player"
        ></iframe>
    </div>
  );
};
