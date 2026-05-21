import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Community as CommunityType } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Users, ArrowRight, Plus, MessageSquare, TrendingUp, Globe, User, X, 
  Sparkles, Send, Heart, Award, CheckCircle2, ShieldCheck, Filter, MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import FollowButton from '@/components/FollowButton';
import AdBanner from '@/components/AdBanner';

interface Shout {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  is_verified?: boolean;
  role_badge?: string;
  content: string;
  likes: number;
  has_liked?: boolean;
  created_at: string;
}

// Highly stylized fallback creators for premium default spotlights
const FALLBACK_SPOTLIGHTS = [
  {
    id: "fide-spotlight-1",
    username: "mary_adeboye",
    full_name: "Mary Adeboye",
    avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop",
    bio: "Broadcast Anchor & Investigative Journalist. Spotlighting media pipelines, digital equity, and creative technology across Sub-Saharan Africa.",
    is_verified: true,
    role: "Lead Broadcast Anchor",
    followers: 5240,
    specialty: "Broadcasting"
  },
  {
    id: "fide-spotlight-2",
    username: "jacob_cinematic",
    full_name: "Jacob Mensah",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
    bio: "Chief Cinematography and Field Broadcast Director. Dedicated to high-definition sports workflows and creative aerial video coverage.",
    is_verified: true,
    role: "Visual & Technical Director",
    followers: 3120,
    specialty: "Visual Production"
  },
  {
    id: "fide-spotlight-3",
    username: "sophia_media",
    full_name: "Sophia Nwachukwu",
    avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop",
    bio: "Executive Program Producer. Architecting mixed-reality studios, localized audio formats, and community broadcast integrations.",
    is_verified: true,
    role: "Editor & Live Producer",
    followers: 6710,
    specialty: "Strategy"
  }
];

const PRESET_SHOUTS: Shout[] = [
  {
    id: "pre-shout-1",
    username: "mary_adeboye",
    full_name: "Mary Adeboye",
    avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop",
    is_verified: true,
    role_badge: "🔥 Broadcast Lead",
    content: "Welcome to the FideTV Collective! Catch our flagship global discussion broadcast streaming directly on the Live tab this Friday 18:00 UTC.",
    likes: 38,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: "pre-shout-2",
    username: "jacob_cinematic",
    full_name: "Jacob Mensah",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
    is_verified: true,
    role_badge: "🎥 Cinematographer",
    content: "Just finalized rendering the creative assets for our upcoming community documentary. If you want to contribute drone shots, please drop a message!",
    likes: 24,
    created_at: new Date(Date.now() - 3600000 * 6).toISOString()
  },
  {
    id: "pre-shout-3",
    username: "sophia_media",
    full_name: "Sophia Nwachukwu",
    avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop",
    is_verified: true,
    role_badge: "✨ Executive Producer",
    content: "We just crossed over 15 dynamic video sub-communities on FideTV! Thank you all for maintaining high production standards and friendly dialogues.",
    likes: 51,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

export default function Community() {
  const [communities, setCommunities] = useState<CommunityType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'broadcasters' | 'visual' | 'strategists'>('all');
  
  // Spotlight Slider Index
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  
  // Live Connections Shoutbox State
  const [shouts, setShouts] = useState<Shout[]>([]);
  const [newShoutContent, setNewShoutContent] = useState('');
  
  // Create Hub Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [creating, setCreating] = useState(false);

  // Auto-rotating spotlight effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSpotlightIndex(prev => (prev + 1) % FALLBACK_SPOTLIGHTS.length);
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
          if (data) setCurrentUserProfile(data);
        });
      }
    });

    fetchCommunities();
    fetchSuggestedUsers();
    
    // Load local shouts or presets
    const savedShouts = localStorage.getItem('fidetv_live_shouts');
    if (savedShouts) {
      try {
        setShouts(JSON.parse(savedShouts));
      } catch (e) {
        setShouts(PRESET_SHOUTS);
      }
    } else {
      setShouts(PRESET_SHOUTS);
    }
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
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio, is_verified')
        .limit(10);
      
      if (data && data.length >= 3) {
        setSuggestedUsers(data);
      } else {
        // Fallback to fill layout gorgeously
        setSuggestedUsers(FALLBACK_SPOTLIGHTS.map(s => ({
          id: s.id,
          username: s.username,
          full_name: s.full_name,
          avatar_url: s.avatar_url,
          bio: s.bio,
          is_verified: s.is_verified
        })));
      }
    } catch (e) {
      setSuggestedUsers(FALLBACK_SPOTLIGHTS.map(s => ({
        id: s.id,
        username: s.username,
        full_name: s.full_name,
        avatar_url: s.avatar_url,
        bio: s.bio,
        is_verified: s.is_verified
      })));
    }
  };

  // Shout Submit Handler
  const handlePostShout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShoutContent.trim()) return;

    const username = currentUserProfile?.username || currentUser?.email?.split('@')[0] || 'anonymous_creator';
    const fullName = currentUserProfile?.full_name || 'Collective Creative';
    const avatarUrl = currentUserProfile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

    const newShout: Shout = {
      id: `shout-${Date.now()}`,
      username: username,
      full_name: fullName,
      avatar_url: avatarUrl,
      is_verified: currentUserProfile?.is_verified || false,
      role_badge: "⚡ Ambassador Node",
      content: newShoutContent.trim(),
      likes: 0,
      created_at: new Date().toISOString()
    };

    const updated = [newShout, ...shouts];
    setShouts(updated);
    localStorage.setItem('fidetv_live_shouts', JSON.stringify(updated));
    setNewShoutContent('');
  };

  // Shout Like handler
  const handleLikeShout = (shoutId: string) => {
    const updated = shouts.map(s => {
      if (s.id === shoutId) {
        const alreadyLiked = s.has_liked;
        return {
          ...s,
          likes: alreadyLiked ? s.likes - 1 : s.likes + 1,
          has_liked: !alreadyLiked
        };
      }
      return s;
    });
    setShouts(updated);
    localStorage.setItem('fidetv_live_shouts', JSON.stringify(updated));
  };

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setCreating(true);

    const { data: community, error } = await supabase
      .from('communities')
      .insert({
        name: newName,
        description: newDescription,
        image_url: newImageUrl
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
    } else if (community) {
      // Add creator as admin
      await supabase
        .from('community_members')
        .insert({
          community_id: community.id,
          user_id: currentUser.id,
          role: 'admin',
          status: 'approved'
        });
      
      setShowCreateModal(false);
      setNewName('');
      setNewDescription('');
      setNewImageUrl('');
      fetchCommunities();
    }
    setCreating(false);
  };

  // Search Logic
  const filteredCommunities = communities.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Suggested user filter based on dynamic tags
  const filteredSuggestedUsers = suggestedUsers.filter(u => {
    if (activeCategory === 'all') return true;
    
    const uname = u.username?.toLowerCase() || '';
    const bioText = u.bio?.toLowerCase() || '';
    
    if (activeCategory === 'broadcasters') {
      return uname.includes('broadcaster') || uname.includes('mary') || bioText.includes('anchor') || bioText.includes('journalist');
    }
    if (activeCategory === 'visual') {
      return uname.includes('cinematic') || uname.includes('jacob') || bioText.includes('cinematography') || bioText.includes('director');
    }
    if (activeCategory === 'strategists') {
      return uname.includes('sophia') || bioText.includes('producer') || bioText.includes('strategy') || bioText.includes('chief');
    }
    return true;
  });

  const spotlight = FALLBACK_SPOTLIGHTS[spotlightIndex];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 space-y-16">
      
      {/* Dynamic Masterclass Spotlight Carousel */}
      <div className="w-full relative rounded-[3rem] overflow-hidden bg-gradient-to-br from-surface to-background border border-border-custom p-8 sm:p-12 shadow-[0_30px_100px_rgba(0,0,0,0.4)]">
        {/* Glowing Background Orbs */}
        <div className="absolute top-1/2 -left-16 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute right-0 bottom-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Spotlight Meta Details */}
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2.5 px-4.5 py-2 bg-primary/10 border border-primary/25 rounded-full text-[9px] font-black uppercase text-primary tracking-[0.25em]">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>FideTV Creator Spotlight</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={spotlight.id}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.6 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3">
                  <h2 className="text-4xl sm:text-5xl font-display font-medium text-foreground tracking-tight">
                    {spotlight.full_name}
                  </h2>
                  <CheckCircle2 className="w-6 h-6 text-primary fill-primary/10" />
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest text-[#f5f5f5]/65">
                  <span className="px-3 py-1 bg-white/5 rounded-md border border-white/10">{spotlight.role}</span>
                  <span className="px-3 py-1 bg-white/5 rounded-md border border-white/10 text-primary">★ {spotlight.specialty}</span>
                </div>

                <p className="text-sm sm:text-base text-text-muted leading-relaxed font-light max-w-2xl">
                  "{spotlight.bio}"
                </p>

                {/* Micro Stats inside Spotlight */}
                <div className="pt-4 flex items-center gap-8">
                  <div>
                    <span className="block text-2xl font-bold text-foreground font-mono">{spotlight.followers.toLocaleString()}</span>
                    <span className="text-[10px] uppercase font-black tracking-wider text-text-muted">Global Connections</span>
                  </div>
                  <div className="h-8 w-px bg-border-custom" />
                  <div>
                    <span className="block text-2xl font-bold text-foreground font-mono">Verified Partner</span>
                    <span className="text-[10px] uppercase font-black tracking-wider text-text-muted">Broadcast Tier</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Quick Action Navigation Buttons */}
            <div className="pt-4 flex flex-wrap gap-4">
              <Link 
                to={`/profile/${spotlight.username}`}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-white hover:bg-white/95 text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-xl hover:scale-103 active:scale-97"
              >
                <span>Explore Channel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              
              <FollowButton targetUserId={spotlight.id} className="px-7 py-3.5" />
            </div>
          </div>

          {/* Visual Showcase Avatar Element with abstract orbital layout */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 shrink-0 flex items-center justify-center">
            {/* Ambient Rotational Background Rings */}
            <div className="absolute inset-0 border border-white/5 rounded-full animate-[spin_40s_linear_infinite]" />
            <div className="absolute inset-8 border border-dashed border-primary/20 rounded-full animate-[spin_20s_linear_infinite]" />
            <div className="absolute inset-16 border border-white/5 rounded-full" />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={spotlight.id}
                initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.8, rotate: 10 }}
                transition={{ duration: 0.6 }}
                className="relative z-10 w-44 h-44 sm:w-56 sm:h-56 rounded-full overflow-hidden border-2 border-primary/40 shadow-2xl p-1 bg-surface-bright"
              >
                <img 
                  src={spotlight.avatar_url} 
                  alt={spotlight.full_name} 
                  className="w-full h-full object-cover rounded-full select-none"
                />
              </motion.div>
            </AnimatePresence>
            
            {/* Auto-rotation Indicators */}
            <div className="absolute bottom-0 inset-x-0 flex justify-center gap-2 z-20">
              {FALLBACK_SPOTLIGHTS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSpotlightIndex(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    spotlightIndex === i ? "bg-primary w-6" : "bg-white/20"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="flex flex-col lg:flex-row gap-12">
        
        {/* Left Column: Sub-Communities & Connection Shoutbox */}
        <div className="flex-grow space-y-12">
          
          {/* Header Action Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h2 className="text-3xl font-display font-bold text-foreground">Explore Sub-Communities</h2>
              <p className="text-sm text-text-muted mt-1">Discover, create, and share specialized technical workflows</p>
            </div>

            {currentUser && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-[#111111] hover:bg-neutral-900 border border-white/10 text-white font-black uppercase tracking-wider text-[9px] rounded-xl flex items-center gap-2 transition-all hover:scale-103"
              >
                <Plus className="w-4 h-4 text-primary" />
                <span>Create New Community Hub</span>
              </button>
            )}
          </div>

          {/* Search bar inside Explore */}
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter specialized groups (e.g. Cinema Enthusiasts, Live Broadcasters)..."
              className="w-full bg-surface-bright border border-border-custom rounded-2xl pl-14 pr-6 py-4.5 text-sm placeholder-text-muted focus:outline-none focus:border-primary/20 transition-all shadow-inner"
            />
          </div>

          {/* Communities Content */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-surface rounded-3xl animate-pulse border border-border-custom" />
              ))}
            </div>
          ) : filteredCommunities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCommunities.map((c, idx) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(idx, 4) * 0.05 }}
                  viewport={{ once: true }}
                >
                  <Link to={`/community/${c.id}`} className="block h-full">
                    <div className="group h-full bg-surface-bright/40 rounded-3xl p-6 border border-border-custom hover:border-primary/20 transition-all duration-300 flex flex-col justify-between hover:shadow-xl hover:shadow-black/20">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="w-14 h-14 rounded-2xl border border-border-custom bg-surface overflow-hidden flex items-center justify-center shrink-0">
                            {c.image_url ? (
                              <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full text-[8px] font-black uppercase text-white/50 tracking-wider border border-white/5">
                            <Globe className="w-2.5 h-2.5 text-primary" />
                            <span>Public Hub</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{c.name}</h3>
                          <p className="text-xs text-text-muted leading-relaxed line-clamp-2 font-light">{c.description}</p>
                        </div>
                      </div>

                      <div className="pt-5 border-t border-border-custom/50 mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="flex -space-x-2">
                            {[1, 2].map(i => (
                              <div key={i} className="w-6 h-6 rounded-full border border-surface bg-surface-bright flex items-center justify-center text-[8px]">
                                <User className="w-3.5 h-3.5 text-white/40" />
                              </div>
                            ))}
                          </div>
                          <span className="text-[9px] font-black uppercase text-text-muted tracking-wider">Active Collective</span>
                        </div>

                        <div className="w-9 h-9 rounded-full bg-foreground/5 group-hover:bg-primary group-hover:text-white flex items-center justify-center text-foreground transition-all">
                          <ArrowRight className="w-4 h-4 group-hover:-rotate-45 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-surface rounded-3xl border border-border-custom">
              <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground">No matches found</h3>
              <p className="text-xs text-text-muted mt-1">Try resetting your search input or create a custom collective.</p>
            </div>
          )}

          {/* Social Connectivity Board: "Shoutbox" / "Creator Pulse" */}
          <div className="bg-surface rounded-[2.5rem] border border-border-custom p-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase text-primary tracking-widest block">Broadcast Shouts</span>
                <h3 className="text-2xl font-display font-medium text-foreground">Creator Pulse Notice Wall</h3>
              </div>
              <p className="text-xs text-text-muted max-w-sm">
                Share status milestones, request creative feedback, or tag partners live.
              </p>
            </div>

            {/* Post Shout Input Form */}
            {currentUser ? (
              <form onSubmit={handlePostShout} className="flex gap-4">
                <div className="w-10 h-10 rounded-full border border-border-custom bg-surface overflow-hidden shrink-0">
                  {currentUserProfile?.avatar_url ? (
                    <img src={currentUserProfile.avatar_url} alt="You" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xs uppercase">
                      UI
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="relative">
                    <input 
                      type="text"
                      maxLength={160}
                      value={newShoutContent}
                      onChange={(e) => setNewShoutContent(e.target.value)}
                      placeholder="Write a social shoutout tag... (max 160 chars)"
                      className="w-full bg-[#111111] pr-12 pl-5 py-3.5 rounded-xl border border-white/10 text-sm text-white focus:outline-none focus:border-primary/40 focus:bg-[#151515] transition-all"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-[#ffffff]/35 font-mono">
                      {newShoutContent.length}/160
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-text-muted">Posting on global bulletin</span>
                    <button
                      type="submit"
                      disabled={!newShoutContent.trim()}
                      className="px-5 py-2 bg-primary hover:scale-[1.03] active:scale-[0.97] transition-all rounded-lg text-white font-black text-[9px] uppercase tracking-widest flex items-center gap-2"
                    >
                      <span>Share Shout</span>
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="p-6 bg-white/5 rounded-2xl border border-white/5 text-center flex flex-col items-center justify-center gap-4">
                <p className="text-xs text-text-muted leading-relaxed font-light max-w-md">
                   You are currently viewing as guest. Connect your verified profile to pitch concepts, leaves notes, and engage with collaborators on the notice wall.
                </p>
                <Link
                  to="/auth"
                  className="px-6 py-2.5 bg-primary rounded-lg text-white font-black uppercase text-[9px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/10"
                >
                  Join Connection Wall
                </Link>
              </div>
            )}

            {/* Shouts Wall Index */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence initial={false}>
                {shouts.slice(0, 6).map((shout) => (
                  <motion.div
                    key={shout.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-5 rounded-2xl bg-surface-bright border border-border-custom relative hover:border-white/10 transition-colors flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full border border-border-custom overflow-hidden bg-surface shrink-0">
                          {shout.avatar_url ? (
                            <img src={shout.avatar_url} alt={shout.username} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-text-muted mx-auto my-auto" />
                          )}
                        </div>
                        
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-foreground truncate">{shout.full_name}</span>
                            {shout.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                          </div>
                          <span className="text-[9px] text-[#ffffff]/35 uppercase tracking-widest truncate">@{shout.username}</span>
                        </div>
                      </div>

                      <p className="text-xs text-foreground/80 leading-relaxed font-light italic">
                        "{shout.content}"
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-border-custom flex justify-between items-center">
                      <span className="text-[8px] text-text-muted font-mono uppercase">
                        {shout.role_badge || "⚡ Producer"}
                      </span>

                      <button
                        onClick={() => handleLikeShout(shout.id)}
                        className={cn(
                          "flex items-center gap-1 px-3 py-1 bg-white/5 hover:bg-white/10 rounded-full text-[9px] font-bold tracking-widest transition-colors",
                          shout.has_liked ? "text-primary bg-primary/10 border border-primary/20" : "text-white/40 border border-transparent"
                        )}
                      >
                        <Heart className={cn("w-3 h-3 transition-transform", shout.has_liked ? "fill-primary scale-120 animate-pulse text-primary" : "")} />
                        <span>{shout.likes}</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Sticky Sidebar Column */}
        <div className="w-full lg:w-80 space-y-8 shrink-0">
          
          {/* Trends panel */}
          <div className="glass rounded-[2rem] p-8 space-y-6">
            <h3 className="font-display font-bold text-foreground text-base flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>Collective Analytics</span>
            </h3>
            
            <div className="space-y-4">
              {[
                { tag: '#AfricaLiveBroadcasting', posts: '2.4K discussions' },
                { tag: '#EditMastersWeekly', posts: '1.2K logs' },
                { tag: '#MediaInfrastructure', posts: '840 topics' }
              ].map(item => (
                <div key={item.tag} className="group cursor-pointer">
                  <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{item.tag}</p>
                  <p className="text-[10px] text-text-muted uppercase font-black tracking-widest mt-0.5">{item.posts}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ad banner Slot */}
          <div className="py-2">
             <AdBanner placement="Community Sidebar" />
          </div>

          {/* Social Explorer Spotlights (Who To Follow) with professional filtration tabs */}
          <div className="glass rounded-[2rem] p-8 space-y-6">
            <div className="space-y-1">
              <h3 className="font-display font-bold text-foreground text-base flex items-center space-x-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Connect with Pioneers</span>
              </h3>
              <p className="text-[9px] uppercase font-black tracking-wider text-text-muted">Filtered Spotlight Directory</p>
            </div>

            {/* Categorization controls */}
            <div className="flex flex-wrap gap-1 p-0.5 bg-black/40 rounded-xl border border-white/5 shrink-0 select-none">
              {(['all', 'broadcasters', 'visual', 'strategists'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "flex-1 py-1 px-1.5 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all",
                    activeCategory === cat ? "bg-primary text-white shadow" : "text-white/40 hover:text-white"
                  )}
                >
                  {cat === 'all' ? 'All' : cat === 'broadcasters' ? 'Anchor' : cat === 'visual' ? 'Media' : 'Director'}
                </button>
              ))}
            </div>

            <div className="space-y-4 pt-2">
              {filteredSuggestedUsers.length > 0 ? (
                filteredSuggestedUsers.slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center justify-between group gap-3">
                    <Link to={`/profile/${u.username}`} className="flex items-center space-x-3 overflow-hidden min-w-0">
                      <div className="w-9 h-9 rounded-full bg-surface-bright flex items-center justify-center shrink-0 border border-border-custom overflow-hidden">
                        {u.avatar_url ? (
                           <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                        ) : (
                           <User className="w-4 h-4 text-text-muted" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">{u.full_name || u.username}</span>
                          {u.is_verified && <CheckCircle2 className="w-3 text-primary shrink-0" />}
                        </div>
                        <span className="text-[9px] text-text-muted uppercase tracking-widest truncate">@{u.username}</span>
                      </div>
                    </Link>
                    
                    <FollowButton targetUserId={u.id} className="scale-75 origin-right shrink-0" />
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-text-muted italic text-center">No pioneers matching category found.</p>
              )}
            </div>
          </div>

          {/* Invitation banner card */}
          <div className="p-8 bg-primary/10 border border-primary/20 rounded-[2rem] space-y-4">
             <div className="w-10 h-10 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center text-primary mb-6">
               <Award className="w-5 h-5" />
             </div>
             <h4 className="text-primary font-bold text-xs uppercase tracking-widest leading-none">Become a Partner</h4>
             <p className="text-[11px] text-text-muted leading-relaxed font-light">
               Approved Broadcasters get special verified badges, dedicated custom streaming links, and custom analytics widgets.
             </p>
             <Link to="/contact" className="inline-block pt-3 text-[9px] font-black text-white hover:text-primary uppercase tracking-[0.2em] transition-colors">
               Submit Proposal &rarr;
             </Link>
          </div>
        </div>

      </div>

      {/* Initialize Hub Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface border border-border-custom rounded-[2.5rem] p-8 sm:p-12 w-full max-w-xl shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
               
               <div className="relative z-10 space-y-8">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                       <h2 className="text-2xl font-display font-bold text-foreground">Launch a Hub</h2>
                       <p className="text-[9px] text-primary uppercase font-black tracking-widest">Architect a New Collective</p>
                    </div>
                    <button onClick={() => setShowCreateModal(false)} className="p-3 bg-background border border-border-custom rounded-full hover:bg-red-500 hover:text-white transition-all">
                       <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateCommunity} className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black tracking-widest text-foreground/40 ml-2">Hub Name</label>
                        <input 
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          required
                          placeholder="e.g. Cinema Enthusiasts"
                          className="w-full bg-background border border-border-custom rounded-xl p-4 text-xs text-foreground focus:border-primary/50 transition-colors shadow-inner outline-none"
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black tracking-widest text-foreground/40 ml-2">Description</label>
                        <textarea 
                          value={newDescription}
                          onChange={e => setNewDescription(e.target.value)}
                          required
                          placeholder="What is this collective about?"
                          className="w-full bg-background border border-border-custom rounded-xl p-4 text-xs text-foreground h-24 resize-none focus:border-primary/50 transition-colors shadow-inner outline-none"
                        />
                     </div>

                     <div className="space-y-2">
                        <label className="text-[9px] uppercase font-black tracking-widest text-foreground/40 ml-2">Thumbnail Graphic URL</label>
                        <input 
                          value={newImageUrl}
                          onChange={e => setNewImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full bg-background border border-border-custom rounded-xl p-4 text-xs text-foreground focus:border-primary/50 transition-colors shadow-inner outline-none"
                        />
                     </div>

                     <button 
                       disabled={creating}
                       className="w-full py-5 bg-primary text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-xl shadow-primary/20 hover:bg-primary/95 transition-all font-display disabled:opacity-50"
                     >
                       {creating ? 'Architecting...' : 'Deploy Collective Hub'}
                     </button>
                  </form>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
