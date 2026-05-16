import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertCircle, Loader2 } from 'lucide-react';

interface HighPerformancePlayerProps {
  url: string;
  playing?: boolean;
  muted?: boolean;
  controls?: boolean;
  playsinline?: boolean;
  onReady?: () => void;
  onError?: (error: any) => void;
  className?: string;
  poster?: string;
}

export default function HighPerformancePlayer({
  url,
  playing = true,
  muted = true,
  controls = true,
  playsinline = true,
  onReady,
  onError,
  className,
  poster
}: HighPerformancePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    setLoading(true);
    setError(null);

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = url.toLowerCase().includes('.m3u8') || 
                  url.toLowerCase().includes('playlist') ||
                  url.toLowerCase().includes('/hls/') ||
                  url.toLowerCase().includes('/live/');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        manifestLoadingMaxRetry: 10,
        levelLoadingMaxRetry: 10,
        fragLoadingMaxRetry: 10,
        startLevel: -1, // Auto
        abrEwmaDefaultEstimate: 500000,
        testBandwidth: true,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        if (playing) {
          video.play().catch(e => {
            console.warn('Auto-play blocked:', e);
            // Non-fatal, user might need to interact
          });
        }
        onReady?.();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Fatal network error encountered, try to recover');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error encountered, try to recover');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error:', data);
              setError('Failed to load stream');
              onError?.(data);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        if (playing) video.play().catch(() => {});
        onReady?.();
      });
      video.addEventListener('error', (e) => {
        setError('Native playback error');
        onError?.(e);
      });
    } else {
      // Fallback for non-HLS or no support
      video.src = url;
      video.addEventListener('playing', () => {
        setLoading(false);
        onReady?.();
      });
      video.addEventListener('error', (e) => {
        setError('Playback error');
        onError?.(e);
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playing]);

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        muted={muted}
        controls={controls}
        playsInline={playsinline}
        poster={poster}
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
      />
      
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-white font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-full text-xs font-bold uppercase tracking-widest"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
