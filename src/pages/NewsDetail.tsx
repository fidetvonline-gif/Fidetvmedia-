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

      // 1. Instant in-memory check from NewsSyncService
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

      // 4. Query backend unified API
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
    <div className="min-h-screen bg-background pb-32">
      <SEO title={item.title} description={item.excerpt || item.description} />
      
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 transition-all duration-150" style={{ width: `${scrollProgress}%` }} />

      {/* Clean Modern Editorial Header & Cover Image Layout */}
      <header className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 space-y-8">
         {/* Navigation & Category Bar */}
         <div className="flex flex-wrap items-center justify-between gap-4">
            <Link to="/news" className="glass px-4 py-2.5 rounded-2xl text-foreground hover:bg-primary hover:text-white transition-all shadow-md flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
               <ArrowLeft className="w-4 h-4" />
               <span>Back to News</span>
            </Link>
            
            <div className="flex items-center gap-3">
               <span className="bg-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg">
                  {item.category}
               </span>
               <div className="glass px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] text-text-muted border border-border-custom flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-primary" /> {(item as any).read_time || '5 MIN READ'}
               </div>
            </div>
         </div>

         {/* Article Title */}
         <motion.h1 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-3xl sm:text-5xl lg:text-6xl font-display font-black text-foreground leading-[1.1] tracking-tight"
         >
            {item.title}
         </motion.h1>

         {/* Author & Share Bar */}
         <div className="flex flex-wrap items-center justify-between gap-4 py-6 border-y border-border-custom">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl border border-border-custom overflow-hidden shadow-lg">
                  <img src={item.profiles?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=FideTV'} className="w-full h-full object-cover" alt="Author" />
               </div>
               <div>
                  <p className="text-foreground font-black uppercase tracking-widest text-xs">{item.profiles?.username || 'FideTV News Desk'}</p>
                  <p className="text-text-muted text-[10px] font-bold uppercase tracking-[0.15em]">{format(new Date(item.created_at), 'MMMM dd, yyyy')}</p>
               </div>
            </div>

            <div className="flex items-center gap-3">
               <button onClick={handleLike} className={cn("glass p-3 rounded-2xl transition-all active:scale-90 flex items-center gap-2 text-xs font-bold", isLiked ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-text-muted hover:text-foreground border-border-custom")}>
                  <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                  <span>{likesCount}</span>
               </button>
               <button onClick={handleShare} className="glass p-3 rounded-2xl text-text-muted hover:text-foreground border border-border-custom transition-all active:scale-90 flex items-center gap-2 text-xs font-bold">
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
               </button>
            </div>
         </div>

         {/* Cover Photo Container (Fully Visible, Zero Overlap) */}
         <motion.div 
           initial={{ opacity: 0, scale: 0.98 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5 }}
           className="w-full aspect-[16/9] sm:aspect-[21/9] rounded-[2.5rem] overflow-hidden border border-border-custom shadow-2xl bg-surface relative"
         >
            <img 
              src={getHighQualityImage(item.image_url || (item as any).cover_image, item.category, item.title)} 
              className="w-full h-full object-cover"
              alt={item.title}
              onError={(e) => { e.currentTarget.src = getClientContentImage(item.title, item.category); }}
            />
         </motion.div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-16">
         {/* Lead Paragraph / Excerpt */}
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
                p: ({ node, ...props }) => <p className="text-foreground/85 text-lg leading-relaxed mb-6 font-light" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-6 space-y-2 text-foreground/85 my-6" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-6 space-y-2 text-foreground/85 my-6" {...props} />,
                li: ({ node, ...props }) => <li className="text-foreground/85 text-base font-light" {...props} />,
                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary pl-6 py-2 my-8 italic text-foreground/90 font-medium bg-surface/50 rounded-r-2xl" {...props} />,
                strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
                a: ({ node, ...props }) => <a className="text-primary hover:underline font-bold" target="_blank" rel="noopener noreferrer" {...props} />
              }}
            >
               {articleContent}
            </ReactMarkdown>
         </article>

         {/* Interactive Reactions & Share Bar */}
         <div className="pt-10 border-t border-border-custom flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
               <button onClick={handleLike} className={cn("px-6 py-3.5 rounded-2xl glass border flex items-center gap-2 font-bold text-xs uppercase tracking-wider transition-all", isLiked ? "text-red-500 bg-red-500/10 border-red-500/30" : "text-foreground border-border-custom hover:bg-surface-bright")}>
                  <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                  <span>{likesCount} Likes</span>
               </button>
               <button onClick={handleShare} className="px-6 py-3.5 rounded-2xl glass border border-border-custom text-foreground hover:bg-surface-bright flex items-center gap-2 font-bold text-xs uppercase tracking-wider transition-all">
                  <Share2 className="w-4 h-4" />
                  <span>Share Story</span>
               </button>
            </div>
            <div className="text-text-muted text-[10px] font-black uppercase tracking-widest">
               FideTV Editorial Wire Desk
            </div>
         </div>

         {/* Comments Section */}
         <section className="space-y-8 pt-10 border-t border-border-custom">
            <h3 className="text-2xl font-display font-black text-foreground flex items-center gap-3">
               <MessageCircle className="w-6 h-6 text-primary" />
               <span>Discussion ({comments.length})</span>
            </h3>

            {user ? (
              <form onSubmit={handleComment} className="space-y-4">
                 <textarea
                   value={newComment}
                   onChange={(e) => setNewComment(e.target.value)}
                   placeholder="Share your perspective on this report..."
                   rows={3}
                   className="w-full p-4 rounded-2xl glass border border-border-custom text-foreground text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                 />
                 <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="px-6 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-emerald-500 shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>Post Comment</span>
                    </button>
                 </div>
              </form>
            ) : (
              <div className="p-6 rounded-2xl glass border border-border-custom text-center space-y-3">
                 <p className="text-text-muted text-sm">Sign in to join the conversation and leave comments.</p>
                 <Link to="/auth" className="inline-block px-6 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl">Sign In</Link>
              </div>
            )}

            <div className="space-y-4">
               {comments.map((comment) => (
                 <div key={comment.id} className="p-6 rounded-2xl glass border border-border-custom space-y-3">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                          <img src={comment.profiles?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'} className="w-8 h-8 rounded-full border border-border-custom" alt="User" />
                          <span className="text-xs font-black text-foreground uppercase">{comment.profiles?.username || 'Viewer'}</span>
                       </div>
                       <span className="text-[10px] text-text-muted">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                    </div>
                    <p className="text-sm text-foreground/90 font-light">{comment.content}</p>
                 </div>
               ))}
            </div>
         </section>

         {/* Related Stories */}
         {relatedNews.length > 0 && (
           <section className="space-y-8 pt-16 border-t border-border-custom">
              <h3 className="text-2xl font-display font-black text-foreground">Related Reports</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {relatedNews.map((rel) => (
                   <Link key={rel.id} to={`/news/${rel.slug || rel.id}`} className="group block rounded-3xl glass border border-border-custom overflow-hidden p-5 space-y-4 hover:border-primary/40 transition-all">
                      <div className="aspect-[16/10] rounded-2xl overflow-hidden">
                         <img 
                           src={getHighQualityImage(rel.image_url, rel.category, rel.title)} 
                           className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                           alt={rel.title}
                           onError={(e) => { e.currentTarget.src = getClientContentImage(rel.title, rel.category); }}
                         />
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-primary">{rel.category}</span>
                      <h4 className="text-base font-display font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">{rel.title}</h4>
                   </Link>
                 ))}
              </div>
           </section>
         )}
      </main>
    </div>
  );
}
