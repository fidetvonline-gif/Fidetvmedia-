import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Community as CommunityType } from '@/types';
import { motion } from 'motion/react';
import { Search, Users, ArrowRight, Plus, MessageSquare, TrendingUp, Globe, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import FollowButton from '@/components/FollowButton';

export default function Community() {
  const [communities, setCommunities] = useState<CommunityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
    fetchCommunities();
    fetchSuggestedUsers();
  }, []);

  const fetchCommunities = async () => {
    const { data } = await supabase
      .from('communities')
      .select('*')
      .order('name');
    
    if (data) setCommunities(data as any);
    setLoading(false);
  };

  const fetchSuggestedUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .limit(5);
    
    if (data) {
      setSuggestedUsers(data);
    }
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
          <h1 className="text-5xl md:text-7xl font-display font-medium text-foreground tracking-tighter">
            Join the <span className="text-muted">Circle.</span>
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
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-text-muted group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for communities (e.g. Media Production, Live Streaming)..."
              className="w-full bg-surface-bright border border-border-custom rounded-[2rem] pl-16 pr-8 py-6 text-foreground text-lg placeholder-text-muted focus:outline-none focus:border-primary/20 transition-all shadow-2xl"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="glass rounded-[3rem] h-64 animate-pulse" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((c, idx) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.05 }}
                  viewport={{ once: true }}
                  className={cn(
                    "group relative h-full",
                    idx === 0 ? "md:col-span-2" : ""
                  )}
                >
                  <Link to={`/community/${c.id}`} className="block h-full">
                    <div className="h-full bg-surface-bright/50 backdrop-blur-xl rounded-[2.5rem] p-8 space-y-6 border border-border-custom hover:border-primary/30 transition-all duration-500 overflow-hidden relative">
                      {/* Abstract Background Accent */}
                      <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700" />
                      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />
                      
                      <div className="relative z-10 flex justify-between items-start">
                        <div className="w-20 h-20 bg-gradient-to-br from-surface to-surface-bright rounded-[1.5rem] flex items-center justify-center border border-border-custom text-primary shadow-2xl group-hover:scale-105 group-hover:rotate-3 transition-transform duration-500">
                          {c.image_url ? (
                            <img src={c.image_url} alt={c.name} className="w-full h-full object-cover rounded-[1.5rem]" />
                          ) : (
                            <Users className="w-8 h-8" />
                          )}
                        </div>
                        <div className="flex items-center space-x-1 bg-surface-bright/80 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase text-text-muted tracking-widest border border-border-custom">
                          <Globe className="w-3 h-3 text-primary" />
                          <span>Public</span>
                        </div>
                      </div>

                      <div className="relative z-10 space-y-3">
                        <h3 className={cn(
                          "font-display font-medium text-foreground group-hover:text-primary transition-colors",
                          idx === 0 ? "text-4xl" : "text-2xl"
                        )}>{c.name}</h3>
                        <p className={cn(
                          "text-text-muted font-light leading-relaxed",
                          idx === 0 ? "text-lg max-w-2xl" : "text-sm line-clamp-2"
                        )}>{c.description}</p>
                      </div>

                      <div className="relative z-10 pt-6 flex items-center justify-between border-t border-border-custom mt-auto">
                        <div className="flex -space-x-3">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-surface bg-surface-bright flex items-center justify-center overflow-hidden">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                          ))}
                          <div className="w-8 h-8 rounded-full border-2 border-surface bg-primary/20 flex items-center justify-center text-[9px] font-black text-primary backdrop-blur-md">
                            +{Math.floor(Math.random() * 50) + 10}
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-white transition-all duration-300">
                          <ArrowRight className="w-5 h-5 group-hover:-rotate-45 transition-transform duration-300" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-40 glass rounded-[4rem] border-dashed border-border-custom">
              <MessageSquare className="w-16 h-16 text-text-muted mx-auto mb-6" />
              <h2 className="text-2xl font-display font-medium text-text-muted">No communities found.</h2>
              <p className="text-text-muted mt-2">Try searching for something else or contact an admin to create a hub.</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-8 flex-shrink-0">
          <div className="glass rounded-[2.5rem] p-8 space-y-8">
            <h3 className="font-display font-bold text-foreground text-lg flex items-center space-x-2">
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
                  <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{item.tag}</p>
                  <p className="text-[10px] text-text-muted uppercase font-black tracking-widest mt-1">{item.posts} Discussions</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-[2.5rem] p-8 space-y-6">
            <h3 className="font-display font-bold text-foreground text-lg flex items-center space-x-2">
              <User className="w-5 h-5 text-primary" />
              <span>Who to Follow</span>
            </h3>
            <div className="space-y-4">
              {suggestedUsers.filter(u => u.id !== currentUser?.id).slice(0, 4).map(u => (
                <div key={u.id} className="flex items-center justify-between group">
                  <Link to={`/profile/${u.username}`} className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-full bg-surface-bright flex items-center justify-center shrink-0 border border-border-custom overflow-hidden">
                      {u.avatar_url ? (
                         <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                      ) : (
                         <User className="w-5 h-5 text-text-muted" />
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{u.full_name || u.username}</span>
                      <span className="text-[10px] text-text-muted uppercase tracking-widest truncate">@{u.username}</span>
                    </div>
                  </Link>
                  <FollowButton targetUserId={u.id} className="scale-75 origin-right" />
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
