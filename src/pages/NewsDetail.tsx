import { SEO } from '@/components/SEO';
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { News, Comment } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, User, ArrowLeft, Share2, Bookmark, Heart, MessageCircle, Send, Award, Clock, Newspaper } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import ReactPlayer from 'react-player';
import { cn, getHighQualityImage } from '@/lib/utils';
import { getClientContentImage } from '@/lib/imageValidator';
import AUTO_BLOGS from '@/data/auto_blogs.json';
import { safeLocalStorage } from '@/lib/storage';
import { newsSyncService } from '@/services/newsSyncService';

const Player = ReactPlayer as any;

const STATIC_RELEASE_POST: News = {
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

export default function NewsDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [relatedNews, setRelatedNews] = useState<News[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: item?.title,
        url: url
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  useEffect(() => {
    if (slug) {
      fetchNewsDetail();
    }
  }, [slug]);

  const normalizeSlug = (s: string) => {
    return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  };

  const fetchNewsDetail = async () => {
    setLoading(true);
    setNotFound(false);
    
    if (slug === 'major-release-v2' || slug === 'fidetv-release-v2') {
      setItem(STATIC_RELEASE_POST);
      setLikesCount(142);
      setLoading(false);
      fetchRelatedNews('fidetv-release-v2');
      return;
    }

    try {
      const targetSlug = slug || '';
      const normalizedTarget = normalizeSlug(targetSlug);

      // 1. Instant in-memory check from NewsSyncService (already in memory on client)
      const liveArticles = newsSyncService.getNews();
      let match = liveArticles.find(p => 
        p.slug === targetSlug || 
        p.id === targetSlug || 
        (p.slug && normalizeSlug(p.slug) === normalizedTarget) ||
        (p.title && normalizeSlug(p.title) === normalizedTarget)
      );

      // 2. Check AUTO_BLOGS seed/bundled data
      if (!match && Array.isArray(AUTO_BLOGS)) {
        match = (AUTO_BLOGS as any[]).find(p => 
          p.slug === targetSlug || 
          p.id === targetSlug || 
          (p.slug && normalizeSlug(p.slug) === normalizedTarget) ||
          (p.title && normalizeSlug(p.title) === normalizedTarget)
        );
      }

      // 3. Check client localStorage cache
      if (!match) {
        try {
          const local = safeLocalStorage.getItem('fidetv_live_blogs_v3');
          if (local) {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed)) {
              match = parsed.find((p: any) => 
                p.slug === targetSlug || 
                p.id === targetSlug || 
                (p.slug && normalizeSlug(p.slug) === normalizedTarget) ||
                (p.title && normalizeSlug(p.title) === normalizedTarget)
              );
            }
          }
        } catch {}
      }

      if (match) {
        setItem(match);
        const related = (liveArticles.length > 0 ? liveArticles : (AUTO_BLOGS as any[]))
          .filter(p => p.id !== match.id)
          .slice(0, 3);
        setRelatedNews(related);
        setLoading(false);
        fetchComments(match.id);
        fetchLikes(match.id);
        return;
      }

      // 4. Query backend unified API (/api/news/posts/:slug or /api/blog/posts/:slug)
      try {
        const endpoints = [
          `/api/news/posts/${encodeURIComponent(targetSlug)}`,
          `/api/news/${encodeURIComponent(targetSlug)}`,
          `/api/blog/posts/${encodeURIComponent(targetSlug)}`
        ];
        for (const ep of endpoints) {
          const apiRes = await fetch(ep);
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            if (apiData && apiData.post) {
              setItem(apiData.post);
              setRelatedNews(apiData.relatedPosts || []);
              fetchComments(apiData.post.id);
              fetchLikes(apiData.post.id);
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('[NewsDetail] API fetch warning:', err);
      }

      // 5. Query Supabase database directly
      try {
        const { data: dbData, error: dbError } = await supabase
          .from('news')
          .select('*')
          .or(`slug.eq.${targetSlug},id.eq.${targetSlug}`)
          .maybeSingle();

        if (dbData && !dbError) {
          const formatted: News = {
            id: dbData.id,
            slug: dbData.slug || dbData.id,
            title: dbData.title,
            excerpt: dbData.excerpt || dbData.description || '',
            description: dbData.description || dbData.excerpt || '',
            content: dbData.content || dbData.description || dbData.excerpt || '',
            category: dbData.category || 'News',
            tags: dbData.tags || ['Broadcasting', 'News'],
            image_url: dbData.image_url || getHighQualityImage(undefined, dbData.category, dbData.title),
            image_urls: dbData.image_urls || (dbData.image_url ? [dbData.image_url] : []),
            author_id: dbData.author_id || 'fidetv_admin',
            is_published: true,
            created_at: dbData.created_at || new Date().toISOString(),
            profiles: {
              id: dbData.author_id || 'fidetv_admin',
              username: 'FideTV News Desk',
              avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=FideTV_NewsDesk',
              created_at: dbData.created_at || new Date().toISOString()
            }
          };
          setItem(formatted);
          fetchComments(dbData.id);
          fetchLikes(dbData.id);
          fetchRelatedNews(dbData.id);
          setLoading(false);
          return;
        }
      } catch (dbErr) {
        console.warn('[NewsDetail] Supabase direct query warning:', dbErr);
      }

      // If not found across all tiers, show friendly not-found state instead of jarring redirect
      setNotFound(true);
    } catch (err) {
      console.error('[NewsDetail] Unexpected error in fetchNewsDetail:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedNews = async (currentId: string) => {
    try {
      const { data } = await supabase
        .from('news')
        .select('*')
        .eq('is_published', true)
        .neq('id', currentId)
        .limit(3);
      if (data) setRelatedNews(data);
    } catch {}
  };

  const fetchComments = async (newsId: string) => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url, is_verified)')
      .eq('post_id', `news_${newsId}`)
      .order('created_at', { ascending: true });
    if (data) setComments(data as any);
  };

  const fetchLikes = async (newsId: string) => {
    try {
      const { count } = await supabase
        .from('news_likes')
        .select('*', { count: 'exact', head: true })
        .eq('news_id', newsId);
      if (count !== null) setLikesCount(count);
    } catch {}
  };

  const handleLike = async () => {
    if (!user || !item) return;
    try {
       const { error } = await supabase.from('news_likes').insert({ news_id: item.id, user_id: user.id });
       if (!error) {
         setIsLiked(true);
         setLikesCount(prev => prev + 1);
       }
    } catch {}
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !item || !newComment.trim()) return;
    setSubmittingComment(true);
    const { error } = await supabase.from('comments').insert({
      post_id: `news_${item.id}`,
      author_id: user.id,
      content: newComment
    });
    if (!error) {
      setNewComment('');
      fetchComments(item.id);
    }
    setSubmittingComment(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 space-y-6">
       <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" />
       <p className="text-foreground/70 font-bold uppercase tracking-[0.25em] text-[11px]">Loading Article Details...</p>
    </div>
  );

  if (notFound || !item) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl glass border border-border-custom flex items-center justify-center text-primary shadow-xl">
          <Newspaper className="w-10 h-10 opacity-70" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-2xl sm:text-3xl font-display font-black text-foreground">Article Not Found</h2>
          <p className="text-text-muted text-sm leading-relaxed">
            This story might have been updated or moved. Browse through our real-time news archive to read the latest updates.
          </p>
        </div>
        <Link
          to="/news"
          className="px-6 py-3.5 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-2xl hover:bg-emerald-500 shadow-xl shadow-primary/20 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All News</span>
        </Link>
      </div>
    );
  }

  const articleContent = (item.content && item.content.trim().length > 40)
    ? item.content
    : `${item.excerpt || item.description}\n\n---\n\n### 📰 Story Overview & Background\n\n${item.description || item.excerpt || 'Official reporting from the FideTV News Desk.'}\n\n---\n\n### 📡 Editorial Dispatch & Broadcast Notes\n\n* **Category**: ${item.category || 'News'}\n* **Source**: FideTV News Desk Network\n* **Broadcast Availability**: Continuous stream coverage and live viewer commentary available in the FideTV Live section.`;

  return (
    <div className="min-h-screen bg-background">
      <SEO title={item.title} description={item.excerpt || item.description} />
      
      {/* Immersive Cinematic Header */}
      <header className="relative h-[85vh] w-full overflow-hidden border-b border-border-custom">
         <motion.div 
           initial={{ scale: 1.1 }}
           animate={{ scale: 1 }}
           transition={{ duration: 1.5, ease: "easeOut" }}
           className="absolute inset-0 z-0"
         >
            <img 
              src={getHighQualityImage(item.image_url || (item as any).cover_image, item.category, item.title)} 
              className="w-full h-full object-cover"
              alt={item.title}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/20" />
         </motion.div>

         <div className="absolute inset-0 z-10 flex flex-col justify-end">
            <div className="max-w-6xl mx-auto px-6 pb-20 w-full space-y-8">
               <motion.div 
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 className="flex flex-wrap items-center gap-4"
               >
                  <Link to="/news" className="glass p-3 rounded-2xl text-white hover:bg-primary transition-all shadow-2xl" aria-label="Back to news">
                     <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <span className="bg-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl">
                     {item.category}
                  </span>
                  <div className="glass px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] text-white/80 border border-white/10 flex items-center gap-2">
                     <Clock className="w-3.5 h-3.5" /> {(item as any).read_time || '5 MIN READ'}
                  </div>
               </motion.div>

               <motion.h1 
                 initial={{ opacity: 0, y: 30 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2 }}
                 className="text-4xl md:text-7xl lg:text-8xl font-display font-black text-white leading-[1.05] tracking-tighter"
               >
                  {item.title}
               </motion.h1>

               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 0.4 }}
                 className="flex items-center justify-between pt-12 border-t border-white/10"
               >
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-2xl border border-white/20 overflow-hidden shadow-2xl">
                        <img src={item.profiles?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=FideTV'} className="w-full h-full object-cover" alt="Author" />
                     </div>
                     <div>
                        <p className="text-white font-black uppercase tracking-widest text-sm">{item.profiles?.username || 'News Desk'}</p>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">{format(new Date(item.created_at), 'MMMM dd, yyyy')}</p>
                     </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-4">
                     <button onClick={handleLike} className={cn("glass p-4 rounded-2xl transition-all active:scale-90", isLiked ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-white/60 hover:text-white border-white/10")}>
                        <Heart className={cn("w-6 h-6", isLiked && "fill-current")} />
                     </button>
                     <button onClick={handleShare} className="glass p-4 rounded-2xl text-white/60 hover:text-white border-white/10 transition-all active:scale-90">
                        <Share2 className="w-6 h-6" />
                     </button>
                  </div>
               </motion.div>
            </div>
         </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-6 py-20 space-y-16">
         {/* Lead Paragraph */}
         <section className="relative">
            <div className="p-8 sm:p-10 rounded-3xl bg-surface border border-border-custom shadow-sm space-y-3">
               <p className="text-xl sm:text-2xl font-light text-foreground leading-relaxed italic">
                  "{item.excerpt || item.description}"
               </p>
            </div>
         </section>

         {/* Article Body */}
         <article className="news-content prose prose-invert prose-lg max-w-none">
            <ReactMarkdown
              components={{
                h2: ({ node, ...props }) => <h2 className="text-2xl md:text-4xl font-display font-black text-foreground mt-16 mb-8 tracking-tight" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-xl md:text-2xl font-display font-bold text-primary mt-10 mb-4" {...props} />,
                p: ({ node, ...props }) => <p className="text-foreground/80 text-lg leading-relaxed mb-6 font-light" {...props} />,
                img: ({ node, ...props }) => <img className="rounded-3xl w-full shadow-2xl border border-border-custom my-12" {...props as any} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-0 bg-surface p-8 sm:p-10 rounded-3xl text-xl font-display font-light italic text-foreground shadow-sm my-12 border border-border-custom" {...props} />
                ),
                hr: () => <hr className="my-16 border-border-custom opacity-40" />,
                a: ({ node, ...props }) => {
                   const url = props.href || '';
                   if (Player.canPlay(url)) return <div className="my-12 rounded-3xl overflow-hidden aspect-video bg-black shadow-2xl"><Player url={url} width="100%" height="100%" controls /></div>;
                   return <a className="text-primary font-bold underline underline-offset-4 hover:text-emerald-400 transition-colors" {...props} />;
                }
              }}
            >
              {articleContent}
            </ReactMarkdown>
         </article>

         {/* Interactive Footer Actions */}
         <footer className="pt-16 border-t border-border-custom space-y-12">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-4">
                  <button onClick={handleLike} className="flex items-center gap-3 px-6 py-3 rounded-2xl glass border border-primary/20 text-primary font-bold uppercase tracking-wider text-xs active:scale-95 transition-all">
                     <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                     <span>{likesCount} Encores</span>
                  </button>
                  <button onClick={handleShare} className="p-3 rounded-2xl glass border border-border-custom text-foreground/50 hover:text-primary transition-all">
                     <Share2 className="w-4 h-4" />
                  </button>
               </div>
               
               <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">Tags:</span>
                  {Array.from(new Set(item.tags || [])).slice(0, 4).map((tag, idx, arr) => (
                    <React.Fragment key={tag}>
                      <span className="font-medium text-foreground/75">#{tag}</span>
                      {idx < arr.length - 1 && <span aria-hidden="true" className="opacity-40">·</span>}
                    </React.Fragment>
                  ))}
               </div>
            </div>

            {/* Premium Related Engine */}
            {relatedNews.length > 0 && (
               <section className="space-y-12">
                  <div className="flex items-center gap-4">
                     <h3 className="text-xs font-black uppercase tracking-[0.4em] text-text-muted">Further Reading</h3>
                     <div className="h-px bg-border-custom flex-grow" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                     {relatedNews.map(news => (
                       <Link key={news.id} to={`/news/${news.slug}`} className="group space-y-4">
                          <div className="aspect-video rounded-2xl overflow-hidden border border-border-custom bg-surface relative">
                             <img src={getHighQualityImage(news.image_url, news.category, news.title)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                          </div>
                          <h4 className="text-lg font-display font-bold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2">{news.title}</h4>
                       </Link>
                     ))}
                  </div>
               </section>
            )}

            {/* Cinematic Comments */}
            <section className="space-y-12">
               <h3 className="text-2xl font-display font-black text-foreground tracking-tight flex items-center gap-4">
                  Community Discourse <span className="text-primary/30 font-light">({comments.length})</span>
               </h3>
               
               {user ? (
                 <form onSubmit={handleComment} className="relative group">
                    <textarea 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Contribute to the conversation..."
                      className="w-full bg-surface border border-border-custom rounded-[2.5rem] p-10 text-xl font-light focus:border-primary/40 outline-none transition-all min-h-[180px] shadow-inner"
                    />
                    <button 
                      disabled={submittingComment || !newComment.trim()}
                      className="absolute bottom-8 right-8 px-10 py-4 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                    >
                       Dispatch Perspective
                    </button>
                 </form>
               ) : (
                 <div className="p-16 rounded-[3rem] border border-dashed border-border-custom text-center space-y-6 bg-surface/30">
                    <p className="text-text-muted text-lg italic font-light">Community perspective requires authentication.</p>
                    <Link to="/auth" className="inline-block px-12 py-5 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl">Identify Yourself</Link>
                 </div>
               )}

               <div className="space-y-8">
                  {comments.map(c => (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} className="flex gap-8 group">
                       <div className="w-16 h-16 rounded-2xl bg-surface border border-border-custom overflow-hidden shrink-0 shadow-lg">
                          <img src={c.profiles?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=User'} className="w-full h-full object-cover" />
                       </div>
                       <div className="flex-grow space-y-4">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <span className="font-black text-foreground uppercase tracking-widest text-xs">{c.profiles?.username}</span>
                                {c.profiles?.is_verified && <Award className="w-4 h-4 text-emerald-400" />}
                             </div>
                             <span className="text-[10px] font-bold text-text-muted/60 uppercase">{formatDistanceToNow(new Date(c.created_at))} ago</span>
                          </div>
                          <div className="bg-surface/50 border border-border-custom p-8 rounded-[2rem] shadow-sm italic text-foreground/70 leading-relaxed text-lg">
                             "{c.content}"
                          </div>
                       </div>
                    </motion.div>
                  ))}
               </div>
            </section>
         </footer>
      </main>

      <div className="fixed top-0 left-0 right-0 z-[6000] h-1 bg-border-custom/30">
         <motion.div 
           className="h-full bg-gradient-to-r from-primary to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
           style={{ width: `${scrollProgress}%` }}
         />
      </div>
    </div>
  );
}
