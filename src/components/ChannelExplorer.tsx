import React, { useState, useEffect, useMemo } from 'react';
import { Search, Play, Filter, Globe, Tv, AlertTriangle, Monitor, X, ChevronRight, LayoutGrid, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import HlsPlayer from './streaming/HlsPlayer';
import { cn } from '@/lib/utils';

interface Channel {
  id: string;
  name: string;
  url: string;
  category: string;
  logo: string;
  country: string;
}

export const ChannelExplorer: React.FC = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/channels');
        if (!response.ok) throw new Error('Failed to load channel feed');
        const data = await response.json();
        setChannels(data.channels || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(channels.map(c => c.category));
    return ['All', ...Array.from(cats)].filter(c => c && c !== 'Undefined');
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(channel => {
      const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || channel.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [channels, searchTerm, selectedCategory]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest animate-pulse">Initializing Signal Stream...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-red-500/5 border border-red-500/20 rounded-3xl">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2 uppercase italic">Stream Disruption</h3>
        <p className="text-zinc-400 max-w-md mx-auto mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-red-500 text-white rounded-full font-bold hover:scale-105 transition-transform"
        >
          Attempt Re-Sync
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 p-4">
      {/* Active Player Deck */}
      <AnimatePresence mode="wait">
        {activeChannel && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative group"
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-[2.5rem] bg-black border border-zinc-800 shadow-2xl">
              <HlsPlayer 
                src={activeChannel.url} 
                autoPlay={true}
                onError={(e) => console.error('Playback failed', e)}
              />
              
              {/* Overlay Metadata */}
              <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">{activeChannel.name}</h2>
                    <div className="flex items-center gap-2">
                       <span className="px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded text-[10px] font-bold uppercase tracking-wider">Live Broadcast</span>
                       <span className="text-zinc-400 text-xs font-medium">{activeChannel.category}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveChannel(null)}
                    className="p-3 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 rounded-full text-white transition-all hover:rotate-90"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Technical Rail below player */}
            <div className="mt-4 flex items-center justify-between px-6 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
               <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-400">Signal: Optimal</span>
                  </div>
                  <div className="flex items-center gap-2 border-l border-zinc-800 pl-6">
                    <Monitor className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-400">Mode: 4K Ingest</span>
                  </div>
               </div>
               <div className="text-[10px] font-mono text-zinc-600 truncate max-w-[300px]">
                  SOURCE: {activeChannel.url}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Surface */}
      <div className="sticky top-4 z-30 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
            <input 
              type="text"
              placeholder="QUICK SEARCH CHANNELS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm font-bold tracking-tight shadow-2xl"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {categories.slice(0, 8).map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-6 py-5 rounded-2xl whitespace-nowrap text-xs font-black uppercase tracking-widest border transition-all shadow-xl",
                  selectedCategory === category 
                    ? "bg-primary border-primary text-white scale-95 shadow-primary/20"
                    : "bg-zinc-950/80 backdrop-blur-xl border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-white"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Output Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <AnimatePresence>
          {filteredChannels.length > 0 ? (
            filteredChannels.map((channel, idx) => (
              <motion.div
                key={channel.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => setActiveChannel(channel)}
                className={cn(
                  "group relative cursor-pointer rounded-2xl overflow-hidden bg-zinc-900/30 border border-zinc-800 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/10",
                  activeChannel?.id === channel.id && "ring-2 ring-primary border-transparent"
                )}
              >
                <div className="aspect-[4/5] relative">
                  {channel.logo ? (
                    <img 
                      src={channel.logo} 
                      alt={channel.name}
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-105 group-hover:scale-100"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center p-6 text-center">
                       <Tv className="w-8 h-8 text-zinc-700 group-hover:text-primary transition-colors" />
                    </div>
                  )}
                  
                  {/* Subtle Badge */}
                  <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[8px] font-black uppercase tracking-widest text-zinc-300">
                    {channel.country || 'GLOBAL'}
                  </div>

                  {/* Play Hover Overlay */}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-300">
                      <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-zinc-800/50 bg-zinc-950/50 backdrop-blur-sm">
                  <h3 className="text-[11px] font-black text-white uppercase tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
                    {channel.name}
                  </h3>
                  <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-1">
                    {channel.category}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
               <Info className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
               <p className="text-zinc-600 font-black uppercase tracking-widest">No Signal Found Matching Criteria</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          height: 0px;
          width: 0px;
        }
        .custom-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
};
