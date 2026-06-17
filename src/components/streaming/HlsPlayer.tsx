
import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  src: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onReady?: () => void;
  onError?: (error: any) => void;
}

const HlsPlayer: React.FC<HlsPlayerProps> = ({
  src,
  autoPlay = true,
  muted = false,
  controls = true,
  onReady,
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 10, // Reduced from 30 for faster start
        maxMaxBufferLength: 20,
        initialLiveManifestSize: 1, // Start playing as soon as 1 segment is found
        manifestLoadingMaxRetry: 2,
        levelLoadingMaxRetry: 2,
        fragLoadingMaxRetry: 2,
        // Public proxied streams don't need credentials, and it often causes CORS issues
        xhrSetup: (xhr, url) => {
          // console.log(`[HlsPlayer] Fetching: ${url}`);
        }
      });

      hlsRef.current = hls;
      console.log(`[HlsPlayer] Loading Source: ${src}`);
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log(`[HlsPlayer] Manifest parsed successfully, levels found: ${data.levels?.length}`);
        onReady?.();
        if (autoPlay) {
          video.play().catch(err => {
            console.warn('[HlsPlayer] Autoplay prevented:', err);
          });
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        // console.log(`[HlsPlayer] Fragment loaded: ${data.frag.url}`);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error(`[HlsPlayer] FATAL ERROR: ${data.details}`, data);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('[HlsPlayer] Fatal network error, trying to recover (startLoad)...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[HlsPlayer] Fatal media error, trying to recover (recoverMediaError)...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[HlsPlayer] Unrecoverable fatal error.');
              onError?.(data);
              hls.destroy();
              break;
          }
        } else {
          // Only log non-fatal warnings once per type to avoid spamming
          // console.warn(`[HlsPlayer] Warning: ${data.details}`);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        onReady?.();
        if (autoPlay) video.play();
      });
      video.addEventListener('error', (e) => onError?.(e));
    } else {
      onError?.(new Error('HLS not supported in this browser'));
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay]);

  return (
    <video
      ref={videoRef}
      className="w-full h-full object-contain"
      muted={muted}
      controls={controls}
      playsInline
      crossOrigin="anonymous"
    />
  );
};

export default HlsPlayer;
