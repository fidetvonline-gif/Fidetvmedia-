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
  const [isReady, setIsReady] = useState(false);
  const [origin, setOrigin] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const handleRetry = () => {
    setError(null);
    setIsReady(false);
    setRetryCount(prev => prev + 1);
  };

  // Logic to extract video ID if it's already a full URL or iframe
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
  // Using youtube-nocookie.com for better privacy and fewer CORS issues
  const url = finalId ? (finalId.length === 11 ? `https://www.youtube-nocookie.com/watch?v=${finalId}` : finalId) : '';

  const handleInternalReady = () => {
    setIsReady(true);
    setError(null);
    onReady?.();
  };

  const handleInternalError = (e: any) => {
    // Capture as much detail as possible from the error event
    const diagnosticInfo = {
      error: e,
      errorType: typeof e,
      videoId: finalId,
      url: url,
      origin: origin,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      timestamp: new Date().toISOString()
    };

    console.error("[YouTubeVideoPlayer] Playback failure diagnostic:", diagnosticInfo);

    let msg = "This video is unavailable or restricted.";
    
    // Handle YouTube specific error codes
    // 2: The request contains an invalid parameter value.
    // 5: The requested content cannot be played in an HTML5 player.
    // 100: The video requested was not found. This error occurs when a video has been removed (for any reason) or has been marked as private.
    // 101: The owner of the requested video does not allow it to be played in embedded players.
    // 150: This error is the same as 101. It's just a 101 error in disguise!
    if (typeof e === 'number') {
      switch (e) {
        case 2:
          msg = "Invalid video ID or URL format (Code 2).";
          break;
        case 5:
          msg = "HTML5 player error or browser incompatibility (Code 5).";
          break;
        case 100:
          msg = "Video not found, removed, or private (Code 100).";
          break;
        case 101:
        case 150:
          msg = "Embedding is disabled by the owner for this video (Code 101/150).";
          break;
        default:
          msg = `YouTube Player error detected (Code: ${e})`;
      }
    } else if (e?.target?.error) {
      msg = `Player target error: ${e.target.error.message || 'Unknown code'}`;
    } else if (e?.errorMessage) {
      msg = e.errorMessage;
    }

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
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <span className="text-[10px] items-center font-black uppercase tracking-[0.2em] text-primary animate-pulse">Initializing Stream</span>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/95 p-8 text-center"
          >
            <AlertCircle className="w-12 h-12 text-[#e24b4a] mb-4" />
            <h3 className="text-white text-lg font-black uppercase tracking-wider mb-2">Playback Error</h3>
            <p className="text-white/60 text-sm max-w-md mb-6">{error}</p>
            
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button 
                onClick={handleRetry}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-colors"
              >
                Retry Playback
              </button>

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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full h-full pointer-events-auto">
        <Player
          key={`${url}-${retryCount}`}
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
                origin: origin || undefined,
                enablejsapi: 1,
                modestbranding: 1,
                rel: 0,
                iv_load_policy: 3,
                autoplay: autoPlay ? 1 : 0
              },
              embedOptions: {
                host: 'https://www.youtube-nocookie.com'
              }
            }
          } as any}
        />
      </div>
    </div>
  );
};
