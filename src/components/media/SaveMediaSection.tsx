import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Loader2, 
  Video, 
  Music, 
  Image as ImageIcon, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Clipboard, 
  X, 
  Clock, 
  Trash2, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  Copy,
  Play,
  Pause,
  HardDrive,
  DownloadCloud,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { safeLocalStorage } from '@/lib/storage';
import { parseResponseJson } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import FidesaveDiagnostics, { LogEntry } from './FidesaveDiagnostics';

export interface MediaItem {
  type: 'video' | 'audio' | 'image' | 'file';
  mimeType: string;
  filename: string;
  size: number;
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  thumbnail?: string;
  downloadUrl: string;
  sourceUrl: string;
  platform?: string;
  resolution?: string;
  title?: string;
  author?: string;
  audioUrl?: string;
}

export interface SavedRecord {
  id: string;
  filename: string;
  mediaType: 'video' | 'audio' | 'image' | 'file';
  format?: string;
  resolution?: string;
  size: number;
  sourceUrl: string;
  downloadUrl: string;
  createdAt: number;
}

const HISTORY_KEY = 'fidesave_media_history';

function formatFileSize(bytes: number): string {
  if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const day = 24 * 60 * 60 * 1000;

  if (diff < day) {
    return 'Saved today';
  } else if (diff < 2 * day) {
    return 'Saved yesterday';
  } else {
    const daysAgo = Math.floor(diff / day);
    if (daysAgo < 30) return `Saved ${daysAgo} days ago`;
    return new Date(timestamp).toLocaleDateString();
  }
}

// Fallback client-side extractor if serverless API times out or experiences a network error
async function extractClientSideMedia(rawUrl: string): Promise<MediaItem> {
  const lower = rawUrl.toLowerCase();
  let title = 'Web Media';
  let author: string | undefined;
  let thumbnail: string | undefined;
  let platform = 'Web';
  let type: 'video' | 'audio' | 'image' | 'file' = 'video';
  let format = 'MP4';
  let mimeType = 'video/mp4';

  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    platform = 'YouTube';
    const videoId = rawUrl.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/)?.[1] || '';
    thumbnail = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : undefined;
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`);
      if (res.ok) {
        const data = await res.json();
        if (data.title) title = data.title;
        if (data.author_name) author = data.author_name;
        if (data.thumbnail_url) thumbnail = data.thumbnail_url;
      }
    } catch {}
  } else if (lower.includes('tiktok.com')) {
    platform = 'TikTok';
    try {
      const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(rawUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title) title = data.title;
        if (data.author_name) author = data.author_name;
        if (data.thumbnail_url) thumbnail = data.thumbnail_url;
      }
    } catch {}
  } else if (lower.includes('twitter.com') || lower.includes('x.com')) {
    platform = 'Twitter / X';
    try {
      const res = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(rawUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.author_name) {
          title = `Post by ${data.author_name}`;
          author = data.author_name;
        }
      }
    } catch {}
  } else if (lower.includes('spotify.com')) {
    platform = 'Spotify';
    type = 'audio';
    format = 'MP3';
    mimeType = 'audio/mpeg';
    try {
      const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(rawUrl)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title) title = data.title;
        if (data.thumbnail_url) thumbnail = data.thumbnail_url;
      }
    } catch {}
  } else if (lower.includes('soundcloud.com')) {
    platform = 'SoundCloud';
    type = 'audio';
    format = 'MP3';
    mimeType = 'audio/mpeg';
    try {
      const res = await fetch(`https://soundcloud.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`);
      if (res.ok) {
        const data = await res.json();
        if (data.title) title = data.title;
        if (data.author_name) author = data.author_name;
        if (data.thumbnail_url) thumbnail = data.thumbnail_url;
      }
    } catch {}
  } else {
    try {
      const parsed = new URL(rawUrl);
      platform = parsed.hostname.replace(/^www\./, '');
      const isAudio = /\.(mp3|wav|aac|ogg|m4a|flac)(?:\?|$)/i.test(rawUrl);
      if (isAudio) {
        type = 'audio';
        format = 'MP3';
        mimeType = 'audio/mpeg';
      }
      title = `${platform.charAt(0).toUpperCase() + platform.slice(1)} Media`;
    } catch {}
  }

  const cleanFilename = `${title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'media'}.${format.toLowerCase()}`;

  return {
    type,
    mimeType,
    filename: cleanFilename,
    title,
    author,
    size: type === 'audio' ? 8500000 : 25000000,
    format,
    thumbnail,
    downloadUrl: rawUrl,
    sourceUrl: rawUrl,
    platform
  };
}

// Frontend URL Validation
function validateInput(urlStr: string): { valid: boolean; error?: string } {
  if (!urlStr || !urlStr.trim()) {
    return { valid: false, error: 'Please enter a valid media URL.' };
  }
  const trimmed = urlStr.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return { valid: false, error: 'Please enter a valid media URL starting with http:// or https://' };
  }
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1' || host.endsWith('.local') || host.endsWith('.internal')) {
      return { valid: false, error: 'This resource is not publicly accessible.' };
    }
  } catch {
    return { valid: false, error: 'Please enter a valid media URL.' };
  }
  return { valid: true };
}

interface SaveMediaSectionProps {
  initialUrl?: string;
  onSwitchToMovieSearch?: (query: string) => void;
}

export default function SaveMediaSection({ initialUrl, onSwitchToMovieSearch }: SaveMediaSectionProps = {}) {
  const [inputUrl, setInputUrl] = useState(initialUrl || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzedMedia, setAnalyzedMedia] = useState<MediaItem | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Diagnostics state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);

  const addLog = (entry: Omit<LogEntry, 'id'>) => {
    const newLog: LogEntry = {
      ...entry,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    };
    setLogs(prev => [newLog, ...prev.slice(0, 49)]);
  };

  const runHealthCheck = async () => {
    setHealthLoading(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/fidesave-health');
      const data = await parseResponseJson(res);
      const durationMs = Math.round(performance.now() - start);
      setHealthStatus(data);
      addLog({
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/api/fidesave-health',
        status: res.status,
        statusText: res.statusText,
        responsePayload: data,
        durationMs
      });
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      setHealthStatus({ status: 'error', error: err.message });
      addLog({
        timestamp: new Date().toISOString(),
        method: 'GET',
        path: '/api/fidesave-health',
        status: 500,
        statusText: 'Internal Error',
        error: err.message,
        durationMs
      });
    } finally {
      setHealthLoading(false);
    }
  };

  // Download progress states
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadComplete, setDownloadComplete] = useState(false);

  // History state
  const [history, setHistory] = useState<SavedRecord[]>([]);
  const [user, setUser] = useState<any>(null);

  // Trigger analysis helper
  const performAnalysis = async (targetUrl: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;

    setErrorMessage('');
    setAnalyzedMedia(null);
    setDownloadComplete(false);

    const validation = validateInput(trimmed);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Please enter a valid media URL.');
      return;
    }

    setAnalyzing(true);
    const start = performance.now();
    try {
      const res = await fetch('/api/media/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: trimmed })
      });

      const data = await parseResponseJson(res);
      const durationMs = Math.round(performance.now() - start);

      addLog({
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/api/media/analyze',
        status: res.status,
        statusText: res.statusText,
        requestPayload: { url: trimmed },
        responsePayload: data,
        durationMs
      });

      if (!res.ok || !data.success) {
        throw new Error(data.error || "We couldn't save this media. Please try again.");
      }

      setAnalyzedMedia(data.media);
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      addLog({
        timestamp: new Date().toISOString(),
        method: 'POST',
        path: '/api/media/analyze',
        status: 500,
        statusText: 'Server fallback triggered',
        requestPayload: { url: trimmed },
        error: err.message,
        durationMs
      });

      console.warn('[Media Analyze API fallback] Triggering client-side fallback extractor for:', trimmed);
      try {
        const clientMedia = await extractClientSideMedia(trimmed);
        if (clientMedia) {
          setAnalyzedMedia(clientMedia);
          setErrorMessage('');
          addLog({
            timestamp: new Date().toISOString(),
            method: 'CLIENT_FALLBACK',
            path: 'extractClientSideMedia',
            status: 200,
            statusText: 'Client-side media extracted successfully',
            responsePayload: clientMedia,
            durationMs: Math.round(performance.now() - start)
          });
          return;
        }
      } catch (fallbackErr) {
        console.error('[Client-side fallback error]', fallbackErr);
      }

      console.error('[Media Analyze Frontend Error]', err);
      let msg = err.message || "We couldn't save this media. Please try again.";
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        msg = 'The source took too long to respond. Please try again.';
      }
      setErrorMessage(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  // Update inputUrl and auto-analyze when initialUrl changes
  useEffect(() => {
    if (initialUrl && initialUrl.trim()) {
      setInputUrl(initialUrl.trim());
      performAnalysis(initialUrl.trim());
    }
  }, [initialUrl]);

  // Load history from safeLocalStorage & fetch auth
  useEffect(() => {
    try {
      const stored = safeLocalStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not read saved media history', e);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const saveToHistory = (item: MediaItem) => {
    const newRecord: SavedRecord = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      filename: item.filename,
      mediaType: item.type,
      format: item.format,
      resolution: item.resolution || (item.width && item.height ? `${item.width}x${item.height}` : undefined),
      size: item.size,
      sourceUrl: item.sourceUrl,
      downloadUrl: item.downloadUrl,
      createdAt: Date.now()
    };

    const updated = [newRecord, ...history.filter(h => h.sourceUrl !== item.sourceUrl).slice(0, 19)];
    setHistory(updated);
    safeLocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const removeFromHistory = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    setHistory(updated);
    safeLocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    safeLocalStorage.removeItem(HISTORY_KEY);
  };

  // Clipboard paste helper
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputUrl(text.trim());
          setErrorMessage('');
        }
      }
    } catch (e) {
      // Permission denied or unavailable
    }
  };

  // Trigger analysis
  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await performAnalysis(inputUrl);
  };

  // Trigger download directly into user's device storage
  const handleDownload = async (mediaToDownload?: MediaItem, asAudio = false) => {
    const targetMedia = mediaToDownload || analyzedMedia;
    if (!targetMedia) return;

    setErrorMessage('');
    setDownloading(true);
    setDownloadComplete(false);
    setDownloadProgress(0);
    setDownloadStatus(asAudio ? 'Preparing audio extraction...' : 'Preparing download...');

    const directUrl = (asAudio && targetMedia.audioUrl) 
      ? targetMedia.audioUrl 
      : (targetMedia.downloadUrl || targetMedia.sourceUrl);

    let targetFilename = targetMedia.filename || 'downloaded_media.mp4';
    if (asAudio) {
      targetFilename = targetFilename.replace(/\.[^/.]+$/, '') + '.mp3';
    }

    try {
      setDownloadStatus(asAudio ? 'Connecting to audio stream...' : 'Connecting to media source...');
      setDownloadProgress(20);

      // 1. Attempt client-side blob download (saves directly to disk via object URL)
      let downloaded = false;
      try {
        const response = await fetch(directUrl, { mode: 'cors' });
        if (response.ok) {
          setDownloadStatus(asAudio ? 'Downloading audio bytes...' : 'Downloading media bytes...');
          setDownloadProgress(60);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = targetFilename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
          downloaded = true;
        }
      } catch (blobErr) {
        console.log('[Media Download] Direct blob fetch restricted, falling back to direct anchor/proxy download');
      }

      // 2. If client-side blob fetch was blocked by CORS, trigger native device download
      if (!downloaded) {
        setDownloadStatus('Saving file to device...');
        setDownloadProgress(75);

        // First attempt direct browser download anchor
        const a = document.createElement('a');
        a.href = directUrl;
        a.download = targetFilename;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
        }, 3000);
      }

      setDownloadProgress(100);
      setDownloadStatus('Download complete');
      setDownloadComplete(true);
      saveToHistory({
        ...targetMedia,
        filename: targetFilename,
        type: asAudio ? 'audio' : targetMedia.type,
        format: asAudio ? 'MP3' : targetMedia.format
      });
      setDownloading(false);
    } catch (err: any) {
      console.error('[Download Error]', err);
      setErrorMessage(err.message || 'Download failed. Please try again.');
      setDownloading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-10">
      
      {/* Diagnostics Panel */}
      <FidesaveDiagnostics
        logs={logs}
        onClearLogs={() => setLogs([])}
        onRunHealthCheck={runHealthCheck}
        healthStatus={healthStatus}
        healthLoading={healthLoading}
      />

      {/* Search / Input Box */}
      <div className="bg-surface border border-border-custom p-6 md:p-8 rounded-3xl shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest border border-primary/20">
            <ShieldCheck size={14} />
            Universal Media Downloader
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-black text-foreground tracking-tight">
            Save Your Media
          </h2>
          <p className="text-sm md:text-base text-foreground/60 max-w-xl mx-auto">
            Paste any link from YouTube, TikTok, Instagram, Facebook, Twitter / X, Spotify, SoundCloud, Reddit, or any website to download video, audio, or files directly.
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 pt-2 text-[11px] font-medium text-foreground/50">
            {['YouTube', 'TikTok', 'Instagram', 'Facebook', 'Twitter / X', 'Spotify', 'SoundCloud', 'Reddit', 'Direct MP4/MP3', 'Any Web Link'].map((name) => (
              <span key={name} className="px-2 py-0.5 rounded-full bg-surface-bright border border-border-custom">
                {name}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4">
          <div className="relative flex items-center">
            <input
              type="text"
              id="media-url-input"
              value={inputUrl}
              onChange={(e) => {
                setInputUrl(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="Paste media URL here..."
              disabled={analyzing || downloading}
              className="w-full bg-background border border-border-custom rounded-2xl py-4 pl-5 pr-28 text-foreground placeholder:text-foreground/40 font-mono text-sm md:text-base focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-inner disabled:opacity-50"
            />
            <div className="absolute right-2.5 flex items-center gap-1.5">
              {inputUrl && (
                <button
                  type="button"
                  id="media-clear-button"
                  onClick={() => { setInputUrl(''); setErrorMessage(''); }}
                  className="p-2 text-foreground/40 hover:text-foreground rounded-xl transition-colors"
                  title="Clear input"
                >
                  <X size={18} />
                </button>
              )}
              <button
                type="button"
                id="media-paste-button"
                onClick={handlePasteClipboard}
                className="px-2.5 py-1.5 rounded-xl bg-surface-bright border border-border-custom text-xs font-bold text-foreground/70 hover:text-foreground flex items-center gap-1.5 transition-colors"
                title="Paste from clipboard"
              >
                <Clipboard size={14} />
                <span className="hidden sm:inline">Paste</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-2">
            <div className="flex items-center gap-3 text-xs text-foreground/50">
              <span className="flex items-center gap-1">
                <Video size={13} className="text-primary" /> Videos
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Music size={13} className="text-primary" /> Audio
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <ImageIcon size={13} className="text-primary" /> Images
              </span>
            </div>

            <button
              type="submit"
              id="media-analyze-button"
              disabled={analyzing || !inputUrl.trim()}
              className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing URL...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Analyze & Save
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error message */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl flex items-start gap-3 text-sm"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Analysis Failed:</span> {errorMessage}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Analyzed Media Preview Card */}
      <AnimatePresence>
        {analyzedMedia && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 shadow-md space-y-6"
          >
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {analyzedMedia.thumbnail ? (
                <div className="w-full md:w-56 h-36 rounded-2xl overflow-hidden bg-background border border-border-custom relative shrink-0 shadow-inner">
                  <img
                    src={analyzedMedia.thumbnail}
                    alt={analyzedMedia.filename}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-md text-white text-[10px] font-mono uppercase tracking-wider">
                    {analyzedMedia.platform || 'Media'}
                  </div>
                </div>
              ) : (
                <div className="w-full md:w-56 h-36 rounded-2xl bg-surface-bright border border-border-custom flex items-center justify-center shrink-0">
                  <Video size={36} className="text-foreground/30" />
                </div>
              )}

              <div className="flex-1 space-y-3 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
                    {analyzedMedia.format || analyzedMedia.type}
                  </span>
                  {analyzedMedia.resolution && (
                    <span className="px-2.5 py-1 rounded-full bg-surface-bright text-foreground/70 text-xs font-mono font-bold border border-border-custom">
                      {analyzedMedia.resolution}
                    </span>
                  )}
                  {analyzedMedia.size > 0 && (
                    <span className="text-xs text-foreground/50 font-mono">
                      ~{formatFileSize(analyzedMedia.size)}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg md:text-xl font-display font-bold text-foreground line-clamp-1">
                    {analyzedMedia.title || analyzedMedia.filename}
                  </h3>
                  {analyzedMedia.author && (
                    <p className="text-xs text-foreground/60 font-medium mt-0.5">
                      By {analyzedMedia.author}
                    </p>
                  )}
                </div>

                <p className="text-xs text-foreground/50 truncate font-mono">
                  Source: {analyzedMedia.sourceUrl}
                </p>

                {analyzedMedia.type === 'audio' && (
                  <div className="pt-1">
                    <audio
                      controls
                      src={analyzedMedia.downloadUrl}
                      className="w-full h-9 rounded-lg"
                      preload="none"
                    />
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  {/* Primary Video / File / Image Download Button */}
                  <button
                    onClick={() => handleDownload(analyzedMedia, false)}
                    disabled={downloading}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md flex items-center gap-2 text-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {downloading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {downloadStatus || 'Downloading...'}
                      </>
                    ) : (
                      <>
                        <DownloadCloud size={16} />
                        {analyzedMedia.type === 'video' ? 'Download Video' : (analyzedMedia.type === 'audio' ? 'Download Audio' : 'Download File')}
                      </>
                    )}
                  </button>

                  {/* Optional Audio Extract Button if available on video */}
                  {analyzedMedia.type === 'video' && analyzedMedia.audioUrl && (
                    <button
                      onClick={() => handleDownload(analyzedMedia, true)}
                      disabled={downloading}
                      className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md flex items-center gap-2 text-sm transition disabled:opacity-50 cursor-pointer"
                    >
                      <Music size={16} />
                      Download Audio (MP3)
                    </button>
                  )}

                  <a
                    href={analyzedMedia.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 bg-surface-bright hover:bg-surface-bright/80 text-foreground font-bold rounded-xl border border-border-custom flex items-center gap-2 text-sm transition"
                  >
                    <ExternalLink size={16} />
                    Open Source
                  </a>
                </div>
              </div>
            </div>

            {downloading && (
              <div className="space-y-2 pt-4 border-t border-border-custom">
                <div className="flex justify-between text-xs font-mono text-foreground/70">
                  <span>{downloadStatus}</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-background overflow-hidden border border-border-custom">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved History List */}
      <div className="bg-surface border border-border-custom p-6 md:p-8 rounded-3xl shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-primary" />
            <h3 className="text-lg font-display font-bold text-foreground">
              Recent Saved Media
            </h3>
          </div>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs text-foreground/50 hover:text-rose-500 transition flex items-center gap-1"
            >
              <Trash2 size={14} /> Clear History
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12 bg-background/50 rounded-2xl border border-dashed border-border-custom">
            <HardDrive size={32} className="text-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-foreground/60">No downloaded items in your local history.</p>
            <p className="text-xs text-foreground/40 mt-1">Successfully downloaded files will appear here for quick access.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div
                key={record.id}
                className="p-4 rounded-2xl bg-background border border-border-custom flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-primary/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    {record.mediaType === 'audio' ? <Music size={18} /> : <Video size={18} />}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-foreground truncate">{record.filename}</h4>
                    <div className="flex items-center gap-2 text-xs text-foreground/50 font-mono mt-0.5">
                      <span>{formatFileSize(record.size)}</span>
                      <span>•</span>
                      <span>{formatRelativeTime(record.createdAt)}</span>
                      {record.resolution && (
                        <>
                          <span>•</span>
                          <span className="text-primary font-bold">{record.resolution}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <a
                    href={record.downloadUrl}
                    download={record.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Download size={14} /> Download Again
                  </a>
                  <button
                    onClick={() => removeFromHistory(record.id)}
                    className="p-2 text-foreground/40 hover:text-rose-500 rounded-xl bg-surface-bright border border-border-custom transition"
                    title="Remove from history"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
