import { SEO } from '@/components/SEO';
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { News, Comment } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, User, ArrowLeft, Share2, Bookmark, Heart, MessageCircle, Send, Award } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import ReactPlayer from 'react-player';
import { cn } from '@/lib/utils';
import fidetvWorldCup from '@/assets/images/fidetv_world_cup_1780392851684.png';

const Player = ReactPlayer as any;

const STATIC_WC_POST: News = {
  id: 'fidetv-worldcup-live',
  slug: 'watch-world-cup-matches-live-free',
  title: 'Where to Watch All World Cup Matches Live & For Free Exclusively Online',
  excerpt: 'Searching for a premium, reliable place to watch World Cup matches? FideTV.online is proud to broadcast every single global tournament match live, in full HD, and 100% free with no subscription or signup required!',
  description: 'Learn how to easily tune in to live World Cup fixtures, tournament schedules, multi-feed coverage, and real-time community fan chats on the ultimate digital sports media hub.',
  content: `### 🏆 The Ultimate Destination for Global Football Fans

Are you looking for the absolute best place to watch the upcoming **World Cup Matches live, online, and completely for free**? Look no further! 

**FideTV.online** is officially bringing you pristine, uninterrupted digital coverage of the entire global soccer tournament. Whether you're cheering for Lionel Messi, Cristiano Ronaldo, Erling Haaland, Kylian Mbappé, or the rising stars of national teams, we have you fully covered.

---

### 🎁 Why Watch the World Cup on FideTV.online?

Unlike mainstream paywalled platforms or ad-congested pirate streams, FideTV focuses on a premium, clean viewer experience:

1. **100% Free Access**: No subscription fees, no credit card prompts, and absolutely no mandatory sign-ups. Just click and watch!
2. **Crystal-Clear HD Audio & Video**: Experience every high-stakes penalty shootout, gorgeous bicycle kick, and crowd roar in high definition.
3. **Multi-Camera Coverage**: Select from multiple vantage angles or main director streams.
4. **Interactive Fan Chat**: Share instant emotional reactions, debate tactical lineups, and socialize with football enthusiasts around the globe in our secure, real-time live chat panel next to the broadcast.
5. **Universal Mobile & TV Support**: Optimized perfectly for smartphones, tablet displays, laptops, and smart TV browsers so you can enjoy matches on the go.

---

### 📅 Event Schedule & Kick-Off Details

Our broadcasts synchronize directly with the official kick-off times! To make sure you don't miss a single touch of the ball, head over to our main platform sections:

* **[Visit the Live Section](/live)**: Our continuous matches stream live on the customized video deck immediately.
* **Matchday Alerts**: Keep the Live Event Banner active to access rolling down-to-the-second countdowns before your favorite national squads square off on the field.

### 🌟 Live Fan Engagement

During live match occurrences, FideTV.online hosts interactive companion panels. You'll have live play-by-plays, scoreboards, and active discussions right alongside fans worldwide.

Be sure to bookmark FideTV.online and share this page with fellow football fans so nobody misses the biggest sports tournament of the decade! No cables, no registrations — just beautiful football.`,
  category: 'Live Broadcasts',
  author_id: 'admin',
  is_published: true,
  image_url: fidetvWorldCup,
  created_at: '2026-06-02T09:00:00Z',
  profiles: {
    username: 'fidetv_sports',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=fidetv_sports'
  } as any
};

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
  const [relatedNews, setRelatedNews] = useState<News[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [submittingComment, setSubmittingComment] = useState(false);

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
      console.log('NewsDetail: Fetching for slug:', slug);
      fetchNewsDetail();
    }
  }, [slug]);

  const fetchNewsDetail = async () => {
    setLoading(true);
    if (slug === 'watch-world-cup-matches-live-free' || slug === 'fidetv-worldcup-live') {
      setItem(STATIC_WC_POST);
      setLikesCount(1185);
      setLoading(false);
      fetchRelatedNews('fidetv-worldcup-live');
      return;
    }
    if (slug === 'major-release-v2' || slug === 'fidetv-release-v2') {
      setItem(STATIC_RELEASE_POST);
      setLikesCount(142);
      setLoading(false);
      fetchRelatedNews('fidetv-release-v2');
      return;
    }
    try {
      // Check if slug is potentially a UUID (standard news ID format)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug!);
      
      let query = supabase
        .from('news')
        .select('*, profiles(username, avatar_url)');
      
      if (isUuid) {
        query = query.or(`slug.eq.${slug},id.eq.${slug}`);
      } else {
        query = query.eq('slug', slug);
      }

      const { data, error } = await query.maybeSingle();
      
      if (error) {
        console.error('NewsDetail: Supabase error:', error);
        throw error;
      }

      if (!data) {
        console.warn('NewsDetail: No data found for slug:', slug);
        navigate('/news');
        return;
      }

      console.log('NewsDetail: Data loaded:', data);
      setItem(data as any);
      fetchComments(data.id);
      fetchLikes(data.id);
      fetchRelatedNews(data.id);
    } catch (err) {
      console.error('NewsDetail: Unexpected error:', err);
      navigate('/news');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedNews = async (currentId: string) => {
    const { data } = await supabase
      .from('news')
      .select('*')
      .eq('is_published', true)
      .neq('id', currentId)
      .limit(3);
    
    let combinedRelated: News[] = [];
    if (currentId === 'fidetv-worldcup-live') {
      combinedRelated.push(STATIC_RELEASE_POST);
    } else if (currentId === 'fidetv-release-v2') {
      combinedRelated.push(STATIC_WC_POST);
    } else {
      combinedRelated.push(STATIC_WC_POST, STATIC_RELEASE_POST);
    }

    if (data) {
      combinedRelated = [...combinedRelated, ...(data as any).filter((item: any) => item.id !== currentId && item.slug !== 'major-release-v2' && item.slug !== 'watch-world-cup-matches-live-free')];
    }
    setRelatedNews(combinedRelated.slice(0, 3));
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
    // Try to get likes from a news_likes table if it exists
    // Fallback to local state if table doesn't exist
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error, count } = await supabase
        .from('news_likes')
        .select('*', { count: 'exact' })
        .eq('news_id', newsId);
      
      if (!error && count !== null) {
        setLikesCount(count);
        if (session?.user) {
          setIsLiked(data.some(l => l.user_id === session.user.id));
        }
      }
    } catch (e) {
      // news_likes table might not exist
      console.warn('news_likes table might not exist, skipping likes fetch');
    }
  };

  const handleLike = async () => {
    if (!user || !item) return;

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('news_likes')
          .delete()
          .eq('news_id', item.id)
          .eq('user_id', user.id);
        
        if (!error) {
          setIsLiked(false);
          setLikesCount(prev => Math.max(0, prev - 1));
        }
      } else {
        const { error } = await supabase
          .from('news_likes')
          .insert({ news_id: item.id, user_id: user.id });
        
        if (!error) {
          setIsLiked(true);
          setLikesCount(prev => prev + 1);
        }
      }
    } catch (e) {
      alert('Could not process like. The feature might be in maintenance.');
    }
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
    } else {
      alert('Error posting comment: ' + error.message);
    }
    setSubmittingComment(false);
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-40">
      <div className="h-8 w-64 bg-surface animate-pulse mb-8 rounded-lg" />
      <div className="h-[400px] w-full bg-surface animate-pulse mb-8 rounded-[2.5rem]" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-4 w-full bg-surface animate-pulse rounded" />)}
      </div>
    </div>
  );

  if (!item) return null;

  return (
    <motion.article 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-background"
    >
      <SEO title={item.title} description={item.excerpt || item.description} />
      <Link to="/news" className="inline-flex items-center space-x-2 text-foreground/40 hover:text-primary transition-colors mb-12 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold uppercase tracking-widest">Back to News</span>
      </Link>

      <header className="space-y-8 mb-12">
        <div className="flex items-center space-x-4">
          <span className="bg-primary/20 text-primary text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-primary/20">
            {item.category || 'Platform News'}
          </span>
          <div className="flex items-center space-x-2 text-foreground/40 text-[10px] font-black uppercase tracking-widest">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(item.created_at), 'MMMM dd, yyyy')}</span>
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-display font-medium text-foreground tracking-tighter leading-[1.1]">
          {item.title}
        </h1>

        <div className="flex items-center justify-between py-8 border-y border-border-custom">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center overflow-hidden border border-border-custom">
              {item.profiles?.avatar_url ? (
                <img src={item.profiles.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-foreground/20" />
              )}
            </div>
            <div>
              <p className="text-foreground font-bold">{item.profiles?.username || 'Admin'}</p>
              <p className="text-[10px] uppercase font-black text-foreground/40 tracking-tighter">FideTV Media Hub</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <button 
               onClick={handleLike} 
               className={cn(
                 "flex items-center space-x-2 px-4 py-2 rounded-xl border transition-all active:scale-95 shadow-sm",
                 isLiked ? "bg-red-500/10 border-red-500/20 text-red-500" : "bg-surface border-border-custom text-foreground/40 hover:text-red-500"
               )}
             >
               <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
               <span className="text-sm font-bold">{likesCount}</span>
             </button>
             <button onClick={handleShare} className="p-3 bg-surface border border-border-custom rounded-xl text-foreground/40 hover:text-primary transition-all active:scale-95 shadow-sm">
               <Share2 className="w-5 h-5" />
             </button>
             <button className="p-3 bg-surface border border-border-custom rounded-xl text-foreground/40 hover:text-primary transition-all active:scale-95 shadow-sm">
               <Bookmark className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      {item.image_url && (
        <div className="rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden mb-16 border border-border-custom aspect-video shadow-2xl relative group bg-surface">
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
        <div className="flex-grow space-y-16">
          <div className="news-content">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => <h1 className="text-3xl md:text-5xl font-display font-medium text-foreground mt-12 mb-6 tracking-tight leading-tight" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-2xl md:text-3.5xl font-display font-medium text-foreground mt-10 mb-5 tracking-tight border-b border-border-custom pb-3" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-xl md:text-2.5xl font-display font-semibold text-foreground mt-8 mb-4 tracking-tight flex items-center gap-2" {...props} />,
                h4: ({ node, ...props }) => <h4 className="text-lg md:text-xl font-display font-semibold text-foreground mt-6 mb-3 tracking-tight" {...props} />,
                img: ({ node, ...props }) => <img className="rounded-3xl w-full h-auto my-12 shadow-2xl border border-white/10" {...props as any} />,
                p: ({ node, ...props }) => <p className="text-foreground/80 text-base md:text-[17px] leading-relaxed mb-6 font-sans font-normal tracking-wide" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-8 space-y-3 text-foreground/80 text-base md:text-[17px] marker:text-primary" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-8 space-y-3 text-foreground/80 text-base md:text-[17px] marker:text-primary" {...props} />,
                li: ({ node, ...props }) => <li className="pl-2 leading-relaxed" {...props} />,
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-primary bg-primary/5 pl-6 py-5 pr-5 my-8 rounded-r-2xl text-foreground font-serif italic text-lg md:text-xl leading-relaxed shadow-sm border-y border-r border-border-custom/20" {...props} />
                ),
                code: ({ node, inline, ...props }: any) => {
                  return inline ? (
                    <code className="bg-surface-bright border border-border-custom px-2 py-0.5 rounded-lg text-primary text-sm font-mono font-medium" {...props} />
                  ) : (
                    <pre className="bg-surface-bright border border-border-custom p-6 rounded-2xl overflow-x-auto text-foreground text-sm font-mono my-8 leading-relaxed shadow-inner">
                      <code {...props} />
                    </pre>
                  );
                },
                hr: () => <hr className="my-12 border-border-custom" />,
                strong: ({ node, ...props }) => <strong className="font-extrabold text-foreground" {...props} />,
                em: ({ node, ...props }) => <em className="italic text-foreground/90 font-serif" {...props} />,
                a: ({ node, ...props }) => {
                  const url = props.href || '';
                  if (Player.canPlay(url)) {
                    return (
                      <div className="my-10 rounded-[2rem] overflow-hidden aspect-video bg-black border border-border-custom shadow-2xl">
                        <Player url={url} width="100%" height="100%" controls />
                      </div>
                    );
                  }
                  return (
                    <a 
                      className="text-primary hover:text-primary/100 hover:underline font-bold transition-all decoration-primary/40 decoration-2 underline-offset-4" 
                      target={url.startsWith('http') ? '_blank' : undefined} 
                      rel={url.startsWith('http') ? 'noopener noreferrer' : undefined}
                      {...props} 
                    />
                  );
                }
              }}
            >
              {item.content}
            </ReactMarkdown>
          </div>

          {item.image_urls && item.image_urls.length > 0 && (
            <div className="space-y-8">
               <h3 className="text-xl font-display font-bold text-foreground tracking-tight">Gallery Highlights</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {item.image_urls.filter((url: string) => url.trim() !== '').map((url: string, i: number) => (
                    <div key={i} className="rounded-3xl overflow-hidden border border-border-custom aspect-square bg-surface group">
                       <img 
                        src={url} 
                        alt={`Gallery ${i}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-zoom-in" 
                        onClick={() => window.open(url, '_blank')}
                      />
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* Comments Section */}
          <section className="space-y-12 pt-20 border-t border-border-custom">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-display font-bold text-foreground tracking-tight flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-primary" />
                Comments <span className="text-foreground/20">({comments.length})</span>
              </h3>
            </div>

            {user ? (
              <form onSubmit={handleComment} className="relative group">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts on this story..."
                  className="w-full bg-surface border border-border-custom rounded-[2rem] p-8 text-foreground min-h-[150px] focus:border-primary/50 transition-all shadow-inner outline-none placeholder:text-text-muted"
                />
                <button 
                  disabled={submittingComment || !newComment.trim()}
                  className="absolute bottom-6 right-6 px-8 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {submittingComment ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Post Comment
                </button>
              </form>
            ) : (
              <div className="p-12 glass rounded-[2rem] text-center border-dashed border-border-custom space-y-6">
                <p className="text-text-muted italic">Join the conversation. Sign in to leave a comment.</p>
                <Link to="/auth" className="inline-flex px-8 py-4 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                  Sign In to Comment
                </Link>
              </div>
            )}

            <div className="space-y-8">
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-6 group"
                >
                  <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center overflow-hidden border border-border-custom shadow-sm shrink-0">
                    {comment.profiles?.avatar_url ? (
                      <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-foreground/20" />
                    )}
                  </div>
                  <div className="flex-grow space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm">{comment.profiles?.username || 'User'}</span>
                        {comment.profiles?.is_verified && <Award className="w-3 h-3 text-primary" />}
                      </div>
                      <span className="text-[10px] text-foreground/40 font-medium italic">
                        {formatDistanceToNow(new Date(comment.created_at))} ago
                      </span>
                    </div>
                    <div className="bg-surface/50 border border-border-custom rounded-3xl p-6 shadow-sm">
                      <p className="text-foreground/70 leading-relaxed italic">"{comment.content}"</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {comments.length === 0 && (
                <div className="py-20 text-center text-foreground/20 italic font-light">
                  No comments yet. Be the first to share your thoughts!
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="w-full lg:w-80 shrink-0 space-y-12">
          {relatedNews.length > 0 && (
            <div className="space-y-8 sticky top-32">
              <h3 className="text-xl font-display font-bold text-foreground tracking-tight border-b border-border-custom pb-4 text-center lg:text-left">Related Stories</h3>
              <div className="space-y-8">
                {relatedNews.map((news) => (
                  <Link key={news.id} to={`/news/${news.slug}`} className="group block space-y-3">
                    <div className="aspect-video rounded-2xl overflow-hidden border border-border-custom bg-surface relative">
                      <img src={news.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-all" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-black text-primary tracking-widest">{news.category}</p>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">{news.title}</h4>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      <footer className="mt-32 pt-12 border-t border-border-custom flex flex-col items-center">
        <h3 className="text-foreground font-bold mb-6 italic uppercase tracking-widest text-xs">Share this article</h3>
        <div className="flex space-x-4">
          <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${item.title}&url=${window.location.href}`)} className="px-8 py-3 bg-surface border border-border-custom rounded-xl text-foreground font-bold text-xs uppercase hover:text-primary transition-colors">X / Twitter</button>
          <button onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${window.location.href}`)} className="px-8 py-3 bg-surface border border-border-custom rounded-xl text-foreground font-bold text-xs uppercase hover:text-primary transition-colors">LinkedIn</button>
        </div>
      </footer>
    </motion.article>
  );
}
