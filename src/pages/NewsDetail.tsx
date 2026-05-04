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
    fetchNewsDetail();
  }, [slug]);

  const fetchNewsDetail = async () => {
    const { data, error } = await supabase
      .from('news')
      .select('*, profiles(username, avatar_url)')
      .eq('slug', slug)
      .single();
    
    if (error || !data) {
      navigate('/news');
      return;
    }

    setItem(data as any);
    setLoading(false);
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

  return (
    <motion.article 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
    >
      <Link to="/news" className="inline-flex items-center space-x-2 text-gray-500 hover:text-primary transition-colors mb-12 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold uppercase tracking-widest">Back to News</span>
      </Link>

      <header className="space-y-8 mb-12">
        <div className="flex items-center space-x-4">
          <span className="bg-primary/20 text-primary text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-primary/20">
            Platform News
          </span>
          <div className="flex items-center space-x-2 text-gray-500 text-[10px] font-black uppercase tracking-widest">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(item!.created_at), 'MMMM dd, yyyy')}</span>
          </div>
        </div>

        <h1 className="text-4xl md:text-6xl font-display font-medium text-white tracking-tighter leading-[1.1]">
          {item!.title}
        </h1>

        <div className="flex items-center justify-between py-8 border-y border-white/5">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-surface-bright rounded-2xl flex items-center justify-center overflow-hidden border border-white/10">
              {item!.profiles?.avatar_url ? (
                <img src={item!.profiles.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-gray-600" />
              )}
            </div>
            <div>
              <p className="text-white font-bold">{item!.profiles?.username || 'Admin'}</p>
              <p className="text-[10px] uppercase font-black text-gray-500 tracking-tighter">FideTV Editorial Board</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <button onClick={handleShare} className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-primary transition-all active:scale-95 shadow-lg">
               <Share2 className="w-5 h-5" />
             </button>
             <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-all active:scale-95 shadow-lg">
               <Bookmark className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      {item!.image_url && (
        <div className="rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden mb-16 border border-white/5 aspect-video shadow-2xl relative group">
          <img src={item!.image_url} alt={item!.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}

      <div className="prose prose-invert prose-p:text-gray-400 prose-p:leading-relaxed prose-headings:text-white prose-headings:font-display prose-a:text-primary max-w-none prose-img:rounded-[2rem] news-content">
        <ReactMarkdown
          components={{
            a: ({ node, ...props }) => {
              const url = props.href || '';
              if (Player.canPlay(url)) {
                return (
                  <div className="my-10 rounded-[2rem] overflow-hidden aspect-video bg-black border border-white/5 shadow-2xl">
                    <Player url={url} width="100%" height="100%" controls />
                  </div>
                );
              }
              return <a {...props} />;
            }
          }}
        >
          {item!.content}
        </ReactMarkdown>
      </div>

      {(item as any).image_urls && (item as any).image_urls.length > 0 && (
        <div className="mt-16 space-y-8">
           <h3 className="text-xl font-display font-bold text-white tracking-tight">Gallery Highlights</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(item as any).image_urls.filter((url: string) => url.trim() !== '').map((url: string, i: number) => (
                <div key={i} className="rounded-3xl overflow-hidden border border-white/5 aspect-square bg-surface-bright group">
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

      <footer className="mt-20 pt-12 border-t border-white/5 flex flex-col items-center">
        <h3 className="text-white font-bold mb-6">Share this article</h3>
        <div className="flex space-x-4">
          <button onClick={() => window.open(`https://twitter.com/intent/tweet?text=${item!.title}&url=${window.location.href}`)} className="px-8 py-3 glass rounded-xl text-white font-bold text-xs uppercase hover:bg-white/5 transition-colors">X / Twitter</button>
          <button onClick={() => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${window.location.href}`)} className="px-8 py-3 glass rounded-xl text-white font-bold text-xs uppercase hover:bg-white/5 transition-colors">LinkedIn</button>
        </div>
      </footer>
    </motion.article>
  );
}
