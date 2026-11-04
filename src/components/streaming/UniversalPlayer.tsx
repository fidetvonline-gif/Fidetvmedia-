
import React, { useState, useEffect, useRef } from 'react';
import { UniversalStreamService, NormalizedStream } from '../../lib/streaming';
import HlsPlayer from './HlsPlayer';
import ReactPlayer from 'react-player';
import { Loader2, AlertCircle, RefreshCw, Database, Tv, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

import { YouTubeVideoPlayer } from './../YouTubeVideoPlayer';

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
    setError(null);
    setFailCount(0); // Reset for new channel

    // If format is completely unknown, don't stay in loading state forever
    if (normalized.type === 'unknown') {
      setLoading(false);
      setError('Unknown signal format. The bridge does not support this broadcast type.');
      return;
    }

    setLoading(true);
    console.log(`[Universal Player] Normalized stream:`, normalized);

    if (normalized.type === 'youtube') {
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [channel]);

  // Separate watchdog effect to ensure it resets on retry/fallback
  useEffect(() => {
    if (!loading) return;

    // Watchdog timer: If we are still loading after 45 seconds, something is wrong
    // (Bypass watchdog for youtube/facebook/vimeo since they use external players which have their own state management)
    if (stream?.type === 'youtube' || stream?.type === 'facebook' || stream?.type === 'vimeo') {
      return;
    }

    const watchdog = setTimeout(() => {
      console.error(`[Universal Player] Signal Watchdog Timeout for: ${stream.url}`);
      setError('Signal acquisition is taking too long. This source might be heavily congested or restricted.');
      setLoading(false);
    }, 60000); // Increased to 60s for better tolerance on slow proxies

    return () => clearTimeout(watchdog);
  }, [loading, retryKey]);

  const handleReady = React.useCallback(() => {
    if (stream) {
      console.log(`[Universal Player] Playback ready for: ${stream.name}`);
    }
    setLoading(false);
    setError(null);
    setFailCount(0);
  }, [stream]);

  const handleError = React.useCallback((e: any) => {
    console.error(`[Universal Player] Playback error:`, e);
    
    // Auto-fallback: If direct playback fails (e.g. CORS), try routing through proxy.
    // If proxy playback fails (e.g. Cloud Run IP blocked), it will hit this again and fail out.
    if (stream && !stream.needsProxy && failCount === 0) {
      console.warn(`[Universal Player] Direct playback failure for ${stream.url}. Switching to Proxy Bridge...`);
      setStream({ ...stream, needsProxy: true });
      setLoading(true);
      setError(null);
      setFailCount(1);
      setRetryKey(k => k + 1);
      return;
    }
    
    // Check for specific common browser errors that are "silent"
    const isProbablyCors = !stream.needsProxy && (e?.name === 'NotAllowedError' || e?.name === 'SecurityError');
    if (isProbablyCors && failCount === 0) {
        handleError('CORS restriction detected. Re-routing through bridge...');
        return;
    }
    
    const msg = typeof e === 'string' ? e : (e?.message || 'Signal acquisition failed. This might be due to geographical restrictions or temporary downtime.');
    setError(msg);
    setLoading(false);
    
    setFailCount(prev => prev + 1);
    
    // Auto-notify parent if it fails
    if (onError) {
      onError(msg);
    }
  }, [stream, failCount, onError]);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream || stream.type !== 'mp4') return;

    if (autoPlay) {
      video.play().catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('[UniversalPlayer] MP4 playback error:', err);
        }
      });
    }

    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [stream, autoPlay]);

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
            
            {/* Show a forced skip/retry after 10s of loading */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 5 }}
              className="mt-6 flex flex-col items-center gap-2"
            >
              <p className="text-white/30 text-[9px] uppercase tracking-tighter mb-2">Signal acquisition is taking longer than usual</p>
              <div className="flex gap-3">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setRetryKey(k => k + 1);
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-[9px] font-black uppercase tracking-widest border border-white/5 transition-all"
                >
                  Force Refresh
                </button>
                {onError && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onError("User initiated signal skip");
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/60 text-[9px] font-black uppercase tracking-widest border border-white/5 transition-all text-[#e24b4a]"
                  >
                    Skip Signal
                  </button>
                )}
              </div>
            </motion.div>
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
            
            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => setRetryKey(k => k + 1)}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Reconnect Signal
              </button>
              
              <a 
                href="/health"
                className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all underline decoration-primary/50 underline-offset-4"
              >
                <Database className="w-4 h-4" />
                Diagnostics
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div key={retryKey} className="w-full h-full">
        {stream.type === 'youtube' ? (
          <YouTubeVideoPlayer 
            videoId={stream.url} 
            autoPlay={autoPlay} 
            muted={muted}
            className="w-full h-full" 
            onReady={handleReady}
            onError={handleError}
          />
        ) : stream.type === 'facebook' || stream.type === 'vimeo' ? (
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
              youtube: { playerVars: {} },
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
        ) : stream.type === 'official_embed' ? (
          <div className="relative w-full h-full bg-gradient-to-br from-zinc-950 via-zinc-900 to-black rounded-xl overflow-hidden shadow-2xl flex flex-col items-center justify-center p-8 text-center group">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(226,75,74,0.1)_0,transparent_70%)] pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-5 text-primary shadow-lg shadow-primary/20 animate-pulse">
                <Tv className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
                Official Broadcast Portal
              </span>
              <h3 className="text-white text-xl font-black uppercase tracking-wider mb-2">
                {stream.name}
              </h3>
              <p className="text-zinc-400 text-xs mb-8 leading-relaxed">
                NTA's security policy requires direct viewing on their official broadcast network to ensure uninterrupted HD playback. Click below to launch the live stream instantly.
              </p>
              <a 
                href={stream.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/25 hover:scale-105 active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                Launch Live Stream in New Tab
              </a>
            </div>
          </div>
        ) : stream.type === 'dash' ? (
          <video 
            ref={videoRef}
            src={stream.url}
            className="w-full h-full object-contain"
            muted={muted}
            controls
            preload="auto"
            onLoadedMetadata={handleReady}
            onCanPlay={handleReady}
            onError={handleError}
            playsInline
          />
        ) : stream.type === 'mp4' ? (
          <video 
            ref={videoRef}
            src={stream.needsProxy ? `/api/proxy-stream?url=${encodeURIComponent(stream.url)}` : stream.url}
            className="w-full h-full object-contain"
            muted={muted}
            controls
            preload="auto"
            onLoadedMetadata={handleReady}
            onCanPlay={handleReady}
            onError={handleError}
            playsInline
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
