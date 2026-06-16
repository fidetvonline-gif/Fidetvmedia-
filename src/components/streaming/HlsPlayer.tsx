
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
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        }
      });

      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('[HlsPlayer] Manifest parsed successfully');
        onReady?.();
        if (autoPlay) {
          video.play().catch(err => {
            console.warn('[HlsPlayer] Autoplay prevented:', err);
            // If autoplay failed, we don't necessarily want to call onError, 
            // the user might just need to click play.
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.warn(`[HlsPlayer] Error: ${data.details}`, data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('[HlsPlayer] Fatal network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('[HlsPlayer] Fatal media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[HlsPlayer] Fatal error, giving up.');
              onError?.(data);
              hls.destroy();
              break;
          }
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
