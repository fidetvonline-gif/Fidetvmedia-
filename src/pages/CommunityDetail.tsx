import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Community, Post } from '@/types';
import PostCard from '@/components/PostCard';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Plus, Image as ImageIcon, Video, MessageSquare, Users, Globe, Info, Edit3, 
  Camera, Check, X, Shield, UserMinus, Lock, Mic, MicOff, Volume2, VolumeX, 
  MessageSquare as MessageIcon, Headphones, Radio, Signal, Wifi, Activity, Sparkles, Send 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactPlayer from 'react-player';
import { format } from 'date-fns';
import { safeLocalStorage } from '@/lib/storage';

const Player = ReactPlayer as any;

export default function CommunityDetail() {
  const { id } = useParams();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const POSTS_PER_PAGE = 5;
  const [isCreating, setIsCreating] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isMember, setIsMember] = useState(false);
  const [memberRole, setMemberRole] = useState<'member' | 'moderator' | 'admin' | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [moderators, setModerators] = useState<any[]>([]);
  const [approvedMembers, setApprovedMembers] = useState<any[]>([]);
  const [editIsPrivate, setEditIsPrivate] = useState(false);

  const [isEditingCommunity, setIsEditingCommunity] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isUpdatingCommunity, setIsUpdatingCommunity] = useState(false);
  const [isManagingMembers, setIsManagingMembers] = useState(false);
  const [communityMembers, setCommunityMembers] = useState<any[]>([]);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Community Redesign & Connection States
  const [activeTab, setActiveTab] = useState<'feed' | 'chat' | 'voice'>('feed');
  const [siteTotalVisits, setSiteTotalVisits] = useState(18542);
  const [activeOnSite, setActiveOnSite] = useState(38);
  
  const [loungeMessages, setLoungeMessages] = useState<any[]>(() => {
    const defaultMessages = [
      { id: 'm1', username: 'mary_adeboye', full_name: 'Mary Adeboye', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop', text: 'Hey guys! Staging is set up for our broadcasting review. Check out the Voice Channels tab to discuss live!', time: '10:15 M', is_pioneer: true },
      { id: 'm2', username: 'sophia_media', full_name: 'Sophia Nwachukwu', avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop', text: 'I am here as well! Excited about the new media pipelines we are launching this week under high bandwidth latency constraints.', time: '10:18 M', is_pioneer: true },
      { id: 'm3', username: 'jacob_cinematic', full_name: 'Jacob Mensah', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop', text: 'Stunning presets in the latest hub update! Let me know if anyone wants video rendering templates or drone raw materials.', time: '10:22 M', is_pioneer: true }
    ];
    return defaultMessages;
  });
  const [newChatText, setNewChatText] = useState('');
  const [isTypingSim, setIsTypingSim] = useState(false);

  // Room & Voice States
  const [activeVoiceRoom, setActiveVoiceRoom] = useState<{ id: string; title: string; host: string } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [connectedSpeakers, setConnectedSpeakers] = useState<string[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom helper for lounge chat
  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [loungeMessages, activeTab]);

  // Handle simulated auto-reply in Lounge Chat
  const handleSendLoungeChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatText.trim()) return;

    const username = user?.email?.split('@')[0] || 'anonymous_pioneer';
    const fullName = user?.user_metadata?.full_name || 'Creative Pioneer';
    const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

    const newMsg = {
      id: `u-${Date.now()}`,
      username: username,
      full_name: fullName,
      avatar_url: avatar,
      text: newChatText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_pioneer: false
    };

    const updated = [...loungeMessages, newMsg];
    setLoungeMessages(updated);
    setNewChatText('');

    // Trigger typing simulation
    setIsTypingSim(true);
    setTimeout(() => {
      const replies = [
        "That is impressive! Let's schedule a deep dive segment on the Channels tab.",
        "Totally agree. Let's hop onto the '🎙️ Creators Stage' Voice Room to discuss this right now!",
        "Brilliant ideas! The live media configurations here are perfect for testing that scale.",
        "Yes, we are pushing high-definition feeds soon. Stay tuned!",
        "Awesome insights. Mary Adeboye was saying similar things about media reach during our project review."
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const randomPioneers = [
        { name: 'Mary Adeboye', username: 'mary_adeboye', av: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&auto=format&fit=crop' },
        { name: 'Sophia Nwachukwu', username: 'sophia_media', av: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=200&auto=format&fit=crop' },
        { name: 'Jacob Mensah', username: 'jacob_cinematic', av: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' }
      ];
      const chosenPioneer = randomPioneers[Math.floor(Math.random() * randomPioneers.length)];

      const simMsg = {
        id: `sim-${Date.now()}`,
        username: chosenPioneer.username,
        full_name: chosenPioneer.name,
        avatar_url: chosenPioneer.av,
        text: randomReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        is_pioneer: true
      };
      
      setLoungeMessages(prev => [...prev, simMsg]);
      setIsTypingSim(false);
    }, 1500);
  };

  // Simple mute toggle
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Site total & active users state ticks
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count } = await supabase
          .from('site_visits')
          .select('*', { count: 'exact', head: true });
        if (count !== null) {
          setSiteTotalVisits(18542 + count);
        }
      } catch (err) {
        console.warn("DB visits check skipped");
      }
      setActiveOnSite(Math.floor(Math.random() * 15) + 36);
    };
    fetchStats();

    const metricInterval = setInterval(() => {
      setActiveOnSite(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        const newVal = prev + delta;
        return newVal < 28 ? 28 : newVal > 58 ? 58 : newVal;
      });
    }, 10000);
    return () => clearInterval(metricInterval);
  }, []);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        const activeUser = session?.user ?? null;
        setUser(activeUser);
        const userId = activeUser?.id || 'guest_pioneer';
        if (id) {
          checkMembership(userId, id);
        }
      })
      .catch((err) => {
        console.warn("Auth session fetch error (expected if not logged in):", err);
        // Fallback for guest
        setUser(null);
        if (id) checkMembership('guest_pioneer', id);
      });
    
    fetchData();
  }, [id]);

  const [joinStatus, setJoinStatus] = useState<'none' | 'pending' | 'approved'>('none');

  const checkMembership = async (userId: string, communityId: string) => {
     let data: any = null;
     try {
       const res = await supabase
         .from('community_members')
         .select('role, status')
         .eq('user_id', userId)
         .eq('community_id', communityId)
         .maybeSingle();
       data = res.data;
     } catch (err) {
       console.warn("DB checkMembership error, using local storage");
     }
     
     const localJoined = safeLocalStorage.getItem(`joined_community_${communityId}_${userId}`);
     
     if (data) {
       const status = data.status || 'approved';
       setJoinStatus(status as any);
       setIsMember(status === 'approved');
       setMemberRole(data.role || null);
       safeLocalStorage.setItem(`joined_community_${communityId}_${userId}`, status);
     } else if (localJoined) {
       setJoinStatus(localJoined as any);
       setIsMember(localJoined === 'approved');
       setMemberRole('member');
     } else {
       setJoinStatus('none');
       setIsMember(false);
       setMemberRole(null);
     }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
       const file = e.target.files[0];
       setMediaFile(file);
       setMediaPreview(URL.createObjectURL(file));
    }
  };

  const toggleMembership = async () => {
    if (!id || !community) return;
    
    const userId = user?.id || 'guest_pioneer';
    const isCurrentlyJoined = joinStatus !== 'none';
    
    if (isCurrentlyJoined) {
      setIsMember(false);
      setJoinStatus('none');
      setMemberCount(prev => Math.max(0, prev - 1));
      
      safeLocalStorage.removeItem(`joined_community_${id}_${userId}`);
      
      if (user) {
        try {
          await supabase
            .from('community_members')
            .delete()
            .eq('user_id', userId)
            .eq('community_id', id);
        } catch (err) {
          console.warn("Database sync error for leave community:", err);
        }
      }
      
      fetchMembers();
    } else {
      const status = (community as any).is_private ? 'pending' : 'approved';
      
      setJoinStatus(status);
      if (status === 'approved') {
        setIsMember(true);
        setMemberCount(prev => prev + 1);
      }
      
      safeLocalStorage.setItem(`joined_community_${id}_${userId}`, status);
      
      if (user) {
        try {
          await supabase
            .from('community_members')
            .insert({ user_id: userId, community_id: id, status: status, role: 'member' });
        } catch (err) {
          console.warn("Database sync error for join community:", err);
        }
      }
      
      fetchMembers();
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const [comRes, countRes, modRes, membRes] = await Promise.all([
      supabase.from('communities').select('*').eq('id', id).single(),
      supabase
        .from('community_members')
        .select('id', { count: 'exact' })
        .eq('community_id', id)
        .eq('status', 'approved'),
      supabase
        .from('community_members')
        .select('profiles(username, avatar_url)')
        .eq('community_id', id)
        .eq('status', 'approved')
        .in('role', ['moderator', 'admin']),
      supabase
        .from('community_members')
        .select('role, status, profiles(id, username, avatar_url, full_name)')
        .eq('community_id', id)
        .eq('status', 'approved')
        .limit(10)
    ]);

    if (comRes.data) {
      setCommunity(comRes.data);
      setEditName(comRes.data.name);
      setEditDescription(comRes.data.description || '');
      setEditIsPrivate(!!comRes.data.is_private);
    }
    
    // Initial fetch of posts
    await fetchPosts(0, false);
    
    if (countRes.count !== null) setMemberCount(countRes.count);
    if (modRes.data) setModerators(modRes.data.map(m => m.profiles).filter(Boolean));
    if (membRes.data) setApprovedMembers(membRes.data.filter(m => m.profiles));
    setLoading(false);
  };

  const fetchPosts = async (pageNum: number, isLoadMore = false) => {
    if (!id) return;
    
    const from = pageNum * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    if (isLoadMore) setLoadingMore(true);

    const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url, is_verified), post_likes(user_id)')
        .eq('community_id', id)
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching posts:', error);
    }

    if (data) {
      if (isLoadMore) {
        setPosts(prev => [...prev, ...(data as any)]);
      } else {
        setPosts(data as any);
      }
      setHasMore(data.length === POSTS_PER_PAGE);
    }
    setLoadingMore(false);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage, true);
  };

  const fetchMembers = async () => {
    if (!id) return;
    const { data } = await supabase
      .from('community_members')
      .select('*, profiles(username, avatar_url, full_name)')
      .eq('community_id', id);
    if (data) setCommunityMembers(data);
  };

  useEffect(() => {
    if (isManagingMembers) {
      fetchMembers();
    }
  }, [isManagingMembers]);

  const updateMemberRole = async (userId: string, newRole: string) => {
    if (!id) return;
    const { error } = await supabase
      .from('community_members')
      .update({ role: newRole })
      .eq('community_id', id)
      .eq('user_id', userId);
    
    if (!error) {
      fetchMembers();
      fetchData();
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !user || !id) return;

    setUploading(true);
    let media_url = null;
    let type: 'text' | 'image' | 'video' = 'text';

    if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `posts/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
            .from('event-thumbnails')
            .upload(filePath, mediaFile);
            
        if (!uploadError) {
            media_url = supabase.storage.from('event-thumbnails').getPublicUrl(filePath).data.publicUrl;
            type = mediaFile.type.startsWith('image') ? 'image' : 'video';
        }
    }

    const { error } = await supabase.from('posts').insert({
      author_id: user.id,
      community_id: id,
      content: newPostContent,
      media_url,
      type
    });

    if (!error) {
      setNewPostContent('');
      setMediaFile(null);
      setMediaPreview(null);
      setIsCreating(false);
      fetchData();
    }
    setUploading(false);
  };

  const handleUpdateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!community || !user || !id) return;

    setIsUpdatingCommunity(true);
    let image_url = community.image_url;

    if (editImageFile) {
      const fileExt = editImageFile.name.split('.').pop();
      const fileName = `${id}-${Math.random()}.${fileExt}`;
      const filePath = `communities/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-thumbnails')
        .upload(filePath, editImageFile);

      if (!uploadError) {
        image_url = supabase.storage.from('event-thumbnails').getPublicUrl(filePath).data.publicUrl;
      }
    }

    let updatePayload: any = {
      name: editName,
      description: editDescription,
      image_url,
      is_private: editIsPrivate
    };

    let { error } = await supabase
      .from('communities')
      .update(updatePayload)
      .eq('id', id);

    if (error && error.message?.includes('column "is_private" of relation "communities" does not exist')) {
      console.warn("is_private column does not exist, falling back to basic fields");
      const { error: retryError } = await supabase
        .from('communities')
        .update({
          name: editName,
          description: editDescription,
          image_url
        })
        .eq('id', id);
      error = retryError;
    }

    if (!error) {
      setIsEditingCommunity(false);
      setEditImageFile(null);
      setEditImagePreview(null);
      fetchData();
    }
    setIsUpdatingCommunity(false);
  };

  const removeMember = async (targetUserId: string) => {
    if (!id || !confirm('Are you sure you want to remove this member?')) return;
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', id)
      .eq('user_id', targetUserId);
    if (!error) fetchMembers();
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (!error) {
      setPosts(prev => prev.filter(p => (p as any).id !== postId));
    } else {
      alert('Error deleting post');
    }
  };

  const handleJoinRequest = async (requestId: string, approve: boolean) => {
    if (approve) {
      await supabase.from('community_members').update({ status: 'approved' }).eq('id', requestId);
    } else {
      await supabase.from('community_members').delete().eq('id', requestId);
    }
    fetchMembers();
  };

  const isModerator = memberRole === 'moderator' || memberRole === 'admin' || user?.email === 'fidetvonline@gmail.com';
  const isAdminCheck = user?.email === 'fidetvonline@gmail.com';
  const hasAccess = !community?.is_private || isMember || isModerator || isAdminCheck;

  if (loading && !community) return <div className="max-w-4xl mx-auto py-40 text-center text-gray-500">Loading Hub...</div>;
  if (!community) return <div className="max-w-4xl mx-auto py-40 text-center text-gray-500">Hub not found.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <Link to="/community" className="inline-flex items-center space-x-2 text-gray-500 hover:text-primary transition-colors mb-8 group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-bold uppercase tracking-widest">Back to Communities</span>
      </Link>

      <AnimatePresence>
        {isManagingMembers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-surface-bright rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 p-8 sm:p-12 space-y-8"
            >
              <button
                onClick={() => setIsManagingMembers(false)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-2">
                <h2 className="text-3xl font-display font-medium text-foreground tracking-tight">Manage Members</h2>
                <p className="text-text-muted text-sm">Control who can moderate or participate in your community.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-black uppercase text-primary tracking-widest pl-1">Join Requests</h3>
                  <div className="max-h-[30vh] overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                    {communityMembers.filter(m => m.status === 'pending').length > 0 ? (
                      communityMembers.filter(m => m.status === 'pending').map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-4 bg-yellow-500/5 rounded-2xl border border-yellow-500/10">
                          <div className="flex items-center space-x-3">
                            <img src={req.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user_id}`} className="w-8 h-8 rounded-full" />
                            <span className="text-sm font-bold">{req.profiles?.username}</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleJoinRequest(req.id, true)} className="px-3 py-1.5 bg-green-500 text-white text-[10px] font-black uppercase rounded-lg">Approve</button>
                            <button onClick={() => handleJoinRequest(req.id, false)} className="px-3 py-1.5 bg-red-500 text-white text-[10px] font-black uppercase rounded-lg">Decline</button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-text-muted italic p-2">No pending join requests.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-black uppercase text-text-muted tracking-widest pl-1">Approved Members</h3>
                  <div className="max-h-[40vh] overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                    {communityMembers.filter(m => m.status === 'approved').map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-foreground/5 rounded-2xl border border-border-custom hover:border-foreground/10 transition-all">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/20 shrink-0">
                            {member.profiles?.avatar_url ? (
                              <img src={member.profiles.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-primary" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-foreground font-bold text-sm">{member.profiles?.full_name || member.profiles?.username}</p>
                            <p className="text-xs text-text-muted">@{member.profiles?.username}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <select 
                            value={member.role}
                            onChange={(e) => updateMemberRole(member.user_id, e.target.value)}
                            disabled={member.user_id === user?.id && member.role === 'admin'} 
                            className="bg-background border border-border-custom rounded-lg text-xs text-foreground px-3 py-2 outline-none focus:border-primary/50"
                          >
                            <option value="member">Member</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                          
                          {member.user_id !== user?.id && (
                            <button 
                              onClick={() => removeMember(member.user_id)}
                              className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                              title="Remove Member"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isEditingCommunity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl bg-surface-bright rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 p-8 sm:p-12 space-y-8"
            >
              <button
                onClick={() => setIsEditingCommunity(false)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-2">
                <h2 className="text-3xl font-display font-medium text-foreground tracking-tight">Hub Settings</h2>
                <p className="text-text-muted text-sm">Update your community details and branding.</p>
              </div>

              <form onSubmit={handleUpdateCommunity} className="space-y-8">
                <div className="flex flex-col sm:flex-row gap-8 items-center">
                  <div className="relative group">
                    <div className="w-32 h-32 bg-surface rounded-[2rem] border-2 border-border-custom overflow-hidden flex items-center justify-center text-primary">
                      {editImagePreview || community.image_url ? (
                        <img src={editImagePreview || community.image_url} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-12 h-12" />
                      )}
                    </div>
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer rounded-[2rem]">
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setEditImageFile(e.target.files[0]);
                            setEditImagePreview(URL.createObjectURL(e.target.files[0]));
                          }
                        }} 
                      />
                      <Camera className="w-8 h-8 text-white" />
                    </label>
                  </div>
                  <div className="flex-grow space-y-4 w-full">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-text-muted tracking-widest pl-1">Hub Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-background border border-border-custom rounded-2xl px-6 py-4 text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary/40 transition-all font-display shadow-inner"
                        placeholder="Name of your community"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-text-muted tracking-widest pl-1">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-background border border-border-custom rounded-2xl px-6 py-4 text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary/40 transition-all min-h-[120px] resize-none text-sm leading-relaxed font-display shadow-inner"
                    placeholder="What is this hub about?"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-text-muted tracking-widest pl-1">Hub Security & Privacy</label>
                  <select
                    value={editIsPrivate ? 'private' : 'public'}
                    onChange={(e) => setEditIsPrivate(e.target.value === 'private')}
                    className="w-full bg-background border border-border-custom rounded-2xl px-6 py-4 text-foreground focus:outline-none focus:border-primary/40 transition-all font-display text-sm font-semibold selection:bg-primary shadow-inner"
                  >
                    <option value="public">🌍 Public (Anyone can view discussion threads & members)</option>
                    <option value="private">🔒 Private (Only approved members can view discussion threads & members)</option>
                  </select>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isUpdatingCommunity || !editName.trim()}
                    className="px-10 py-5 bg-primary text-white font-black uppercase tracking-[0.2em] text-xs rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center space-x-3"
                  >
                    {isUpdatingCommunity ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>{isUpdatingCommunity ? 'Saving...' : 'Update Hub'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="mb-12 bg-surface rounded-[2rem] p-8 border border-border-custom shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-6 animate-fadeIn">
              <div className="w-24 h-24 bg-surface-bright rounded-[2rem] flex items-center justify-center border border-white/10 text-primary shadow-2xl shrink-0">
                {community.image_url ? (
                  <img src={community.image_url} alt={community.name} className="w-full h-full object-cover rounded-[2rem]" />
                ) : (
                  <Users className="w-12 h-12" />
                )}
              </div>
              <div>
                <h1 className="text-4xl md:text-6xl font-display font-medium text-foreground tracking-tighter">{community.name}</h1>
                <div className="flex items-center space-x-4 mt-3">
                  <span className="flex items-center space-x-1.5 text-[11px] font-black uppercase text-text-muted tracking-widest">
                    {(community as any).is_private ? <Lock className="w-3.5 h-3.5 text-red-500" /> : <Globe className="w-3.5 h-3.5 text-green-500" />}
                    <span>{(community as any).is_private ? 'Private Group' : 'Public Group'}</span>
                  </span>
                  <span className="w-1 h-1 bg-border-custom rounded-full" />
                  <span className="text-[11px] font-black uppercase text-primary tracking-widest">{memberCount.toLocaleString()} Members</span>
                </div>
              </div>
            </div>
            <div className="flex items-center flex-wrap gap-4 self-start md:self-auto">
              {isModerator && (
                <button
                  onClick={() => setIsManagingMembers(true)}
                  className="w-14 h-14 bg-foreground/5 border border-border-custom rounded-2xl flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/20 transition-all shadow-xl"
                  title="Manage Members"
                >
                  <Shield className="w-6 h-6" />
                </button>
              )}
              {isModerator && (
                <button
                  onClick={() => setIsEditingCommunity(true)}
                  className="w-14 h-14 bg-foreground/5 border border-border-custom rounded-2xl flex items-center justify-center text-text-muted hover:text-primary hover:border-primary/20 transition-all shadow-xl"
                  title="Edit Hub"
                >
                  <Edit3 className="w-6 h-6" />
                </button>
              )}
              <button
                onClick={toggleMembership}
                className={cn(
                  "px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
                  joinStatus === 'approved' 
                    ? "bg-foreground/5 border border-border-custom text-text-muted hover:text-red-500 hover:border-red-500/20" 
                    : joinStatus === 'pending'
                    ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-500"
                    : "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105"
                )}
              >
                {joinStatus === 'approved' ? 'Leave Hub' : joinStatus === 'pending' ? 'Pending Approval' : 'Join Hub'}
              </button>
            </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* LEFT SIDEBAR: About & Rules */}
        <div className="lg:w-1/4 space-y-6">
          <div className="bg-surface rounded-3xl p-6 border border-border-custom shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-4">About the Hub</h3>
            <p className="text-sm text-foreground/70 leading-relaxed">{community.description}</p>
          </div>
          <div className="bg-surface rounded-3xl p-6 border border-border-custom shadow-xl">
             <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-4">Community Guidelines</h3>
             <ul className="space-y-3 text-xs text-text-muted font-medium">
                <li>✅ Be respectful to all members</li>
                <li>✅ Stay on topic</li>
                <li>✅ No spamming or promotional links</li>
                <li>✅ Report inappropriate content</li>
             </ul>
          </div>
        </div>

        {/* MAIN FEED: Posts */}
        <div className="flex-grow space-y-6">

          {/* Social Media Mode Navigation Tabs */}
          {hasAccess && (
            <div className="flex bg-surface-bright/70 backdrop-blur-md rounded-2xl p-1.5 border border-border-custom gap-2 shadow-2xl mb-8">
              <button
                onClick={() => setActiveTab('feed')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer",
                  activeTab === 'feed'
                    ? "bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]"
                    : "text-text-muted hover:text-foreground hover:bg-foreground/5"
                )}
              >
                <Radio className="w-4 h-4 text-primary group-hover:animate-pulse" />
                <span>Feed Hub ({posts.length})</span>
              </button>
              
              <button
                onClick={() => setActiveTab('chat')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer relative",
                  activeTab === 'chat'
                    ? "bg-primary text-white shadow-lg shadow-primary/25 scale-[1.02]"
                    : "text-text-muted hover:text-foreground hover:bg-foreground/5"
                )}
              >
                <MessageIcon className="w-4 h-4 text-indigo-400" />
                <span>Lounge Chat</span>
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full text-[7px] font-mono px-1.5 py-0.5 animate-pulse uppercase">Active</span>
              </button>
            </div>
          )}

          {!hasAccess ? (
            <div className="glass rounded-[2.5rem] p-12 text-center border-dashed border border-primary/20 bg-primary/5 space-y-6 flex flex-col items-center justify-center py-24">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-2">
                <Lock className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-display font-medium text-foreground tracking-tight">Private Community Hub</h3>
                <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
                  This Creative Hub sector is set to private. Join index to pitch ideas, collaborate, and access member exclusive discussions.
                </p>
              </div>
              <button
                onClick={toggleMembership}
                className={cn(
                  "px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer shadow-xl font-display",
                  joinStatus === 'pending'
                    ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-500"
                    : "bg-primary text-white shadow-primary/20 hover:scale-[1.03] active:scale-95"
                )}
              >
                {joinStatus === 'pending' ? '⏳ Request Pending Approval' : '🔑 Request Access'}
              </button>
            </div>
          ) : (
            <div className="w-full">
              {/* DISCUSSION FEED */}
              {activeTab === 'feed' && (
                <div className="space-y-8">
                  {/* ... Feed content ... */}
                  {loading && posts.length === 0 ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="glass rounded-3xl h-64 animate-pulse" />
                    ))
                  ) : posts.length > 0 ? (
                    <>
                      {posts.map((post: any) => (
                        <div key={post.id} className="relative group">
                          <PostCard post={post} onDelete={() => { setPage(0); fetchData(); }} onUpdate={() => { setPage(0); fetchData(); }} />
                          {isModerator && (
                            <button 
                              onClick={() => deletePost(post.id)}
                              className="absolute top-4 right-4 p-2 bg-background/80 hover:bg-red-500 hover:text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                              title="Delete Post (Moderator)"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {hasMore && (
                        <div className="pt-8 flex justify-center">
                          <button 
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="px-10 py-4 bg-surface border border-border-custom rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 hover:text-primary hover:border-primary/20 transition-all shadow-xl disabled:opacity-50 flex items-center space-x-3"
                          >
                            {loadingMore ? (
                              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                            <span>{loadingMore ? 'Loading More...' : 'Load Older Posts'}</span>
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-20 bg-surface/30 rounded-[3rem] border border-dashed border-border-custom">
                      <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-6" />
                      <h3 className="text-2xl font-display font-medium text-text-muted">The hub is quiet.</h3>
                      <p className="text-text-muted mt-2">Start a conversation for the community!</p>
                    </div>
                  )}
                </div>
              )}

              {/* LOUNGE CHAT */}
              {activeTab === 'chat' && (
                <div className="glass rounded-[2rem] border border-border-custom p-6 flex flex-col h-[580px] justify-between shadow-2xl overflow-hidden bg-background/50">
                  {/* Chat content ... */}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR: Moderators / Quick Actions */}
        <div className="lg:w-1/4 space-y-6">
           <div className="bg-surface rounded-3xl p-6 border border-border-custom shadow-xl">
            <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-4">Moderators</h3>
            <div className="flex flex-wrap gap-2">
              {moderators.map(mod => (
                <img key={mod.username} src={mod.avatar_url} className="w-10 h-10 rounded-full border-2 border-primary" title={mod.username} />
              ))}
            </div>
           </div>
        </div>
      </div>

      {/* Floating Join Action for Mobile/Tablet viewport */}
      {!isMember && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[40] md:hidden w-[calc(100%-2rem)] max-w-sm flex">
          <button
            onClick={toggleMembership}
            className="w-full py-4.5 bg-primary text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl shadow-[0_20px_50px_rgba(242,125,38,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all text-center flex items-center justify-center gap-2 border border-primary/20 backdrop-blur-sm"
          >
            <span>{joinStatus === 'pending' ? '⏳ Pending Approval' : '🔑 Join Hub Collective'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
