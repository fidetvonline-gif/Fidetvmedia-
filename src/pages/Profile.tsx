import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  User, Settings, Grid, Heart, MessageSquare, LogOut, Camera, 
  Edit3, AlertTriangle, Twitter, Instagram, Linkedin, X, Check, 
  ShieldCheck, ShieldAlert, Award, FileText, Calendar, Star, Send, CheckCircle2,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import PostCard from '@/components/PostCard';
import FollowButton from '@/components/FollowButton';
import { Post, Profile as ProfileType, Booking } from '@/types';
import { format } from 'date-fns';

export default function Profile() {
  const { username: urlUsername } = useParams();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'liked' | 'bookings'>('posts');
  const [loading, setLoading] = useState(true);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState(0);
  const [resending, setResending] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    bio: '',
    social_x: '',
    social_instagram: '',
    social_linkedin: ''
  });

  const [uploading, setUploading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (urlUsername) {
        await fetchUserProfileByUsername(urlUsername, currentUser);
      } else if (currentUser) {
        await fetchProfile(currentUser);
        setIsOwnProfile(true);
      } else {
        navigate('/auth');
        return;
      }
      setLoading(false);
    };

    checkUser();
  }, [navigate, urlUsername]);

  const fetchUserProfileByUsername = async (username: string, currentUser: any) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (data) {
      setProfile(data);
      setIsOwnProfile(currentUser?.id === data.id);
      
      await Promise.all([
        fetchUserPosts(data.id),
        fetchFollowerCounts(data.id)
      ]);
    } else {
      setLoading(false);
    }
  };

  const fetchFollowerCounts = async (profileId: string) => {
    try {
      const [followers, following] = await Promise.all([
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', profileId),
        supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', profileId)
      ]);
      setFollowerCount(followers.count || 0);
      setFollowingCount(following.count || 0);
    } catch (e) {
      console.warn("Followers count error", e);
    }
  };

  const fetchUserBookings = async (userId: string) => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) setBookings(data);
  };

  const submitFeedback = async (bookingId: string) => {
    if (!feedbackText.trim() || rating === 0) {
      alert('Please provide both a rating and feedback text.');
      return;
    }
    setSubmittingFeedback(bookingId);
    const { error } = await supabase
      .from('bookings')
      .update({ 
        feedback: feedbackText,
        rating: rating 
      })
      .eq('id', bookingId);
    
    if (!error) {
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, feedback: feedbackText, rating: rating } : b));
      setSubmittingFeedback(null);
      setFeedbackText('');
      setRating(0);
      alert('Thank you for your feedback!');
    }
  };

  const requestVerification = async () => {
    if (!user || !verificationDetails) return;
    setSendingRequest(true);
    const { error } = await supabase
      .from('profiles')
      .update({ 
        verification_requested: true, 
        verification_details: verificationDetails 
      })
      .eq('id', user.id);
    
    if (!error) {
      setProfile(prev => prev ? { ...prev, verification_requested: true, verification_details: verificationDetails } : null);
      setIsVerifying(false);
      alert('Verification request sent!');
    }
    setSendingRequest(false);
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.includes('bucket not found')) {
            throw new Error('Storage bucket "avatars" not found. Please ensure it is created in Supabase (see Section 9 of supabase_schema.sql).');
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      alert('Avatar updated successfully!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const resendVerification = async () => {
    if (!user?.email) return;
    setResending(true);
    try {
      await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });
      alert('Verification email resent!');
    } catch (err) {
      console.error(err);
    } finally {
      setResending(false);
    }
  };

  const fetchProfile = async (currentUser: any) => {
    let { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: newData, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: currentUser.id,
          username: currentUser.email?.split('@')[0] || `user_${currentUser.id.slice(0, 5)}`,
          full_name: currentUser.user_metadata?.full_name || '',
          avatar_url: currentUser.user_metadata?.avatar_url || '',
        })
        .select()
        .single();
      
      if (!createError) {
        data = newData;
      }
    }
    
    if (data) {
      setProfile(data);
      setEditForm({
        bio: data.bio || '',
        social_x: data.social_x || '',
        social_instagram: data.social_instagram || '',
        social_linkedin: data.social_linkedin || ''
      });
      await Promise.all([
        fetchUserPosts(data.id),
        fetchUserBookings(data.id),
        fetchFollowerCounts(data.id)
      ]);
    }
  };

  const fetchUserPosts = async (userId: string) => {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url)')
      .eq('author_id', userId)
      .order('created_at', { ascending: false });

    if (data) setPosts(data as any);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const toggleEdit = () => {
    if (isEditing) {
      setIsEditing(false);
      if (profile) {
        setEditForm({
          bio: profile.bio || '',
          social_x: profile.social_x || '',
          social_instagram: profile.social_instagram || '',
          social_linkedin: profile.social_linkedin || ''
        });
      }
    } else {
      setIsEditing(true);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          bio: editForm.bio,
          social_x: editForm.social_x,
          social_instagram: editForm.social_instagram,
          social_linkedin: editForm.social_linkedin,
        })
        .eq('id', user.id)
        .select()
        .single();
        
      if (error) throw error;
      if (data) setProfile(data);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || 'Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 bg-background text-foreground">
      {/* Verification Banner */}
      {!user?.email_confirmed_at && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-amber-500 text-sm font-medium">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>Please verify your email address to unlock all features.</span>
            </div>
            <button
              onClick={resendVerification}
              disabled={resending}
              className="text-xs font-bold uppercase tracking-widest bg-amber-500 text-black px-4 py-2 rounded-lg hover:bg-amber-400 transition-colors disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend Email'}
            </button>
          </div>
        </div>
      )}

      {/* Header / Cover */}
      <div className="h-64 sm:h-80 bg-surface relative border-b border-border-custom">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 translate-y-1/2">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 sm:gap-10">
            <div className="relative group">
              <div className="w-32 h-32 sm:w-44 sm:h-44 bg-surface rounded-[2rem] sm:rounded-[2.5rem] border-4 border-background overflow-hidden shadow-2xl relative z-10">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-foreground/40">
                    <User className="w-16 h-16 sm:w-20 sm:h-20" />
                  </div>
                )}
                <label className={cn(
                  "absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer",
                  uploading && "opacity-100 cursor-wait"
                )}>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8 text-white" />
                  )}
                </label>
              </div>
            </div>
            
            <div className="flex-grow pb-2 sm:pb-8 space-y-2 text-center sm:text-left">
              <h1 className="text-2xl sm:text-4xl font-display font-bold text-foreground tracking-tight flex items-center justify-center sm:justify-start gap-3">
                @{profile?.username || 'user'}
                {profile?.is_verified && <Award className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />}
              </h1>
              <div className="flex items-center justify-center sm:justify-start space-x-6 text-foreground/40 font-medium text-sm sm:text-base">
                 <div className="flex items-center space-x-1">
                    <span className="text-foreground font-bold">{followerCount}</span>
                    <span className="text-[10px] uppercase tracking-widest text-foreground/40">Followers</span>
                 </div>
                 <div className="flex items-center space-x-1">
                    <span className="text-foreground font-bold">{followingCount}</span>
                    <span className="text-[10px] uppercase tracking-widest text-foreground/40">Following</span>
                 </div>
              </div>
            </div>

            <div className="flex space-x-3 pb-2 sm:pb-8">
              {isOwnProfile ? (
                <>
                  <button 
                    onClick={toggleEdit} 
                    className="px-5 sm:px-6 py-2.5 sm:py-3 bg-foreground/5 border border-border-custom rounded-xl sm:rounded-2xl text-foreground text-[10px] font-black uppercase tracking-widest flex items-center space-x-2 hover:bg-foreground/10 transition-all shadow-sm"
                  >
                    {isEditing ? <X className="w-4 h-4 text-foreground/40" /> : <Edit3 className="w-4 h-4 text-primary" />}
                    <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                  </button>
                  <button 
                    onClick={handleSignOut}
                    className="p-2.5 sm:p-3 bg-foreground/5 border border-border-custom rounded-xl sm:rounded-2xl text-foreground/40 hover:text-red-500 transition-all shadow-sm"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <FollowButton 
                  targetUserId={profile?.id || ''} 
                  className="sm:px-8 sm:py-4 rounded-2xl" 
                  onFollowChange={(active) => setFollowerCount(prev => active ? prev + 1 : prev - 1)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-32 sm:mt-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Sidebar Info */}
          <div className="lg:w-80 space-y-8">
             <div className="glass rounded-[2.5rem] p-8 space-y-6">
                <h3 className="font-display font-bold text-foreground text-lg">About Me</h3>
                {isEditing ? (
                  <div className="space-y-4">
                    <textarea 
                      value={editForm.bio}
                      onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Write a little about yourself..."
                      className="w-full bg-background border border-border-custom rounded-xl p-3 text-sm text-foreground focus:outline-none focus:border-primary/50 resize-none h-24 shadow-inner placeholder:text-text-muted"
                    />
                    <div className="space-y-3">
                      <div className="relative">
                        <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input 
                          type="text"
                          value={editForm.social_x}
                          onChange={e => setEditForm(prev => ({ ...prev, social_x: e.target.value }))}
                          placeholder="X (Twitter) Username/Link"
                          className="w-full bg-background border border-border-custom rounded-xl py-2 pl-10 pr-3 text-sm text-foreground focus:outline-none focus:border-primary/50 shadow-inner placeholder:text-text-muted"
                        />
                      </div>
                      <div className="relative">
                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input 
                          type="text"
                          value={editForm.social_instagram}
                          onChange={e => setEditForm(prev => ({ ...prev, social_instagram: e.target.value }))}
                          placeholder="Instagram Username/Link"
                          className="w-full bg-background border border-border-custom rounded-xl py-2 pl-10 pr-3 text-sm text-foreground focus:outline-none focus:border-primary/50 shadow-inner placeholder:text-text-muted"
                        />
                      </div>
                      <div className="relative">
                        <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input 
                          type="text"
                          value={editForm.social_linkedin}
                          onChange={e => setEditForm(prev => ({ ...prev, social_linkedin: e.target.value }))}
                          placeholder="LinkedIn URL"
                          className="w-full bg-background border border-border-custom rounded-xl py-2 pl-10 pr-3 text-sm text-foreground focus:outline-none focus:border-primary/50 shadow-inner placeholder:text-text-muted"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={saveProfile}
                      disabled={saving}
                      className="w-full bg-primary hover:bg-primary-light text-white text-xs font-bold uppercase tracking-widest py-3 rounded-xl transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 shadow-lg shadow-primary/20"
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Save Profile</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-foreground/60 leading-relaxed font-light italic">
                      {profile?.bio || "No bio yet. Tell the community about your creative journey!"}
                    </p>
                    {(profile?.social_x || profile?.social_instagram || profile?.social_linkedin) && (
                      <div className="flex gap-4 pt-4 border-t border-border-custom">
                        {profile.social_x && (
                          <a href={profile.social_x.startsWith('http') ? profile.social_x : `https://x.com/${profile.social_x.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-foreground/40 hover:text-primary transition-colors">
                            <Twitter className="w-5 h-5" />
                          </a>
                        )}
                        {profile.social_instagram && (
                          <a href={profile.social_instagram.startsWith('http') ? profile.social_instagram : `https://instagram.com/${profile.social_instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-foreground/40 hover:text-primary transition-colors">
                            <Instagram className="w-5 h-5" />
                          </a>
                        )}
                        {profile.social_linkedin && (
                          <a href={profile.social_linkedin.startsWith('http') ? profile.social_linkedin : `https://linkedin.com/in/${profile.social_linkedin}`} target="_blank" rel="noopener noreferrer" className="text-foreground/40 hover:text-primary transition-colors">
                            <Linkedin className="w-5 h-5" />
                          </a>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                {!isEditing && (
                  <div className="pt-6 border-t border-border-custom space-y-4">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-foreground/40">Joined</span>
                      <span className="text-foreground font-black">May 2024</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                      <span className="text-foreground/40">Posts</span>
                      <span className="text-foreground font-black">{posts.length}</span>
                    </div>
                  </div>
                )}
             </div>

             <div className="glass rounded-[2.5rem] p-8 space-y-6">
                <h3 className="font-display font-bold text-foreground text-lg flex items-center gap-3">
                   <ShieldCheck className="w-5 h-5 text-primary" />
                   Verification
                </h3>
                {profile?.is_verified ? (
                  <div className="p-6 bg-primary/5 border border-primary/20 rounded-[2rem] space-y-3 shadow-inner">
                     <div className="flex items-center gap-3 text-primary">
                        <Award className="w-8 h-8" />
                        <span className="text-xs font-black uppercase tracking-widest">Official Badge</span>
                     </div>
                     <p className="text-[10px] text-foreground/40 font-medium leading-relaxed italic">Your account is officially verified on FideTV. You have access to exclusive community features.</p>
                  </div>
                ) : profile?.verification_requested ? (
                  <div className="p-6 bg-yellow-500/5 border border-yellow-500/20 rounded-[2rem] space-y-3 shadow-inner">
                     <div className="flex items-center gap-3 text-yellow-500">
                        <ShieldAlert className="w-8 h-8" />
                        <span className="text-xs font-black uppercase tracking-widest">Pending Review</span>
                     </div>
                     <p className="text-[10px] text-foreground/40 font-medium leading-relaxed italic">Your request is being processed by our team. We'll notify you once it's approved.</p>
                  </div>
                ) : isOwnProfile ? (
                  <div className="space-y-4">
                     <p className="text-xs text-foreground/40 leading-relaxed font-medium italic">Get a verification badge to build trust and unlock advanced platform features.</p>
                     <button 
                       onClick={() => setIsVerifying(true)}
                       className="w-full py-4 bg-foreground/5 border border-border-custom rounded-2xl text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-primary hover:text-white hover:border-primary transition-all shadow-xl shadow-black/5"
                     >
                       Request Badge
                     </button>
                  </div>
                ) : (
                  <div className="p-6 bg-foreground/5 border border-dashed border-border-custom rounded-[2rem] text-center">
                    <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest italic">Standard Profile</p>
                  </div>
                )}
             </div>
          </div>

          {/* User Feed */}
          <div className="flex-grow space-y-8">
              <div className="flex items-center space-x-8 border-b border-border-custom pb-4">
                <button 
                  onClick={() => setActiveTab('posts')}
                  className={cn(
                    "flex items-center space-x-2 pb-4 font-bold text-sm uppercase tracking-widest leading-none transition-all",
                    activeTab === 'posts' ? "text-primary border-b-2 border-primary" : "text-foreground/40 hover:text-foreground"
                  )}
                >
                  <Grid className="w-4 h-4" />
                  <span>Posts</span>
                </button>
                {isOwnProfile && (
                  <button 
                    onClick={() => setActiveTab('bookings')}
                    className={cn(
                      "flex items-center space-x-2 pb-4 font-bold text-sm uppercase tracking-widest leading-none transition-all",
                      activeTab === 'bookings' ? "text-primary border-b-2 border-primary" : "text-foreground/40 hover:text-foreground"
                    )}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>My Bookings</span>
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab('liked')}
                  className={cn(
                    "flex items-center space-x-2 pb-4 font-bold text-sm uppercase tracking-widest leading-none transition-all",
                    activeTab === 'liked' ? "text-primary border-b-2 border-primary" : "text-foreground/40 hover:text-foreground"
                  )}
                >
                  <Heart className="w-4 h-4" />
                  <span>Liked</span>
                </button>
             </div>

             <div className="grid grid-cols-1 gap-8">
                {activeTab === 'posts' ? (
                  posts.length > 0 ? (
                    posts.map((post) => <PostCard key={post.id} post={post} />)
                  ) : (
                    <div className="text-center py-20 bg-surface/30 rounded-[3rem] border border-dashed border-border-custom">
                      <MessageSquare className="w-12 h-12 text-foreground/20 mx-auto mb-6" />
                      <h3 className="text-xl font-display font-medium text-foreground/40 italic">You haven't posted anything yet.</h3>
                    </div>
                  )
                ) : activeTab === 'bookings' ? (
                  bookings.length > 0 ? (
                    <div className="space-y-6">
                      {bookings.map((booking: Booking) => (
                        <div key={booking.id} className="glass rounded-[2.5rem] p-8 border-border-custom space-y-6">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                  booking.status === 'confirmed' ? "bg-green-500/10 text-green-500" : 
                                  booking.status === 'cancelled' ? "bg-red-500/10 text-red-500" :
                                  "bg-yellow-500/10 text-yellow-500"
                                )}>
                                  {booking.status}
                                </span>
                                <h4 className="text-xs font-bold text-foreground/40 uppercase tracking-widest">#{booking.id.slice(0, 8)}</h4>
                              </div>
                              <h3 className="text-xl font-bold text-foreground tracking-tight">{booking.event_type}</h3>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-mono text-foreground tracking-tighter">{format(new Date(booking.date), 'PPPP')}</p>
                              <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest mt-1">Event Date</p>
                            </div>
                          </div>

                          <div className="flex gap-8 py-6 border-y border-border-custom">
                            <div className="flex-1 space-y-1">
                              <p className="text-[10px] text-foreground/40 font-black uppercase tracking-widest">Requirements</p>
                              <p className="text-sm text-foreground/60 font-light italic leading-relaxed line-clamp-3">"{booking.message}"</p>
                            </div>
                            {booking.budget && (
                              <div className="space-y-1">
                                <p className="text-[10px] text-foreground/40 font-black uppercase tracking-widest">Budget</p>
                                <p className="text-sm text-primary font-bold">{booking.budget}</p>
                              </div>
                            )}
                          </div>

                          {booking.status === 'confirmed' && (
                            <div className="pt-2 space-y-4">
                              {booking.feedback ? (
                                <div className="p-6 bg-primary/5 border border-primary/20 rounded-[2rem] space-y-3">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-primary">
                                      <Star className="w-4 h-4 fill-current" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Your Experience</span>
                                    </div>
                                    <div className="flex gap-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star key={star} className={cn(
                                          "w-3 h-3",
                                          star <= (booking.rating || 0) ? "fill-primary text-primary" : "text-foreground/10"
                                        )} />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-sm text-foreground/60 font-light italic leading-relaxed">"{booking.feedback}"</p>
                                </div>
                              ) : new Date(booking.date) < new Date() ? (
                                <div className="space-y-6">
                                  <div className="flex items-center justify-between px-4">
                                    <div className="flex items-center gap-2 text-foreground/40">
                                      <CheckCircle2 className="w-4 h-4" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">How was it?</span>
                                    </div>
                                    <div className="flex gap-2">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                          key={star}
                                          onClick={() => setRating(star)}
                                          className="transition-transform active:scale-90"
                                        >
                                          <Star className={cn(
                                            "w-6 h-6 transition-colors",
                                            star <= rating ? "fill-primary text-primary" : "text-foreground/10 hover:text-foreground/30"
                                          )} />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="relative">
                                    <textarea
                                      value={feedbackText}
                                      onChange={(e) => setFeedbackText(e.target.value)}
                                      placeholder="Tell us about your experience..."
                                      className="w-full bg-background border border-border-custom rounded-2xl p-5 text-sm text-foreground focus:border-primary/50 transition-colors min-h-[100px] resize-none shadow-inner"
                                    />
                                    <button
                                      onClick={() => submitFeedback(booking.id)}
                                      disabled={submittingFeedback === booking.id || !feedbackText.trim() || rating === 0}
                                      className="absolute bottom-4 right-4 p-3 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                                    >
                                      {submittingFeedback === booking.id ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      ) : (
                                        <Send className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-6 bg-foreground/5 border border-dashed border-border-custom rounded-[2rem] text-center">
                                  <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest italic">Feedback will be available after your session</p>
                                </div>
                              )}
                            </div>
                          )}

                          {booking.status === 'pending' && (
                            <p className="text-[10px] text-foreground/40 italic text-center">Your booking is currently under review. Check your email for more information.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-surface/30 rounded-[3rem] border border-dashed border-border-custom">
                      <Calendar className="w-12 h-12 text-foreground/20 mx-auto mb-6" />
                      <h3 className="text-xl font-display font-medium text-foreground/40 italic">No bookings found.</h3>
                      <button onClick={() => navigate('/booking')} className="mt-6 text-primary text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all font-black">Book a session now</button>
                    </div>
                  )
                ) : (
                  <div className="text-center py-20 bg-surface/30 rounded-[3rem] border border-dashed border-border-custom">
                    <Heart className="w-12 h-12 text-foreground/20 mx-auto mb-6" />
                    <h3 className="text-xl font-display font-medium text-foreground/40 italic">You haven't liked any posts yet.</h3>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      <AnimatePresence>
        {isVerifying && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]" onClick={() => setIsVerifying(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-surface rounded-[3rem] border border-border-custom z-[101] p-10 shadow-2xl">
               <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-8 border border-primary/20 mx-auto">
                  <Award className="w-10 h-10 text-primary" />
               </div>
               <h2 className="text-3xl font-display font-bold text-foreground mb-2 text-center tracking-tighter">Get <span className="text-primary">Verified.</span></h2>
               <p className="text-foreground/40 text-sm mb-8 text-center px-4 italic">Tell us why you should be verified. (e.g. Creator, Business Owner, Public Figure)</p>
               
               <div className="space-y-6">
                  <div className="space-y-2">
                     <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Why should we verify you?</label>
                     <div className="relative">
                        <FileText className="absolute left-4 top-4 w-4 h-4 text-foreground/20" />
                        <textarea 
                          value={verificationDetails} 
                          onChange={e => setVerificationDetails(e.target.value)} 
                          placeholder="Provide details or external links to verify your identity..." 
                          className="w-full bg-background border border-border-custom rounded-2xl py-4 pl-12 pr-4 text-foreground text-sm min-h-[120px] focus:border-primary/50 transition-colors shadow-inner"
                        />
                     </div>
                  </div>

                  <div className="flex gap-4">
                     <button onClick={() => setIsVerifying(false)} className="flex-1 py-4 text-xs font-bold uppercase tracking-widest text-foreground/40 hover:text-foreground transition-colors">Cancel</button>
                     <button 
                       onClick={requestVerification}
                       disabled={sendingRequest || !verificationDetails}
                       className="flex-1 py-4 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                     >
                       {sendingRequest ? 'Sending...' : 'Submit Request'}
                     </button>
                  </div>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
