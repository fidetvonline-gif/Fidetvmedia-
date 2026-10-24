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
import { getHighQualityImage } from '@/lib/utils';
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
  const { news, isSyncing, refreshNews } = useNewsSync();
  const [filteredNews, setFilteredNews] = useState<NewsType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    // Filter logic whenever news or filters change
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12">
        <div className="space-y-4">
          <div className="inline-flex items-center space-x-2.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-black uppercase tracking-[0.25em] text-xs">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>FideTV Automated News & Blog Wire</span>
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-medium text-foreground tracking-tighter">
            FideTV <span className="text-primary">Blog Studio.</span>
          </h1>
          <p className="max-w-xl text-text-muted text-base sm:text-lg font-light leading-relaxed">
            Continuously updated editorial news on media production, broadcasting breakthroughs, creator tools, and real-time industry intelligence.
          </p>
        </div>
      </div>

      {/* Search & Category Filter Navigation */}
      <div className="mb-12 space-y-5">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search news, topics, tags..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl glass border border-border-custom bg-surface/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-text-muted/60"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-foreground px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 text-xs text-text-muted self-end md:self-center">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span>Showing {filteredNews.length} articles</span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'glass text-text-muted hover:text-foreground hover:bg-surface-bright border-border-custom'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inline Ads */}
      <div className="mb-14 space-y-8">
        <DisplayInlineAds />
        <AdBanner placement="News Page Top" />
      </div>

      {isSyncing ? (
        <div className="space-y-8">
          <div className="glass rounded-[2.5rem] h-96 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="glass rounded-[2.5rem] h-80 animate-pulse" />
            ))}
          </div>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="text-center py-28 glass rounded-[3rem] border border-dashed border-border-custom mt-8 p-8">
          <Newspaper className="w-16 h-16 text-text-muted mx-auto mb-5 opacity-60" />
          <h2 className="text-2xl font-display font-medium text-foreground">No articles found</h2>
          <p className="text-text-muted text-sm mt-2 max-w-md mx-auto">
            {searchQuery 
              ? `No stories matched "${searchQuery}". Try a different keyword or reset filters.`
              : 'Our automated news wire is refreshing.'}
          </p>
          <button
            onClick={() => refreshNews()}
            className="mt-6 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh News Now</span>
          </button>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Featured Breaking News Hero Card */}
          {featuredPost && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="group relative glass rounded-[2.5rem] overflow-hidden border border-border-custom hover:border-primary/40 transition-all duration-500 shadow-2xl"
            >
              <Link 
                to={`/news/${featuredPost.slug || featuredPost.id}`} 
                className="absolute inset-0 z-20" 
                aria-label={`Read ${featuredPost.title}`} 
              />
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
                <div className="lg:col-span-7 relative overflow-hidden bg-surface aspect-[16/10] lg:aspect-auto">
                  <img
                    src={getHighQualityImage(featuredPost.image_url)}
                    alt={featuredPost.title}
                    loading="eager"
                    fetchPriority="high"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent lg:hidden" />
                  <div className="absolute top-6 left-6 flex items-center space-x-2 z-10">
                    <span className="bg-primary text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-lg flex items-center space-x-1.5">
                      <Flame className="w-3 h-3 text-amber-300" />
                      <span>{featuredPost.category || 'Featured Story'}</span>
                    </span>
                    {(featuredPost as any).read_time && (
                      <span className="glass backdrop-blur-md text-foreground text-[10px] font-bold px-3 py-1.5 rounded-full border border-border-custom flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-text-muted" />
                        <span>{(featuredPost as any).read_time}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-[11px] uppercase font-bold tracking-wider text-text-muted">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>{format(new Date(featuredPost.created_at), 'MMMM dd, yyyy')}</span>
                      </div>
                      <span>•</span>
                      <span className="text-emerald-400">Breaking Wire</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-display text-foreground group-hover:text-primary transition-colors leading-tight">
                      {featuredPost.title}
                    </h2>

                    <p className="text-text-muted text-sm sm:text-base line-clamp-3 leading-relaxed">
                      {featuredPost.excerpt || featuredPost.description}
                    </p>

                    {featuredPost.tags && featuredPost.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {featuredPost.tags.slice(0, 4).map((tag, i) => (
                          <span key={i} className="text-[10px] font-medium px-2.5 py-1 rounded-md bg-surface-bright text-text-muted border border-border-custom/60 flex items-center space-x-1">
                            <Tag className="w-2.5 h-2.5 text-primary" />
                            <span>#{tag}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-border-custom flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={featuredPost.profiles?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=FideTV_NewsDesk'}
                        alt={featuredPost.profiles?.username || 'Author'}
                        className="w-9 h-9 rounded-full bg-surface border border-border-custom"
                      />
                      <div>
                        <div className="text-xs font-bold text-foreground">
                          {featuredPost.profiles?.username || 'FideTV News Desk'}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {(featuredPost as any).source_name || 'Automated Editorial Wire'}
                        </div>
                      </div>
                    </div>

                    <div className="inline-flex items-center space-x-2 text-primary font-bold text-xs group-hover:translate-x-1 transition-transform">
                      <span>Read Story</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Standard Blog Article Grid */}
          {standardPosts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {standardPosts.map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: (idx % 6) * 0.08 }}
                  viewport={{ once: true }}
                  className="group glass rounded-[2.5rem] overflow-hidden border border-border-custom hover:border-primary/40 hover:bg-surface-bright transition-all duration-500 relative flex flex-col shadow-lg"
                >
                  <Link 
                    to={`/news/${item.slug || item.id}`} 
                    className="absolute inset-0 z-20" 
                    aria-label={`Read ${item.title}`} 
                  />
                  <div className="flex flex-col h-full relative z-10 pointer-events-none">
                    <div className="relative aspect-[16/10] overflow-hidden bg-surface">
                      {(item.image_url || (item as any).cover_image) ? (
                        <img 
                          src={getHighQualityImage(item.image_url || (item as any).cover_image)} 
                          alt={item.title} 
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-surface">
                          <Newspaper className="w-12 h-12 text-text-muted" />
                        </div>
                      )}
                      <div className="absolute top-5 left-5 right-5 flex items-center justify-between z-30 pointer-events-auto">
                        <span className="bg-primary/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-border-custom shadow-lg">
                          {item.category || 'Editorial'}
                        </span>
                        {(item as any).read_time && (
                          <span className="glass backdrop-blur-md text-foreground text-[10px] font-bold px-2.5 py-1 rounded-full border border-border-custom">
                            {(item as any).read_time}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-7 space-y-4 flex flex-col flex-grow">
                      <div className="flex items-center space-x-3 text-[10px] uppercase font-bold tracking-wider text-text-muted">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-primary" />
                          <span>{format(new Date(item.created_at), 'EEEE, MMMM dd, yyyy')}</span>
                        </div>
                        {(item as any).source_name && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px]">{(item as any).source_name}</span>
                          </>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-text-muted text-xs sm:text-sm line-clamp-3 leading-relaxed flex-grow">
                        {item.excerpt || item.description}
                      </p>

                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.tags.slice(0, 3).map((tag, ti) => (
                            <span key={ti} className="text-[9px] font-medium px-2 py-0.5 rounded bg-surface text-text-muted border border-border-custom/50">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="pt-5 flex items-center justify-between border-t border-border-custom">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                            {item.profiles?.username?.[0] || 'F'}
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted truncate max-w-[110px]">
                            {item.profiles?.username || 'News Desk'}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
