import React, { useState } from 'react';
import ReactPlayer from 'react-player';
import { AlertCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const Player = ReactPlayer as any;

interface YouTubeEmbedProps {
  videoId: string; // can be id, full url, or iframe string
  autoPlay?: boolean;
  muted?: boolean;
  onReady?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ 
  videoId, 
  autoPlay = true, 
  muted = false,
  onReady, 
  onError, 
  className 
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Logic to extract video ID if it's already a full URL or iframe
  const getEmbedId = (idOrUrl: string) => {
    if (!idOrUrl) return '';
    
    let processed = idOrUrl.trim();

    // Check if it's an iframe tag
    if (processed.startsWith('<iframe')) {
        const match = processed.match(/src="([^"]+)"/);
        if (match) {
            processed = match[1];
        }
    }
    
    // Check for standard YouTube URL patterns or IDs
    // This regex looks for 11 chars after common YouTube URL precursors
    const match = processed.match(/(?:v=|embed\/|youtu\.be\/|\/v\/|watch\?v=|^)([a-zA-Z0-9_-]{11})(?:[?&]|$)/);
    return match ? match[1] : processed;
  };

  const finalId = getEmbedId(videoId);
  // Ensure we have a clean YouTube URL for ReactPlayer
  const url = finalId ? (finalId.length === 11 ? `https://www.youtube.com/watch?v=${finalId}` : finalId) : '';

  const handleInternalReady = () => {
    setIsReady(true);
    onReady?.();
  };

  const handleInternalError = (e: any) => {
    console.error("[YouTubeEmbed] Error loading video:", e);
    const msg = "This video is unavailable, private, or restricted from playing on other websites.";
    // Only show error if it's not a transient one or if it persists
    if (finalId) {
      setError(msg);
      onError?.(msg);
    }
  };

  return (
    <div className={cn("relative w-full aspect-video bg-black rounded-xl overflow-hidden group", className)}>
      <AnimatePresence>
        {!isReady && !error && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 pointer-events-none"
          >
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/95 p-8 text-center"
          >
            <AlertCircle className="w-12 h-12 text-[#e24b4a] mb-4" />
            <h3 className="text-white text-lg font-black uppercase tracking-wider mb-2">Video Unavailable</h3>
            <p className="text-white/60 text-sm max-w-md mb-6">{error}</p>
            {finalId && (
              <a 
                href={`https://www.youtube.com/watch?v=${finalId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 bg-[#e24b4a]/20 text-[#e24b4a] rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#e24b4a]/30 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Play className="w-4 h-4" />
                Watch on YouTube
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full h-full pointer-events-auto">
        <Player
          url={url}
          width="100%"
          height="100%"
          playing={autoPlay}
          muted={muted}
          controls={true}
          onReady={handleInternalReady}
          onError={handleInternalError}
          config={{
            youtube: {
              playerVars: { 
                origin: typeof window !== 'undefined' ? window.location.origin : '',
                modestbranding: 1,
                rel: 0
              }
            }
          } as any}
        />
      </div>
    </div>
  );
};
