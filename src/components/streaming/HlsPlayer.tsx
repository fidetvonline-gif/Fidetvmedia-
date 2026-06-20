
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
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        initialLiveManifestSize: 1,
        manifestLoadingTimeOut: 30000, // Match server timeout room
        levelLoadingTimeOut: 30000,
        fragLoadingTimeOut: 30000,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 4,
        manifestLoadingRetryDelay: 1000,
        levelLoadingRetryDelay: 1000,
        fragLoadingRetryDelay: 1000,
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

      let networkErrorCount = 0;
      let mediaErrorCount = 0;
      let manifestErrorCount = 0;

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error(`[HlsPlayer] FATAL ERROR: ${data.details}`, data);
          
          // Specific handling for manifest loading errors
          if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
              data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR ||
              data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT) {
            
            manifestErrorCount++;
            if (manifestErrorCount <= 2) {
              console.log(`[HlsPlayer] Manifest error (${data.details}), retrying (${manifestErrorCount}/2)...`);
              setTimeout(() => {
                hls.loadSource(src);
              }, 2000);
              return;
            }

             console.error(`[HlsPlayer] Critical manifest failure (${data.details}). Signal may be offline or protected.`);
             onErrorRef.current?.(`Broadcast data unparseable or signal offline. (${data.details})`);
             hls.destroy();
             return;
          }

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkErrorCount++;
              if (networkErrorCount <= 3) {
                console.log(`[HlsPlayer] Fatal network error (${data.details}), retrying (${networkErrorCount}/3)...`);
                hls.startLoad();
              } else {
                console.error('[HlsPlayer] Network error recovery exhausted.');
                onErrorRef.current?.(`Signal network failure: ${data.details}`);
                hls.destroy();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              mediaErrorCount++;
              if (mediaErrorCount <= 2) {
                console.log(`[HlsPlayer] Fatal media error (${data.details}), attempting recovery (${mediaErrorCount}/2)...`);
                hls.recoverMediaError();
              } else {
                console.error('[HlsPlayer] Media error recovery exhausted.');
                onErrorRef.current?.(`Signal decode failure: ${data.details}`);
                hls.destroy();
              }
              break;
            default:
              console.error(`[HlsPlayer] Unrecoverable fatal error: ${data.details}`);
              onErrorRef.current?.(`Unrecoverable signal error: ${data.details}`);
              hls.destroy();
              break;
          }
        } else {
          // Non-fatal errors
          if (data.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR || data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR) {
            console.warn(`[HlsPlayer] Non-fatal load error: ${data.details}`);
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      const readyHandler = () => {
        onReadyRef.current?.();
        if (autoPlay) {
          video.play().catch(err => {
            if (err.name !== 'AbortError') {
              console.warn('[HlsPlayer] Native playback error:', err);
            }
          });
        }
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
    />
  );
};

export default HlsPlayer;
