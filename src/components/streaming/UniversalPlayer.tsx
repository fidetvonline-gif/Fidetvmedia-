
import React, { useState, useEffect, useRef } from 'react';
import { UniversalStreamService, NormalizedStream } from '../../lib/streaming';
import HlsPlayer from './HlsPlayer';
import ReactPlayer from 'react-player';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';

const Player = ReactPlayer as any;
import { motion, AnimatePresence } from 'motion/react';

interface UniversalPlayerProps {
  channel: any;
  autoPlay?: boolean;
  muted?: boolean;
  onError?: (error: string) => void;
  className?: string;
}

const UniversalPlayer: React.FC<UniversalPlayerProps> = ({ 
  channel, 
  autoPlay = true, 
  muted = false,
  onError,
  className
}) => {
  const [stream, setStream] = useState<NormalizedStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [failCount, setFailCount] = useState(0);
  
  const loadingRef = useRef(loading);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  
  useEffect(() => {
    if (!channel) {
        console.log('[Universal Player] No channel channel data passed');
        return;
    }
    
    console.log(`[Universal Player] Loading Channel: ${channel.name} (${channel.url})`);
    const normalized = UniversalStreamService.normalize(channel);
    setStream(normalized);
    setLoading(true);
    setError(null);
    setFailCount(0); // Reset for new channel
    
    console.log(`[Universal Player] Normalized stream:`, normalized);

    // Watchdog timer: If we are still loading after 25 seconds, something is wrong
    const watchdog = setTimeout(() => {
      if (loadingRef.current) {
        console.error(`[Universal Player] Signal Watchdog Timeout for ${channel.name}`);
        setError('Signal acquisition timed out. The bridge might be struggling with the current stream.');
        setLoading(false);
      }
    }, 25000);

    return () => clearTimeout(watchdog);
  }, [channel, retryKey]);

  const handleReady = () => {
    console.log(`[Universal Player] Playback ready for: ${stream?.name}`);
    setLoading(false);
    setFailCount(0);
  };

  const handleError = (e: any) => {
    console.error(`[Universal Player] Playback error:`, e);
    const msg = 'Failed to load stream. This might be due to geographical restrictions or server timeout.';
    setError(msg);
    setLoading(false);
    
    const newFailCount = failCount + 1;
    setFailCount(newFailCount);
    
    // Auto-notify parent if it fails immediately or after a retry
    if (newFailCount >= 1 && onError) {
      setTimeout(() => onError(msg), 3000); // Give user a moment to see the error
    }
  };

  if (!stream) return null;

  return (
    <div className={cn("relative w-full aspect-video bg-black rounded-xl overflow-hidden group", className)}>
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-white/60 text-xs font-black uppercase tracking-widest animate-pulse">
              Initializing Signal Bridge...
            </p>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 p-8 text-center"
          >
            <AlertCircle className="w-12 h-12 text-primary mb-4" />
            <h3 className="text-white text-lg font-black uppercase tracking-wider mb-2">Signal Failure</h3>
            <p className="text-white/60 text-sm max-w-md mb-6">{error}</p>
            <button 
              onClick={() => setRetryKey(k => k + 1)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect Signal
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full h-full">
        {stream.type === 'youtube' || stream.type === 'facebook' || stream.type === 'vimeo' ? (
          <Player
            url={stream.url}
            width="100%"
            height="100%"
            playing={autoPlay}
            muted={muted}
            controls={true}
            onReady={handleReady}
            onError={handleError}
            config={{
              youtube: { playerVars: { origin: typeof window !== 'undefined' ? window.location.origin : '' } },
              facebook: { attributes: { crossOrigin: 'anonymous' } }
            } as any}
          />
        ) : stream.type === 'hls' || stream.type === 'mpeg-ts' ? (
          <HlsPlayer 
            src={stream.needsProxy ? `/api/proxy-stream?url=${encodeURIComponent(stream.url)}` : stream.url}
            autoPlay={autoPlay}
            muted={muted}
            onReady={handleReady}
            onError={handleError}
          />
        ) : stream.type === 'mp4' ? (
          <video 
            src={stream.needsProxy ? `/api/proxy-stream?url=${encodeURIComponent(stream.url)}` : stream.url}
            className="w-full h-full object-contain"
            autoPlay={autoPlay}
            muted={muted}
            controls
            preload="auto"
            onCanPlay={handleReady}
            onError={handleError}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/40 font-mono text-sm">
            UNKNOWN STREAM FORMAT
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversalPlayer;
