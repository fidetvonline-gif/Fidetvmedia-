import React, { useState, useEffect } from 'react';
import { Download, Link as LinkIcon, Loader2, Video, FileAudio, AlertCircle, PlayCircle, ShieldCheck, Search, Film, Star, Clock, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Fidesave() {
  const [activeTab, setActiveTab] = useState<'download' | 'search' | 'engine'>('download');
  const [url, setUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/video-downloader', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch video details.');
      
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please make sure the URL is valid and public.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;

    setLoading(true);
    setError('');
    setSearchResults([]);

    try {
      const res = await fetch(`/api/video-search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setSearchResults(data);
    } catch (err: any) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadDirectly = (url: string, title: string) => {
    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
    const proxyUrl = `/api/video-download-proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    window.location.href = proxyUrl;
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-8 border border-primary/20 shadow-xl">
          <ShieldCheck size={48} />
        </div>
        <h2 className="text-4xl font-display font-black text-foreground mb-4">Secure Access Only</h2>
        <p className="text-foreground/60 max-w-md mb-8 px-6">
          <span className="font-bold text-primary">Fidesave</span> is a premium tool for registered FideTv users. Please sign in to download videos and search our library.
        </p>
        <button
          onClick={() => navigate('/auth')}
          className="px-10 py-5 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all"
        >
          Sign In to Access Fidesave
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center p-4">
      <div className="w-full max-w-4xl py-12">
        
        {/* Header section */}
        <div className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 text-primary mb-6 mx-auto border border-primary/20 shadow-inner"
          >
            <Download size={40} />
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-display font-black text-foreground mb-4 tracking-tighter">
            Fide<span className="text-primary">save</span>
          </h1>
          <p className="text-lg text-foreground/60 max-w-xl mx-auto font-medium">
            Discover and download high-quality media instantly. Safe, secure, and always free for our community.
          </p>
        </div>

        {/* Tabs Control */}
        <div className="flex bg-surface border border-border-custom p-1.5 rounded-2xl mb-12 max-w-sm mx-auto relative overflow-hidden shadow-sm">
          <button
            onClick={() => { setActiveTab('download'); setResult(null); setError(''); }}
            className={`flex-1 py-3 px-4 rounded-[0.9rem] flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all z-10 ${
              activeTab === 'download' ? 'bg-primary text-white shadow-lg' : 'text-foreground/50 hover:text-foreground'
            }`}
          >
            <LinkIcon size={16} />
            Link
          </button>
          <button
            onClick={() => { setActiveTab('search'); setSearchResults([]); setError(''); }}
            className={`flex-1 py-3 px-4 rounded-[0.9rem] flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all z-10 ${
              activeTab === 'search' ? 'bg-primary text-white shadow-lg' : 'text-foreground/50 hover:text-foreground'
            }`}
          >
            <Search size={16} />
            Search
          </button>
          <button
            onClick={() => { setActiveTab('engine'); setError(''); }}
            className={`flex-1 py-3 px-4 rounded-[0.9rem] flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all z-10 ${
              activeTab === 'engine' ? 'bg-primary text-white shadow-lg' : 'text-foreground/50 hover:text-foreground'
            }`}
          >
            <PlayCircle size={16} />
            Web Engine
          </button>
        </div>

        {/* Tab Content: Download */}
        <AnimatePresence mode="wait">
          {activeTab === 'download' ? (
            <motion.div 
              key="tab-download"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="bg-surface-bright border border-border-custom rounded-[2.5rem] p-2 shadow-xl overflow-hidden focus-within:border-primary/50 transition-colors">
                <form onSubmit={handleDownload} className="flex flex-col md:flex-row gap-2">
                  <div className="relative flex-1 flex items-center">
                    <LinkIcon className="absolute left-6 text-foreground/30" size={20} />
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="Paste TikTok, IG, or YouTube link here..."
                      className="w-full bg-transparent text-foreground placeholder-foreground/30 py-6 pl-14 pr-6 rounded-2xl outline-none transition-all font-mono text-sm md:text-base border-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !url}
                    className="bg-primary hover:opacity-90 text-white px-10 py-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    <span>Fetch Media</span>
                  </button>
                </form>
              </div>

              <div className="flex flex-wrap justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-foreground/40">
                <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-primary"/> TikTok</span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-primary"/> Instagram</span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-primary"/> Facebook</span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-primary"/> X (Twitter)</span>
              </div>

              {/* Results Area for Download */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mt-8 bg-surface border border-border-custom rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row gap-10 relative z-10">
                      <div className="w-full md:w-2/5 aspect-video md:aspect-[3/4] bg-background rounded-3xl overflow-hidden relative group border border-border-custom">
                        {result.thumbnail ? (
                          <img src={result.thumbnail} className="w-full h-full object-cover" alt="Video preview" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-foreground/20">
                            <PlayCircle size={64} className="mb-4 opacity-50" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Download size={64} className="text-white" />
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-center">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                            {result.platform || 'Online Media'}
                          </span>
                          <span className="text-foreground/40 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                             <Clock size={12} /> {result.duration || 'N/A'}
                          </span>
                        </div>
                        <h3 className="text-3xl sm:text-4xl font-display font-black text-foreground mb-4 line-clamp-3 leading-tight tracking-tight">
                          {result.title || 'Media Ready for Download'}
                        </h3>
                        
                        <div className="flex flex-col sm:flex-row gap-4 mt-6">
                          {result.videoUrl && (
                            <button 
                              onClick={() => downloadDirectly(result.videoUrl, result.title || 'Video')}
                              className="bg-primary hover:opacity-90 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                            >
                              <Video size={18} />
                              Download Video
                            </button>
                          )}
                          {result.audioUrl && (
                            <button 
                              onClick={() => downloadDirectly(result.audioUrl, (result.title || 'Audio') + '_audio')}
                              className="bg-surface-bright border border-border-custom hover:bg-surface text-foreground px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 hover:scale-105 active:scale-95"
                            >
                              <FileAudio size={18} />
                              Audio (MP3)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : activeTab === 'search' ? (
            <motion.div 
              key="tab-search"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <div className="bg-surface-bright border border-border-custom rounded-[2.5rem] p-2 shadow-xl focus-within:border-primary/50 transition-colors">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
                  <div className="relative flex-1 flex items-center">
                    <Search className="absolute left-6 text-foreground/30" size={20} />
                    <input
                      type="text"
                      required
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search for movies to download..."
                      className="w-full bg-transparent text-foreground placeholder-foreground/30 py-6 pl-14 pr-6 rounded-2xl outline-none transition-all font-sans font-medium text-sm md:text-base border-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !searchQuery}
                    className="bg-foreground text-background hover:opacity-90 px-10 py-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                    <span>Search Movies</span>
                  </button>
                </form>
              </div>

              {/* Movie Results Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((movie, idx) => (
                  <motion.div
                    key={movie.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-surface border border-border-custom rounded-[2.5rem] overflow-hidden group hover:border-primary/30 transition-all flex flex-col shadow-sm hover:shadow-xl"
                  >
                    <div className="relative aspect-[2/3] overflow-hidden">
                      <img src={movie.poster} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={movie.title} />
                      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-[10px] font-black text-primary flex items-center gap-1.5 border border-border-custom">
                        <Star size={12} className="fill-current" /> {movie.rating}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                        <div className="text-white text-[10px] font-bold uppercase tracking-widest bg-primary px-3 py-1.5 rounded-lg shadow-lg">
                          {movie.duration}
                        </div>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex-1 space-y-2 mb-6">
                        <div className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{movie.year}</div>
                        <h4 className="text-xl font-display font-black text-foreground leading-tight group-hover:text-primary transition-colors tracking-tight line-clamp-2">{movie.title}</h4>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => window.open(movie.downloadUrl, '_blank')}
                          className="w-full py-4 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          <Download size={14} /> Download Now
                        </button>
                        <button 
                          onClick={() => {
                            setActiveTab('engine');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="w-full py-4 bg-surface-bright hover:bg-foreground hover:text-background text-foreground text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-border-custom transition-all flex items-center justify-center gap-2"
                        >
                          <PlayCircle size={14} /> Full Info
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {searchQuery && !loading && searchResults.length === 0 && (
                <div className="text-center py-24 bg-surface-bright/30 border border-dashed border-border-custom rounded-[3rem]">
                  <Film className="w-16 h-16 text-foreground/10 mx-auto mb-6" />
                  <p className="text-foreground/40 font-bold uppercase tracking-widest text-xs italic">No movies found for "{searchQuery}"</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="tab-engine"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full"
            >
              <div className="bg-surface border border-border-custom rounded-[3rem] overflow-hidden shadow-2xl">
                <div className="bg-surface-bright p-6 border-b border-border-custom flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h3 className="font-display font-black text-foreground tracking-tight">Fide Web Engine</h3>
                      <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Powered by videodownloader.site</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => window.open('https://videodownloader.site/', '_blank')}
                      className="px-4 py-2 bg-foreground text-background rounded-lg text-[10px] font-bold uppercase tracking-widest hover:opacity-80"
                    >
                      Open Original
                    </button>
                  </div>
                </div>
                <div className="relative aspect-video md:h-[700px] bg-background">
                  <iframe 
                    src="https://videodownloader.site/" 
                    className="w-full h-full border-none"
                    title="External Downloader Engine"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  />
                  <div className="absolute bottom-6 right-6 bg-primary text-white p-4 rounded-2xl shadow-xl max-w-xs animate-bounce">
                    <p className="text-xs font-bold leading-snug">Use this web engine if our internal search fails to find your movie.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Requirements Section */}
        <div className="mt-24 bg-surface-bright/50 border border-border-custom rounded-[3rem] p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Info size={24} />
            </div>
            <h3 className="text-2xl font-display font-black text-foreground tracking-tight">Access Requirements</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-widest text-foreground">1. Active Account</h4>
              <p className="text-xs text-foreground/50 leading-relaxed font-medium">To protect our infrastructure, Fidesave is exclusively available to registered FideTv users. Ensure you are logged in to access the downloader.</p>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-widest text-foreground">2. Supported Formats</h4>
              <p className="text-xs text-foreground/50 leading-relaxed font-medium">We currently support direct downloads for MP4, MKV, and MP3 formats across all major social media platforms and our movie library.</p>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-widest text-foreground">3. Download Limits</h4>
              <p className="text-xs text-foreground/50 leading-relaxed font-medium">Standard users can download up to 10 videos per day. Premium subscribers enjoy unlimited high-speed downloads directly to their local storage.</p>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-widest text-foreground">4. Source Availability</h4>
              <p className="text-xs text-foreground/50 leading-relaxed font-medium">For movie searches, availability depends on current FideCloud indexing status. If a title is missing, it will usually be added within 24 hours.</p>
            </div>
          </div>
        </div>

        {/* Branding & Info Section */}
        <div className="mt-32 pt-16 border-t border-border-custom grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-primary">High Fidelity</h4>
            <div className="text-3xl font-display font-black text-foreground leading-tight tracking-tighter">Perfectly <span className="font-light italic text-foreground/60">Optimized.</span></div>
            <p className="text-sm text-foreground/50 leading-relaxed font-medium">We process every request through our FideCloud cluster to ensure you get the original high-resolution file without compression.</p>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-cyan-500">Global Reach</h4>
            <div className="text-3xl font-display font-black text-foreground leading-tight tracking-tighter">Universal <span className="font-light italic text-foreground/60">Library.</span></div>
            <p className="text-sm text-foreground/50 leading-relaxed font-medium">From Nollywood hits to Hollywood blockbusters, our smart indexing helps you find and save content from across the globe.</p>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-emerald-500">Security First</h4>
            <div className="text-3xl font-display font-black text-foreground leading-tight tracking-tighter">Private & <span className="font-light italic text-foreground/60">Protected.</span></div>
            <p className="text-sm text-foreground/50 leading-relaxed font-medium">Your search history and downloads are 100% private. We don't track your content; we just help you save what matters to you.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
