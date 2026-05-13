import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { News } from '@/types';
import { motion } from 'motion/react';
import { Calendar, User, ArrowLeft, Share2, Bookmark } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import ReactPlayer from 'react-player';

const Player = ReactPlayer as any;

export default function NewsDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedNews, setRelatedNews] = useState<News[]>([]);

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
      fetchRelatedNews();
    }
  }, [slug]);

  const fetchNewsDetail = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('news')
        .select('*, profiles(username, avatar_url)')
        .eq('slug', slug)
        .maybeSingle();
      
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
    } catch (err) {
      console.error('NewsDetail: Unexpected error:', err);
      navigate('/news');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedNews = async () => {
    const { data } = await supabase
      .from('news')
      .select('*')
      .eq('is_published', true)
      .neq('slug', slug)
      .limit(3);
    if (data) setRelatedNews(data as any);
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
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-background"
    >
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
             <button onClick={handleShare} className="p-3 bg-surface border border-border-custom rounded-xl text-foreground/40 hover:text-primary transition-all active:scale-95 shadow-sm">
               <Share2 className="w-5 h-5" />
             </button>
             <button className="p-3 bg-surface border border-border-custom rounded-xl text-foreground/40 hover:text-primary transition-all active:scale-95 shadow-sm">
               <Bookmark className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      {item.thumbnail_url && (
        <div className="rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden mb-16 border border-border-custom aspect-video shadow-2xl relative group bg-surface">
          <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
        <div className="flex-grow space-y-16">
          <div className="prose dark:prose-invert prose-p:text-foreground/70 prose-p:leading-relaxed prose-headings:text-foreground prose-headings:font-display prose-a:text-primary max-w-none prose-img:rounded-[2rem] news-content">
            <ReactMarkdown
              components={{
                a: ({ ...props }) => {
                  const url = props.href || '';
                  if (Player.canPlay(url)) {
                    return (
                      <div className="my-10 rounded-[2rem] overflow-hidden aspect-video bg-black border border-border-custom shadow-2xl">
                        <Player url={url} width="100%" height="100%" controls />
                      </div>
                    );
                  }
                  return <a {...props} />;
                }
              }}
            >
              {item.content}
            </ReactMarkdown>
          </div>

          {(item as any).gallery && (item as any).gallery.length > 0 && (
            <div className="space-y-8">
               <h3 className="text-xl font-display font-bold text-foreground tracking-tight">Gallery Highlights</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(item as any).gallery.filter((url: string) => url.trim() !== '').map((url: string, i: number) => (
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
        </div>

        <aside className="w-full lg:w-80 shrink-0 space-y-12">
          {relatedNews.length > 0 && (
            <div className="space-y-8 sticky top-32">
              <h3 className="text-xl font-display font-bold text-foreground tracking-tight border-b border-border-custom pb-4 text-center lg:text-left">Related Stories</h3>
              <div className="space-y-8">
                {relatedNews.map((news) => (
                  <Link key={news.id} to={`/news/${news.slug}`} className="group block space-y-3">
                    <div className="aspect-video rounded-2xl overflow-hidden border border-border-custom bg-surface relative">
                      <img src={news.thumbnail_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
