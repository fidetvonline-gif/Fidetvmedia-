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
  Play,
  Pause,
  HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { safeLocalStorage } from '@/lib/storage';
import { parseResponseJson } from '@/lib/api';
import { supabase } from '@/lib/supabase';

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
    try {
      const res = await fetch('/api/media/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: trimmed })
      });

      const data = await parseResponseJson(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || "We couldn't save this media. Please try again.");
      }

      setAnalyzedMedia(data.media);
    } catch (err: any) {
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

  // Trigger download via direct CDN link or streaming fallback
  const handleDownload = async (mediaToDownload?: MediaItem) => {
    const targetMedia = mediaToDownload || analyzedMedia;
    if (!targetMedia) return;

    setErrorMessage('');
    setDownloading(true);
    setDownloadComplete(false);
    setDownloadProgress(0);
    setDownloadStatus('Preparing download...');

    // If we have a direct downloadUrl, prioritize direct download to guarantee full file delivery (e.g. 23.8MB)
    const directUrl = targetMedia.downloadUrl;
    if (directUrl && !directUrl.includes('/api/media/download')) {
      try {
        setDownloadStatus('Downloading full file...');
        setDownloadProgress(50);
        
        // Try direct browser anchor download
        const a = document.createElement('a');
        a.href = directUrl;
        a.download = targetMedia.filename || 'downloaded_media.mp4';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setDownloadProgress(100);
        setDownloadStatus('Download complete');
        setDownloadComplete(true);
        saveToHistory(targetMedia);
        setDownloading(false);
        return;
      } catch (directErr) {
        console.warn('Direct download anchor failed, falling back to server proxy download:', directErr);
      }
    }

    // Simplified Download Trigger for Production Stability
    // We use a direct browser navigation for the download endpoint.
    // This bypasses Vercel's 4.5MB payload limit (because the server now redirects)
    // and also avoids CORS fetch issues by using native browser download behavior.
    try {
      setDownloadStatus('Starting download...');
      setDownloadProgress(20);
      
      const downloadUrl = `/api/media/download?url=${encodeURIComponent(targetMedia.downloadUrl || targetMedia.sourceUrl)}&filename=${encodeURIComponent(targetMedia.filename)}`;
      
      // Use hidden iframe or direct navigation to trigger download without leaving page
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = targetMedia.filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // Give it a moment to trigger the browser's download manager
      setTimeout(() => {
        document.body.removeChild(a);
        setDownloadProgress(100);
        setDownloadStatus('Download started');
        setDownloadComplete(true);
        saveToHistory(targetMedia);
        setDownloading(false);
      }, 1500);

      return;
    } catch (err: any) {
      console.error('[Media Download Frontend Error]', err);
      setErrorMessage("We couldn't start the download. Please try the 'Direct File' link.");
    } finally {
      // setDownloading(false) is handled in the timeout above
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-10">
      
      {/* Search / Input Box */}
      <div className="bg-surface border border-border-custom p-6 md:p-8 rounded-3xl shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest border border-primary/20">
            <ShieldCheck size={14} />
            Safe Media Downloader
          </div>
          <h2 className="text-3xl md:text-4xl font-display font-black text-foreground tracking-tight">
            Save Your Media
          </h2>
          <p className="text-sm md:text-base text-foreground/60 max-w-xl mx-auto">
            Paste a publicly accessible URL to analyze and download videos, audios, images, or files with live preview.
          </p>
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
              <span>•</span>
              <span className="flex items-center gap-1">
                <FileText size={13} className="text-primary" /> Documents
              </span>
            </div>

            <button
              type="submit"
              id="media-analyze-button"
              disabled={analyzing || downloading || !inputUrl.trim()}
              className="w-full sm:w-auto min-w-[140px] px-8 py-3.5 rounded-2xl bg-primary text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-primary/20 min-h-[44px]"
            >
              {analyzing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <RefreshCw size={18} />
                  <span>Analyze</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Clean Error Alert */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex flex-col gap-2 text-red-500"
            >
              <div className="flex items-center gap-3">
                <AlertCircle size={20} className="shrink-0" />
                <p className="text-sm font-semibold flex-1">{errorMessage}</p>
                <button 
                  onClick={() => setErrorMessage('')}
                  className="hover:bg-red-500/20 p-1.5 rounded-xl transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
              {onSwitchToMovieSearch && !inputUrl.startsWith('http') && inputUrl.trim().length > 1 && (
                <div className="pt-2 border-t border-red-500/20 flex items-center justify-between">
                  <span className="text-xs text-foreground/70">Searching for a movie or cinema title?</span>
                  <button
                    type="button"
                    onClick={() => onSwitchToMovieSearch(inputUrl.trim())}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/20"
                  >
                    <span>Search "{inputUrl.trim()}" in Movie Search</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading / Downloading State Banner */}
        {(analyzing || downloading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3"
          >
            <div className="flex items-center justify-between text-sm font-bold text-foreground">
              <span className="flex items-center gap-2">
                <Loader2 size={18} className="animate-spin text-primary" />
                {analyzing ? 'Analyzing media...' : (downloadStatus || 'Preparing download...')}
              </span>
              {downloading && downloadProgress > 0 && (
                <span className="font-mono text-primary">{downloadProgress}%</span>
              )}
            </div>
            {downloading && (
              <div className="w-full h-2 bg-foreground/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${downloadProgress || 5}%` }}
                />
              </div>
            )}
          </motion.div>
        )}

        {/* Download Success Confirmation */}
        {downloadComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-between text-green-500"
          >
            <div className="flex items-center gap-2.5 text-sm font-bold">
              <CheckCircle2 size={18} />
              <span>Download complete! Media saved to your device.</span>
            </div>
            <button
              onClick={() => setDownloadComplete(false)}
              className="p-1 hover:bg-green-500/20 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </div>

      {/* MEDIA FOUND PREVIEW CARD */}
      <AnimatePresence>
        {analyzedMedia && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 space-y-6 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-border-custom pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-foreground/70">
                  Media Found
                </span>
              </div>
              <span className="px-3 py-1 rounded-full bg-surface-bright border border-border-custom text-xs font-bold text-foreground/60 uppercase">
                {analyzedMedia.platform || analyzedMedia.format || 'Media'}
              </span>
            </div>

            {/* Dynamic Media Preview Container */}
            <div className="rounded-2xl overflow-hidden bg-black/20 border border-border-custom flex items-center justify-center min-h-[160px] max-h-[420px] relative">
              {analyzedMedia.type === 'image' && (
                <img
                  src={analyzedMedia.thumbnail || analyzedMedia.downloadUrl}
                  alt={analyzedMedia.filename}
                  referrerPolicy="no-referrer"
                  className="max-h-[400px] w-auto max-w-full object-contain mx-auto"
                />
              )}

              {analyzedMedia.type === 'video' && (
                <div className="w-full flex flex-col items-center justify-center p-2">
                  <video
                    controls
                    preload="metadata"
                    poster={analyzedMedia.thumbnail}
                    crossOrigin="anonymous"
                    className="max-h-[380px] w-full rounded-xl object-contain bg-black"
                  >
                    <source src={analyzedMedia.downloadUrl} type={analyzedMedia.mimeType} />
                    <source src={`/api/media/download?url=${encodeURIComponent(analyzedMedia.downloadUrl || analyzedMedia.sourceUrl)}&filename=${encodeURIComponent(analyzedMedia.filename)}`} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              {analyzedMedia.type === 'audio' && (
                <div className="w-full p-8 flex flex-col items-center justify-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Music size={32} />
                  </div>
                  <p className="font-bold text-foreground text-center truncate max-w-md">
                    {analyzedMedia.filename}
                  </p>
                  <audio controls className="w-full max-w-md">
                    <source src={analyzedMedia.downloadUrl} type={analyzedMedia.mimeType} />
                    <source src={`/api/media/download?url=${encodeURIComponent(analyzedMedia.downloadUrl || analyzedMedia.sourceUrl)}&filename=${encodeURIComponent(analyzedMedia.filename)}`} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}

              {analyzedMedia.type === 'file' && (
                <div className="w-full p-10 flex flex-col items-center justify-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-surface-bright border border-border-custom flex items-center justify-center text-primary">
                    <FileText size={32} />
                  </div>
                  <p className="font-bold text-foreground text-center truncate max-w-md">
                    {analyzedMedia.filename}
                  </p>
                  <span className="text-xs text-foreground/50 font-mono">
                    {analyzedMedia.mimeType}
                  </span>
                </div>
              )}
            </div>

            {/* Media Metadata Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-bright border border-border-custom p-4 rounded-2xl text-center">
              <div>
                <span className="text-xs text-foreground/40 font-bold uppercase tracking-wider block">Format</span>
                <span className="text-sm md:text-base font-black text-foreground">
                  {analyzedMedia.format || analyzedMedia.type.toUpperCase()}
                </span>
              </div>

              <div>
                <span className="text-xs text-foreground/40 font-bold uppercase tracking-wider block">File Size</span>
                <span className="text-sm md:text-base font-black text-foreground">
                  {formatFileSize(analyzedMedia.size)}
                </span>
              </div>

              <div>
                <span className="text-xs text-foreground/40 font-bold uppercase tracking-wider block">
                  {analyzedMedia.type === 'video' ? 'Resolution' : (analyzedMedia.type === 'image' ? 'Dimensions' : 'Type')}
                </span>
                <span className="text-sm md:text-base font-black text-foreground">
                  {analyzedMedia.resolution || 
                   (analyzedMedia.width && analyzedMedia.height ? `${analyzedMedia.width}x${analyzedMedia.height}` : (analyzedMedia.type.toUpperCase()))}
                </span>
              </div>

              <div>
                <span className="text-xs text-foreground/40 font-bold uppercase tracking-wider block">Duration</span>
                <span className="text-sm md:text-base font-black text-foreground">
                  {analyzedMedia.duration ? formatDuration(analyzedMedia.duration) : 'N/A'}
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-foreground/60 truncate max-w-xs sm:max-w-md w-full">
                <span className="font-bold text-foreground block truncate">{analyzedMedia.filename}</span>
                <span className="font-mono text-foreground/40 truncate block">{analyzedMedia.sourceUrl}</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <a
                  href={`/api/media/download?url=${encodeURIComponent(analyzedMedia.downloadUrl || analyzedMedia.sourceUrl)}&filename=${encodeURIComponent(analyzedMedia.filename)}`}
                  download={analyzedMedia.filename}
                  onClick={() => saveToHistory(analyzedMedia)}
                  className="px-5 py-3.5 rounded-2xl bg-surface-bright border border-border-custom text-foreground font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-surface hover:text-primary transition-all min-h-[44px]"
                  title="Direct download file"
                >
                  <ExternalLink size={16} />
                  <span>Direct File</span>
                </a>

                <button
                  type="button"
                  id="media-save-download-button"
                  onClick={() => handleDownload()}
                  disabled={downloading}
                  className="flex-1 sm:flex-initial px-8 py-3.5 rounded-2xl bg-primary text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-95 disabled:opacity-50 transition-all shadow-md shadow-primary/20 min-h-[44px]"
                >
                  {downloading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>{downloadStatus || 'Downloading...'}</span>
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      <span>Save / Download</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SAVED MEDIA HISTORY SECTION (Requirement 18) */}
      <div className="bg-surface border border-border-custom rounded-3xl p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border-custom pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Clock size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Saved Media</h3>
              <p className="text-xs text-foreground/50">Your recently downloaded and saved media</p>
            </div>
          </div>

          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs text-foreground/40 hover:text-red-500 font-bold flex items-center gap-1.5 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
              title="Clear all saved items"
            >
              <Trash2 size={14} />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-surface-bright border border-border-custom mx-auto flex items-center justify-center text-foreground/30">
              <HardDrive size={24} />
            </div>
            <p className="text-sm text-foreground/50 font-medium">
              No media saved yet. Paste a URL above to analyze and save media.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {history.map((record) => {
              const iconMap = {
                video: <Video size={18} className="text-primary" />,
                audio: <Music size={18} className="text-amber-500" />,
                image: <ImageIcon size={18} className="text-emerald-500" />,
                file: <FileText size={18} className="text-indigo-500" />
              };

              return (
                <div
                  key={record.id}
                  className="p-4 rounded-2xl bg-surface-bright border border-border-custom hover:border-primary/40 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-surface border border-border-custom flex items-center justify-center shrink-0">
                      {iconMap[record.mediaType] || <FileText size={18} className="text-primary" />}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-bold text-foreground truncate" title={record.filename}>
                        {record.filename}
                      </p>
                      <p className="text-xs text-foreground/50 font-mono flex items-center gap-1.5">
                        <span>{record.format || record.mediaType.toUpperCase()}</span>
                        {record.resolution && (
                          <>
                            <span>•</span>
                            <span>{record.resolution}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{formatFileSize(record.size)}</span>
                      </p>
                      <span className="text-[11px] text-foreground/40 font-medium block">
                        {formatRelativeTime(record.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleDownload({
                        type: record.mediaType,
                        mimeType: 'application/octet-stream',
                        filename: record.filename,
                        size: record.size,
                        format: record.format,
                        downloadUrl: record.downloadUrl,
                        sourceUrl: record.sourceUrl
                      })}
                      className="p-2 text-foreground/60 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                      title="Re-download file"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => removeFromHistory(record.id)}
                      className="p-2 text-foreground/30 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      title="Remove from history"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
