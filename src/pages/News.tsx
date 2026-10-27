import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { News as NewsType } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  ArrowRight, 
  Newspaper, 
  RefreshCw, 
  Search, 
  Sparkles, 
  Clock, 
  Radio, 
  Tag, 
  Flame,
  CheckCircle2,
  TrendingUp,
  LayoutGrid,
  List as ListIcon,
  Columns
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import AdBanner from '@/components/AdBanner';
import DisplayInlineAds from '@/components/DisplayInlineAds';
import { cn, getHighQualityImage } from '@/lib/utils';
import { getClientContentImage } from '@/lib/imageValidator';
import { useNewsSync } from '@/hooks/useNewsSync';

const CORE_CATEGORIES = [
  'All',
  'Breaking & Global',
  'Broadcasting & Media',
  'Technology & AI',
  'Entertainment & Culture',
  'Creator Economy',
  'Sports & Live Events',
  'Platform Updates'
];

const matchesCategory = (category: string | undefined, selected: string) => {
  if (selected === 'All') return true;
  if (!category) return false;
  const c = category.toLowerCase().trim();
  const s = selected.toLowerCase().trim();
  if (c === s) return true;
  if (s.includes(c) || c.includes(s)) return true;
  if (s.includes('breaking') || s.includes('global')) {
    if (c.includes('global') || c.includes('world') || c.includes('news') || c.includes('nigeria') || c.includes('politics') || c.includes('africa')) return true;
  }
  if (s.includes('broadcasting') || s.includes('media')) {
    if (c.includes('broadcast') || c.includes('stream') || c.includes('tv') || c.includes('media') || c.includes('journal')) return true;
  }
  if (s.includes('tech') || s.includes('ai')) {
    if (c.includes('tech') || c.includes('ai') || c.includes('digital') || c.includes('software')) return true;
  }
  if (s.includes('entertainment') || s.includes('culture')) {
    if (c.includes('entertainment') || c.includes('music') || c.includes('movie') || c.includes('culture') || c.includes('lifestyle')) return true;
  }
  if (s.includes('sports')) {
    if (c.includes('sport') || c.includes('football') || c.includes('fifa') || c.includes('match')) return true;
  }
  if (s.includes('creator')) {
    if (c.includes('creator') || c.includes('production') || c.includes('video') || c.includes('studio')) return true;
  }
  if (s.includes('platform')) {
    if (c.includes('platform') || c.includes('update') || c.includes('release')) return true;
  }
  return false;
};

export default function News() {
  const { news, isSyncing, refreshNews, lastSyncTime } = useNewsSync();
  const [filteredNews, setFilteredNews] = useState<NewsType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState<'magazine' | 'grid' | 'list'>('magazine');

  const dynamicCategories = React.useMemo(() => {
    const set = new Set<string>(CORE_CATEGORIES);
    for (const item of news) {
      if (item.category && item.category.trim() && !set.has(item.category)) {
        if (item.category.length < 24) set.add(item.category);
      }
    }
    return Array.from(set);
  }, [news]);

  useEffect(() => {
    let filtered = [...news];
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(n => matchesCategory(n.category, selectedCategory));
    }
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(n => n.title.toLowerCase().includes(q) || n.excerpt?.toLowerCase().includes(q));
    }
    setFilteredNews(filtered);
  }, [news, selectedCategory, searchQuery]);

  const featuredPost = filteredNews.length > 0 ? filteredNews[0] : null;
  const standardPosts = filteredNews.length > 1 ? filteredNews.slice(1) : [];
  const breakingNews = news.slice(0, 5);

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Breaking News Ribbon Ticker */}
      {breakingNews.length > 0 && (
        <div className="bg-surface border-b border-border-custom py-2.5 px-4 overflow-hidden relative z-50">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest shrink-0">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              Breaking Wire
            </div>
            <div className="overflow-hidden whitespace-nowrap relative w-full flex items-center">
              <div className="inline-flex gap-8 animate-marquee text-xs font-bold text-foreground">
                {breakingNews.map((item, idx) => (
                  <Link key={idx} to={`/news/${item.slug || item.id}`} className="hover:text-primary transition-colors flex items-center gap-2">
                    <span className="text-primary">•</span> {item.title}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cinematic Editorial Header */}
      <section className="relative py-12 sm:py-20 flex flex-col items-center justify-center border-b border-border-custom bg-background">
         <div className="absolute inset-0 z-0 opacity-15">
            <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1504711432869-53c267e15303?q=80&w=1200')] bg-cover bg-center grayscale filter blur-sm" />
         </div>

         <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4 mb-10">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl sm:text-6xl md:text-7xl font-display font-black text-foreground tracking-tighter leading-tight"
            >
              FideTV <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-primary-hover animate-pulse">Global Wire.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="max-w-xl mx-auto text-text-muted text-xs sm:text-sm font-light leading-relaxed italic"
            >
              "Real-time news syndication, broadcasting updates, and critical multimedia reports."
            </motion.p>
         </div>

         {/* Category Nav */}
         <div className="relative z-30 w-full max-w-5xl px-4">
            <div className="glass p-2 rounded-2xl border border-border-custom shadow-xl flex items-center justify-start md:justify-center gap-2 overflow-x-auto scrollbar-none no-scrollbar">
               {dynamicCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200",
                    selectedCategory === cat
                      ? "bg-primary text-white shadow-lg shadow-primary/25 scale-102"
                      : "text-text-muted hover:text-foreground hover:bg-surface-bright"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
         </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 mt-12 relative z-40">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-16 px-4">
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="relative flex-grow md:flex-grow-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search headlines & stories..."
                className="pl-12 pr-6 py-4 rounded-2xl glass border border-border-custom w-full md:w-80 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
              />
            </div>
            
            {/* Layout Mode Switcher */}
            <div className="flex items-center gap-1 glass p-1.5 rounded-2xl border border-border-custom">
               <button
                 onClick={() => setLayoutMode('magazine')}
                 className={cn("p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2", layoutMode === 'magazine' ? "bg-primary text-white shadow-lg" : "text-text-muted hover:text-foreground")}
                 title="Magazine Layout"
               >
                 <Columns className="w-4 h-4" />
                 <span className="hidden sm:inline">Magazine</span>
               </button>
               <button
                 onClick={() => setLayoutMode('grid')}
                 className={cn("p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2", layoutMode === 'grid' ? "bg-primary text-white shadow-lg" : "text-text-muted hover:text-foreground")}
                 title="Grid Layout"
               >
                 <LayoutGrid className="w-4 h-4" />
                 <span className="hidden sm:inline">Grid</span>
               </button>
               <button
                 onClick={() => setLayoutMode('list')}
                 className={cn("p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2", layoutMode === 'list' ? "bg-primary text-white shadow-lg" : "text-text-muted hover:text-foreground")}
                 title="List Layout"
               >
                 <ListIcon className="w-4 h-4" />
                 <span className="hidden sm:inline">List</span>
               </button>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
             <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl glass border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {filteredNews.length} Stories Live
             </div>
             <button
              onClick={() => refreshNews(true)}
              disabled={isSyncing}
              className="p-3 rounded-2xl glass border border-border-custom text-primary hover:bg-primary hover:text-white transition-all active:scale-90"
              title="Refresh News Feed"
            >
              <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
            </button>
          </div>
        </div>

        {isSyncing && filteredNews.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="aspect-[4/5] rounded-[3rem] glass animate-pulse" />
            ))}
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="text-center py-40 glass rounded-[4rem] border border-dashed border-border-custom">
             <Newspaper className="w-20 h-20 text-text-muted mx-auto mb-8 opacity-20" />
             <h2 className="text-3xl font-display font-black text-foreground">No matches in our wire.</h2>
             <p className="text-text-muted mt-4 max-w-md mx-auto">Try adjusting your filters or search keywords.</p>
             <button onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }} className="mt-10 px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs">Reset Filters</button>
          </div>
        ) : (
          <div className="space-y-20">
            {/* MAGAZINE LAYOUT MODE */}
            {layoutMode === 'magazine' && (
              <div className="space-y-16">
                {/* Top Featured Hero */}
                {featuredPost && (
                  <motion.div 
                    layoutId={featuredPost.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="group"
                  >
                    <Link to={`/news/${featuredPost.slug || featuredPost.id}`} className="block relative aspect-[16/9] lg:aspect-[21/9] rounded-[3.5rem] overflow-hidden border border-border-custom shadow-2xl bg-surface">
                       <img 
                         src={getHighQualityImage(featuredPost.image_url, featuredPost.category, featuredPost.title)} 
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s] ease-out"
                         alt={featuredPost.title}
                         onError={(e) => { e.currentTarget.src = getClientContentImage(featuredPost.title, featuredPost.category); }}
                       />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent flex flex-col justify-end p-8 sm:p-16 space-y-6">
                          <div className="flex flex-wrap items-center gap-4">
                             <span className="px-4 py-1.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                                {featuredPost.category}
                             </span>
                             {new Date().getTime() - new Date(featuredPost.created_at).getTime() < 3600000 && (
                               <span className="px-4 py-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg animate-pulse">
                                 BREAKING REPORT
                               </span>
                             )}
                             <span className="flex items-center gap-2 text-white/60 text-[10px] font-black uppercase tracking-widest">
                                <Clock className="w-3.5 h-3.5" /> {(featuredPost as any).read_time || '5 MIN READ'}
                             </span>
                          </div>
                          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black text-white leading-tight tracking-tighter group-hover:text-primary transition-colors duration-500">
                             {featuredPost.title}
                          </h2>
                          <p className="max-w-3xl text-white/75 text-base sm:text-xl line-clamp-2 font-light">
                             {featuredPost.excerpt}
                          </p>
                          <div className="pt-4 flex items-center justify-between border-t border-white/10">
                             <div className="flex items-center gap-3">
                                <img src={featuredPost.profiles?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=FideTV'} className="w-10 h-10 rounded-full border border-white/20" />
                                <div>
                                   <p className="text-white text-xs font-black uppercase tracking-widest">{featuredPost.profiles?.username || 'FideTV News Desk'}</p>
                                   <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{format(new Date(featuredPost.created_at), 'MMMM dd, yyyy')}</p>
                                </div>
                             </div>
                             <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white group-hover:bg-primary group-hover:border-primary transition-all duration-500">
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                             </div>
                          </div>
                       </div>
                    </Link>
                  </motion.div>
                )}

                {/* Sub-Magazine Grid (3 columns of impactful stories) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   {standardPosts.slice(0, 3).map((item, i) => (
                     <motion.div 
                       key={`${item.id}-${i}`}
                       initial={{ opacity: 0, y: 20 }}
                       whileInView={{ opacity: 1, y: 0 }}
                       transition={{ delay: i * 0.1 }}
                       viewport={{ once: true }}
                       className="group flex flex-col h-full"
                     >
                       <Link to={`/news/${item.slug || item.id}`} className="flex flex-col h-full rounded-[2.5rem] overflow-hidden border border-border-custom bg-surface p-6 space-y-6 hover:border-primary/40 transition-all duration-500 hover:shadow-2xl">
                          <div className="aspect-[16/10] rounded-[2rem] overflow-hidden">
                             <img 
                               src={getHighQualityImage(item.image_url, item.category, item.title)} 
                               className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                               alt={item.title}
                               onError={(e) => { e.currentTarget.src = getClientContentImage(item.title, item.category); }}
                             />
                          </div>
                          <div className="space-y-4 flex-grow flex flex-col justify-between">
                             <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                   <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary">{item.category}</span>
                                   <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                                      <Clock className="w-3 h-3 text-primary" /> {format(new Date(item.created_at), 'MMM dd')}
                                   </span>
                                </div>
                                <h3 className="text-xl font-display font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                   {item.title}
                                </h3>
                                <p className="text-text-muted text-xs line-clamp-2 font-light">
                                   {item.excerpt}
                                </p>
                             </div>
                             <div className="flex items-center justify-between pt-4 border-t border-border-custom">
                                <span className="text-[10px] font-bold text-text-muted uppercase">{(item as any).source_name || 'FideTV Wire'}</span>
                                <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                             </div>
                          </div>
                       </Link>
                     </motion.div>
                   ))}
                </div>

                {/* Ad Break */}
                <div className="py-6">
                   <AdBanner placement="Magazine Mid Banner" />
                </div>

                {/* Remaining Feed in Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                   {standardPosts.slice(3).map((item, idx) => (
                     <motion.div
                       key={`${item.id}-${idx}`}
                       initial={{ opacity: 0, y: 20 }}
                       whileInView={{ opacity: 1, y: 0 }}
                       transition={{ delay: (idx % 3) * 0.1 }}
                       viewport={{ once: true }}
                       className="group flex flex-col space-y-6"
                     >
                       <Link to={`/news/${item.slug || item.id}`} className="block relative aspect-[4/3] rounded-[2.5rem] overflow-hidden border border-border-custom bg-surface shadow-lg group-hover:shadow-2xl transition-all duration-700">
                          <img 
                            src={getHighQualityImage(item.image_url, item.category, item.title)} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                            alt={item.title}
                            onError={(e) => { e.currentTarget.src = getClientContentImage(item.title, item.category); }}
                          />
                          <div className="absolute top-4 left-4">
                             <div className="glass px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-foreground border border-white/10 shadow-xl">
                                {item.category}
                             </div>
                          </div>
                       </Link>
                       <div className="px-2 space-y-3">
                          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-text-muted/60">
                             <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(item.created_at), 'MMM dd, yyyy')}</span>
                             <span>•</span>
                             <span>{(item as any).read_time || '4 MIN READ'}</span>
                          </div>
                          <Link to={`/news/${item.slug || item.id}`}>
                            <h3 className="text-xl font-display font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                               {item.title}
                            </h3>
                          </Link>
                          <p className="text-text-muted text-xs line-clamp-2 leading-relaxed font-light">
                             {item.excerpt || item.description}
                          </p>
                       </div>
                     </motion.div>
                   ))}
                </div>
              </div>
            )}

            {/* GRID LAYOUT MODE */}
            {layoutMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                 {filteredNews.map((item, idx) => (
                   <motion.div
                     key={`${item.id}-${idx}`}
                     initial={{ opacity: 0, y: 20 }}
                     whileInView={{ opacity: 1, y: 0 }}
                     transition={{ delay: (idx % 3) * 0.1 }}
                     viewport={{ once: true }}
                     className="group flex flex-col space-y-6"
                   >
                     <Link to={`/news/${item.slug || item.id}`} className="block relative aspect-square rounded-[3rem] overflow-hidden border border-border-custom bg-surface shadow-lg group-hover:shadow-2xl transition-all duration-700">
                        <img 
                          src={getHighQualityImage(item.image_url, item.category, item.title)} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                          alt={item.title}
                          onError={(e) => { e.currentTarget.src = getClientContentImage(item.title, item.category); }}
                        />
                        <div className="absolute top-6 left-6">
                           <div className="glass px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-foreground border border-white/10 shadow-xl">
                              {item.category}
                           </div>
                        </div>
                     </Link>
                     <div className="px-2 space-y-4">
                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-text-muted/60">
                           <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {format(new Date(item.created_at), 'MMM dd, yyyy')}</span>
                           <span>•</span>
                           <span>{(item as any).read_time || '4 MIN READ'}</span>
                        </div>
                        <Link to={`/news/${item.slug || item.id}`}>
                          <h3 className="text-2xl font-display font-bold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
                             {item.title}
                          </h3>
                        </Link>
                        <p className="text-text-muted text-sm line-clamp-3 leading-relaxed font-light">
                           {item.excerpt || item.description}
                        </p>
                     </div>
                   </motion.div>
                 ))}
              </div>
            )}

            {/* LIST LAYOUT MODE */}
            {layoutMode === 'list' && (
              <div className="max-w-4xl mx-auto space-y-6">
                 {filteredNews.map((item, idx) => (
                   <motion.div
                     key={`${item.id}-${idx}`}
                     initial={{ opacity: 0, x: -20 }}
                     whileInView={{ opacity: 1, x: 0 }}
                     transition={{ delay: idx * 0.05 }}
                     viewport={{ once: true }}
                   >
                     <Link to={`/news/${item.slug || item.id}`} className="group flex flex-col sm:flex-row gap-6 p-6 rounded-[2.5rem] glass border border-border-custom hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-2xl">
                        <div className="w-full sm:w-64 aspect-[16/10] rounded-[2rem] overflow-hidden shrink-0">
                           <img 
                             src={getHighQualityImage(item.image_url, item.category, item.title)} 
                             className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                             alt={item.title}
                             onError={(e) => { e.currentTarget.src = getClientContentImage(item.title, item.category); }}
                           />
                        </div>
                        <div className="flex flex-col justify-between space-y-3 flex-grow">
                           <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                 <span className="text-[9px] font-black uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10">{item.category}</span>
                                 <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{format(new Date(item.created_at), 'MMM dd, yyyy')}</span>
                              </div>
                              <h3 className="text-xl sm:text-2xl font-display font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                                 {item.title}
                              </h3>
                              <p className="text-text-muted text-xs sm:text-sm line-clamp-2 font-light">
                                 {item.excerpt}
                              </p>
                           </div>
                           <div className="flex items-center justify-between pt-2 border-t border-border-custom">
                              <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{(item as any).source_name || 'FideTV Wire Desk'}</span>
                              <span className="text-xs font-bold text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                 Read Story <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                           </div>
                        </div>
                     </Link>
                   </motion.div>
                 ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Refresh Indicator */}
      <AnimatePresence>
         {isSyncing && (
           <motion.div 
             initial={{ y: 100, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             exit={{ y: 100, opacity: 0 }}
             className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] glass px-6 py-3 rounded-full border border-primary/30 flex items-center gap-3 shadow-2xl"
           >
              <RefreshCw className="w-4 h-4 text-primary animate-spin" />
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Synchronizing live editorial feeds...</span>
           </motion.div>
         )}
      </AnimatePresence>
    </div>
  );
}
