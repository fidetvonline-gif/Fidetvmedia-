
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
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
  }, [onReady, onError]);

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
        onReadyRef.current?.();
        if (autoPlay) {
          video.play().catch(err => {
            console.warn('[HlsPlayer] Autoplay prevented:', err);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error(`[HlsPlayer] FATAL ERROR: ${data.details}`, data);
          
          // Specific handling for manifest parsing errors (likely invalid content from proxy)
          if (data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR || 
              data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
             console.error('[HlsPlayer] Critical manifest failure. Channel likely offline.');
             onErrorRef.current?.("Broadcast data is unparseable or channel is offline.");
             hls.destroy();
             return;
          }

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
              onErrorRef.current?.(data);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      const readyHandler = () => {
        onReadyRef.current?.();
        if (autoPlay) video.play();
      };
      const errorHandler = (e: any) => onErrorRef.current?.(e);

      video.addEventListener('loadedmetadata', readyHandler);
      video.addEventListener('error', errorHandler);
      
      return () => {
        video.removeEventListener('loadedmetadata', readyHandler);
        video.removeEventListener('error', errorHandler);
      };
    } else {
      onErrorRef.current?.(new Error('HLS not supported in this browser'));
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
