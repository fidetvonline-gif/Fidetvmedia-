import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { News as NewsType } from '@/types';
import { motion } from 'motion/react';
import { Calendar, User, ArrowRight, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function News() {
  const [news, setNews] = useState<NewsType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    const { data } = await supabase
      .from('news')
      .select('*, profiles(username)')
      .eq('is_published', true)
      .order('created_at', { ascending: false });
    
    if (data) setNews(data as any);
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-primary font-black uppercase tracking-[0.3em] text-xs">
            <Newspaper className="w-4 h-4" />
            <span>Updates & Insights</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter">
            FideTV <span className="text-gray-600">Blog Studio.</span>
          </h1>
        </div>
        <p className="max-w-md text-gray-400 text-lg font-light leading-relaxed">
          Stay updated with the latest in media production, broadcasting technology, community highlights, and industry insights.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass rounded-[2.5rem] h-96 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {news.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="group glass rounded-[2.5rem] overflow-hidden border-white/5 hover:bg-white/5 transition-all duration-500 flex flex-col"
            >
              <Link to={`/news/${item.slug}`} className="flex flex-col h-full">
                <div className="relative aspect-[16/10] overflow-hidden bg-surface">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Newspaper className="w-12 h-12 text-gray-800" />
                    </div>
                  )}
                  <div className="absolute top-6 left-6 flex space-x-2">
                    <span className="bg-primary/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
                      {item.category || 'Editorial'}
                    </span>
                  </div>
                </div>
                <div className="p-8 space-y-4 flex flex-col flex-grow">
                  <div className="flex items-center space-x-4 text-[10px] uppercase font-black tracking-widest text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(item.created_at), 'MMMM dd, yyyy')}</span>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed flex-grow">
                    {item.excerpt || item.description}
                  </p>
                  <div className="pt-6 flex items-center justify-between border-t border-white/5">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                        {item.profiles?.username?.[0] || 'A'}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{item.profiles?.username || 'Admin'}</span>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-700 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
      
      {!loading && news.length === 0 && (
        <div className="text-center py-40 glass rounded-[3rem] border-dashed border-white/5 mt-12">
          <Newspaper className="w-16 h-16 text-gray-800 mx-auto mb-6" />
          <h2 className="text-2xl font-display font-medium text-gray-500">No news articles yet.</h2>
          <p className="text-gray-600 mt-2">Come back later for official updates.</p>
        </div>
      )}
    </div>
  );
}
