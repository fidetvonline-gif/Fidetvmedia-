import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Event, Community, News, Booking, Profile, PortfolioItem, TvChannel, Service } from '@/types';
import { 
  LayoutDashboard, Radio, MessageSquare, Users, Settings, Plus, 
  Edit2, Trash2, Globe, Youtube, ToggleLeft, ToggleRight, 
  Sparkles, Camera, Eye, Newspaper, BookOpen, Clock, CheckCircle2, XCircle,
  ShieldCheck, ShieldAlert, Award, Headset, Briefcase, Tv, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import { fetchYouTubeStats, YouTubeStats } from '@/services/youtubeService';
import { DEFAULT_CHANNELS } from '@/constants/channels';

type AdminTab = 'overview' | 'events' | 'news' | 'communities' | 'bookings' | 'users' | 'support' | 'portfolio' | 'channels' | 'services';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [events, setEvents] = useState<Event[]>([]);
  const [channels, setChannels] = useState<TvChannel[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const [communityStats, setCommunityStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ytStats, setYtStats] = useState<Record<string, YouTubeStats>>({});
  
  // SHARED Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // EVENT Form State
  const [youtubeId, setYoutubeId] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [startTime, setStartTime] = useState('');
  const [status, setStatus] = useState<'live' | 'upcoming' | 'offline'>('upcoming');

  // PORTFOLIO Form State
  const [category, setCategory] = useState('Featured');
  const [isFeatured, setIsFeatured] = useState(true);
  const [features, setFeatures] = useState<string[]>([]);
  const [icon, setIcon] = useState('Video');
  const [price, setPrice] = useState('');

  // NEWS / BLOG Form State
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [blogCategory, setBlogCategory] = useState('News');
  const [blogTags, setBlogTags] = useState<string[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [newsGallery, setNewsGallery] = useState<string[]>([]);

  // UTILS
  const [uploading, setUploading] = useState(false);
  const [certUrl, setCertUrl] = useState('');
  const [smedanUrl, setSmedanUrl] = useState('');
  const [certUploading, setCertUploading] = useState(false);
  const [smedanUploading, setSmedanUploading] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchData();
    fetchCertificates();
  }, [activeTab]);

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchBookings();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        fetchSupportChats();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchProfiles();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        fetchEvents();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    if (activeTab === 'overview') {
      await Promise.all([
        fetchEvents(),
        fetchNews(),
        fetchCommunities(),
        fetchProfiles(),
        fetchBookings(),
        fetchSupportChats(),
        fetchCommunityStats(),
        fetchPortfolio(),
        fetchChannels(),
        fetchServices()
      ]);
    }
    if (activeTab === 'events') await fetchEvents();
    if (activeTab === 'news') await fetchNews();
    if (activeTab === 'communities') await fetchCommunities();
    if (activeTab === 'bookings') await fetchBookings();
    if (activeTab === 'users') await fetchProfiles();
    if (activeTab === 'support') await fetchSupportChats();
    if (activeTab === 'portfolio') await fetchPortfolio();
    if (activeTab === 'channels') await fetchChannels();
    if (activeTab === 'services') await fetchServices();
    setLoading(false);
  };

  const fetchServices = async () => {
    const { data } = await supabase.from('services').select('*').order('order_index');
    if (data) setServices(data);
  };

  const fetchChannels = async () => {
    const { data } = await supabase.from('tv_channels').select('*').order('order_index');
    if (data) setChannels(data);
  };

  const fetchPortfolio = async () => {
    const { data } = await supabase.from('portfolio_items').select('*').order('created_at', { ascending: false });
    if (data) setPortfolio(data);
  };

  const fetchSupportChats = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .like('post_id', 'support_%')
      .order('created_at', { ascending: false });
    
    if (data) {
      const chats = data.reduce((acc: any, msg: any) => {
        const userId = msg.post_id.replace('support_', '');
        if (!acc[userId]) acc[userId] = [];
        acc[userId].push(msg);
        return acc;
      }, {});
      setSupportChats(Object.entries(chats).map(([userId, messages]: [string, any]) => {
        const userMsgs = (messages as any[]).sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        return {
          userId,
          messages: userMsgs,
          lastMessage: userMsgs[userMsgs.length - 1]
        };
      }).sort((a,b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()));
    }
  };

  const handleAdminReply = async (userId: string) => {
    if (!adminReply.trim()) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('comments').insert({
      post_id: `support_${userId}`,
      author_id: session.user.id,
      content: adminReply,
    });

    if (!error) {
      setAdminReply('');
      fetchSupportChats();
    }
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setProfiles(data);
  };

  const fetchCommunityStats = async () => {
    const { data: counts } = await supabase
      .from('community_members')
      .select('community_id');
    
    if (counts) {
      const stats = counts.reduce((acc: any, curr: any) => {
        acc[curr.community_id] = (acc[curr.community_id] || 0) + 1;
        return acc;
      }, {});
      setCommunityStats(stats);
    }
  };

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email === 'fidetvonline@gmail.com') {
      setIsAdmin(true);
    }
  };

  const fetchCertificates = async () => {
    const cac = supabase.storage.from('event-thumbnails').getPublicUrl('cac_certificate').data.publicUrl;
    const smedan = supabase.storage.from('event-thumbnails').getPublicUrl('smedan_certificate').data.publicUrl;
    
    const [cacRes, smedanRes] = await Promise.all([
      fetch(cac, { method: 'HEAD' }),
      fetch(smedan, { method: 'HEAD' })
    ]);

    if (cacRes.ok) setCertUrl(cac + '?t=' + Date.now());
    if (smedanRes.ok) setSmedanUrl(smedan + '?t=' + Date.now());
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, bucket: string, path: string, callback: (url: string) => void) => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const file = e.target.files[0];
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (!error) {
       const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
       callback(url + '?t=' + Date.now());
    }
    setUploading(false);
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
    if (data) {
      setEvents(data);
      data.forEach(ev => ev.youtube_id && updateYouTubeStats(ev.youtube_id));
    }
  };

  const fetchNews = async () => {
    const { data } = await supabase.from('news').select('*, profiles(username)').order('created_at', { ascending: false });
    if (data) setNews(data as any);
  };

  const fetchCommunities = async () => {
    const { data } = await supabase.from('communities').select('*').order('name');
    if (data) setCommunities(data);
  };

  const fetchBookings = async () => {
    const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
    if (data) setBookings(data);
  };

  const updateYouTubeStats = async (id: string) => {
    const stats = await fetchYouTubeStats(id);
    if (stats) setYtStats(prev => ({ ...prev, [id]: stats }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    let payload: any = {};
    let table = '';

    if (activeTab === 'events') {
      table = 'events';
      payload = { title, description, youtube_id: youtubeId, stream_url: streamUrl, thumbnail_url: imageUrl, start_time: startTime, status };
    } else if (activeTab === 'news') {
      table = 'news';
      payload = { 
        title, 
        slug, 
        excerpt,
        description, 
        content, 
        category: blogCategory,
        tags: blogTags,
        image_url: imageUrl, 
        image_urls: newsGallery, 
        is_published: isPublished, 
        author_id: session.user.id 
      };
    } else if (activeTab === 'communities') {
      table = 'communities';
      payload = { name: title, description, image_url: imageUrl };
    } else if (activeTab === 'portfolio') {
      table = 'portfolio_items';
      payload = { title, description, image_url: imageUrl, category, is_featured: isFeatured, youtube_id: youtubeId, video_url: streamUrl };
    } else if (activeTab === 'channels') {
      table = 'tv_channels';
      payload = { name: title, category, description, url: streamUrl, thumbnail: imageUrl, is_active: status === 'live' };
    } else if (activeTab === 'services') {
      table = 'services';
      payload = { title, description, icon, features, price, order_index: portfolio.length };
    }

    if (!table) return;

    const query = editingId 
      ? supabase.from(table).update(payload).eq('id', editingId)
      : supabase.from(table).insert(payload);

    const { error } = await query;
    if (!error) {
      setIsEditing(false);
      resetForm();
      fetchData();
    } else {
      alert(error.message);
    }
  };

  const handleDelete = async (table: string, id: string) => {
    if (!window.confirm("Delete this item?")) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) fetchData();
  };

  const handleVerification = async (userId: string, approve: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        is_verified: approve,
        verification_requested: false 
      })
      .eq('id', userId);
    
    if (!error) {
      fetchProfiles();
    } else {
      alert(error.message);
    }
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setExcerpt(''); setContent(''); setImageUrl(''); setYoutubeId('');
    setStreamUrl(''); setStartTime(''); setStatus('upcoming');
    setSlug(''); setBlogCategory('News'); setBlogTags([]); setIsPublished(false); setNewsGallery([]); setEditingId(null);
    setCategory('Featured'); setIsFeatured(true);
    setFeatures([]); setIcon('Video'); setPrice('');
  };

  const generateWithAI = async () => {
    if (!title) return;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Write a compelling description (max 300 chars) for: "${title}". Type: ${activeTab}. Make it professional.`;
      const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
      setDescription(response.text || "");
    } catch (err) { alert("AI generation failed."); }
  };

  if (!isAdmin) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center bg-background">
      <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-8 border border-red-500/20">
        <Settings className="w-10 h-10 text-red-500" />
      </div>
      <h2 className="text-3xl font-display font-bold text-white mb-4">Access Restricted</h2>
      <p className="text-gray-500 max-w-sm mb-10">Only authorized administrators can access the FideTV Dashboard.</p>
      <button onClick={() => window.location.href = '/'} className="px-8 py-4 glass rounded-full text-xs font-bold uppercase tracking-widest text-white hover:bg-white/5 transition-all">
        Go Back Home
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-32">
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div className="space-y-2">
             <h1 className="text-4xl font-display font-bold text-white tracking-tighter">Admin <span className="text-gray-600">Studio.</span></h1>
             <p className="text-gray-500 font-medium tracking-wide">Command center for FideTV Media content and community.</p>
          </div>
          <button 
            onClick={() => { resetForm(); setIsEditing(true); }}
            className="px-8 py-4 bg-primary text-white font-bold rounded-2xl flex items-center space-x-3 shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span className="uppercase tracking-widest text-xs">
              Create {activeTab === 'events' ? 'Event' : activeTab === 'communities' ? 'Community' : activeTab === 'news' ? 'Article' : activeTab === 'portfolio' ? 'Portfolio Item' : activeTab === 'channels' ? 'TV Channel' : activeTab}
            </span>
          </button>
       </div>

       {/* Tabs Navigation */}
       <div className="flex flex-wrap gap-4 mb-12">
          {[
            { id: 'overview', name: 'Overview', icon: LayoutDashboard },
            { id: 'channels', name: 'TV Channels', icon: Tv },
            { id: 'services', name: 'Services', icon: Zap },
            { id: 'portfolio', name: 'Portfolio & Shows', icon: Briefcase },
            { id: 'events', name: 'Events', icon: Radio },
            { id: 'news', name: 'Blog Studio', icon: Newspaper },
            { id: 'communities', name: 'Communities', icon: Users },
            { id: 'users', name: 'Users', icon: ShieldCheck },
            { id: 'bookings', name: 'Bookings', icon: BookOpen },
            { id: 'support', name: 'Support', icon: MessageSquare }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={cn(
                "px-8 py-4 rounded-2xl flex items-center space-x-3 font-bold text-xs uppercase tracking-widest transition-all border",
                activeTab === tab.id 
                  ? "bg-white/5 border-primary text-white shadow-xl shadow-primary/5" 
                  : "bg-surface border-white/5 text-gray-500 hover:text-white hover:border-white/10"
              )}
            >
              <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-primary" : "text-gray-600")} />
              <span>{tab.name}</span>
            </button>
          ))}
       </div>

       {/* Content Rendering */}
       <div className="space-y-12">
          {activeTab === 'support' && (
            <div className="flex gap-8 h-[600px]">
              {/* Chat Sidebar */}
              <div className="w-80 glass rounded-[2.5rem] border-white/5 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/10 bg-surface-bright/50">
                  <h3 className="text-xs font-black uppercase tracking-widest text-primary">Support Inbox</h3>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar">
                  {supportChats.length > 0 ? (
                    supportChats.map(chat => (
                      <button 
                        key={chat.userId}
                        onClick={() => setSelectedChat(chat.userId)}
                        className={cn(
                          "w-full p-6 text-left border-b border-white/5 transition-all hover:bg-white/5",
                          selectedChat === chat.userId ? "bg-white/5" : ""
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <img 
                            src={chat.lastMessage.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.userId}`} 
                            className="w-10 h-10 rounded-full border border-white/10" 
                          />
                          <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <p className="font-bold text-white text-sm truncate">{chat.lastMessage.profiles?.username || 'User'}</p>
                              <span className="text-[8px] text-gray-600 uppercase font-bold">{format(new Date(chat.lastMessage.created_at), 'MMM dd')}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 truncate">{chat.lastMessage.content}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-600 text-xs italic">No support chats yet.</div>
                  )}
                </div>
              </div>

              {/* Chat Window */}
              <div className="flex-grow glass rounded-[2.5rem] border-white/5 overflow-hidden flex flex-col">
                {selectedChat ? (
                  <>
                    <div className="p-6 border-b border-white/10 bg-surface-bright/50 flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20">
                        <MessageSquare className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest leading-none">Support Conversation</h3>
                        <p className="text-[10px] text-gray-500 font-medium tracking-tight mt-1">User ID: {selectedChat}</p>
                      </div>
                    </div>
                    <div className="flex-grow overflow-y-auto p-8 space-y-6 custom-scrollbar">
                      {supportChats.find(c => c.userId === selectedChat)?.messages.map((msg: any) => (
                        <div key={msg.id} className={cn(
                          "flex flex-col space-y-2",
                          msg.author_id === selectedChat ? "items-start" : "items-end"
                        )}>
                          <div className={cn(
                            "max-w-[80%] px-5 py-3 rounded-2xl text-sm leading-relaxed",
                            msg.author_id === selectedChat 
                              ? "bg-surface-bright text-gray-200 rounded-tl-none border border-white/5"
                              : "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10" 
                          )}>
                            {msg.content}
                          </div>
                          <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest px-1">
                            {format(new Date(msg.created_at), 'HH:mm')} • {msg.author_id === selectedChat ? 'Client' : 'Admin'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="p-6 bg-surface-bright/50 border-t border-white/10">
                      <div className="relative">
                        <textarea
                          value={adminReply}
                          onChange={(e) => setAdminReply(e.target.value)}
                          placeholder="Type your reply as support..."
                          className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-white focus:border-primary/50 transition-colors min-h-[80px] resize-none pr-20"
                        />
                        <button
                          onClick={() => handleAdminReply(selectedChat)}
                          disabled={!adminReply.trim()}
                          className="absolute bottom-4 right-4 px-6 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                        >
                          Send Reply
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6">
                    <Headset className="w-16 h-16 text-gray-800" />
                    <div className="space-y-2">
                       <h3 className="text-xl font-display font-medium text-gray-500">No Chat Selected</h3>
                       <p className="text-xs text-gray-600 max-w-xs mx-auto">Select a user from the sidebar to view the support conversation and provide assistance.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-12">
              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Active Streams', value: events.filter(e => e.status === 'live').length, icon: Radio },
                  { label: 'Total Users', value: profiles.length, icon: ShieldCheck },
                  { label: 'Communities', value: communities.length, icon: Users },
                  { label: 'Pending Bookings', value: bookings.filter(b => b.status === 'pending').length, icon: BookOpen },
                ].map((stat, i) => (
                  <div key={i} className="glass p-6 rounded-3xl border-white/5">
                      <div className="flex justify-between items-start mb-4">
                        <stat.icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-3xl font-display font-bold text-white tracking-tighter">{stat.value}</h3>
                      <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-6">
                      <h2 className="text-xl font-display font-bold text-white flex items-center gap-3">
                         <Users className="w-5 h-5 text-primary" />
                         Community Sizes
                      </h2>
                      <div className="space-y-4">
                         {communities.map(c => (
                           <div key={c.id} className="flex items-center justify-between p-4 bg-white/2 rounded-2xl border border-white/5">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-surface-bright rounded-xl flex items-center justify-center border border-white/5">
                                    {c.image_url ? <img src={c.image_url} className="w-full h-full object-cover rounded-xl" /> : <Users className="w-5 h-5" />}
                                 </div>
                                 <span className="font-bold text-white text-sm">{c.name}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                 <span className="text-xl font-display font-bold text-white">{communityStats[c.id] || 0}</span>
                                 <span className="text-[8px] uppercase font-black text-gray-500 tracking-widest">Members</span>
                              </div>
                           </div>
                         ))}
                      </div>
                  </div>

                  <div className="glass p-8 rounded-[2.5rem] border-white/5 space-y-6">
                      <h2 className="text-xl font-display font-bold text-white flex items-center gap-3">
                         <ShieldAlert className="w-5 h-5 text-yellow-500" />
                         Verification Requests
                      </h2>
                      <div className="space-y-4">
                         {profiles.filter(p => p.verification_requested && !p.is_verified).slice(0, 5).map(p => (
                           <div key={p.id} className="flex items-center justify-between p-4 bg-white/2 rounded-2xl border border-white/5 uppercase tracking-widest text-[10px]">
                              <div className="flex items-center gap-4">
                                 <img src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`} className="w-8 h-8 rounded-full border border-white/10" />
                                 <div className="flex flex-col">
                                    <span className="font-black text-white">{p.username}</span>
                                    <span className="text-gray-500">{p.full_name}</span>
                                 </div>
                              </div>
                              <button onClick={() => setActiveTab('users')} className="text-primary font-black hover:text-white transition-colors">Handle</button>
                           </div>
                         ))}
                         {profiles.filter(p => p.verification_requested && !p.is_verified).length === 0 && (
                           <div className="p-8 text-center bg-white/2 rounded-2xl border border-dashed border-white/10">
                              <p className="text-xs text-gray-500 font-bold tracking-widest">NO PENDING REQUESTS</p>
                           </div>
                         )}
                      </div>
                  </div>
              </div>

              {/* Business Verification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <h2 className="text-xl font-display font-bold text-white px-2">CAC Registration</h2>
                    <div className="glass p-8 rounded-[2.5rem] border-white/5 flex flex-col gap-6">
                      <p className="text-sm text-gray-400">FIDE TV MEDIA Registration (BN - 3647744)</p>
                      <div className="flex items-center gap-4">
                          {certUrl && (
                            <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-white/10 group shrink-0">
                              <img src={certUrl} alt="CAC" className="w-full h-full object-cover" />
                              <a href={certUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-[10px] font-bold uppercase tracking-wider">View</span>
                              </a>
                            </div>
                          )}
                          <label className={cn(
                            "flex-1 px-6 py-4 glass text-white font-bold text-xs uppercase tracking-widest rounded-2xl cursor-pointer hover:bg-white/5 transition-colors border border-white/10 flex items-center justify-center space-x-2",
                            certUploading && "opacity-50 cursor-wait"
                          )}>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'event-thumbnails', 'cac_certificate', setCertUrl)} />
                            <Plus className="w-4 h-4 text-primary" />
                            <span>{certUrl ? 'Update CAC' : 'Upload CAC'}</span>
                          </label>
                      </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-xl font-display font-bold text-white px-2">SMEDAN Certificate</h2>
                    <div className="glass p-8 rounded-[2.5rem] border-white/5 flex flex-col gap-6">
                      <p className="text-sm text-gray-400">Official business verification from SMEDAN (SUIN28515358).</p>
                      <div className="flex items-center gap-4">
                          {smedanUrl && (
                            <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-white/10 group shrink-0">
                              <img src={smedanUrl} alt="SMEDAN" className="w-full h-full object-cover" />
                              <a href={smedanUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-[10px] font-bold uppercase tracking-wider">View</span>
                              </a>
                            </div>
                          )}
                          <label className={cn(
                            "flex-1 px-6 py-4 glass text-white font-bold text-xs uppercase tracking-widest rounded-2xl cursor-pointer hover:bg-white/5 transition-colors border border-white/10 flex items-center justify-center space-x-2",
                            smedanUploading && "opacity-50 cursor-wait"
                          )}>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'event-thumbnails', 'smedan_certificate', setSmedanUrl)} />
                            <Plus className="w-4 h-4 text-primary" />
                            <span>{smedanUrl ? 'Update SMEDAN' : 'Upload SMEDAN'}</span>
                          </label>
                      </div>
                    </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'channels' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Database Channels */}
                {channels.map(channel => (
                  <div key={channel.id} className="glass rounded-[2rem] p-6 space-y-4 group border-white/5 hover:border-white/10 transition-all">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-bright">
                       {channel.thumbnail && <img src={channel.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                       <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase text-white tracking-widest border border-white/10">
                          {channel.category}
                       </div>
                       {channel.is_active && (
                         <div className="absolute top-4 right-4 bg-red-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase text-white tracking-widest border border-red-500/50">
                            LIVE
                         </div>
                       )}
                    </div>
                    <div className="space-y-1">
                       <h3 className="text-white font-bold group-hover:text-primary transition-colors">{channel.name}</h3>
                       <p className="text-[10px] text-gray-500 line-clamp-2">{channel.description}</p>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-white/5">
                       <div className="flex items-center gap-2">
                          <Tv className="w-3 h-3 text-gray-600" />
                          <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">#{channel.order_index}</span>
                       </div>
                       <div className="flex space-x-2">
                          <button onClick={() => { 
                            setEditingId(channel.id); setTitle(channel.name); setCategory(channel.category); setDescription(channel.description || ''); setImageUrl(channel.thumbnail || ''); setStreamUrl(channel.url); setStatus(channel.is_active ? 'live' : 'offline'); 
                            setIsEditing(true); 
                          }} className="p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete('tv_channels', channel.id)} className="p-2 text-gray-500 hover:text-red-500 transition-colors bg-white/5 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </div>
                  </div>
                ))}
                
                {channels.length === 0 && !loading && (
                  <div className="col-span-full py-20 text-center glass rounded-[2.5rem] border-white/5 border-dashed">
                     <div className="w-20 h-20 bg-surface-bright rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                        <Tv className="w-10 h-10 text-gray-700" />
                     </div>
                     <h3 className="text-xl font-display font-bold text-white mb-2">No TV Channels Found</h3>
                     <p className="text-gray-500 max-w-sm mx-auto mb-8">You haven't added any channels to your broadcast network yet.</p>
                     {DEFAULT_CHANNELS.length > 0 && (
                       <button 
                         onClick={async () => {
                           if (confirm('Import default system channels to database?')) {
                             for (const ch of DEFAULT_CHANNELS) {
                               await supabase.from('tv_channels').insert({
                                 name: ch.name,
                                 category: ch.category,
                                 url: ch.url,
                                 thumbnail: ch.thumbnail,
                                 description: ch.description,
                                 is_active: true,
                                 icon: 'Tv'
                               });
                             }
                             fetchChannels();
                           }
                         }}
                         className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold uppercase tracking-widest text-primary border border-primary/20 transition-all"
                       >
                         Seed Default Channels
                       </button>
                     )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div className="space-y-8">
              <div className="flex justify-end">
                <button 
                  onClick={async () => {
                    if (confirm('Import current default services to database?')) {
                      const defaultServices = [
                        {
                          title: 'Video Production',
                          icon: 'Video',
                          description: 'From concept to final cut, we create cinematic video content that tells your story with power and precision.',
                          features: ['4K Cinematography', 'Professional Editing', 'Motion Graphics', 'Sound Design'],
                          price: 'Starting at ₦1,500,000'
                        },
                        {
                          title: 'Live Streaming',
                          icon: 'Radio',
                          description: 'Ultra-low latency, multi-camera broadcasting for concerts, conferences, and virtual events.',
                          features: ['Multi-platform Stream', 'Live Tech Support', 'Interaction Tools', 'HD Quality'],
                          price: 'Starting at ₦2,000,000'
                        },
                        {
                          title: 'Event Coverage',
                          icon: 'Camera',
                          description: 'Comprehensive media coverage for large-scale events, combining photography and videography.',
                          features: ['Full Day Coverage', 'Quick Turnaround', 'High-Res Photos', 'Highlight Reels'],
                          price: 'Starting at ₦3,000,000'
                        },
                        {
                          title: 'Interviews & Podcasts',
                          icon: 'Mic',
                          description: 'Professional sets and high-end audio for crisp, engaging talk content and interviews.',
                          features: ['Multi-Mic Setup', 'Video Recording', 'Lighting Design', 'Post Production'],
                          price: 'Starting at ₦800,000'
                        }
                      ];
                      for (const s of defaultServices) {
                        await supabase.from('services').insert(s);
                      }
                      fetchServices();
                    }
                  }}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-primary border border-primary/20 transition-all font-mono"
                >
                  Seed Services Dataset
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {services.map((item, i) => (
                  <div key={item.id} className="glass rounded-[2rem] p-8 space-y-6 group border-white/5 hover:border-white/10 transition-all">
                    <div className="flex justify-between items-start">
                      <div className="w-16 h-16 bg-surface-bright rounded-2xl flex items-center justify-center border border-white/5 text-primary">
                        <Zap className="w-8 h-8" />
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => { 
                          setEditingId(item.id); 
                          setTitle(item.title); 
                          setDescription(item.description || ''); 
                          setIcon(item.icon || 'Video');
                          setFeatures(item.features || []);
                          setPrice(item.price);
                          setIsEditing(true); 
                        }} className="p-2 text-gray-600 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete('services', item.id)} className="p-2 text-gray-600 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{item.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                      <div className="pt-2">
                        <span className="text-lg font-display font-bold text-primary">{item.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {services.length === 0 && !loading && (
                   <div className="col-span-full py-20 text-center glass border-dashed">
                      <Zap className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                      <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No Services Defined</p>
                   </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="space-y-8">
              <div className="flex justify-end">
                  <button 
                    onClick={async () => {
                      if (confirm('Import default videos to database?')) {
                        const defaultVideos = [
                            { title: 'Emeritus director of information has a message for us all', category: 'Campus Matters', image_url: `https://img.youtube.com/vi/0D-zn6YAqCY/maxresdefault.jpg`, youtube_id: '0D-zn6YAqCY', description: 'Emeritus director of information has a message for us all - Campus matters', is_featured: true },
                            { title: 'If Shallipopi & Davido Catch This Girl...', category: 'Interviews', image_url: `https://img.youtube.com/vi/VyxGvAzBQGY/maxresdefault.jpg`, youtube_id: 'VyxGvAzBQGY', description: 'If Shallipopi & Davido Catch This Girl, You Won\'t Believe What Happens..', is_featured: true },
                            { title: 'How can a girl who says she loves me be opening her eyes...', category: 'Love Affairs', image_url: `https://img.youtube.com/vi/w24bsyvgMjs/maxresdefault.jpg`, youtube_id: 'w24bsyvgMjs', description: 'How can a girl who says she loves me be opening her eyes every time we are kissing? - Love affair', is_featured: true },
                            { title: 'Love affair: Exploring Non-Penetrative Sex', category: 'Love Affairs', image_url: `https://img.youtube.com/vi/4xQY7dyg8Pg/maxresdefault.jpg`, youtube_id: '4xQY7dyg8Pg', description: 'Love affair: Exploring Non-Penetrative Sex', is_featured: true },
                            { title: 'Love affair: hubby said we buy a land together...', category: 'Love Affairs', image_url: `https://img.youtube.com/vi/4m-9f9saFbA/maxresdefault.jpg`, youtube_id: '4m-9f9saFbA', description: 'Love affair: hubby said we buy a land together, he said it\'s going to be fifty fifty', is_featured: true },
                            { title: 'This one Sabi book oh 😂😂', category: 'Campus Matters', image_url: `https://img.youtube.com/vi/jrjpYn_nX8Q/maxresdefault.jpg`, youtube_id: 'jrjpYn_nX8Q', description: 'This one Sabi book oh 😂😂 || FIDE TV', is_featured: true },
                        ];
                        for (const vid of defaultVideos) {
                          await supabase.from('portfolio_items').insert(vid);
                        }
                        fetchPortfolio();
                      }
                    }}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-primary border border-primary/20 transition-all"
                  >
                    Seed YouTube Videos
                  </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {portfolio.map(item => (
                 <div key={item.id} className="glass rounded-[2rem] p-6 space-y-4 group border-white/5 hover:border-white/10 transition-all">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-bright">
                       {item.image_url && <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                       <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase text-white tracking-widest border border-white/10">
                          {item.category}
                       </div>
                       {item.is_featured && (
                         <div className="absolute top-4 right-4 bg-primary/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase text-white tracking-widest border border-white/10">
                            Featured
                         </div>
                       )}
                    </div>
                    <div className="space-y-1">
                       <h3 className="text-white font-bold group-hover:text-primary transition-colors">{item.title}</h3>
                       <p className="text-[10px] text-gray-500 line-clamp-2">{item.description}</p>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-white/5">
                       <div className="flex space-x-2">
                          <button onClick={() => { 
                            setEditingId(item.id); 
                            setTitle(item.title); 
                            setDescription(item.description || ''); 
                            setCategory(item.category);
                            setImageUrl(item.image_url || ''); 
                            setYoutubeId(item.youtube_id || '');
                            setStreamUrl(item.video_url || '');
                            setIsFeatured(item.is_featured);
                            setIsEditing(true); 
                          }} className="p-2 text-gray-500 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete('portfolio_items', item.id)} className="p-2 text-gray-500 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="glass rounded-[2.5rem] overflow-hidden border-white/5">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-bright/50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5">
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6">Event Details</th>
                    <th className="px-8 py-6">Start Time</th>
                    <th className="px-8 py-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {events.map(ev => (
                    <tr key={ev.id} className="group hover:bg-white/2 transition-colors">
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          ev.status === 'live' ? "bg-red-500 text-white" : "bg-gray-500/10 text-gray-500"
                        )}>
                          {ev.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="font-bold text-white">{ev.title}</p>
                          <p className="text-[10px] text-gray-600 truncate max-w-xs">{ev.description}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-gray-400 font-mono text-xs">
                        {format(new Date(ev.start_time), 'MMM dd, HH:mm')}
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex space-x-4">
                            <button onClick={() => { setEditingId(ev.id); setTitle(ev.title); setYoutubeId(ev.youtube_id || ''); setStreamUrl(ev.stream_url || ''); setImageUrl(ev.thumbnail_url || ''); setStartTime(ev.start_time.slice(0, 16)); setStatus(ev.status); setDescription(ev.description); setIsEditing(true); }} className="text-gray-600 hover:text-white transition-colors"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete('events', ev.id)} className="text-gray-600 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {news.map(n => (
                <div key={n.id} className="glass rounded-[2rem] p-6 space-y-4 group border-white/5 hover:border-white/10 transition-all flex flex-col">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-bright">
                    {n.image_url && <img src={n.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <div className={cn(
                        "bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase text-white tracking-widest border",
                        n.is_published ? "border-green-500/50 text-green-500" : "border-yellow-500/50 text-yellow-500"
                      )}>
                        {n.is_published ? 'Published' : 'Draft'}
                      </div>
                      {n.category && (
                        <div className="bg-primary/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase text-white tracking-widest border border-white/10">
                          {n.category}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 flex-grow">
                    <h3 className="text-white font-bold group-hover:text-primary transition-colors line-clamp-2">{n.title}</h3>
                    <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">{n.excerpt || n.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                       {n.tags?.slice(0, 3).map((t, i) => (
                         <span key={i} className="text-[8px] bg-white/5 px-2 py-0.5 rounded text-gray-400 font-bold uppercase">#{t}</span>
                       ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <div className="flex items-center space-x-2">
                       <Clock className="w-3 h-3 text-gray-600" />
                       <span className="text-[10px] text-gray-600 font-mono">{format(new Date(n.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex space-x-2">
                       <button onClick={() => { 
                         setEditingId(n.id); 
                         setTitle(n.title); 
                         setSlug(n.slug); 
                         setImageUrl(n.image_url || ''); 
                         setNewsGallery((n as any).image_urls || []);
                         setDescription(n.description || '');
                         setExcerpt(n.excerpt || '');
                         setContent(n.content); 
                         setBlogCategory(n.category || 'News');
                         setBlogTags(n.tags || []);
                         setIsPublished(n.is_published); 
                         setIsEditing(true); 
                       }} className="p-2 text-gray-500 hover:text-white bg-white/5 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                       <button onClick={() => handleDelete('news', n.id)} className="p-2 text-gray-500 hover:text-red-500 bg-white/5 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="glass rounded-[2.5rem] overflow-hidden border-white/5">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-bright/50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5">
                    <th className="px-8 py-6">User</th>
                    <th className="px-8 py-6">Verification</th>
                    <th className="px-8 py-6">Details</th>
                    <th className="px-8 py-6">Join Date</th>
                    <th className="px-8 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {profiles.map(user => (
                    <tr key={user.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <img 
                            src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                            className="w-10 h-10 rounded-full border border-white/10" 
                          />
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white">{user.username}</p>
                              {user.is_verified && <Award className="w-3 h-3 text-primary" />}
                            </div>
                            <p className="text-[10px] text-gray-500">{user.full_name || 'No full name set'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {user.is_verified ? (
                          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                          </span>
                        ) : user.verification_requested ? (
                          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-yellow-500/80">
                            <ShieldAlert className="w-3 h-3" />
                            Pending Review
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Standard</span>
                        )}
                      </td>
                      <td className="px-8 py-6 max-w-xs">
                        <p className="text-[10px] text-gray-400 font-light truncate">
                          {user.verification_details || 'No details provided'}
                        </p>
                      </td>
                      <td className="px-8 py-6 text-[10px] text-gray-500 font-mono tracking-widest uppercase">
                        {format(new Date(user.created_at), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end space-x-2">
                          {user.verification_requested && (
                            <>
                              <button 
                                onClick={() => handleVerification(user.id, true)}
                                className="p-2 glass text-green-500 hover:bg-green-500 hover:text-white transition-all rounded-lg"
                                title="Approve Verification"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleVerification(user.id, false)}
                                className="p-2 glass text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-lg"
                                title="Reject Request"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {!user.is_verified && !user.verification_requested && (
                             <button 
                               onClick={() => handleVerification(user.id, true)}
                               className="p-2 glass text-primary hover:bg-primary hover:text-white transition-all rounded-lg"
                               title="Grant Badge Manually"
                             >
                               <Award className="w-4 h-4" />
                             </button>
                          )}
                          {user.is_verified && (
                             <button 
                               onClick={() => handleVerification(user.id, false)}
                               className="p-2 glass text-gray-600 hover:bg-red-500 hover:text-white transition-all rounded-lg"
                               title="Revoke Verification"
                             >
                               <ShieldAlert className="w-4 h-4" />
                             </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'communities' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {communities.map(c => (
                 <div key={c.id} className="glass rounded-[2rem] p-8 space-y-6 flex flex-col group border-white/5 hover:border-white/10 transition-all">
                    <div className="flex justify-between items-start">
                       <div className="w-16 h-16 bg-surface-bright rounded-2xl flex items-center justify-center border border-white/5 text-primary group-hover:scale-105 transition-transform">
                          {c.image_url ? <img src={c.image_url} className="w-full h-full object-cover rounded-2xl" /> : <Users className="w-8 h-8" />}
                       </div>
                       <div className="flex space-x-2">
                          <button onClick={() => { setEditingId(c.id); setTitle(c.name); setDescription(c.description); setImageUrl(c.image_url || ''); setIsEditing(true); }} className="p-2 text-gray-600 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete('communities', c.id)} className="p-2 text-gray-600 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </div>
                    <div className="space-y-1">
                       <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{c.name}</h3>
                       <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{c.description}</p>
                    </div>
                 </div>
               ))}
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="glass rounded-[2.5rem] overflow-hidden border-white/5">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-bright/50 text-gray-500 uppercase text-[10px] font-black tracking-widest border-b border-white/5">
                    <th className="px-8 py-6">Date</th>
                    <th className="px-8 py-6">Client</th>
                    <th className="px-8 py-6">Type</th>
                    <th className="px-8 py-6">Status</th>
                    <th className="px-8 py-6">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {bookings.map(book => (
                    <tr key={book.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-8 py-6 text-gray-400 font-mono text-xs">{book.date}</td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <p className="font-bold text-white">{book.client_name}</p>
                          <p className="text-[10px] text-gray-600">{book.client_email}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-xs text-gray-300 font-medium">{book.event_type}</td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                          book.status === 'confirmed' ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                        )}>
                          {book.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex space-x-2">
                           <button onClick={async () => { await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', book.id); fetchBookings(); }} className="p-2 text-gray-600 hover:text-green-500"><CheckCircle2 className="w-4 h-4" /></button>
                           <button onClick={async () => { await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', book.id); fetchBookings(); }} className="p-2 text-gray-600 hover:text-red-500"><XCircle className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
       </div>

       {/* Form Modal */}
       <AnimatePresence>
          {isEditing && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]" onClick={() => setIsEditing(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-surface rounded-[3rem] border border-white/5 z-[101] p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                 <h2 className="text-3xl font-display font-bold text-white mb-8 tracking-tighter">
                   {editingId ? 'Edit' : 'Create'} <span className="text-primary">
                     {activeTab === 'events' ? 'Event' : activeTab === 'communities' ? 'Community' : activeTab === 'news' ? 'Article' : activeTab === 'portfolio' ? 'Portfolio Item' : activeTab === 'channels' ? 'TV Channel' : activeTab === 'services' ? 'Service' : activeTab}
                   </span>
                 </h2>
                 <form onSubmit={handleSave} className="space-y-6">
                   {activeTab === 'news' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      {/* Main Editor */}
                      <div className="lg:col-span-2 space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] uppercase font-black tracking-widest text-primary ml-4">Article Title</label>
                           <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Enter broad title..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-xl font-bold text-white focus:border-primary transition-all shadow-inner" />
                        </div>

                        <div className="space-y-2">
                           <div className="flex justify-between items-center px-4 mb-2">
                              <label className="text-[10px] uppercase font-black tracking-widest text-gray-500">Short Excerpt</label>
                              <button type="button" onClick={generateWithAI} className="flex items-center space-x-2 text-[10px] font-black text-primary hover:text-white transition-colors">
                                 <Sparkles className="w-3 h-3" /><span>AI Generate Excerpt</span>
                              </button>
                           </div>
                           <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Catchy summary for cards..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white text-sm min-h-[80px] resize-none focus:border-primary transition-colors" />
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">Full Content (Markdown Supported)</label>
                           <textarea value={content} onChange={e => setContent(e.target.value)} required placeholder="Once upon a time in FideTV..." className="w-full bg-black/40 border border-white/10 rounded-3xl p-8 text-white min-h-[400px] resize-none focus:border-primary transition-colors font-mono text-sm leading-relaxed" />
                        </div>
                      </div>

                      {/* Side Settings */}
                      <div className="space-y-8 bg-black/20 p-6 rounded-[2.5rem] border border-white/5 h-fit">
                        <div className="space-y-4">
                           <h3 className="text-[10px] uppercase font-black tracking-widest text-gray-400 px-2 border-b border-white/5 pb-2">Publishing</h3>
                           <div className="flex items-center justify-between p-4 bg-surface-bright/50 rounded-2xl border border-white/5">
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Status</span>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", isPublished ? "bg-green-500" : "bg-yellow-500")} />
                                <span className="text-[10px] font-black text-white">{isPublished ? 'PUBLISHED' : 'DRAFT'}</span>
                              </div>
                           </div>
                           <button 
                             type="button"
                             onClick={() => setIsPublished(!isPublished)}
                             className={cn(
                               "w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                               isPublished 
                                 ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20" 
                                 : "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
                             )}
                           >
                             {isPublished ? 'Revert to Draft' : 'Publish Article'}
                           </button>
                        </div>

                        <div className="space-y-4">
                           <h3 className="text-[10px] uppercase font-black tracking-widest text-gray-400 px-2 border-b border-white/5 pb-2">Organization</h3>
                           <div className="space-y-2">
                              <label className="text-[8px] font-black uppercase text-gray-600 ml-2">Category</label>
                              <select 
                                value={blogCategory} 
                                onChange={e => setBlogCategory(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs font-bold uppercase tracking-wider"
                              >
                                <option value="News">General News</option>
                                <option value="Entertainment">Entertainment</option>
                                <option value="Tech">Broadcasting Tech</option>
                                <option value="Lifestyle">Lifestyle</option>
                                <option value="Community">Community Spotlight</option>
                                <option value="Opinion">Opinion Pieces</option>
                                <option value="Industry">Industry News</option>
                              </select>
                           </div>

                           <div className="space-y-2">
                              <label className="text-[8px] font-black uppercase text-gray-600 ml-2">Permalink Slug</label>
                              <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="url-friendly-slug" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-[10px] font-mono" />
                           </div>
                        </div>

                        <div className="space-y-4">
                           <h3 className="text-[10px] uppercase font-black tracking-widest text-gray-400 px-2 border-b border-white/5 pb-2">Featured Image</h3>
                           <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/40 border-2 border-dashed border-white/5 flex flex-col items-center justify-center group cursor-pointer" onClick={() => document.getElementById('blog-upload')?.click()}>
                              {imageUrl ? (
                                <>
                                  <img src={imageUrl} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-6 h-6 text-white" />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <Camera className="w-6 h-6 text-gray-600 mb-2" />
                                  <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Select Image</span>
                                </>
                              )}
                              <input id="blog-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'event-thumbnails', `blog/${Date.now()}`, setImageUrl)} />
                           </div>
                           <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Or paste external URL..." className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-[8px]" />
                        </div>

                        <div className="space-y-4">
                           <h3 className="text-[10px] uppercase font-black tracking-widest text-gray-400 px-2 border-b border-white/5 pb-2">Actions</h3>
                           <div className="flex gap-2">
                              <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-gray-500 font-bold uppercase tracking-widest text-[10px] rounded-xl transition-all">Cancel</button>
                              <button type="submit" className="flex-1 py-4 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Save Changes</button>
                           </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">{activeTab === 'communities' ? 'Hub Name' : 'Title'}</label>
                       <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Enter name/title..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white focus:border-primary/50 transition-colors" />
                    </div>

                    {activeTab === 'news' && (
                      <div className="space-y-2 text-xs uppercase text-gray-500 font-bold border-white/5 border-b pb-6 mb-6">
                         <label className="px-4">Article Slug (e.g. new-platform-update)</label>
                         <input value={slug} onChange={e => setSlug(e.target.value)} required className="w-full bg-black/40 border-white/10 rounded-2xl p-5 mt-2" />
                      </div>
                    )}

                    {activeTab === 'portfolio' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">Category</label>
                            <input value={category} onChange={e => setCategory(e.target.value)} required placeholder="e.g. Signature Productions" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white focus:border-primary/50 transition-colors" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">YouTube ID (Optional)</label>
                            <input value={youtubeId} onChange={e => setYouTubeId(e.target.value)} placeholder="e.g. dQw4w9WgXcQ" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white focus:border-primary/50 transition-colors" />
                         </div>
                      </div>
                    )}

                    {activeTab === 'channels' && (
                      <div className="grid grid-cols-1 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">Category</label>
                            <input value={category} onChange={e => setCategory(e.target.value)} required placeholder="e.g. Sports" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white focus:border-primary/50 transition-colors" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">Stream URL (.m3u8, .mp4, YouTube URL, or &lt;iframe&gt;)</label>
                            <input value={streamUrl} onChange={e => setStreamUrl(e.target.value)} required placeholder="https://... or <iframe src='...'></iframe>" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white focus:border-primary/50 transition-colors" />
                         </div>
                      </div>
                    )}

                    {activeTab === 'services' && (
                      <div className="grid grid-cols-1 gap-6">
                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">Price / Investment</label>
                              <input value={price} onChange={e => setPrice(e.target.value)} required placeholder="e.g. Starting at ₦1,500,000" className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white focus:border-primary/50 transition-colors" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">Icon (Lucide Name)</label>
                              <select value={icon} onChange={e => setIcon(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white focus:border-primary/50 transition-colors">
                                <option value="Video">Video</option>
                                <option value="Radio">Radio</option>
                                <option value="Camera">Camera</option>
                                <option value="Mic">Mic</option>
                                <option value="Zap">Zap</option>
                                <option value="Globe">Globe</option>
                              </select>
                           </div>
                         </div>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center px-4">
                               <label className="text-[10px] uppercase font-black tracking-widest text-gray-500">Service Features</label>
                               <button 
                                 type="button" 
                                 onClick={() => setFeatures([...features, ''])}
                                 className="text-[10px] font-black text-primary hover:text-white uppercase tracking-widest flex items-center space-x-1"
                               >
                                 <Plus className="w-3 h-3" />
                                 <span>Add Feature</span>
                               </button>
                            </div>
                            <div className="space-y-3">
                               {features.map((feat, idx) => (
                                 <div key={idx} className="flex gap-3">
                                    <input 
                                      value={feat} 
                                      onChange={e => {
                                        const newF = [...features];
                                        newF[idx] = e.target.value;
                                        setFeatures(newF);
                                      }} 
                                      placeholder="e.g. 4K Cinematography" 
                                      className="flex-grow bg-black/40 border border-white/10 rounded-xl p-4 text-white text-xs" 
                                    />
                                    <button 
                                      type="button" 
                                      onClick={() => setFeatures(features.filter((_, i) => i !== idx))}
                                      className="p-4 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </div>
                    )}

                    <div className="space-y-2">
                       <div className="flex justify-between items-center px-4 mb-2">
                          <label className="text-[10px] uppercase font-black tracking-widest text-gray-500">{activeTab === 'news' ? 'Short Summary' : 'Description'}</label>
                          <button type="button" onClick={generateWithAI} className="flex items-center space-x-2 text-[10px] font-black text-primary hover:text-white transition-colors">
                             <Sparkles className="w-3 h-3" /><span>AI Optimize</span>
                          </button>
                       </div>
                       <textarea value={description} onChange={e => setDescription(e.target.value)} required placeholder={activeTab === 'news' ? 'Brief catch-phrase for the article...' : 'Describe this hub/event...'} className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white min-h-[100px] resize-none focus:border-primary/50 transition-colors" />
                    </div>

                    {activeTab === 'news' && (
                      <div className="space-y-2">
                         <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">Full Article Body (Markdown)</label>
                         <textarea value={content} onChange={e => setContent(e.target.value)} required placeholder="Write the complete article content here..." className="w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white min-h-[300px] resize-none focus:border-primary/50 transition-colors" />
                      </div>
                    )}

                    <div className="space-y-4">
                       <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">
                         {activeTab === 'news' ? 'Article Thumbnail' : 'Media Accent'}
                       </label>
                       <div className="flex gap-4">
                          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Paste Image URL..." className="flex-grow bg-black/40 border border-white/10 rounded-2xl p-5 text-white text-xs" />
                          <label className="px-6 py-5 bg-white/5 border border-dashed border-white/10 rounded-2xl cursor-pointer hover:bg-white/10">
                             <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'event-thumbnails', `uploads/${Date.now()}`, setImageUrl)} />
                             <Camera className="w-5 h-5 text-primary" />
                          </label>
                       </div>
                    </div>

                    {activeTab === 'news' && (
                      <div className="space-y-6 pt-4 border-t border-white/5">
                         <div className="flex justify-between items-center px-4">
                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500">Gallery Images (Multi)</label>
                            <button 
                              type="button" 
                              onClick={() => setNewsGallery([...newsGallery, ''])}
                              className="text-[10px] font-black text-primary hover:text-white uppercase tracking-widest flex items-center space-x-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Image</span>
                            </button>
                         </div>
                         <div className="space-y-3">
                            {newsGallery.map((url, idx) => (
                              <div key={idx} className="flex gap-3">
                                 <input 
                                   value={url} 
                                   onChange={e => {
                                     const newG = [...newsGallery];
                                     newG[idx] = e.target.value;
                                     setNewsGallery(newG);
                                   }} 
                                   placeholder="Additional image URL..." 
                                   className="flex-grow bg-black/40 border border-white/10 rounded-xl p-4 text-white text-xs" 
                                 />
                                 <button 
                                   type="button" 
                                   onClick={() => setNewsGallery(newsGallery.filter((_, i) => i !== idx))}
                                   className="p-4 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors"
                                 >
                                    <Trash2 className="w-4 h-4" />
                                 </button>
                              </div>
                            ))}
                         </div>
                      </div>
                    )}

                    {activeTab === 'events' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">YouTube ID</label>
                            <input value={youtubeId} onChange={e => setYoutubeId(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-2xl p-5" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-gray-500 ml-4">Start Time</label>
                            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-black/40 border-white/10 rounded-2xl p-5" />
                         </div>
                      </div>
                    )}

                    {activeTab === 'news' && (
                      <div className="flex items-center space-x-4 p-4 glass rounded-2xl">
                         <input type="checkbox" id="pub" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} className="w-5 h-5 accent-primary" />
                         <label htmlFor="pub" className="text-xs font-bold text-gray-300 uppercase tracking-widest">Publish Immediately</label>
                      </div>
                    )}

                    {activeTab === 'portfolio' && (
                      <div className="flex items-center space-x-4 p-4 glass rounded-2xl">
                         <input type="checkbox" id="feat" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="w-5 h-5 accent-primary" />
                         <label htmlFor="feat" className="text-xs font-bold text-gray-300 uppercase tracking-widest">Feature on Homepage</label>
                      </div>
                    )}

                    {activeTab === 'channels' && (
                      <div className="flex items-center space-x-4 p-4 glass rounded-2xl">
                         <input type="checkbox" id="act" checked={status === 'live'} onChange={e => setStatus(e.target.checked ? 'live' : 'offline')} className="w-5 h-5 accent-primary" />
                         <label htmlFor="act" className="text-xs font-bold text-gray-300 uppercase tracking-widest">Mark as Live / Active</label>
                      </div>
                    )}

                    <div className="flex justify-end space-x-4 pt-8">
                       <button type="button" onClick={() => setIsEditing(false)} className="px-8 py-4 text-gray-500 font-bold uppercase tracking-widest text-[10px] hover:text-white">Cancel</button>
                       <button type="submit" className="px-10 py-4 bg-primary text-white font-bold uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                          Confirm & Save
                       </button>
                    </div>
                  </div>
                )}
                 </form>
              </motion.div>
            </>
          )}
       </AnimatePresence>
    </div>
  );
}
