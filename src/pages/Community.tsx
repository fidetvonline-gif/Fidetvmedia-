import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Community as CommunityType } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Users, ArrowRight, Plus, MessageSquare, TrendingUp, Globe, User, X, 
  Sparkles, Send, Heart, Award, CheckCircle2, ShieldCheck, Filter, MapPin,
  Trash2, Edit2, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import FollowButton from '@/components/FollowButton';
import AdBanner from '@/components/AdBanner';
import { safeLocalStorage } from '@/lib/storage';

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
  const [spotlitCreators, setSpotlitCreators] = useState<any[]>(FALLBACK_SPOTLIGHTS);
  
  // Live Connections Shoutbox State
  const [shouts, setShouts] = useState<Shout[]>([]);
  const [newShoutContent, setNewShoutContent] = useState('');
  const [editingShoutId, setEditingShoutId] = useState<string | null>(null);
  const [editingShoutContent, setEditingShoutContent] = useState('');
  
  // Create Hub Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [creating, setCreating] = useState(false);

  // Partner proposal modal state
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [submittingProposal, setSubmittingProposal] = useState(false);
  const [partnerForm, setPartnerForm] = useState({
    fullName: '',
    brandName: '',
    email: '',
    specialty: 'Broadcasting',
    streamUrl: '',
    reason: '',
    frequency: 'Weekly'
  });

  // Auto-rotating spotlight effect
  useEffect(() => {
    if (spotlitCreators.length === 0) return;
    const timer = setInterval(() => {
      setSpotlightIndex(prev => (prev + 1) % spotlitCreators.length);
    }, 9000);
    return () => clearInterval(timer);
  }, [spotlitCreators.length]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
          if (data) setCurrentUserProfile(data);
        });
        setPartnerForm(prev => ({
          ...prev,
          fullName: user.user_metadata?.full_name || user.user_metadata?.name || '',
          email: user.email || ''
        }));
      }
    });

    const fetchSpotlights = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('*')
        .eq('key', 'creator_spotlights')
        .maybeSingle();
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSpotlitCreators(parsed);
          }
        } catch (e) {
          console.error("Error setting spotlights from site settings:", e);
        }
      }
    };
    fetchSpotlights();

    fetchCommunities();
    fetchSuggestedUsers();
    
    // Load local shouts or presets
    const savedShouts = safeLocalStorage.getItem('fidetv_live_shouts');
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
    safeLocalStorage.setItem('fidetv_live_shouts', JSON.stringify(updated));
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
    safeLocalStorage.setItem('fidetv_live_shouts', JSON.stringify(updated));
  };

  const handleDeleteShout = (shoutId: string) => {
    if (!window.confirm("Are you sure you want to delete this notice wall post?")) return;
    const updated = shouts.filter(s => s.id !== shoutId);
    setShouts(updated);
    safeLocalStorage.setItem('fidetv_live_shouts', JSON.stringify(updated));
  };

  const handleStartEditShout = (shoutId: string, content: string) => {
    setEditingShoutId(shoutId);
    setEditingShoutContent(content);
  };

  const handleSaveEditShout = (shoutId: string) => {
    if (!editingShoutContent.trim()) return;
    const updated = shouts.map(s => {
      if (s.id === shoutId) {
        return { ...s, content: editingShoutContent.trim() };
      }
      return s;
    });
    setShouts(updated);
    safeLocalStorage.setItem('fidetv_live_shouts', JSON.stringify(updated));
    setEditingShoutId(null);
    setEditingShoutContent('');
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

  const spotlight = spotlitCreators[spotlightIndex] || FALLBACK_SPOTLIGHTS[0];

  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProposal(true);
    try {
      const compiledMessage = `Brand/Agency: ${partnerForm.brandName || 'N/A'}\nStream URL: ${partnerForm.streamUrl || 'N/A'}\nStreaming frequency: ${partnerForm.frequency || 'N/A'}\nReason to Join FideTV:\n${partnerForm.reason}`;
      const { error } = await supabase.from('bookings').insert({
        client_name: partnerForm.fullName,
        client_email: partnerForm.email,
        event_type: 'Partner Application',
        date: new Date().toISOString().split('T')[0],
        budget: partnerForm.specialty,
        message: compiledMessage,
        status: 'pending'
      });

      if (error) throw error;

      alert('Proposal submitted successfully! Our broadcast acquisition team will review and follow up within 48-72 business hours.');
      setPartnerForm({
        fullName: '',
        brandName: '',
        email: '',
        specialty: 'Broadcasting',
        streamUrl: '',
        reason: '',
        frequency: 'Weekly'
      });
      setShowPartnerModal(false);
    } catch (err: any) {
      console.error(err);
      alert('Error submitting proposal: ' + err.message);
    } finally {
      setSubmittingProposal(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      
      {/* Dynamic Masterclass Spotlight Carousel */}
      <div className="w-full relative rounded-3xl overflow-hidden bg-[#0c0c0c] border border-white/5 p-8 sm:p-12 shadow-[0_24px_60px_rgba(0,0,0,0.8)]">
        {/* Decorative Grid Mesh & Sporty Lights */}
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
        <div className="absolute top-1/2 -left-16 w-92 h-92 bg-primary/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute right-0 bottom-0 w-[450px] h-[450px] bg-[#e0650d]/5 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Slanted Sport Ticker Bar accent at bottom */}
        <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-[#e0650d] to-primary pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Spotlight Meta Details */}
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black uppercase text-primary tracking-widest">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>OFFICIAL BROADCAST PARTNER</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={spotlight.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-3xl sm:text-5xl font-display font-black text-white tracking-tight leading-none uppercase">
                    {spotlight.full_name}
                  </h2>
                  <div className="flex items-center gap-1 bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold tracking-wider shrink-0">
                    <ShieldCheck className="w-3 h-3 text-primary" />
                    <span>VERIFIED PRO</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-white/50">
                  <span className="px-2.5 py-1 bg-white/5 rounded-md border border-white/5">{spotlight.role}</span>
                  <span className="px-2.5 py-1 bg-[#e0650d]/10 text-[#e0650d] rounded-md border border-[#e0650d]/10">⚽ {spotlight.specialty} Spec</span>
                </div>

                <p className="text-sm sm:text-base text-white/70 leading-relaxed font-normal max-w-2xl bg-white/[0.02] border-l-2 border-primary p-4 rounded-r-xl">
                  "{spotlight.bio}"
                </p>

                {/* Micro Stats inside Spotlight */}
                <div className="pt-2 flex items-center gap-6 sm:gap-10">
                  <div>
                    <span className="block text-2xl font-black text-white font-mono tracking-tight">{spotlight.followers.toLocaleString()}</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">Loyal Listeners</span>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div>
                    <span className="block text-2xl font-black text-white font-mono tracking-tight">STADIUM TIER</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">Status Class</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Quick Action Navigation Buttons */}
            <div className="pt-2 flex flex-wrap gap-3">
              <Link 
                to={`/profile/${spotlight.username}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg hover:translate-y-[-2px]"
              >
                <span>View Broadcaster</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              
              <FollowButton targetUserId={spotlight.id} className="px-6 py-3 border border-white/10 hover:bg-white/5 rounded-xl font-bold uppercase tracking-widest text-[10px] text-white" />
            </div>
          </div>

          {/* Visual Showcase Avatar Element with abstract orbital layout */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 shrink-0 flex items-center justify-center">
            {/* Ambient Rotational Background Rings */}
            <div className="absolute inset-0 border border-white/5 rounded-full animate-[spin_50s_linear_infinite]" />
            <div className="absolute inset-6 border border-dashed border-primary/20 rounded-full animate-[spin_35s_linear_infinite]" />
            <div className="absolute inset-12 border border-white/5 rounded-full" />
            
            {/* Glowing Accent Ring */}
            <div className="absolute inset-2 bg-gradient-to-tr from-primary/10 to-[#e0650d]/10 rounded-full blur-xl pointer-events-none" />

            <AnimatePresence mode="wait">
              <motion.div
                key={spotlight.id}
                initial={{ opacity: 0, scale: 0.9, rotate: -3 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.9, rotate: 3 }}
                transition={{ duration: 0.4 }}
                className="relative z-10 w-44 h-44 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 border-primary/30 shadow-[0_0_50px_rgba(224,101,13,0.15)] bg-black/60 p-1"
              >
                <img 
                  src={spotlight.avatar_url} 
                  alt={spotlight.full_name} 
                  className="w-full h-full object-cover rounded-full select-none"
                />
              </motion.div>
            </AnimatePresence>
            
            {/* Auto-rotation Indicators */}
            <div className="absolute bottom-[-10px] inset-x-0 flex justify-center gap-1.5 z-20">
              {spotlitCreators.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSpotlightIndex(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300",
                    spotlightIndex === i ? "bg-primary w-5" : "bg-white/10 hover:bg-white/20"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* Left Column: Sub-Communities & Connection Shoutbox */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Header Action Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-black uppercase text-primary tracking-widest block">MATCHDAY CENTERS</span>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-white uppercase tracking-tight">Active Fan Hubs</h2>
              <p className="text-xs text-white/50 mt-1">Join passionate fan lounges, live commentary streams, and expert talk circles</p>
            </div>

            {currentUser && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold uppercase tracking-wider text-[10px] rounded-xl flex items-center gap-2 transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4 text-primary" />
                <span>Lobby Creative Group</span>
              </button>
            )}
          </div>

          {/* Search bar inside Explore with Sporty Border */}
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tournaments, leagues, teams or broadcasters (e.g. England vs Germany)..."
              className="w-full bg-[#0c0c0c] border border-white/5 focus:border-primary/20 rounded-2xl pl-12 pr-6 py-4 text-sm text-white placeholder-white/30 focus:outline-none transition-all shadow-2xl"
            />
          </div>

          {/* Communities Content */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-44 bg-[#0a0a0a] rounded-2xl animate-pulse border border-white/5" />
              ))}
            </div>
          ) : filteredCommunities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filteredCommunities.map((c, idx) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(idx, 4) * 0.05 }}
                  viewport={{ once: true }}
                >
                  <Link to={`/community/${c.id}`} className="block h-full">
                    <div className="group h-full bg-[#0d0d0d] rounded-2xl p-5 border border-white/5 hover:border-primary/20 transition-all duration-300 flex flex-col justify-between hover:shadow-[0_12px_24px_rgba(0,0,0,0.6)]">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-xl border border-white/5 bg-[#121212] overflow-hidden flex items-center justify-center shrink-0">
                            {c.image_url ? (
                              <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/15 text-primary border border-primary/20 rounded text-[9px] font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            <span>LIVE DISCUSSIONS</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-base font-bold text-white group-hover:text-primary transition-colors">{c.name}</h3>
                          <p className="text-xs text-white/50 leading-relaxed line-clamp-2 font-normal">{c.description || 'Global sport commentary space open for fan feedback & stats sharing.'}</p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 mt-4 flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/40">
                          🔥 {Math.floor(Math.random() * 120 + 15)} Fans Active
                        </span>

                        <span className="text-[9px] font-bold uppercase tracking-widest text-primary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>Enter Hub</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-[#0a0a0a] rounded-2xl border border-white/5">
              <MessageSquare className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white uppercase tracking-tight">No match lounges found</h3>
              <p className="text-xs text-white/50 mt-1">Try searching a different league name or set up a custom lobby now.</p>
            </div>
          )}

          {/* Social Connectivity Board: "Shoutbox" / "Creator Pulse" */}
          <div className="bg-[#0b0b0b] rounded-2xl border border-white/5 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary">REAL-TIME MEMBER NEWSFEED</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-display font-black text-white uppercase tracking-tight">Soccer Fan Noticeboard</h3>
              </div>
              <p className="text-xs text-white/40 max-w-sm sm:text-right">
                Post ticket info, soccer debates, play-by-plays or tag matches live.
              </p>
            </div>

            {/* Post Shout Input Form */}
            {currentUser ? (
              <form onSubmit={handlePostShout} className="flex gap-4 bg-[#0e0e0e] border border-white/5 p-4 rounded-xl">
                <div className="w-10 h-10 rounded-xl border border-white/5 bg-[#141414] overflow-hidden shrink-0">
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
                      placeholder="Comment on live matches, schedules, or share thoughts... (max 160)"
                      className="w-full bg-[#050505] pr-12 pl-4 py-3 rounded-xl border border-white/5 text-xs text-white focus:outline-none focus:border-primary/20 transition-all placeholder-white/20"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-white/40 font-mono">
                      {newShoutContent.length}/160
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono text-white/30 tracking-tight">Broadcasting on FideTV News ticker</span>
                    <button
                      type="submit"
                      disabled={!newShoutContent.trim()}
                      className="px-4 py-2 bg-primary hover:bg-primary/95 transition-all rounded-lg text-white font-black text-[9px] uppercase tracking-widest flex items-center gap-1.5"
                    >
                      <span>SEND BROADCAST</span>
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="p-6 bg-white/[0.02] rounded-xl border border-white/5 text-center flex flex-col items-center justify-center gap-3">
                <p className="text-xs text-white/50 leading-relaxed max-w-md font-light">
                  Join the football community! Log in to post streaming updates, debate teams, and heart other fans posts on the live noticeboard.
                </p>
                <Link
                  to="/auth"
                  className="px-5 py-2.5 bg-primary hover:bg-primary/95 rounded-lg text-white font-black uppercase text-[10px] tracking-widest transition-all shadow-md"
                >
                  Log In & Publish Shout
                </Link>
              </div>
            )}

            {/* Shouts Wall Index */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence initial={false}>
                {shouts.slice(0, 6).map((shout) => {
                  const isAdmin = currentUser?.email === 'fidetvonline@gmail.com';
                  const isShoutAuthor = currentUserProfile?.username === shout.username || shout.username === currentUser?.email?.split('@')[0];
                  const canManageShout = isAdmin || isShoutAuthor;
                  const isEditingThis = editingShoutId === shout.id;

                  return (
                    <motion.div
                      key={shout.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="p-5 rounded-xl bg-[#0d0d0d] border border-white/5 relative hover:border-white/10 transition-all flex flex-col justify-between group/shout"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg border border-white/5 overflow-hidden bg-[#161616] shrink-0">
                              {shout.avatar_url ? (
                                <img src={shout.avatar_url} alt={shout.username} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-white/30 mx-auto my-auto" />
                              )}
                            </div>
                            
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate">{shout.full_name}</span>
                                {shout.is_verified && <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />}
                              </div>
                              <span className="text-[9px] text-white/30 font-mono tracking-wider truncate">@{shout.username}</span>
                            </div>
                          </div>

                          {canManageShout && !isEditingThis && (
                            <div className="flex items-center gap-1 opacity-0 group-hover/shout:opacity-100 transition-opacity shrink-0">
                              <button 
                                onClick={() => handleStartEditShout(shout.id, shout.content)}
                                className="p-1 text-white/40 hover:text-primary transition-colors cursor-pointer"
                                title="Edit Shout"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteShout(shout.id)}
                                className="p-1 text-white/40 hover:text-red-500 transition-colors cursor-pointer"
                                title="Delete Shout"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {isEditingThis ? (
                          <div className="space-y-2 mt-2">
                            <textarea
                              value={editingShoutContent}
                              onChange={(e) => setEditingShoutContent(e.target.value)}
                              maxLength={160}
                              rows={2}
                              className="w-full bg-[#111111] p-3 text-xs text-white focus:outline-none focus:border-primary/20 rounded-xl transition-all"
                            />
                            <div className="flex justify-end gap-1.5">
                              <button 
                                onClick={() => setEditingShoutId(null)}
                                className="px-2.5 py-1 text-[8px] font-black uppercase tracking-wider text-white/40 hover:text-white cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={() => handleSaveEditShout(shout.id)}
                                className="px-3 py-1 bg-primary hover:bg-primary/95 text-white rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-2.5 h-2.5" />
                                <span>Save</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-white/80 leading-relaxed font-normal italic">
                            "{shout.content}"
                          </p>
                        )}
                      </div>

                      <div className="pt-3 mt-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[9px] text-[#e0650d] bg-[#e0650d]/5 border border-[#e0650d]/10 px-2 py-0.5 rounded font-mono font-bold">
                          {shout.role_badge || "⚡ FAN OPINION"}
                        </span>

                        <button
                          onClick={() => handleLikeShout(shout.id)}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-full text-[9px] font-bold tracking-wider transition-all",
                            shout.has_liked ? "text-primary bg-primary/10 border border-primary/25" : "text-white/40 border border-transparent"
                          )}
                        >
                          <Heart className={cn("w-3 h-3 transition-transform", shout.has_liked ? "fill-primary text-primary" : "")} />
                          <span>{shout.likes}</span>
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Sticky Sidebar Column */}
        <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-24">
          
          {/* Trends panel with Sporty elements */}
          <div className="bg-[#0b0b0b] rounded-2xl p-6 border border-white/5 space-y-5 shadow-xl">
            <h3 className="font-display font-black text-white text-sm uppercase tracking-wide flex items-center space-x-2 border-b border-white/5 pb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>STADIUM HOT TOPICS</span>
            </h3>
            
            <div className="space-y-4">
              {[
                { tag: '#WorldCupLiveFree', posts: '12.8K fans shouting' },
                { tag: '#GoldenBootRace2026', posts: '9.4K votes' },
                { tag: '#FideTvTacticsRoom', posts: '4.2K matches' },
                { tag: '#NoSubscriptionStreaming', posts: '3.1K streams' }
              ].map(item => (
                <div key={item.tag} className="group cursor-pointer p-2 rounded-lg hover:bg-white/[0.02] border border-transparent hover:border-white/5 transition-all">
                  <p className="text-xs font-bold text-white group-hover:text-primary transition-colors">{item.tag}</p>
                  <p className="text-[9px] font-mono text-white/30 uppercase mt-0.5">{item.posts}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ad banner Slot */}
          <div className="py-1">
             <AdBanner placement="Community Sidebar" />
          </div>

          {/* Social Explorer Spotlights (Who To Follow) with professional filtration tabs */}
          <div className="bg-[#0b0b0b] rounded-2xl p-6 border border-white/5 space-y-5 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-display font-black text-white text-sm uppercase tracking-wide flex items-center space-x-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Pioneer Pitch Users</span>
              </h3>
              <p className="text-[9px] uppercase font-bold tracking-widest text-[#e0650d]">Verified Broadcasters</p>
            </div>

            {/* Categorization controls */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-black rounded-lg border border-white/5 shrink-0 select-none">
              {(['all', 'broadcasters', 'visual', 'strategists'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "py-1 text-[8px] font-bold uppercase tracking-wider rounded transition-all truncate text-center",
                    activeCategory === cat ? "bg-primary text-white shadow-md font-black" : "text-white/40 hover:text-white"
                  )}
                >
                  {cat === 'all' ? 'All' : cat === 'broadcasters' ? 'Anchor' : cat === 'visual' ? 'Media' : 'Advisor'}
                </button>
              ))}
            </div>

            <div className="space-y-3.5 pt-1.5">
              {filteredSuggestedUsers.length > 0 ? (
                filteredSuggestedUsers.slice(0, 5).map(u => (
                  <div key={u.id} className="flex items-center justify-between group gap-3 border-b border-white/[0.02] pb-3 last:border-0 last:pb-0">
                    <Link to={`/profile/${u.username}`} className="flex items-center space-x-2.5 overflow-hidden min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#141414] flex items-center justify-center shrink-0 border border-white/5 overflow-hidden">
                        {u.avatar_url ? (
                           <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                        ) : (
                           <User className="w-4 h-4 text-white/30" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-white truncate group-hover:text-primary transition-colors">{u.full_name || u.username}</span>
                          {u.is_verified && <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />}
                        </div>
                        <span className="text-[9px] text-white/40 font-mono tracking-wider truncate">@{u.username}</span>
                      </div>
                    </Link>
                    
                    <FollowButton targetUserId={u.id} className="scale-75 origin-right shrink-0 py-1.5 px-3 uppercase text-[9px] tracking-widest bg-primary font-black text-white rounded-md" />
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-white/30 italic text-center">No pioneers matching category found.</p>
              )}
            </div>
          </div>

          {/* Invitation banner card */}
          <div className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl space-y-4">
             <div className="w-9 h-9 bg-primary/20 border border-primary/30 rounded-xl flex items-center justify-center text-primary">
               <Award className="w-5 h-5 text-primary" />
             </div>
             <div className="space-y-1">
               <h4 className="text-primary font-black text-xs uppercase tracking-wider">Become a Sport Partner</h4>
               <p className="text-[11px] text-white/60 leading-relaxed font-light">
                 Approved premium sports broadcast entities receive priority channels, full analytics grids, and verification locks.
               </p>
             </div>
             <button 
               onClick={() => {
                 if (!currentUser) {
                   if (confirm("You must be logged in to submit a partnership proposal. Click OK to connect your account.")) {
                     window.location.href = "/auth?redirect=/partner";
                   }
                 } else {
                   setShowPartnerModal(true);
                 }
               }} 
               className="inline-flex items-center gap-1.5 text-[9px] font-black text-white hover:text-primary uppercase tracking-widest transition-colors cursor-pointer text-left"
             >
               <span>Launch Proposal</span>
               <ArrowRight className="w-3.5 h-3.5" />
             </button>
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

      {/* Become a Partner Proposal Modal */}
      <AnimatePresence>
        {showPartnerModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md"
            onClick={() => setShowPartnerModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface border border-border-custom rounded-[2.5rem] p-8 sm:p-12 w-full max-w-2xl shadow-[0_0_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden text-left"
              onClick={e => e.stopPropagation()}
            >
               {/* Ambient radial blur graphic */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32" />
               
               <div className="relative z-10 space-y-8 max-h-[85vh] overflow-y-auto pr-1">
                  <div className="flex justify-between items-center">
                    <div className="space-y-1">
                       <h2 className="text-2xl font-display font-bold text-foreground">Become a Partner</h2>
                       <p className="text-[9px] text-primary uppercase font-black tracking-widest">Submit Broadcast Network Proposal</p>
                    </div>
                    <button onClick={() => setShowPartnerModal(false)} className="p-3 bg-background border border-border-custom rounded-full hover:bg-red-500 hover:text-white transition-all">
                       <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitProposal} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black tracking-widest text-foreground/40 ml-2">Full Name</label>
                        <input 
                          value={partnerForm.fullName}
                          onChange={e => setPartnerForm(prev => ({ ...prev, fullName: e.target.value }))}
                          required
                          placeholder="e.g. Fidelis Oruche"
                          className="w-full bg-background border border-border-custom rounded-xl p-4 text-xs text-foreground focus:border-primary/50 transition-colors shadow-inner outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black tracking-widest text-foreground/40 ml-2">Email Address</label>
                        <input 
                          type="email"
                          value={partnerForm.email}
                          onChange={e => setPartnerForm(prev => ({ ...prev, email: e.target.value }))}
                          required
                          placeholder="e.g. fidelis@fidetv.com"
                          className="w-full bg-background border border-border-custom rounded-xl p-4 text-xs text-foreground focus:border-primary/50 transition-colors shadow-inner outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black tracking-widest text-foreground/40 ml-2">Brand or Agency Name</label>
                        <input 
                          value={partnerForm.brandName}
                          onChange={e => setPartnerForm(prev => ({ ...prev, brandName: e.target.value }))}
                          placeholder="e.g. Fide Broadcasts Ltd"
                          className="w-full bg-background border border-border-custom rounded-xl p-4 text-xs text-foreground focus:border-primary/50 transition-colors shadow-inner outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black tracking-widest text-foreground/40 ml-2">Streaming Specialty Genre</label>
                        <select 
                          value={partnerForm.specialty}
                          onChange={e => setPartnerForm(prev => ({ ...prev, specialty: e.target.value }))}
                          className="w-full bg-background border border-border-custom rounded-xl p-4 text-xs text-foreground focus:border-primary/50 transition-colors shadow-inner outline-none"
                        >
                          <option value="Broadcasting">News & Broadcasting</option>
                          <option value="Sports">Sports Broadcasting</option>
                          <option value="Visual Production">Visual & Cinematic Arts</option>
                          <option value="Strategy">Strategy & Podcasting</option>
                          <option value="Community Media">Local Community Broadcast</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black tracking-widest text-foreground/40 ml-2">Expected Frequency</label>
                        <select 
                          value={partnerForm.frequency}
                          onChange={e => setPartnerForm(prev => ({ ...prev, frequency: e.target.value }))}
                          className="w-full bg-background border border-border-custom rounded-xl p-4 text-xs text-foreground focus:border-primary/50 transition-colors shadow-inner outline-none"
                        >
                          <option value="Daily">Daily Broadcasts</option>
                          <option value="Weekly">Weekly Broadcasts</option>
                          <option value="Bi-weekly">Bi-weekly Events</option>
                          <option value="Monthly">Monthly Live Forums</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black tracking-widest text-foreground/40 ml-2">Twitch/YouTube Channel URL</label>
                        <input 
                          value={partnerForm.streamUrl}
                          onChange={e => setPartnerForm(prev => ({ ...prev, streamUrl: e.target.value }))}
                          placeholder="https://youtube.com/c/..."
                          className="w-full bg-background border border-border-custom rounded-xl p-4 text-xs text-foreground focus:border-primary/50 transition-colors shadow-inner outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] uppercase font-black tracking-widest text-foreground/40 ml-2">Proposal Details & Alignment Statement</label>
                      <textarea 
                        value={partnerForm.reason}
                        onChange={e => setPartnerForm(prev => ({ ...prev, reason: e.target.value }))}
                        required
                        placeholder="Tell us about your streaming plans, production camera workflows, why you would love to partner with FideTV..."
                        className="w-full bg-background border border-border-custom rounded-xl p-4 text-xs text-foreground h-28 resize-none focus:border-primary/50 transition-colors shadow-inner outline-none text-left"
                      />
                    </div>

                    <button 
                      disabled={submittingProposal}
                      className="w-full py-5 bg-primary text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-xl shadow-primary/20 hover:bg-primary/95 transition-all font-display disabled:opacity-50 mt-2"
                    >
                      {submittingProposal ? 'Architecting Application Connection...' : 'Acquire Partnership Review'}
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
