import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactPlayer from 'react-player';

const Player = ReactPlayer as any;

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  type: 'image' | 'video';
  title?: string;
}

export default function MediaLightbox({ isOpen, onClose, mediaUrl, type, title }: MediaLightboxProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = title || `fidetv-media-${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(mediaUrl, '_blank');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-12"
          onClick={onClose}
        >
          {/* Controls Header */}
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center pointer-events-none z-[1001]">
            <div className="flex flex-col pointer-events-auto">
              <span className="text-[10px] font-black uppercase text-primary tracking-[0.3em]">Media Viewer</span>
              <h2 className="text-white font-display font-medium text-sm truncate max-w-[200px] sm:max-w-md">
                {title || 'Viewing Content'}
              </h2>
            </div>
            
            <div className="flex items-center space-x-3 pointer-events-auto">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload();
                }}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white transition-all active:scale-90"
                title="Download Media"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white transition-all active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Main Media Area */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {type === 'image' ? (
              <img
                src={mediaUrl}
                alt={title || 'Full Screen Media'}
                className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              />
            ) : (
              <div className="w-full max-w-6xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/5">
                <Player
                  url={mediaUrl}
                  width="100%"
                  height="100%"
                  playing
                  controls
                  config={{
                    youtube: {
                      playerVars: { showinfo: 0, modestbranding: 1, rel: 0 }
                    }
                  }}
                />
              </div>
            )}
          </motion.div>

          {/* Footer Info */}
          <div className="absolute bottom-10 text-center text-white/30 text-[10px] uppercase tracking-[0.5em] font-black pointer-events-none">
            FideTV Media Hub • High Quality Stream
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
