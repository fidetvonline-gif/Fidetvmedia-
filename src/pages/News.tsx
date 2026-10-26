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
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import AdBanner from '@/components/AdBanner';
import DisplayInlineAds from '@/components/DisplayInlineAds';
import { parseResponseJson } from '@/lib/api';
import AUTO_BLOGS from '@/data/auto_blogs.json';
import { safeLocalStorage } from '@/lib/storage';
import { cn, getHighQualityImage } from '@/lib/utils';
import { getClientContentImage } from '@/lib/imageValidator';
import { useNewsSync } from '@/hooks/useNewsSync';

const STATIC_RELEASE_POST: NewsType = {
  id: 'fidetv-release-v2',
  slug: 'major-release-v2',
  title: 'FideTV Major Release: 25 Active Live Channels, Dynamic Audio Spaces & Mobile Optimization!',
  excerpt: 'We are thrilled to unveil a massive update to FideTV, boasting 25 active 24/7 live-streaming channels, brand-new real-time Audio Spaces, immersive mobile optimization, and seamless community interactions!',
  description: 'We are thrilled to unveil a massive update to FideTV, boasting 25 active 24/7 live-streaming channels, brand-new real-time Audio Spaces, immersive mobile optimization, and seamless community interactions!',
  content: `We are incredibly proud to announce the next major milestone for **FideTV Media Hub**! Our team has been working around the clock to bring you a fully synchronized, ultra-high performance media platform that is perfectly customized for both creators and visitors.

Here are the exciting new features and capabilities live on FideTV right now:

### 📺 25 Active 24/7 Live Broadcast Channels
FideTV now hosts **25 fully active, 24/7 high-definition broadcast channels** running continuously! Dive into a rich, curated array of live sports, interactive educational masterclasses, community discussion forums, creative documentaries, and direct cultural showcases. No matter your interests, there is a specialized active stream waiting for you on the **Live tab** right now!

### 🎙️ Interactive Live Audio Spaces
Introducing **FideTV Spaces**! Inspired by modern audio-conversational lobbies, you can now enter dedicated, browser-native live voice chat rooms directly on FideTV. Connect your microphone to host roundtable discussions, join community technical huddles, or participate in live broadcasting reviews alongside seasoned media pioneers.

### 📱 Full Mobile Experience Redesign
We have fully rebuilt our navigation structures to suit all mobile viewport sizes perfectly:
* **Always-Accessible Mobile Drawer**: Redesigned the slide-out navigation menu overlay with deep stacking clearance, protecting it from being covered by video players.
* **Direct Mobile Actions**: Repositioned the community join buttons to sit cleanly in mobile headers so you can easily engage with sub-communities on the fly.
* **Solid Background Clearance**: Handled ambient color alphas so the drawer menu remains crisp and highly legible regardless of content scrolling underneath it.

### 💬 Notice Wall & Collective Engagement
Collaborative teams can now write social shouts, post links, receive likes, and share milestones with fellow creatives directly inside localized sub-communities. It is the perfect bulletin board for managing community media assets, drone raw templates, or organizing schedules.

---

We are dedicated to building a supportive, highly specialized network for global Sub-Saharan and international digital broadcasting creators. We cannot wait to see you explore and participate in our newly polished services!

*Connect your profile, join a Creative Hub, or hop into a Live Space today to get started!*`,
  category: 'Platform Updates',
  author_id: 'admin',
  is_published: true,
  image_url: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=800&auto=format&fit=crop',
  created_at: '2026-05-23T12:00:00Z',
  profiles: {
    username: 'fidetv_admin',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=fidetv_admin'
  } as any
};

const CATEGORIES = [
  'All',
  'Broadcasting & Streaming',
  'Technology & AI',
  'Media & Entertainment',
  'Global News & Culture',
  'Creator Economy & Production',
  'Sports & Live Events',
  'Platform Updates'
];

export default function News() {
  const { news, isSyncing, refreshNews, lastSyncTime } = useNewsSync();
  const [filteredNews, setFilteredNews] = useState<NewsType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let filtered = [...news];
    if (selectedCategory !== 'All') {
      const catLower = selectedCategory.toLowerCase();
      filtered = filtered.filter(n => n.category?.toLowerCase() === catLower);
    }
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(n => n.title.toLowerCase().includes(q) || n.excerpt?.toLowerCase().includes(q));
    }
    setFilteredNews(filtered);
  }, [news, selectedCategory, searchQuery]);

  const featuredPost = filteredNews.length > 0 ? filteredNews[0] : null;
  const standardPosts = filteredNews.length > 1 ? filteredNews.slice(1) : [];

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Cinematic Editorial Header */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden border-b border-border-custom">
         <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background z-10" />
            <motion.div 
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.15 }}
              transition={{ duration: 2 }}
              className="w-full h-full bg-[url('https://images.unsplash.com/photo-1504711432869-53c267e15303?q=80&w=1200')] bg-cover bg-center grayscale filter blur-sm"
            />
         </div>

         <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center space-x-3 px-5 py-2 rounded-full glass border border-primary/20 text-primary font-black uppercase tracking-[0.3em] text-[10px]"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Premium Editorial Wire</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl sm:text-7xl md:text-9xl font-display font-black text-foreground tracking-tighter leading-tight"
            >
              FideTV <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-400 to-primary-hover animate-pulse">Journal.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="max-w-2xl mx-auto text-text-muted text-lg sm:text-xl font-light leading-relaxed italic"
            >
              "The definitive record of Sub-Saharan digital media evolution, broadcasting breakthroughs, and industrial creative intelligence."
            </motion.p>
         </div>

         {/* Floating Category Nav */}
         <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 w-full max-w-4xl px-4">
            <div className="glass p-2 rounded-[2rem] border border-border-custom shadow-2xl flex items-center gap-2 overflow-x-auto scrollbar-none no-scrollbar">
               {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-6 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all duration-300",
                    selectedCategory === cat
                      ? "bg-primary text-white shadow-xl shadow-primary/30 scale-105"
                      : "text-text-muted hover:text-foreground hover:bg-surface-bright"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
         </div>
      </section>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 -mt-8 relative z-40">
        {/* Status Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-16 px-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search the archive..."
                className="pl-12 pr-6 py-4 rounded-2xl glass border border-border-custom w-full md:w-80 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium"
              />
            </div>
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-bright/50 border border-border-custom text-[10px] font-black uppercase tracking-widest text-text-muted">
               <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
               <span>{filteredNews.length} Reports Found</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl glass border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Sync Active
             </div>
             <button
              onClick={() => refreshNews(true)}
              disabled={isSyncing}
              className="p-3 rounded-2xl glass border border-border-custom text-primary hover:bg-primary hover:text-white transition-all active:scale-90"
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
             <p className="text-text-muted mt-4 max-w-md mx-auto">Try adjusting your filters or checking back in a few minutes.</p>
             <button onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }} className="mt-10 px-8 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs">Reset Filters</button>
          </div>
        ) : (
          <div className="space-y-20">
            {/* The Dynamic Magazine Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
               {/* Featured Hero (Lg) */}
               {featuredPost && (
                 <motion.div 
                   layoutId={featuredPost.id}
                   initial={{ opacity: 0, y: 30 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   className="md:col-span-12 lg:col-span-8 group"
                 >
                   <Link to={`/news/${featuredPost.slug || featuredPost.id}`} className="block relative aspect-[16/9] lg:aspect-[21/9] rounded-[3rem] overflow-hidden border border-border-custom shadow-2xl bg-surface">
                      <img 
                        src={getHighQualityImage(featuredPost.image_url, featuredPost.category, featuredPost.title)} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s] ease-out"
                        alt={featuredPost.title}
                        onError={(e) => { e.currentTarget.src = getClientContentImage(featuredPost.title, featuredPost.category); }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-8 sm:p-16 space-y-6">
                         <div className="flex flex-wrap items-center gap-4">
                            <span className="px-4 py-1.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">
                               {featuredPost.category}
                            </span>
                            {new Date().getTime() - new Date(featuredPost.created_at).getTime() < 3600000 && (
                              <span className="px-4 py-1.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg animate-pulse">
                                JUST IN
                              </span>
                            )}
                            <span className="flex items-center gap-2 text-white/60 text-[10px] font-black uppercase tracking-widest">
                               <Clock className="w-3.5 h-3.5" /> {(featuredPost as any).read_time || '5 MIN READ'}
                            </span>
                         </div>
                         <h2 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black text-white leading-tight tracking-tighter group-hover:text-primary transition-colors duration-500">
                            {featuredPost.title}
                         </h2>
                         <p className="max-w-3xl text-white/70 text-base sm:text-xl line-clamp-2 font-light">
                            {featuredPost.excerpt}
                         </p>
                         <div className="pt-4 flex items-center justify-between border-t border-white/10">
                            <div className="flex items-center gap-3">
                               <img src={featuredPost.profiles?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=FideTV'} className="w-10 h-10 rounded-full border border-white/20" />
                               <div>
                                  <p className="text-white text-xs font-black uppercase tracking-widest">{featuredPost.profiles?.username || 'News Desk'}</p>
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

               {/* Side Compacts (Md) */}
               <div className="md:col-span-12 lg:col-span-4 flex flex-col gap-10">
                  {standardPosts.slice(0, 2).map((item, i) => (
                    <motion.div 
                      key={`${item.id}-${i}`}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      viewport={{ once: true }}
                      className="group flex-grow"
                    >
                      <Link to={`/news/${item.slug || item.id}`} className="block h-full relative rounded-[2.5rem] overflow-hidden border border-border-custom bg-surface p-6 space-y-6 hover:border-primary/40 transition-all duration-500 hover:shadow-2xl">
                         <div className="aspect-[16/9] rounded-[2rem] overflow-hidden">
                            <img 
                              src={getHighQualityImage(item.image_url, item.category, item.title)} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                              alt={item.title}
                              onError={(e) => { e.currentTarget.src = getClientContentImage(item.title, item.category); }}
                            />
                         </div>
                         <div className="space-y-4">
                            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-primary">{item.category}</span>
                            <h3 className="text-2xl font-display font-bold text-foreground leading-tight line-clamp-3 group-hover:text-primary transition-colors">
                               {item.title}
                            </h3>
                            <div className="flex items-center justify-between pt-4 border-t border-border-custom">
                               <span className="text-[10px] font-bold text-text-muted uppercase">{(item as any).source_name || 'FideTV Wire'}</span>
                               <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                            </div>
                         </div>
                      </Link>
                    </motion.div>
                  ))}
               </div>
            </div>

            {/* Premium Mid-Page Ad Break */}
            <div className="py-10">
               <AdBanner placement="Blog Grid Mid" />
            </div>

            {/* Standard Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
               {standardPosts.slice(2).map((item, idx) => (
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
                      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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
                         {new Date().getTime() - new Date(item.created_at).getTime() < 3600000 && (
                           <>
                             <span className="text-emerald-400 animate-pulse">JUST IN</span>
                             <span>•</span>
                           </>
                         )}
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
                      <div className="pt-4 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-black text-primary uppercase">
                               {item.profiles?.username?.[0] || 'F'}
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">{item.profiles?.username || 'Wire Desk'}</span>
                         </div>
                         <Link to={`/news/${item.slug || item.id}`} className="text-[10px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 group/btn">
                            Read Story <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                         </Link>
                      </div>
                   </div>
                 </motion.div>
               ))}
            </div>
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
