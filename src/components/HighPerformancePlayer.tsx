import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { AlertCircle, Loader2, Settings, Check, Maximize, Minimize, Play, RefreshCw } from 'lucide-react';

import { motion, AnimatePresence } from 'motion/react';

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
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [levels, setLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 = Auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [finalUrl, setFinalUrl] = useState<string>(url);
  const [usingProxy, setUsingProxy] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!url) return;
    
    const isHls = url.toLowerCase().includes('.m3u8') || 
                  url.toLowerCase().includes('playlist.m3u') ||
                  url.toLowerCase().includes('m3u8') ||
                  url.toLowerCase().includes('limex') ||
                  url.toLowerCase().includes('sh-cdn.com') ||
                  url.toLowerCase().includes('amagi.tv') ||
                  url.toLowerCase().includes('wurl.tv') ||
                  url.toLowerCase().includes('ottera.tv') ||
                  url.toLowerCase().includes('akamai');

    if (isHls) {
      let proxyReferer = '';
      try {
        const targetOrigin = new URL(url).origin;
        proxyReferer = targetOrigin + '/';
        if (url.includes('amagi.tv')) proxyReferer = 'https://www.rakuten.tv/';
        if (url.includes('ottera.tv')) proxyReferer = 'https://www.ottera.tv/';
        if (url.includes('limex') || url.includes('sh-cdn')) proxyReferer = 'https://limex.tv/';
      } catch (e) {}
      
      const pUrl = `/api/proxy-stream?url=${encodeURIComponent(url)}${proxyReferer ? `&referer=${encodeURIComponent(proxyReferer)}` : ''}`;
      setFinalUrl(pUrl);
      setUsingProxy(true);
      console.log('[Player Debug] Signal Bridge Engaged:', pUrl);
    } else {
      setFinalUrl(url);
      setUsingProxy(false);
      console.log('[Player Debug] Direct Source Engaged:', url);
    }
  }, [url]);

  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const networkRetryCountRef = useRef(0);
  const mediaRetryCountRef = useRef(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !finalUrl) return;

    setLoading(true);
    setError(null);
    setRetryMessage(null);
    setLevels([]);
    setCurrentLevel(-1);
    setShowQualityMenu(false);
    networkRetryCountRef.current = 0;
    mediaRetryCountRef.current = 0;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    // Clear video element src to force fresh load
    if (video) {
      video.pause();
      video.src = '';
      try { video.load(); } catch (e) {}
    }

    const isHls = url.toLowerCase().includes('.m3u8') || 
                  url.toLowerCase().includes('playlist.m3u') ||
                  url.toLowerCase().includes('m3u8') ||
                  url.toLowerCase().includes('limex') ||
                  url.toLowerCase().includes('sh-cdn.com') ||
                  url.toLowerCase().includes('amagi.tv') ||
                  url.toLowerCase().includes('wurl.tv') ||
                  url.toLowerCase().includes('ottera.tv') ||
                  url.toLowerCase().includes('akamai');

    if (isHls && Hls.isSupported()) {
      console.log(`[Player Debug] Initializing HLS.js engine for: ${usingProxy ? 'Proxied' : 'Direct'} Stream`);
      const hls = new Hls({
        enableWorker: true,
        debug: false,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1024 * 1024,
        liveSyncDurationCount: 3, 
        liveMaxLatencyDurationCount: 10,
        manifestLoadingMaxRetry: 10,
        levelLoadingMaxRetry: 10,
        fragLoadingMaxRetry: 10,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        }
      });

      hlsRef.current = hls;
      hls.loadSource(finalUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!isMountedRef.current) return;
        console.log('[Player Debug] Manifest parsed successfully');
        setLoading(false);
        setError(null);
        setRetryMessage(null);
        
        if (hls.levels && hls.levels.length > 1) {
          setLevels(hls.levels);
        }

        if (playing && video.isConnected && video.readyState >= 2) {
          video.play().catch(e => {
            if (e.name !== 'AbortError' && e.name !== 'NotAllowedError') {
              console.warn('[Player Debug] Playback failure after manifest parse:', e.message);
            }
          });
        }
        onReady?.();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('[Player Debug] FATAL HLS Error:', data.type, data.details);
          
          // CRITICAL: If proxy is failing to reach the domain, fallback to direct
          if (usingProxy && (data.details === 'manifestLoadError' || data.details === 'manifestParsingError')) {
            console.warn('[Player Debug] Signal bridge failed (DNS/CORS), attempting direct bypass...');
            setUsingProxy(false);
            setFinalUrl(url); // This will trigger this useEffect again with direct URL
            return;
          }

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (networkRetryCountRef.current < 5) {
                networkRetryCountRef.current++;
                const msg = `Reconnecting... (${networkRetryCountRef.current}/5)`;
                setRetryMessage(msg);
                setTimeout(() => {
                  if (hlsRef.current && hlsRef.current === hls) {
                    hls.startLoad();
                  }
                }, 2000);
              } else {
                setError('Signal lost. The stream may be offline or restricted.');
                setRetryMessage(null);
                onError?.(data);
                hls.destroy();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[Player Debug] Media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              setError('Failed to establish stream link.');
              onError?.(data);
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('[Player Debug] Using Native HLS (Bridge: Safe)');
      video.src = finalUrl;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        if (playing && isMountedRef.current && video.readyState >= 2) {
          video.play().catch(() => {});
        }
        onReady?.();
      });
      video.addEventListener('error', (e) => {
        const error = (e.target as HTMLVideoElement).error;
        if (error && error.code !== 1) {
           setError(`Native Signal Error: ${error.message || 'unknown'}`);
           onError?.(e);
        }
      });
    } else {
      console.log('[Player Debug] Using Direct Playback');
      video.src = finalUrl;
      const handleLoaded = () => {
        setLoading(false);
        onReady?.();
      };
      video.addEventListener('loadedmetadata', handleLoaded);
      video.addEventListener('playing', handleLoaded);
      video.addEventListener('error', (e) => {
        const error = (e.target as HTMLVideoElement).error;
        if (error && error.code !== 1) {
           setError('Failed to play direct source');
           onError?.(e);
        }
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [finalUrl, retryKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (playing && isMountedRef.current && video.isConnected && video.readyState >= 2) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else if (!playing) {
      video.pause();
    }
  }, [playing]);

  return (
    <div 
      ref={playerRef}
      className={`relative w-full h-full bg-black overflow-hidden flex items-center justify-center ${className}`}
      onClick={() => {
        if (videoRef.current && videoRef.current.paused) {
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(console.error);
          }
        }
      }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        muted={muted}
        controls={controls}
        playsInline={playsinline}
        crossOrigin="anonymous"
        poster={poster}
        onPause={() => {
          if (playing && isMountedRef.current) {
            // If it pauses but should be playing, it's likely an autoplay block or user interaction needed
          }
        }}
      />

      {/* Visual hint for disabled autoplay or paused state */}
      {videoRef.current?.paused && playing && !loading && !error && (
        <div className="absolute inset-0 z-40 bg-black/40 flex flex-col items-center justify-center cursor-pointer group">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border border-primary/40 backdrop-blur-md group-hover:scale-110 transition-transform">
            <Play className="w-10 h-10 text-white ml-1" />
          </div>
          <p className="mt-4 text-white font-bold uppercase tracking-widest text-[10px]">Click to start stream</p>
        </div>
      )}
      
      {levels.length > 0 && (
        <div className="absolute bottom-16 right-4 z-30 flex flex-col items-end">
          <AnimatePresence>
            {showQualityMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="mb-2 bg-black/90 backdrop-blur-xl border border-white/10 rounded-xl p-1 min-w-[140px] shadow-2xl overflow-hidden"
              >
                <div className="px-3 py-2 text-[10px] font-bold text-white/40 uppercase tracking-widest border-b border-white/5 mb-1">
                  Quality Selector
                </div>
                
                <button
                  onClick={() => {
                    if (hlsRef.current) hlsRef.current.currentLevel = -1;
                    setCurrentLevel(-1);
                    setShowQualityMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                    currentLevel === -1 ? 'bg-primary/20 text-primary' : 'text-white/70 hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    Auto
                    <span className="text-[9px] opacity-40 font-mono">bits</span>
                  </span>
                  {currentLevel === -1 && <Check className="w-3.5 h-3.5" />}
                </button>

                {levels.slice().reverse().map((level, idx) => {
                  const originalIdx = levels.length - 1 - idx;
                  const label = level.height ? `${level.height}p` : `${(level.bitrate / 1000).toFixed(0)}k`;
                  return (
                    <button
                      key={originalIdx}
                      onClick={() => {
                        if (hlsRef.current) hlsRef.current.currentLevel = originalIdx;
                        setCurrentLevel(originalIdx);
                        setShowQualityMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        currentLevel === originalIdx ? 'bg-primary/20 text-primary' : 'text-white/70 hover:bg-white/5'
                      }`}
                    >
                      <span>{label}</span>
                      {currentLevel === originalIdx && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowQualityMenu(!showQualityMenu)}
            className="p-2.5 bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-black/70 transition-all border border-white/10 flex items-center gap-2 group cursor-pointer"
            title="Video Quality"
          >
            <Settings className={`w-4 h-4 ${showQualityMenu ? 'rotate-90' : ''} transition-transform duration-500`} />
            <span className="text-[10px] font-bold uppercase tracking-tighter opacity-0 group-hover:opacity-100 max-w-0 group-hover:max-w-[100px] overflow-hidden transition-all duration-500 whitespace-nowrap">
              {currentLevel === -1 ? 'Auto' : levels[currentLevel]?.height ? `${levels[currentLevel].height}p` : 'Manual'}
            </span>
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 bg-black/50 backdrop-blur-md rounded-full text-white/80 hover:text-white hover:bg-black/70 transition-all border border-white/10 flex items-center gap-2 group cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      )}
      
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10 gap-2">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          {retryMessage && (
            <p className="text-white/80 text-xs font-mono bg-black/50 px-3 py-1 rounded-full border border-white/5 animate-pulse">{retryMessage}</p>
          )}
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-20 p-6 text-center backdrop-blur-xl">
          <AlertCircle className="w-16 h-16 text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
          <h3 className="text-xl font-black uppercase tracking-tight text-white mb-2">Signal Lost</h3>
          <p className="text-white/60 text-sm max-w-xs mx-auto leading-relaxed mb-8 italic">
            {error}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => {
                setError(null);
                setRetryKey(prev => prev + 1);
              }}
              className="px-8 py-3 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect Stream
            </button>
            <a 
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <Maximize className="w-4 h-4" />
              Try Direct Link
            </a>
          </div>
          <p className="mt-8 text-white/20 text-[9px] uppercase tracking-widest font-mono">
            Debug Code: {retryKey} • Signal: {isFullscreen ? 'FS' : 'STD'} • Bridge: Proxy-Active
          </p>
        </div>
      )}
    </div>
  );
}
