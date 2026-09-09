import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Loader2, 
  Video, 
  AlertCircle, 
  PlayCircle, 
  Search, 
  Film, 
  Star, 
  Info, 
  ExternalLink, 
  X, 
  DownloadCloud, 
  Play, 
  Sparkles,
  RefreshCw,
  Tv
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { parseResponseJson } from '@/lib/api';

import { YouTubeVideoPlayer } from '@/components/YouTubeVideoPlayer';
import UniversalPlayer from '@/components/streaming/UniversalPlayer';
import SaveMediaSection from '@/components/media/SaveMediaSection';

export default function Fidesave() {
  const [activeTab, setActiveTab] = useState<'save-media' | 'search'>('save-media');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [catalogType, setCatalogType] = useState<'trending' | 'search'>('trending');
  const [error, setError] = useState('');
  const [prefilledUrlForSave, setPrefilledUrlForSave] = useState('');
  
  // Link fetching & playing states
  const [fetchingLinksFor, setFetchingLinksFor] = useState<string | null>(null);
  const [movieLinks, setMovieLinks] = useState<Record<string, any>>({});
  const [activeMediaStream, setActiveMediaStream] = useState<{ url: string; title: string; type: string; quality?: string } | null>(null);

  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const initialUrl = searchParams.get('url');

  // Handle URL param if passed
  useEffect(() => {
    if (initialUrl) {
      setPrefilledUrlForSave(decodeURIComponent(initialUrl));
      setActiveTab('save-media');
    }
  }, [initialUrl]);

  // Load trending movies when entering Movie Search if list is empty
  const fetchTrendingCatalog = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = session?.access_token ? {
        'Authorization': `Bearer ${session.access_token}`
      } : {};

      const res = await fetch('/api/video-search', { headers });
      const data = await parseResponseJson(res);
      if (!res.ok) throw new Error(data.error || 'Failed to fetch catalog');

      if (Array.isArray(data)) {
        setSearchResults(data);
      } else if (data.results) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
      setCatalogType('trending');
    } catch (err: any) {
      console.warn("Failed to load trending movies:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger catalog fetch when switching to search tab
  useEffect(() => {
    if (activeTab === 'search' && searchResults.length === 0 && !searchQuery) {
      fetchTrendingCatalog();
    }
  }, [activeTab]);

  const handleSearch = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const q = (customQuery !== undefined ? customQuery : searchQuery).trim();
    
    // If empty query, load trending
    if (!q) {
      fetchTrendingCatalog();
      return;
    }

    // If query looks like a media URL, switch to Save Media
    if (q.startsWith('http://') || q.startsWith('https://')) {
      setPrefilledUrlForSave(q);
      setActiveTab('save-media');
      return;
    }

    setLoading(true);
    setError('');
    setSearchResults([]);
    setMovieLinks({}); // Reset previous links

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = session?.access_token ? {
        'Authorization': `Bearer ${session.access_token}`
      } : {};

      const res = await fetch(`/api/video-search?q=${encodeURIComponent(q)}`, {
        headers
      });
      const data = await parseResponseJson(res);
      if (!res.ok) throw new Error(data.error || data.details || 'Search failed');
      
      if (Array.isArray(data)) {
        setSearchResults(data);
      } else if (data.results) {
        setSearchResults(data.results);
      } else {
        setSearchResults([]);
      }
      setCatalogType('search');
    } catch (err: any) {
      setError(err.message || 'Search failed. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchLinks = async (movie: any) => {
    setFetchingLinksFor(movie.id);
    setError('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = session?.access_token ? {
        'Authorization': `Bearer ${session.access_token}`
      } : {};

      const res = await fetch(`/api/movie-download-options?title=${encodeURIComponent(movie.title)}&id=${movie.id}`, {
        headers
      });
      const data = await parseResponseJson(res);
      if (res.ok) {
        setMovieLinks(prev => ({ ...prev, [movie.id]: data.links || [] }));
      } else {
        throw new Error(data.error || 'Availability check failed');
      }
    } catch (err: any) {
      console.error("Failed to fetch links", err);
      setError(`Notice: ${err.message || 'Limited availability for this title.'}`);
    } finally {
      setFetchingLinksFor(null);
    }
  };

  const sendToSaveMedia = (mediaUrl: string) => {
    setPrefilledUrlForSave(mediaUrl);
    setActiveTab('save-media');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const popularSuggestions = ['Avatar', 'Spider-Man', 'Oppenheimer', 'Dune', 'Batman', 'Interstellar'];

  return (
    <div className="min-h-[80vh] flex flex-col items-center p-4">
      <div className="w-full max-w-5xl py-12">
        
        {/* Header section */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 text-primary mb-6 mx-auto border border-primary/20 shadow-inner"
          >
            <DownloadCloud size={40} />
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-display font-black text-foreground mb-4 tracking-tighter">
            Fide<span className="text-primary">Save</span> Media
          </h1>
          <p className="text-lg text-foreground/60 max-w-xl mx-auto font-medium">
            Analyze, preview, and download publicly accessible videos, audios, images, and movie catalogs with secure high-speed streaming.
          </p>
        </div>

        {/* Streamlined Tabs Control: Only Save Media & Movie Search */}
        <div className="flex bg-surface border border-border-custom p-1.5 rounded-2xl mb-12 max-w-md mx-auto relative overflow-hidden shadow-sm">
          <button
            id="tab-save-media-btn"
            onClick={() => { setActiveTab('save-media'); setError(''); }}
            className={`flex-1 py-3.5 px-6 rounded-xl flex items-center justify-center gap-2.5 font-bold text-xs uppercase tracking-widest transition-all z-10 ${
              activeTab === 'save-media' ? 'bg-primary text-white shadow-lg' : 'text-foreground/50 hover:text-foreground'
            }`}
          >
            <DownloadCloud size={17} />
            Save Media
          </button>
          <button
            id="tab-movie-search-btn"
            onClick={() => { setActiveTab('search'); setError(''); }}
            className={`flex-1 py-3.5 px-6 rounded-xl flex items-center justify-center gap-2.5 font-bold text-xs uppercase tracking-widest transition-all z-10 ${
              activeTab === 'search' ? 'bg-primary text-white shadow-lg' : 'text-foreground/50 hover:text-foreground'
            }`}
          >
            <Film size={17} />
            Movie Search
          </button>
        </div>

        {/* Global Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-8 flex items-center gap-3 text-red-500"
            >
              <AlertCircle size={20} className="shrink-0" />
              <p className="text-xs font-bold uppercase tracking-wide">{error}</p>
              <button 
                onClick={() => setError('')}
                className="ml-auto hover:bg-red-500/10 p-1 rounded-lg transition-colors"
                type="button"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Tab Views */}
        <AnimatePresence mode="wait">
          {activeTab === 'save-media' ? (
            <motion.div
              key="tab-save-media"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-10"
            >
              <SaveMediaSection 
                initialUrl={prefilledUrlForSave} 
                onSwitchToMovieSearch={(query) => {
                  setActiveTab('search');
                  setSearchQuery(query);
                  handleSearch(undefined, query);
                }}
              />
            </motion.div>
          ) : (
            <motion.div 
              key="tab-search"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Search Bar Container */}
              <div className="bg-surface-bright border border-border-custom rounded-[2.5rem] p-3 shadow-xl focus-within:border-primary/50 transition-colors">
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2">
                  <div className="relative flex-1 flex items-center">
                    <Search className="absolute left-6 text-foreground/30" size={20} />
                    <input
                      id="movie-search-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search movies, titles, or global catalog..."
                      className="w-full bg-transparent text-foreground placeholder-foreground/30 py-5 pl-14 pr-10 rounded-2xl outline-none transition-all font-sans font-medium text-sm md:text-base border-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); fetchTrendingCatalog(); }}
                        className="absolute right-4 text-foreground/40 hover:text-foreground p-1"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      id="movie-search-submit"
                      type="submit"
                      disabled={loading}
                      className="bg-primary hover:opacity-90 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-primary/20 flex-1 md:flex-initial"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                      <span>Search Movies</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Quick Suggestions & Mode Indicator */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mr-1 flex items-center gap-1">
                    <Sparkles size={12} className="text-primary" /> Popular:
                  </span>
                  {popularSuggestions.map((term) => (
                    <button
                      key={term}
                      onClick={() => {
                        setSearchQuery(term);
                        handleSearch(undefined, term);
                      }}
                      className="px-3 py-1 rounded-xl bg-surface border border-border-custom hover:border-primary/40 text-[10px] font-bold text-foreground/70 hover:text-primary transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setSearchQuery(''); fetchTrendingCatalog(); }}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-foreground/50 hover:text-primary transition-colors"
                  >
                    <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                    {catalogType === 'trending' ? 'Trending Catalog' : 'Reset to Trending'}
                  </button>
                </div>
              </div>

              {/* Status or Title Header */}
              <div className="flex items-center justify-between border-b border-border-custom pb-3 pt-2 px-1">
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground/70 flex items-center gap-2">
                  <Film size={16} className="text-primary" />
                  {catalogType === 'trending' ? 'Trending Movies Today' : `Search Results for "${searchQuery}"`}
                </h3>
                <span className="text-xs font-bold text-foreground/40">
                  {searchResults.length} {searchResults.length === 1 ? 'title' : 'titles'} found
                </span>
              </div>

              {/* Movie Results Grid */}
              {loading && searchResults.length === 0 ? (
                <div className="py-24 text-center">
                  <Loader2 className="animate-spin w-10 h-10 text-primary mx-auto mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest text-foreground/50">Searching Global Catalog...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.map((movie, idx) => (
                    <motion.div
                      key={movie.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.04, 0.4) }}
                      className={`bg-surface border border-border-custom rounded-[2rem] overflow-hidden group hover:border-primary/40 transition-all flex flex-col shadow-sm hover:shadow-xl ${fetchingLinksFor === movie.id ? 'ring-2 ring-primary/40' : ''}`}
                    >
                      {/* Poster image container */}
                      <div className="relative aspect-[2/3] overflow-hidden bg-background">
                        <img 
                          src={movie.poster} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                          alt={movie.title}
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLElement).setAttribute('src', 'https://images.unsplash.com/photo-1485099667858-394460167664?w=800');
                          }}
                        />
                        <div className="absolute top-4 left-4 bg-background/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-[10px] font-black text-amber-500 flex items-center gap-1.5 border border-border-custom shadow-md">
                          <Star size={12} className="fill-current" /> {movie.rating || 'N/A'}
                        </div>
                        <div className="absolute top-4 right-4 bg-background/85 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-[10px] font-black text-primary border border-border-custom shadow-md uppercase tracking-wider">
                          {movie.year || 'TBA'}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                          <div className="text-white text-[10px] font-bold uppercase tracking-widest bg-primary px-3 py-1.5 rounded-lg shadow-lg">
                            {movie.duration || 'Movie'}
                          </div>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex-1 space-y-1.5 mb-5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] font-black text-foreground/50 bg-foreground/5 px-2 py-0.5 rounded-md uppercase tracking-wider border border-border-custom">
                              TMDb Verified
                            </span>
                            {movie.internal_available && (
                              <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider border border-emerald-500/20">
                                In Library
                              </span>
                            )}
                          </div>
                          <h4 className="text-lg font-display font-black text-foreground leading-snug group-hover:text-primary transition-colors tracking-tight line-clamp-2">
                            {movie.title}
                          </h4>
                          <div className="text-[9px] font-mono text-foreground/40 uppercase tracking-wider">
                            ID: {movie.id.replace('tmdb_', '')}
                          </div>
                        </div>
                        
                        {/* Download & Watch Options Area */}
                        <div className="flex flex-col gap-2 min-h-[50px] justify-end">
                          <AnimatePresence mode="wait">
                            {movieLinks[movie.id] ? (
                              <motion.div 
                                key="links"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-2 pb-1"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-black text-foreground/50 uppercase tracking-widest">
                                    Available Streams ({movieLinks[movie.id].length})
                                  </span>
                                  <button 
                                    onClick={() => {
                                      setMovieLinks(prev => {
                                        const next = {...prev};
                                        delete next[movie.id];
                                        return next;
                                      });
                                    }} 
                                    className="text-foreground/40 hover:text-primary p-0.5"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                                
                                {movieLinks[movie.id].length > 0 ? (
                                  <div className="grid grid-cols-1 gap-2">
                                    {movieLinks[movie.id].map((link: any, lIdx: number) => (
                                      <div
                                        key={lIdx}
                                        className="py-2.5 px-3.5 bg-surface-bright border border-border-custom hover:border-primary/50 rounded-xl flex items-center justify-between transition-all group/link"
                                      >
                                        <div className="flex flex-col items-start pr-2 overflow-hidden">
                                          <span className="uppercase text-[8px] font-semibold text-foreground/40 tracking-wider truncate max-w-[140px]">
                                            {link.source}
                                          </span>
                                          <span className="uppercase text-[10px] font-black text-primary">
                                            {link.quality}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {/* Watch / Stream Button */}
                                          <button
                                            onClick={() => {
                                              if (link.type === 'youtube') {
                                                setActiveMediaStream({
                                                  url: link.url,
                                                  title: `${movie.title} - ${link.quality}`,
                                                  type: 'youtube',
                                                  quality: link.quality
                                                });
                                              } else if (link.type === 'stream') {
                                                setActiveMediaStream({
                                                  url: link.url,
                                                  title: `${movie.title} - Stream`,
                                                  type: 'stream',
                                                  quality: link.quality
                                                });
                                              } else {
                                                window.open(link.url, '_blank');
                                              }
                                            }}
                                            title="Watch Stream / Cinema Player"
                                            className="px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white text-[10px] font-bold uppercase transition-all flex items-center gap-1"
                                          >
                                            <Play size={12} className="fill-current" />
                                            <span>Play</span>
                                          </button>

                                          {/* Save in FideSave Button */}
                                          <button
                                            onClick={() => sendToSaveMedia(link.url)}
                                            title="Download Movie Media (MP4)"
                                            className="px-2.5 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 text-[10px] font-bold uppercase transition-all flex items-center gap-1 shadow-sm shadow-primary/20"
                                          >
                                            <DownloadCloud size={12} />
                                            <span>Save</span>
                                          </button>

                                          {/* External Link */}
                                          <button
                                            onClick={() => window.open(link.url, '_blank')}
                                            title="Open in New Tab"
                                            className="p-1.5 rounded-lg bg-surface hover:bg-surface-bright border border-border-custom text-foreground/40 hover:text-foreground transition-all"
                                          >
                                            <ExternalLink size={13} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="py-4 text-center bg-surface-bright/50 rounded-xl border border-dashed border-border-custom">
                                    <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-1">Source Pending</p>
                                    <p className="text-[9px] text-foreground/40">Link currently indexing in FideCloud.</p>
                                  </div>
                                )}
                              </motion.div>
                            ) : (
                              <div className="flex gap-2 w-full">
                                <button
                                  type="button"
                                  onClick={() => sendToSaveMedia(movie.id ? `https://themoviedb.org/movie/${movie.id.replace('tmdb_', '')}` : movie.title)}
                                  title="Analyze and Save Movie Media (MP4 / HD)"
                                  className="flex-1 py-3 px-3 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-1.5"
                                >
                                  <DownloadCloud size={14} />
                                  <span>Save Movie</span>
                                </button>
                                <button 
                                  type="button"
                                  disabled={fetchingLinksFor === movie.id}
                                  onClick={() => handleFetchLinks(movie)}
                                  title="View Available Streams & Previews"
                                  className="py-3 px-3.5 bg-surface hover:bg-surface-bright border border-border-custom hover:border-primary/50 text-foreground text-[10px] font-black uppercase tracking-wider rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-1.5"
                                >
                                  {fetchingLinksFor === movie.id ? (
                                    <Loader2 className="animate-spin" size={14} />
                                  ) : (
                                    <Play size={14} className="text-primary" />
                                  )}
                                  <span>Streams</span>
                                </button>
                              </div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Empty state when query produces 0 results */}
              {!loading && searchResults.length === 0 && searchQuery && (
                <div className="text-center py-20 px-6 bg-surface-bright/30 border border-dashed border-border-custom rounded-[3rem]">
                  <Film className="w-16 h-16 text-foreground/10 mx-auto mb-6" />
                  <h3 className="text-xl font-display font-black text-foreground mb-2">No Movies Found</h3>
                  <p className="text-foreground/50 max-w-sm mx-auto font-medium text-xs uppercase tracking-widest mb-6">
                    We couldn't find matches for "{searchQuery}" in the global database.
                  </p>
                  <button
                    onClick={() => { setSearchQuery(''); fetchTrendingCatalog(); }}
                    className="px-6 py-3 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                  >
                    View Trending Movies
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Built-in Media Stream Player Modal */}
        <AnimatePresence>
          {activeMediaStream && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[5000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
              onClick={() => setActiveMediaStream(null)}
            >
              <div 
                className="w-full max-w-5xl bg-surface border border-border-custom rounded-3xl overflow-hidden shadow-2xl relative flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="p-4 border-b border-border-custom flex items-center justify-between bg-surface-bright">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Tv size={16} />
                    </div>
                    <div>
                      <h4 className="font-display font-black text-sm text-foreground truncate max-w-md">
                        {activeMediaStream.title}
                      </h4>
                      {activeMediaStream.quality && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">
                          {activeMediaStream.quality}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        sendToSaveMedia(activeMediaStream.url);
                        setActiveMediaStream(null);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
                    >
                      <DownloadCloud size={14} />
                      <span>Save in FideSave</span>
                    </button>
                    <button
                      onClick={() => window.open(activeMediaStream.url, '_blank')}
                      className="p-2 text-foreground/40 hover:text-foreground rounded-lg transition-colors"
                      title="Open in new window"
                    >
                      <ExternalLink size={16} />
                    </button>
                    <button 
                      onClick={() => setActiveMediaStream(null)}
                      className="w-8 h-8 bg-surface hover:bg-white/10 text-foreground/60 hover:text-foreground rounded-lg flex items-center justify-center transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Player Frame */}
                <div className="w-full aspect-video bg-black relative flex items-center justify-center">
                  {activeMediaStream.type === 'youtube' ? (
                    <YouTubeVideoPlayer
                      videoId={activeMediaStream.url}
                      autoPlay={true}
                      className="w-full h-full"
                    />
                  ) : activeMediaStream.url.includes('.m3u8') || activeMediaStream.url.includes('.mp4') ? (
                    <UniversalPlayer
                      channel={{ url: activeMediaStream.url, name: activeMediaStream.title }}
                      autoPlay={true}
                      className="w-full h-full"
                    />
                  ) : (
                    <iframe
                      src={activeMediaStream.url}
                      className="w-full h-full border-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Requirements & Info Section */}
        <div className="mt-24 bg-surface-bright/50 border border-border-custom rounded-[3rem] p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Info size={24} />
            </div>
            <h3 className="text-2xl font-display font-black text-foreground tracking-tight">Access & Features</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-widest text-foreground">1. Universal Save Media</h4>
              <p className="text-xs text-foreground/50 leading-relaxed font-medium">
                Save any public media link across YouTube, TikTok, Instagram, Facebook, X, Reddit, Vimeo, and direct media files directly to your device or cloud.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-widest text-foreground">2. Global Movie Catalog</h4>
              <p className="text-xs text-foreground/50 leading-relaxed font-medium">
                Explore official trailers, teasers, licensed stream providers, and multi-source playback mirrors with verified high-definition resolutions.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-widest text-foreground">3. High Fidelity Processing</h4>
              <p className="text-xs text-foreground/50 leading-relaxed font-medium">
                Every request runs through our high-speed extraction engine to ensure you get original audio/video bitrates without compression.
              </p>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-black uppercase tracking-widest text-foreground">4. Instant 1-Click Hand-off</h4>
              <p className="text-xs text-foreground/50 leading-relaxed font-medium">
                Found a trailer or stream in Movie Search? Click "Save in FideSave" to automatically send it to the downloader and save it to your local storage.
              </p>
            </div>
          </div>
        </div>

        {/* Branding & Info Section */}
        <div className="mt-24 pt-16 border-t border-border-custom grid grid-cols-1 md:grid-cols-3 gap-12">
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
