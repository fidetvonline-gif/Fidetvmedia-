import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Community as CommunityType } from '@/types';
import { motion } from 'motion/react';
import { Search, Users, ArrowRight, Plus, MessageSquare, TrendingUp, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Community() {
  const [communities, setCommunities] = useState<CommunityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    const { data } = await supabase
      .from('communities')
      .select('*')
      .order('name');
    
    if (data) setCommunities(data as any);
    setLoading(false);
  };

  const filtered = communities.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-primary font-black uppercase tracking-[0.3em] text-xs">
            <Users className="w-4 h-4" />
            <span>Collective Hub</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-medium text-white tracking-tighter">
            Join the <span className="text-gray-600">Circle.</span>
          </h1>
        </div>
        <p className="max-w-md text-gray-400 text-lg font-light leading-relaxed">
          Find your niche, collaborate with experts, and grow your media presence in our specialized sub-communities.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Main Content */}
        <div className="flex-grow space-y-12">
          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-700 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for communities (e.g. Media Production, Live Streaming)..."
              className="w-full bg-surface-bright border border-white/5 rounded-[2rem] pl-16 pr-8 py-6 text-white text-lg placeholder-gray-700 focus:outline-none focus:border-primary/20 transition-all shadow-2xl"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="glass rounded-[3rem] h-64 animate-pulse" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filtered.map((c, idx) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  viewport={{ once: true }}
                >
                  <Link to={`/community/${c.id}`} className="group block h-full">
                    <div className="h-full glass rounded-[3rem] p-8 space-y-6 border-white/5 hover:bg-white/5 transition-all duration-500 relative overflow-hidden">
                      {/* Abstract Background Accent */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-all" />
                      
                      <div className="flex justify-between items-start">
                        <div className="w-16 h-16 bg-surface-bright rounded-2xl flex items-center justify-center border border-white/5 text-primary group-hover:scale-110 transition-transform">
                          {c.image_url ? (
                            <img src={c.image_url} alt={c.name} className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            <Users className="w-8 h-8" />
                          )}
                        </div>
                        <div className="flex items-center space-x-1 bg-white/5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase text-gray-500 tracking-wider">
                          <Globe className="w-3 h-3" />
                          <span>Public</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-white group-hover:text-primary transition-colors">{c.name}</h3>
                        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{c.description}</p>
                      </div>

                      <div className="pt-6 flex items-center justify-between border-t border-white/5">
                        <div className="flex -space-x-2">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="w-6 h-6 rounded-full border-2 border-surface bg-gray-800" />
                          ))}
                          <div className="w-6 h-6 rounded-full border-2 border-surface bg-surface-bright flex items-center justify-center text-[8px] font-bold text-gray-500">+12</div>
                        </div>
                        <div className="flex items-center space-x-2 text-primary font-black uppercase text-[10px] tracking-widest group-hover:translate-x-1 transition-transform">
                          <span>Enter Hub</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-40 glass rounded-[4rem] border-dashed border-white/5">
              <MessageSquare className="w-16 h-16 text-gray-800 mx-auto mb-6" />
              <h2 className="text-2xl font-display font-medium text-gray-500">No communities found.</h2>
              <p className="text-gray-600 mt-2">Try searching for something else or contact an admin to create a hub.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-8 flex-shrink-0">
          <div className="glass rounded-[2.5rem] p-8 space-y-8">
            <h3 className="font-display font-bold text-white text-lg flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Global Trends</span>
            </h3>
            <div className="space-y-6">
              {[
                { tag: '#LiveBroadcasting', posts: '1.2K' },
                { tag: '#EditMasters', posts: '840' },
                { tag: '#FideCreators', posts: '2.1K' }
              ].map(item => (
                <div key={item.tag} className="group cursor-pointer">
                  <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{item.tag}</p>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">{item.posts} Discussions</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 bg-primary/10 border border-primary/20 rounded-[2.5rem] space-y-4">
             <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white mb-6">
               <Users className="w-5 h-5" />
             </div>
             <h4 className="text-primary font-bold text-sm uppercase tracking-widest leading-tight">Start Your Journey</h4>
             <p className="text-xs text-gray-400 leading-relaxed font-light">
               Can't find your community? Reach out to our community managers to propose a new hub for your niche.
             </p>
             <Link to="/contact" className="inline-block pt-4 text-[10px] font-black text-white hover:text-primary uppercase tracking-[0.2em] transition-colors">
               Propose Hub &rarr;
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
