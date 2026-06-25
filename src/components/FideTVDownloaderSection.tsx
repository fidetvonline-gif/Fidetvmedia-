import React, { useState } from 'react';
import { Search, Download, Video, Loader2, Globe, Shield, Clock, AlertCircle, Youtube, Tv, Instagram, MessageCircle, FileText, Zap, LayoutGrid, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDownloaderSearch } from '@/hooks/useDownloaderSearch';
import { useDownloader } from '@/hooks/useDownloader';

// --- Types ---
interface QualityModalProps {
  videoId: string;
  onClose: () => void;
  onDownload: (videoId: string, quality: string) => void;
}

const QualityModal = ({ videoId, onClose, onDownload }: QualityModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-8 max-w-sm w-full">
      <h3 className="text-xl font-black mb-6">Select Quality</h3>
      <div className="space-y-3">
        {['360p', '720p', '1080p'].map(q => (
          <button key={q} onClick={() => onDownload(videoId, q)} className="w-full py-4 bg-slate-100 rounded-xl font-bold flex justify-between px-4 hover:bg-red-50 hover:text-red-600">
            {q} <Download size={18} />
          </button>
        ))}
      </div>
      <button onClick={onClose} className="mt-6 w-full py-3 text-sm font-bold text-slate-500">Cancel</button>
    </motion.div>
  </div>
);

export default function FideTVDownloaderSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [modalVideo, setModalVideo] = useState<string | null>(null);
  const { search, results, loading, error: searchError } = useDownloaderSearch();
  const { getDownloadLink, loading: downloadLoading, error: downloadError } = useDownloader();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) await search(searchQuery);
  };

  const handleDownload = async (videoId: string, quality: string = '720p') => {
    setModalVideo(null);
    setSelectedVideo(videoId);
    const result = await getDownloadLink(videoId, quality);
    if (result?.downloadUrl) window.open(result.downloadUrl, '_blank');
    setSelectedVideo(null);
  };

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="text-center mb-16">
        <h2 className="text-5xl font-black mb-6 tracking-tight">FideTV <span className="text-red-600">Downloader</span></h2>
        <p className="text-slate-600 max-w-xl mx-auto">High-speed, browser-based media downloads.</p>
        
        {/* Platforms Grid */}
        <div className="flex gap-4 justify-center mt-10 flex-wrap">
          {[
            { name: 'YouTube', icon: Youtube }, { name: 'TikTok', icon: MessageCircle }, 
            { name: 'Instagram', icon: Instagram }, { name: 'Twitch', icon: Tv }
          ].map(p => (
            <a key={p.name} href={`/${p.name.toLowerCase()}`} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full font-bold text-xs uppercase hover:bg-red-100 hover:text-red-600 transition">
              <p.icon size={16} /> {p.name}
            </a>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="max-w-3xl mx-auto mb-16">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Enter video link..." className="flex-1 p-4 rounded-xl border border-slate-200" />
          <button type="submit" disabled={loading} className="px-8 bg-red-600 text-white font-black uppercase rounded-xl flex items-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : <Search size={18} />} Search
          </button>
        </form>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {results.map((video) => (
          <div key={video.id} className="bg-white border p-4 rounded-2xl hover:border-red-600 transition">
            <img src={video.thumbnail} alt={video.title} className="rounded-xl mb-3 aspect-video object-cover" />
            <h4 className="font-bold mb-4 line-clamp-1">{video.title}</h4>
            <button onClick={() => setModalVideo(video.id)} className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold text-xs">Choose Quality</button>
          </div>
        ))}
      </div>
      
      {modalVideo && <QualityModal videoId={modalVideo} onClose={() => setModalVideo(null)} onDownload={handleDownload} />}

      {/* Enhanced Features - 6 total */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { icon: Zap, title: "No Installation Needed" },
           { icon: LayoutGrid, title: "Batch Support" },
           { icon: CheckCircle, title: "Playlist Support" },
           { icon: FileText, title: "Subtitle Extraction" },
           { icon: Shield, title: "Secure & Private" },
           { icon: Download, title: "HD & 4K Output" }
         ].map(f => (
           <div key={f.title} className="p-6 bg-slate-50 rounded-2xl flex items-center gap-4">
             <div className="p-3 bg-white rounded-xl text-red-600"><f.icon size={24} /></div>
             <p className="font-bold uppercase text-xs tracking-widest">{f.title}</p>
           </div>
         ))}
      </div>
    </section>
  );
}

