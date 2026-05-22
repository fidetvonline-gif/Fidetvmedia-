import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Community, Post } from '@/types';
import PostCard from '@/components/PostCard';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Image as ImageIcon, Video, MessageSquare, Users, Globe, Info, Edit3, Camera, Check, X, Shield, UserMinus, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactPlayer from 'react-player';
import { format } from 'date-fns';

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user && id) {
        checkMembership(session.user.id, id);
      }
    });
    fetchData();
  }, [id]);

  const [joinStatus, setJoinStatus] = useState<'none' | 'pending' | 'approved'>('none');

  const checkMembership = async (userId: string, communityId: string) => {
     const { data } = await supabase
       .from('community_members')
       .select('role, status')
       .eq('user_id', userId)
       .eq('community_id', communityId)
       .maybeSingle();
     
     if (data) {
       const status = data.status || 'approved';
       setJoinStatus(status as any);
       setIsMember(status === 'approved');
       setMemberRole(data.role || null);
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
    if (!user || !id || !community) return;
    
    if (joinStatus !== 'none') {
      const { error } = await supabase
        .from('community_members')
        .delete()
        .eq('user_id', user.id)
        .eq('community_id', id);
      if (!error) {
        setIsMember(false);
        setJoinStatus('none');
        setMemberCount(prev => isMember ? prev - 1 : prev);
        fetchMembers();
        fetchData();
      }
    } else {
      // Dynamic status based on community privacy
      const status = (community as any).is_private ? 'pending' : 'approved';
      const { error } = await supabase
        .from('community_members')
        .insert({ user_id: user.id, community_id: id, status: status, role: 'member' });
      if (!error) {
        setJoinStatus(status);
        if (status === 'approved') {
          setIsMember(true);
          setMemberCount(prev => prev + 1);
        }
        fetchMembers();
        fetchData();
      }
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
    <div className="max-w-5xl mx-auto px-4 py-12">
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

      <div className="flex flex-col md:flex-row gap-12 items-start">
        {/* Main Feed */}
        <div className="flex-grow space-y-8 w-full">
          <header className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-surface-bright rounded-[2rem] flex items-center justify-center border border-white/10 text-primary shadow-2xl">
                  {community.image_url ? (
                    <img src={community.image_url} alt={community.name} className="w-full h-full object-cover rounded-[2rem]" />
                  ) : (
                    <Users className="w-10 h-10" />
                  )}
                </div>
                <div>
                  <h1 className="text-3xl md:text-5xl font-display font-medium text-foreground tracking-tighter">{community.name}</h1>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className="flex items-center space-x-1 text-[10px] font-black uppercase text-text-muted tracking-widest">
                      {(community as any).is_private ? <Lock className="w-3 h-3 text-red-500" /> : <Globe className="w-3 h-3 text-green-500" />}
                      <span>{(community as any).is_private ? 'Private Group' : 'Public Group'}</span>
                    </span>
                    <span className="w-1 h-1 bg-border-custom rounded-full" />
                    <span className="text-[10px] font-black uppercase text-primary tracking-widest">{memberCount.toLocaleString()} Members</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
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
                {user && (
                  <button
                    onClick={toggleMembership}
                    className={cn(
                      "px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                      joinStatus === 'approved' 
                        ? "bg-foreground/5 border border-border-custom text-text-muted hover:text-red-500 hover:border-red-500/20" 
                        : joinStatus === 'pending'
                        ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-500"
                        : "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105"
                    )}
                  >
                    {joinStatus === 'approved' ? 'Leave Hub' : joinStatus === 'pending' ? 'Pending Approval' : 'Join Hub'}
                  </button>
                )}
                {user && (
                  <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="w-14 h-14 bg-surface-bright border border-border-custom rounded-2xl flex items-center justify-center text-foreground shadow-xl hover:text-primary transition-all"
                  >
                    <Plus className={cn("w-6 h-6 transition-transform", isCreating && "rotate-45")} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-text-muted text-lg font-light leading-relaxed max-w-2xl">
              {community.description}
            </p>
          </header>

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
              {user ? (
                <button
                  onClick={toggleMembership}
                  className={cn(
                    "px-10 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all cursor-pointer shadow-xl font-display",
                    joinStatus === 'pending'
                      ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-500"
                      : "bg-primary text-white shadow-primary/20 hover:scale-105 active:scale-95"
                  )}
                >
                  {joinStatus === 'pending' ? '⏳ Request Pending Approval' : '🔑 Request Access'}
                </button>
              ) : (
                <Link
                  to="/auth"
                  className="px-10 py-5 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all inline-block font-display"
                >
                  Sign In & Join Hub
                </Link>
              )}
            </div>
          ) : (
            <>
              <AnimatePresence>
                {isCreating && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleCreatePost}
                    className="glass rounded-[2rem] p-8 space-y-6 overflow-hidden border-primary/20 shadow-2xl shadow-primary/5"
                  >
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder={`What's happening in ${community.name}?`}
                      className="w-full bg-transparent border-none focus:ring-0 text-lg text-foreground placeholder:text-text-muted resize-none min-h-[120px]"
                    />
                    
                    {mediaPreview && (
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-background border border-border-custom">
                        {mediaFile?.type.startsWith('image') ? (
                          <img src={mediaPreview} className="w-full h-full object-cover" />
                        ) : (
                          <video src={mediaPreview} controls playsInline className="w-full h-full object-cover" />
                        )}
                        <button 
                          onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                          className="absolute top-4 right-4 p-2 bg-black/60 rounded-xl text-white hover:bg-red-500 transition-colors z-10"
                        >
                          <Plus className="w-5 h-5 rotate-45" />
                        </button>
                      </div>
                    )}
                    {!mediaPreview && newPostContent.match(/(https?:\/\/[^\s]+)/g)?.find(u => Player.canPlay(u)) && (
                      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-background border border-border-custom">
                        <Player 
                          url={newPostContent.match(/(https?:\/\/[^\s]+)/g)?.find(u => Player.canPlay(u))} 
                          className="absolute top-0 left-0"
                          width="100%"
                          height="100%"
                          controls 
                        />
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t border-border-custom">
                      <div className="flex space-x-4">
                        <label className="p-2 text-text-muted hover:text-primary transition-colors cursor-pointer">
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                          <ImageIcon className="w-5 h-5" />
                        </label>
                        <label className="p-2 text-text-muted hover:text-primary transition-colors cursor-pointer">
                          <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                          <Video className="w-5 h-5" />
                        </label>
                      </div>
                      <button
                        type="submit"
                        disabled={!newPostContent.trim() || uploading}
                        className="px-8 py-3 bg-primary text-white font-bold rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-all font-display uppercase tracking-widest text-xs flex items-center space-x-2"
                      >
                        {uploading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                        <span>{uploading ? 'Uploading...' : 'Post to Hub'}</span>
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="space-y-8">
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
            </>
          )}
        </div>

        {/* Info Sidebar */}
        <div className="hidden lg:block w-72 space-y-8 sticky top-32">
          <div className="glass rounded-[2rem] p-8 space-y-6">
            <h3 className="font-display font-bold text-foreground flex items-center space-x-2">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-widest">Hub Details</span>
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-text-muted">Established</p>
                <p className="text-sm text-foreground/70">{community.created_at ? format(new Date(community.created_at), 'MMMM yyyy') : 'April 2026'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-text-muted">Privacy</p>
                <p className="text-sm text-foreground/70">{(community as any).is_private ? '🔒 Private Group' : '🌍 Public Group'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase font-black text-text-muted">Moderators</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {moderators.length > 0 ? moderators.map((mod, i) => (
                    <span key={i} className="text-sm text-primary font-bold">@{mod.username}</span>
                  )) : (
                    <p className="text-sm text-text-muted italic animate-pulse">Assigning mods...</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-[2rem] p-8 space-y-6">
            <h3 className="font-display font-bold text-foreground flex items-center space-x-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs uppercase tracking-widest">Co-Creators</span>
            </h3>
            
            <div className="space-y-4">
              {approvedMembers.length > 0 ? (
                <div className="grid grid-cols-5 gap-2">
                  {approvedMembers.map((memb, i) => (
                    <Link
                      key={i}
                      to={`/profile/${memb.profiles?.username}`}
                      title={`${memb.profiles?.full_name || memb.profiles?.username} (${memb.role || 'member'})`}
                      className="w-10 h-10 rounded-xl bg-surface-bright border border-border-custom overflow-hidden block hover:border-primary/50 transition-all cursor-pointer shadow-sm shrink-0"
                    >
                      {memb.profiles?.avatar_url ? (
                        <img src={memb.profiles.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-foreground/40 font-bold text-[10px] uppercase bg-primary/10">
                          {memb.profiles?.username?.substring(0, 2) || 'CR'}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic">Become the first pioneer!</p>
              )}
            </div>
          </div>

          <div className="p-8 bg-surface-bright border border-border-custom rounded-[2rem] space-y-4">
             <h4 className="text-foreground font-bold text-xs uppercase tracking-widest">Hub Rules</h4>
             <ul className="space-y-3">
               {['Be professional', 'Share insights', 'Collaborate freely'].map(rule => (
                 <li key={rule} className="flex items-center space-x-2 text-[10px] text-text-muted font-bold uppercase tracking-tighter">
                   <div className="w-1 h-1 bg-primary rounded-full" />
                   <span>{rule}</span>
                 </li>
               ))}
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
