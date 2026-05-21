import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { Event, Community, News, Booking, Profile, PortfolioItem, TvChannel, Service } from '@/types';
import { 
  LayoutDashboard, Radio, MessageSquare, Users, Settings, Plus, 
  Edit2, Trash2, Globe, Youtube, ToggleLeft, ToggleRight, 
  Sparkles, Camera, Eye, Newspaper, BookOpen, Clock, CheckCircle2, XCircle,
  ShieldCheck, ShieldAlert, Award, Headset, Briefcase, Tv, Zap, DollarSign,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import { fetchYouTubeStats, YouTubeStats } from '@/services/youtubeService';
import { DEFAULT_CHANNELS } from '@/constants/channels';
import AdBanner from '@/components/AdBanner';

type AdminTab = 'overview' | 'events' | 'news' | 'communities' | 'bookings' | 'users' | 'support' | 'portfolio' | 'channels' | 'services' | 'site' | 'ads';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [events, setEvents] = useState<Event[]>([]);
  const [channels, setChannels] = useState<TvChannel[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [editingTeamIndex, setEditingTeamIndex] = useState<number | null>(null);
  const [teamForm, setTeamForm] = useState({
    name: '',
    role: '',
    bio: '',
    avatarUrl: '',
    socialX: '',
    socialInstagram: '',
    socialLinkedin: '',
  });
  const [creatorSpotlights, setCreatorSpotlights] = useState<any[]>([]);
  const [editingSpotlightIndex, setEditingSpotlightIndex] = useState<number | null>(null);
  const [spotlightForm, setSpotlightForm] = useState({
    id: '',
    username: '',
    full_name: '',
    avatar_url: '',
    bio: '',
    is_verified: true,
    role: '',
    followers: 1000,
    specialty: ''
  });
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [adUnits, setAdUnits] = useState<any[]>([]);
  const [supportChats, setSupportChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [adminReply, setAdminReply] = useState('');
  const [dbErrors, setDbErrors] = useState<Record<string, string>>({});
  const [communityStats, setCommunityStats] = useState<any[]>([]);
  const [visitCount, setVisitCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ytStats, setYtStats] = useState<Record<string, YouTubeStats>>({});
  
  // SHARED Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  
  // ADS Form State
  const [adUnitId, setAdUnitId] = useState('');
  const [platform, setPlatform] = useState('android');
  const [adType, setAdType] = useState('banner');
  const [isActive, setIsActive] = useState(true);

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

  // AUTO SLUG GENERATOR
  useEffect(() => {
    if (activeTab === 'news' && title && !editingId) {
      const generatedSlug = title.toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generatedSlug);
    }
  }, [title, activeTab, editingId]);

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
      .channel('admin-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchBookings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => fetchSupportChats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchProfiles())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEvents())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_units' }, () => fetchAdUnits())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'news' }, () => fetchNews())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => fetchServices())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolio_items' }, () => fetchPortfolio())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tv_channels' }, () => fetchChannels())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const [communitySubTab, setCommunitySubTab] = useState<'hubs' | 'requests' | 'posts'>('hubs');
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [allPosts, setAllPosts] = useState<any[]>([]);

  const fetchCommunityRequests = async () => {
    const { data } = await supabase
      .from('community_members')
      .select('*, profiles(username, avatar_url, full_name), communities(name)')
      .eq('status', 'pending');
    if (data) setPendingRequests(data);
  };

  const fetchAllPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url), communities(name)')
      .order('created_at', { ascending: false });
    if (data) setAllPosts(data);
  };

  const handleRequestAction = async (requestId: string, approve: boolean) => {
    if (approve) {
      await supabase.from('community_members').update({ status: 'approved' }).eq('id', requestId);
    } else {
      await supabase.from('community_members').delete().eq('id', requestId);
    }
    fetchCommunityRequests();
    fetchCommunityStats();
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Delete this post and all its comments?')) return;
    await supabase.from('posts').delete().eq('id', postId);
    fetchAllPosts();
  };

  useEffect(() => {
    if (activeTab === 'communities') {
      if (communitySubTab === 'requests') fetchCommunityRequests();
      if (communitySubTab === 'posts') fetchAllPosts();
    }
  }, [activeTab, communitySubTab]);

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
        fetchServices(),
        fetchSiteSettings(),
        fetchAdUnits(),
        fetchVisits()
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
    if (activeTab === 'site') await fetchSiteSettings();
    if (activeTab === 'ads') await fetchAdUnits();
    setLoading(false);
  };

  const fetchAdUnits = async () => {
    const { data, error } = await supabase.from('ad_units').select('*').order('created_at', { ascending: false });
    if (error) {
      if (error.message.includes('relation "public.ad_units" does not exist')) {
        setDbErrors(prev => ({ ...prev, ad_units: 'Table missing. Run SQL setup.' }));
      }
      return;
    }
    if (data) {
      setAdUnits(data);
      setDbErrors(prev => {
        const next = { ...prev };
        delete next.ad_units;
        return next;
      });
    }
  };

  const fetchSiteSettings = async () => {
    const { data, error } = await supabase.from('site_settings').select('*');
    if (error) {
      if (error.message.includes('relation "public.site_settings" does not exist') || 
          error.message.includes('Could not find the table \'public.site_settings\'')) {
        setDbErrors(prev => ({ ...prev, site_settings: 'Table missing. Run SQL setup.' }));
      }
      return;
    }
    if (data) {
      const settings = data.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      setSiteSettings(settings);
      if (settings.team_members) {
        try {
          setTeamMembers(JSON.parse(settings.team_members));
        } catch (e) {
          console.error('Error parsing team members:', e);
        }
      }
      if (settings.creator_spotlights) {
        try {
          setCreatorSpotlights(JSON.parse(settings.creator_spotlights));
        } catch (e) {
          console.error('Error parsing creator spotlights:', e);
        }
      }
    }
  };

  const saveSiteSetting = async (key: string, value: string) => {
    const { error } = await supabase.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() });
    if (!error) {
      setDbErrors(prev => {
        const next = { ...prev };
        delete next.site_settings;
        return next;
      });
      setSiteSettings(prev => ({ ...prev, [key]: value }));
      alert('Setting saved!');
    } else {
      if (error.message.includes('relation "public.site_settings" does not exist') || 
          error.message.includes('Could not find the table \'public.site_settings\'')) {
        setDbErrors(prev => ({ ...prev, site_settings: 'Table missing. Run SQL setup.' }));
      }
      alert('Error saving setting: ' + error.message);
    }
  };

  const uploadFileToStorage = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `assets_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from('event-thumbnails')
        .upload(fileName, file);
      
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage
          .from('event-thumbnails')
          .getPublicUrl(data.path);
        return publicUrl;
      } else {
        console.warn("Storage upload err:", error);
      }
    } catch (e) {
      console.warn("Storage upload threw:", e);
    }
    
    // Base64 fallback block
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  const handleHeroImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    try {
      const url = await uploadFileToStorage(file);
      setSiteSettings(prev => ({ ...prev, hero_image_url: url }));
      await saveSiteSetting('hero_image_url', url);
    } catch (error: any) {
      alert("Error handling file: " + error.message);
    } finally {
      setUploadingHero(false);
    }
  };

  const handleTeamAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadFileToStorage(file);
      setTeamForm(prev => ({ ...prev, avatarUrl: url }));
    } catch (error: any) {
      alert("Error uploading avatar: " + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name || !teamForm.role) {
      alert("Please provide at least a name and a role!");
      return;
    }
    
    const updatedTeam = [...teamMembers];
    if (editingTeamIndex !== null) {
      updatedTeam[editingTeamIndex] = teamForm;
    } else {
      updatedTeam.push(teamForm);
    }
    
    setTeamMembers(updatedTeam);
    setSiteSettings(prev => ({ ...prev, team_members: JSON.stringify(updatedTeam) }));
    await supabase.from('site_settings').upsert({ 
      key: 'team_members', 
      value: JSON.stringify(updatedTeam), 
      updated_at: new Date().toISOString() 
    });
    
    // Reset form
    setTeamForm({
      name: '',
      role: '',
      bio: '',
      avatarUrl: '',
      socialX: '',
      socialInstagram: '',
      socialLinkedin: '',
    });
    setEditingTeamIndex(null);
    alert('Team roster saved!');
  };

  const handleDeleteTeamMember = async (index: number) => {
    if (confirm('Are you sure you want to remove this team member?')) {
      const updatedTeam = teamMembers.filter((_, i) => i !== index);
      setTeamMembers(updatedTeam);
      setSiteSettings(prev => ({ ...prev, team_members: JSON.stringify(updatedTeam) }));
      await supabase.from('site_settings').upsert({ 
        key: 'team_members', 
        value: JSON.stringify(updatedTeam), 
        updated_at: new Date().toISOString() 
      });
      alert('Member removed!');
    }
  };

  const handleEditTeamMember = (index: number) => {
    setEditingTeamIndex(index);
    setTeamForm(teamMembers[index]);
  };

  const cancelTeamForm = () => {
    setEditingTeamIndex(null);
    setTeamForm({
      name: '',
      role: '',
      bio: '',
      avatarUrl: '',
      socialX: '',
      socialInstagram: '',
      socialLinkedin: '',
    });
  };

  const saveCreatorSpotlight = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedSpotlights = [...creatorSpotlights];
    const formWithId = spotlightForm.id ? spotlightForm : { ...spotlightForm, id: `spotlight-${Date.now()}` };
    if (editingSpotlightIndex !== null) {
      updatedSpotlights[editingSpotlightIndex] = formWithId;
    } else {
      updatedSpotlights.push(formWithId);
    }
    setCreatorSpotlights(updatedSpotlights);
    setSiteSettings(prev => ({ ...prev, creator_spotlights: JSON.stringify(updatedSpotlights) }));
    await supabase.from('site_settings').upsert({
      key: 'creator_spotlights',
      value: JSON.stringify(updatedSpotlights),
      updated_at: new Date().toISOString()
    });
    setSpotlightForm({
      id: '',
      username: '',
      full_name: '',
      avatar_url: '',
      bio: '',
      is_verified: true,
      role: '',
      followers: 1000,
      specialty: ''
    });
    setEditingSpotlightIndex(null);
    alert('Creator Spotlight updated!');
  };

  const handleDeleteCreatorSpotlight = async (index: number) => {
    if (confirm('Are you sure you want to remove this spotlighted creator?')) {
      const updated = creatorSpotlights.filter((_, i) => i !== index);
      setCreatorSpotlights(updated);
      setSiteSettings(prev => ({ ...prev, creator_spotlights: JSON.stringify(updated) }));
      await supabase.from('site_settings').upsert({
        key: 'creator_spotlights',
        value: JSON.stringify(updated),
        updated_at: new Date().toISOString()
      });
      alert('Spotlight removed!');
    }
  };

  const handleEditCreatorSpotlight = (index: number) => {
    setEditingSpotlightIndex(index);
    setSpotlightForm(creatorSpotlights[index]);
  };

  const cancelSpotlightForm = () => {
    setEditingSpotlightIndex(null);
    setSpotlightForm({
      id: '',
      username: '',
      full_name: '',
      avatar_url: '',
      bio: '',
      is_verified: true,
      role: '',
      followers: 1000,
      specialty: ''
    });
  };

  const fetchServices = async () => {
    const { data, error } = await supabase.from('services').select('*').order('order_index');
    if (error) {
      if (error.message.includes('relation "public.services" does not exist') || 
          error.message.includes('Could not find the table \'public.services\'')) {
        setDbErrors(prev => ({ ...prev, services: 'Table missing.' }));
      }
      return;
    }
    if (data) setServices(data);
  };

  const fetchChannels = async () => {
    const { data, error } = await supabase.from('tv_channels').select('*').order('order_index');
    if (error) {
      if (error.message.includes('relation "public.tv_channels" does not exist') || 
          error.message.includes('Could not find the table \'public.tv_channels\'')) {
        setDbErrors(prev => ({ ...prev, tv_channels: 'Table missing.' }));
      }
      return;
    }
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
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      if (error.message.includes('relation "public.profiles" does not exist') || 
          error.message.includes('Could not find the table \'public.profiles\'')) {
        setDbErrors(prev => ({ ...prev, profiles: 'Table missing.' }));
      }
      return;
    }
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

  const fetchVisits = async () => {
    const baseVisits = 18542;
    try {
      const { count, error } = await supabase
        .from('site_visits')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      
      const localVisits = parseInt(localStorage.getItem('fidetv_local_visits') || '0', 10);
      setVisitCount(baseVisits + (count || 0) + localVisits);
      setDbErrors(prev => {
        const next = { ...prev };
        delete next.site_visits;
        return next;
      });
    } catch (e) {
      setDbErrors(prev => ({ ...prev, site_visits: 'Visit tracking table missing' }));
      const localVisits = parseInt(localStorage.getItem('fidetv_local_visits') || '1', 10);
      setVisitCount(baseVisits + localVisits);
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
      payload = { title, description, icon, features, price, order_index: services.length };
    } else if (activeTab === 'ads') {
      table = 'ad_units';
      payload = { name: title, platform, ad_unit_id: adUnitId, ad_type: adType, is_active: isActive };
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
    setAdUnitId(''); setPlatform('android'); setAdType('banner'); setIsActive(true);
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
      <h2 className="text-3xl font-display font-bold text-foreground mb-4">Access Restricted</h2>
      <p className="text-foreground/40 max-w-sm mb-10 italic">Only authorized administrators can access the FideTV Dashboard.</p>
      <button onClick={() => window.location.href = '/'} className="px-8 py-4 bg-surface border border-border-custom rounded-full text-xs font-bold uppercase tracking-widest text-foreground hover:bg-surface-bright transition-all shadow-sm">
        Go Back Home
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-32">
         {/* Header */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
            <div className="space-y-2">
               <h1 className="text-4xl font-display font-bold text-foreground tracking-tighter">Admin <span className="text-foreground/40 italic">Studio.</span></h1>
               <p className="text-foreground/40 font-medium tracking-wide">Command center for FideTV Media content and community.</p>
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
              { id: 'support', name: 'Support', icon: MessageSquare },
              { id: 'site', name: 'Site Setup', icon: Settings },
              { id: 'ads', name: 'Google Ads', icon: DollarSign }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={cn(
                  "px-8 py-4 rounded-2xl flex items-center space-x-3 font-bold text-xs uppercase tracking-widest transition-all border shadow-sm",
                  activeTab === tab.id 
                    ? "bg-surface border-primary text-foreground" 
                    : "bg-surface border-border-custom text-foreground/40 hover:text-foreground hover:border-foreground/20"
                )}
              >
                <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-primary" : "text-foreground/20")} />
                <span>{tab.name}</span>
              </button>
            ))}
         </div>

       {/* Content Rendering */}
       <div className="space-y-12">
          {activeTab !== 'overview' && <AdBanner placement="Admin Dashboard Top" className="mb-4" />}
          {activeTab === 'site' && (
            <div className="space-y-12">
              {dbErrors.site_settings && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-8 space-y-4">
                  <div className="flex items-center gap-3 text-red-500">
                    <ShieldAlert className="w-5 h-5" />
                    <h3 className="font-display font-bold uppercase tracking-tight">Database Table Missing</h3>
                  </div>
                  <p className="text-xs text-foreground/60 leading-relaxed italic">
                    The <code className="bg-red-500/10 px-2 py-0.5 rounded text-red-500">site_settings</code> table is missing from your Supabase database. 
                    Please run the following SQL code in your Supabase SQL Editor:
                  </p>
                  <pre className="bg-background/50 p-6 rounded-2xl text-[10px] font-mono text-foreground/40 overflow-x-auto border border-border-custom shadow-inner">
{`CREATE TABLE IF NOT EXISTS public.site_visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Community Management V2 (Join Request Logic)
ALTER TABLE public.community_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved'));

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can insert visits" ON public.site_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin view visits" ON public.site_visits FOR SELECT USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');

CREATE TABLE IF NOT EXISTS public.ad_units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  ad_unit_id TEXT NOT NULL,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('banner', 'interstitial', 'rewarded', 'native', 'adsense')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ad_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ad units viewable by everyone" ON public.ad_units FOR SELECT USING (true);
CREATE POLICY "Admin manage ad units" ON public.ad_units FOR ALL USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');

CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings viewable by everyone" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Communities viewable by everyone" ON public.communities FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create communities" ON public.communities FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Admins manage member roles" ON public.community_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.community_members m
    WHERE m.community_id = public.community_members.community_id
    AND m.user_id = auth.uid()
    AND m.role IN ('moderator', 'admin')
  ) OR (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com')
);
CREATE POLICY "Admins manage member removal" ON public.community_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.community_members m
    WHERE m.community_id = public.community_members.community_id
    AND m.user_id = auth.uid()
    AND m.role IN ('moderator', 'admin')
  ) OR (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com')
);
CREATE POLICY "Admin manage settings" ON public.site_settings FOR ALL USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');

CREATE TABLE IF NOT EXISTS public.news_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  news_id UUID REFERENCES public.news(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(news_id, user_id)
);
ALTER TABLE public.news_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "News likes viewable by everyone" ON public.news_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like news" ON public.news_likes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can unlike news" ON public.news_likes FOR DELETE USING (auth.uid() = user_id);

INSERT INTO public.site_settings (key, value) VALUES ('showreel_url', 'https://www.youtube.com/watch?v=0D-zn6YAqCY') ON CONFLICT (key) DO NOTHING;
`}
                  </pre>
                  <p className="text-[10px] text-foreground/40 font-medium italic mt-4 leading-relaxed">
                    Note: For a full database setup including all tables (Events, Portfolio, Services, etc.), please copy and run the contents of <span className="text-primary font-bold">supabase_schema.sql</span> from your project root.
                  </p>
                  <button 
                    onClick={() => fetchData()}
                    className="px-6 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest mt-4"
                  >
                    Refresh After Running SQL
                  </button>
                </div>
              )}

              <div className="bg-surface rounded-[2.5rem] p-10 border border-border-custom space-y-10 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                    <Youtube className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-foreground uppercase tracking-tight">Showreel Configuration</h2>
                    <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest mt-1 italic">Manage the video featured on the services page.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] uppercase font-black tracking-[0.2em] text-foreground/40 block ml-4">Youtube showreel URL</label>
                  <div className="flex gap-4">
                    <input 
                      value={siteSettings.showreel_url || ''} 
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, showreel_url: e.target.value }))}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="flex-grow bg-background border border-border-custom rounded-2xl p-6 text-sm text-foreground focus:border-primary/50 transition-colors shadow-inner" 
                    />
                    <button 
                      onClick={() => saveSiteSetting('showreel_url', siteSettings.showreel_url)}
                      className="px-10 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                    >
                      Update URL
                    </button>
                  </div>
                  <p className="text-[9px] text-foreground/20 px-4 italic">This video will appear in the "Watch our Live Showreel" section on the Services page.</p>
                </div>
              </div>

              {/* Hero Image Optimization and Config */}
              <div className="bg-surface rounded-[2.5rem] p-10 border border-border-custom space-y-8 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                    <Camera className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold text-foreground uppercase tracking-tight">Hero Section Image</h2>
                    <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest mt-1 italic">This image will appear next to the Design. Stream. Grow. writer on the Home hero.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-5 flex flex-col items-center justify-center bg-background/50 border border-border-custom rounded-3xl p-6 relative overflow-hidden group min-h-[220px]">
                    {siteSettings.hero_image_url ? (
                      <img 
                        referrerPolicy="no-referrer"
                        src={siteSettings.hero_image_url} 
                        alt="Hero side render" 
                        className="w-full h-full max-h-[180px] object-cover rounded-2xl border border-border-custom/50"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Camera className="w-10 h-10 text-foreground/25 mx-auto mb-2" />
                        <span className="text-[10px] font-bold text-foreground/40 uppercase block">No custom image</span>
                        <span className="text-[9px] text-foreground/20 italic block">Default space illustration will load</span>
                      </div>
                    )}
                    {uploadingHero && (
                      <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex flex-col items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
                        <span className="text-[9px] font-bold text-primary uppercase tracking-wider">Uploading asset...</span>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-7 space-y-5">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-[0.2em] text-foreground/40 block ml-2">Upload Hero Image File</label>
                      <div className="relative border-2 border-dashed border-border-custom hover:border-primary/20 rounded-2xl transition-all p-6 text-center cursor-pointer bg-background/25">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleHeroImageFileChange}
                          className="absolute inset-0 opacity-0 cursor-pointer" 
                          disabled={uploadingHero}
                        />
                        <Camera className="w-6 h-6 text-primary/50 mx-auto mb-2" />
                        <h4 className="text-[11px] font-bold text-foreground">Click to select file...</h4>
                        <p className="text-[9px] text-foreground/40 mt-1 italic">Supported: PNG, JPEG, SVG, WebP</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-black tracking-[0.2em] text-foreground/40 block ml-2">Alternate Image URL Link</label>
                      <div className="flex gap-2">
                        <input 
                          type="text"
                          value={siteSettings.hero_image_url || ''}
                          onChange={(e) => setSiteSettings(prev => ({ ...prev, hero_image_url: e.target.value }))}
                          placeholder="Or paste direct image URL link..."
                          className="flex-grow bg-background border border-border-custom rounded-2xl px-4 py-3 text-xs text-foreground focus:border-primary/50 shadow-inner"
                        />
                        <button
                          onClick={() => saveSiteSetting('hero_image_url', siteSettings.hero_image_url || '')}
                          disabled={uploadingHero}
                          className="px-5 bg-primary/10 border border-primary/20 hover:bg-primary hover:text-white transition-all text-[9px] font-bold uppercase tracking-wider rounded-2xl text-primary"
                        >
                          Save URL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster / Team Members Management Block */}
              <div className="bg-surface rounded-[2.5rem] p-10 border border-border-custom space-y-8 shadow-sm">
                <div className="flex items-center justify-between border-b border-border-custom pb-6 flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-bold text-foreground uppercase tracking-tight">Agency Team Roster</h2>
                      <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest mt-1 italic">Add, modify, or reorganize core team members displayed on the Home page.</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                      {teamMembers.length} Active Members
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                  {/* Team form block */}
                  <div className="xl:col-span-5 bg-background/35 p-8 border border-border-custom rounded-3xl space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground pb-2 border-b border-border-custom">
                      {editingTeamIndex !== null ? '✏️ Edit Member Profile' : '➕ Add Team Member'}
                    </h3>

                    <form onSubmit={saveTeamMember} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Full Name</label>
                        <input 
                          type="text"
                          required
                          value={teamForm.name}
                          onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g. Fidelis Oruche"
                          className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-foreground focus:border-primary/50"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Corporate Role / Title</label>
                        <input 
                          type="text"
                          required
                          value={teamForm.role}
                          onChange={(e) => setTeamForm(prev => ({ ...prev, role: e.target.value }))}
                          placeholder="e.g. Lead Creative Director"
                          className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-foreground focus:border-primary/50"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Personal Bio (Layman terms)</label>
                        <textarea 
                          rows={3}
                          value={teamForm.bio}
                          onChange={(e) => setTeamForm(prev => ({ ...prev, bio: e.target.value }))}
                          placeholder="A quick 1-2 sentence statement about the member's expertise..."
                          className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-foreground focus:border-primary/50 leading-relaxed font-sans"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Profile Photo Image</label>
                          {teamForm.avatarUrl && (
                            <button
                              type="button"
                              onClick={() => setTeamForm(prev => ({ ...prev, avatarUrl: '' }))}
                              className="text-[9px] text-red-500 hover:underline font-bold"
                            >
                              Clear Image
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-8 relative border border-dashed border-border-custom rounded-xl p-3 text-center bg-background/20 hover:border-primary/25 cursor-pointer">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={handleTeamAvatarFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                              disabled={uploadingAvatar}
                            />
                            <span className="text-[10px] text-foreground font-bold">
                              {uploadingAvatar ? 'Uploading avatar...' : 'Choose File...'}
                            </span>
                          </div>
                          <div className="col-span-4">
                            <input 
                              type="text"
                              value={teamForm.avatarUrl}
                              onChange={(e) => setTeamForm(prev => ({ ...prev, avatarUrl: e.target.value }))}
                              placeholder="Photo URL Link..."
                              className="w-full bg-background border border-border-custom rounded-xl p-3 text-[10px] text-foreground"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3.5 pt-2 border-t border-border-custom">
                        <span className="text-[9px] font-black uppercase text-foreground/45 tracking-widest block">Social Media Links</span>
                        
                        <div className="grid grid-cols-3 gap-2">
                          <input 
                            type="text"
                            value={teamForm.socialX || ''}
                            onChange={(e) => setTeamForm(prev => ({ ...prev, socialX: e.target.value }))}
                            placeholder="Twitter Link"
                            className="bg-background border border-border-custom rounded-lg p-2 text-[10px] text-foreground"
                          />
                          <input 
                            type="text"
                            value={teamForm.socialInstagram || ''}
                            onChange={(e) => setTeamForm(prev => ({ ...prev, socialInstagram: e.target.value }))}
                            placeholder="Instagram Link"
                            className="bg-background border border-border-custom rounded-lg p-2 text-[10px] text-foreground"
                          />
                          <input 
                            type="text"
                            value={teamForm.socialLinkedin || ''}
                            onChange={(e) => setTeamForm(prev => ({ ...prev, socialLinkedin: e.target.value }))}
                            placeholder="LinkedIn Link"
                            className="bg-background border border-border-custom rounded-lg p-2 text-[10px] text-foreground"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <button
                          type="submit"
                          className="flex-grow py-3 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-102 active:scale-98 transition-all"
                        >
                          {editingTeamIndex !== null ? 'Save Profile Changes' : 'Add to Roster'}
                        </button>
                        {editingTeamIndex !== null && (
                          <button
                            type="button"
                            onClick={cancelTeamForm}
                            className="px-4 py-3 bg-surface border border-border-custom text-foreground font-bold text-[10px] uppercase rounded-xl"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Active team grid representation */}
                  <div className="xl:col-span-7 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground pb-2 border-b border-border-custom flex items-center gap-2">
                      <span>Roster Members List</span>
                      <span className="text-[9px] font-bold text-foreground/30 font-mono italic">(If empty, site defaults will display)</span>
                    </h3>

                    {teamMembers.length === 0 ? (
                      <div className="p-12 text-center bg-background/15 border border-border-custom rounded-3xl">
                        <Users className="w-10 h-10 text-foreground/20 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-foreground">No custom members added yet</h4>
                        <p className="text-xs text-foreground/40 mt-1 max-w-sm mx-auto leading-relaxed">
                          Your website is currently displaying the beautiful default system members (Fidelis Oruche, Kelechi Anozie, and Chinedu Okafor). Add custom profiles to override those.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto custom-scrollbar pr-1">
                        {teamMembers.map((member, idx) => (
                          <div 
                            key={idx}
                            className="p-5 bg-background border border-border-custom rounded-2xl flex flex-col justify-between hover:border-primary/25 transition-all shadow-xs shrink-0"
                          >
                            <div className="flex gap-4">
                              <div className="w-16 h-16 rounded-xl bg-surface overflow-hidden border border-border-custom shrink-0">
                                <img 
                                  referrerPolicy="no-referrer"
                                  src={member.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200"} 
                                  alt={member.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-xs font-black text-foreground">{member.name}</h4>
                                <span className="text-[9px] uppercase font-black tracking-widest text-primary block">{member.role}</span>
                                <p className="text-[10px] text-foreground/50 leading-relaxed line-clamp-2 italic pr-2">"{member.bio}"</p>
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-3 mt-3 border-t border-border-custom/40">
                              <span className="text-[8px] uppercase tracking-widest text-foreground/30 font-bold">Member Profile</span>
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => handleEditTeamMember(idx)}
                                  className="p-2 bg-surface hover:bg-surface-bright border border-border-custom rounded-lg transition-colors text-foreground"
                                  title="Edit member details"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteTeamMember(idx)}
                                  className="p-2 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg transition-all text-red-500"
                                  title="Delete member from roster"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Creator Spotlights Management Block */}
              <div className="bg-surface rounded-[2.5rem] p-10 border border-border-custom space-y-8 shadow-sm">
                <div className="flex items-center justify-between border-b border-border-custom pb-6 flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-display font-bold text-foreground uppercase tracking-tight">FideTV Creator Spotlights</h2>
                      <p className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest mt-1 italic">Add, modify, or reorganize spotlighted creators shown on the Community hub.</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                      {creatorSpotlights.length} Spotlighted Users
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                  {/* Spotlight form block */}
                  <div className="xl:col-span-5 bg-background/35 p-8 border border-border-custom rounded-3xl space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground pb-2 border-b border-border-custom">
                      {editingSpotlightIndex !== null ? '✏️ Edit Spotlight Profile' : '➕ Add Spotlight Creator'}
                    </h3>

                    <form onSubmit={saveCreatorSpotlight} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Full Name</label>
                        <input 
                          type="text"
                          required
                          value={spotlightForm.full_name || ''}
                          onChange={(e) => setSpotlightForm(prev => ({ ...prev, full_name: e.target.value }))}
                          placeholder="e.g. Mary Adeboye"
                          className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-foreground focus:border-primary/50"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Username (without @)</label>
                        <input 
                          type="text"
                          required
                          value={spotlightForm.username || ''}
                          onChange={(e) => setSpotlightForm(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                          placeholder="e.g. mary_adeboye"
                          className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-foreground focus:border-primary/50"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Category Profile Specialty / Badge</label>
                        <input 
                          type="text"
                          required
                          value={spotlightForm.specialty || ''}
                          onChange={(e) => setSpotlightForm(prev => ({ ...prev, specialty: e.target.value }))}
                          placeholder="e.g. Broadcasting (or Visual Production, Strategy)"
                          className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-foreground focus:border-primary/50"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Spotlight Role Badge</label>
                        <input 
                          type="text"
                          required
                          value={spotlightForm.role || ''}
                          onChange={(e) => setSpotlightForm(prev => ({ ...prev, role: e.target.value }))}
                          placeholder="e.g. Lead Broadcast Anchor"
                          className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-foreground focus:border-primary/50"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Followers / Connection Count</label>
                        <input 
                          type="number"
                          required
                          value={spotlightForm.followers || 0}
                          onChange={(e) => setSpotlightForm(prev => ({ ...prev, followers: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-foreground focus:border-primary/50"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Spotlight Bio Statement</label>
                        <textarea 
                          rows={3}
                          required
                          value={spotlightForm.bio || ''}
                          onChange={(e) => setSpotlightForm(prev => ({ ...prev, bio: e.target.value }))}
                          placeholder="Write a highly engaging quote or description about this creator..."
                          className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-foreground focus:border-primary/50 leading-relaxed font-sans"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-text-muted">Profile Avatar Image URL</label>
                        <input 
                          type="text"
                          required
                          value={spotlightForm.avatar_url || ''}
                          onChange={(e) => setSpotlightForm(prev => ({ ...prev, avatar_url: e.target.value }))}
                          placeholder="https://images.unsplash.com/etc..."
                          className="w-full bg-background border border-border-custom rounded-xl p-3 text-xs text-foreground focus:border-primary/50 font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-2 py-2">
                        <input 
                          type="checkbox"
                          id="is_verified_spot"
                          checked={spotlightForm.is_verified ?? true}
                          onChange={(e) => setSpotlightForm(prev => ({ ...prev, is_verified: e.target.checked }))}
                          className="w-4 h-4 rounded text-primary focus:ring-primary border-border-custom"
                        />
                        <label htmlFor="is_verified_spot" className="text-xs font-bold text-foreground uppercase tracking-wider cursor-pointer">Show Verified Badge</label>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <button
                          type="submit"
                          className="flex-grow py-3 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:scale-102 active:scale-98 transition-all"
                        >
                          {editingSpotlightIndex !== null ? 'Save Spotlight Changes' : 'Add Spotlight'}
                        </button>
                        {editingSpotlightIndex !== null && (
                          <button
                            type="button"
                            onClick={cancelSpotlightForm}
                            className="px-4 py-3 bg-surface border border-border-custom text-foreground font-bold text-[10px] uppercase rounded-xl"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Spotlight list grid */}
                  <div className="xl:col-span-7 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground pb-2 border-b border-border-custom flex items-center gap-2">
                      <span>Spotlight Roster</span>
                      <span className="text-[9px] font-bold text-foreground/30 font-mono italic">(Defaults will display if list is empty)</span>
                    </h3>

                    {creatorSpotlights.length === 0 ? (
                      <div className="p-12 text-center bg-background/15 border border-border-custom rounded-3xl">
                        <Sparkles className="w-10 h-10 text-foreground/20 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-foreground">No custom spotlights specified</h4>
                        <p className="text-xs text-foreground/40 mt-1 max-w-sm mx-auto leading-relaxed">
                          FideTV community is showing standard fallbacks (Mary Adeboye, Jacob Mensah, Sophia Nwachukwu). Start styling dynamic ones here!
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto custom-scrollbar pr-1">
                        {creatorSpotlights.map((spot, idx) => (
                          <div 
                            key={idx}
                            className="p-5 bg-background border border-border-custom rounded-2xl flex flex-col justify-between hover:border-primary/25 transition-all shadow-xs shrink-0"
                          >
                            <div className="flex gap-4">
                              <div className="w-16 h-16 rounded-xl bg-surface overflow-hidden border border-border-custom shrink-0">
                                <img 
                                  referrerPolicy="no-referrer"
                                  src={spot.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200"} 
                                  alt={spot.full_name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-xs font-black text-foreground flex items-center gap-1">
                                  <span>{spot.full_name}</span>
                                  {spot.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                                </h4>
                                <span className="text-[8px] uppercase font-mono text-foreground/40 block">@{spot.username}</span>
                                <span className="text-[9px] uppercase font-black tracking-widest text-primary block mt-1">{spot.role}</span>
                                <span className="text-[8.5px] uppercase font-bold tracking-widest text-foreground/60 block">{spot.specialty} · {spot.followers?.toLocaleString()} followers</span>
                                <p className="text-[10px] text-foreground/50 leading-relaxed line-clamp-2 italic pr-2 mt-1">"{spot.bio}"</p>
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-3 mt-3 border-t border-border-custom/40">
                              <span className="text-[8px] uppercase tracking-widest text-foreground/30 font-bold">Spotlight Node</span>
                              <div className="flex gap-1">
                                <button 
                                  type="button"
                                  onClick={() => handleEditCreatorSpotlight(idx)}
                                  className="p-2 bg-surface hover:bg-surface-bright border border-border-custom rounded-lg transition-colors text-foreground"
                                  title="Edit spotlight details"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteCreatorSpotlight(idx)}
                                  className="p-2 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 rounded-lg transition-all text-red-500"
                                  title="Remove spotlight"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Database Status Info */}
              <div className="bg-surface rounded-[2.5rem] p-10 border border-border-custom space-y-6 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground border-b border-border-custom pb-4">System Maintenance</h3>
                <div className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border-custom shadow-inner">
                   <span className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Database Version</span>
                   <span className="text-[10px] font-mono text-primary font-bold">PROD-v2.1</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="flex flex-col lg:flex-row gap-8 h-[700px]">
              {/* Chat Sidebar */}
              <div className="w-full lg:w-80 bg-surface rounded-[2.5rem] border border-border-custom overflow-hidden flex flex-col shadow-sm">
                <div className="p-6 border-b border-border-custom bg-background/50">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary italic">Support Inbox</h3>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar bg-background/20">
                  {supportChats.length > 0 ? (
                    supportChats.map(chat => (
                      <button 
                        key={chat.userId}
                        onClick={() => setSelectedChat(chat.userId)}
                        className={cn(
                          "w-full p-6 text-left border-b border-border-custom transition-all hover:bg-foreground/5",
                          selectedChat === chat.userId ? "bg-foreground/5" : ""
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <img 
                            src={chat.lastMessage.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.userId}`} 
                            className="w-10 h-10 rounded-full border border-border-custom shadow-sm" 
                          />
                          <div className="flex-grow min-w-0">
                            <div className="flex justify-between items-center mb-1">
                              <p className="font-bold text-foreground text-sm truncate">{chat.lastMessage.profiles?.username || 'User'}</p>
                              <span className="text-[8px] text-foreground/40 uppercase font-black">{format(new Date(chat.lastMessage.created_at), 'MMM dd')}</span>
                            </div>
                            <p className="text-[10px] text-foreground/40 truncate italic leading-relaxed">{chat.lastMessage.content}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center text-foreground/20 text-[10px] uppercase font-black tracking-widest italic pt-20">No support chats yet.</div>
                  )}
                </div>
              </div>

              {/* Chat Window */}
              <div className="flex-grow bg-surface rounded-[2.5rem] border border-border-custom overflow-hidden flex flex-col shadow-sm">
                {selectedChat ? (
                  <>
                    <div className="p-6 border-b border-border-custom bg-background/50 flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 shadow-inner">
                        <MessageSquare className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-[10px] font-black text-foreground uppercase tracking-widest leading-none">Support Conversation</h3>
                        <p className="text-[10px] text-foreground/30 font-medium tracking-tight mt-1 italic">User ID: {selectedChat}</p>
                      </div>
                    </div>
                    <div className="flex-grow overflow-y-auto p-8 space-y-6 custom-scrollbar bg-background/5">
                      {supportChats.find(c => c.userId === selectedChat)?.messages.map((msg: any) => (
                        <div key={msg.id} className={cn(
                          "flex flex-col space-y-2",
                          msg.author_id === selectedChat ? "items-start" : "items-end"
                        )}>
                          <div className={cn(
                            "max-w-[80%] px-5 py-4 rounded-[1.5rem] text-sm leading-relaxed shadow-sm",
                            msg.author_id === selectedChat 
                              ? "bg-background text-foreground rounded-tl-none border border-border-custom"
                              : "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/20 font-medium" 
                          )}>
                            {msg.content}
                          </div>
                          <span className="text-[8px] text-foreground/40 font-black uppercase tracking-widest px-2 italic">
                            {format(new Date(msg.created_at), 'HH:mm')} • {msg.author_id === selectedChat ? 'Client' : 'Admin'}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="p-6 bg-background/50 border-t border-border-custom">
                      <div className="relative">
                        <textarea
                          value={adminReply}
                          onChange={(e) => setAdminReply(e.target.value)}
                          placeholder="Type your reply as support..."
                          className="w-full bg-background border border-border-custom rounded-2xl p-5 text-sm text-foreground focus:border-primary/50 transition-colors min-h-[100px] resize-none pr-20 shadow-inner"
                        />
                        <button
                          onClick={() => handleAdminReply(selectedChat)}
                          disabled={!adminReply.trim()}
                          className="absolute bottom-4 right-4 px-6 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                        >
                          Send Reply
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6 bg-background/5">
                    <div className="w-20 h-20 bg-background border border-border-custom rounded-3xl flex items-center justify-center shadow-inner">
                      <Headset className="w-10 h-10 text-foreground/10" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-xl font-display font-bold text-foreground">No Chat Selected</h3>
                       <p className="text-xs text-foreground/40 max-w-xs mx-auto italic font-light">Select a user from the sidebar to view the support conversation and provide assistance.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-12">
              {/* Database Health Warning */}
              {Object.keys(dbErrors).length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-[2.5rem] p-10 space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-500 rounded-3xl flex items-center justify-center shadow-lg shadow-red-500/20">
                      <ShieldAlert className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-display font-bold text-foreground tracking-tight uppercase">Critical Database Action Required</h2>
                      <p className="text-foreground/40 font-medium italic mt-1 leading-relaxed">Structural elements are missing from your database schema. The dashboard will not function correctly until resolved.</p>
                    </div>
                  </div>
                  <div className="bg-background/40 backdrop-blur-md border border-border-custom rounded-3xl p-8 space-y-4 shadow-inner">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">Missing Components Detected:</p>
                    <div className="flex flex-wrap gap-3">
                      {Object.keys(dbErrors).map(table => (
                        <span key={table} className="px-4 py-2 bg-red-500/20 text-red-500 border border-red-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">{table}</span>
                      ))}
                    </div>
                    <div className="pt-4 mt-6 border-t border-border-custom flex flex-col sm:flex-row items-center gap-6">
                      <button 
                        onClick={() => setActiveTab('site')}
                        className="w-full sm:w-auto px-10 py-4 bg-foreground text-background font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-primary hover:text-white transition-all shadow-xl shadow-foreground/10"
                      >
                        Get Setup SQL
                      </button>
                      <p className="text-[9px] text-foreground/20 italic">Click the button above to view the SQL commands needed for your Supabase SQL Editor.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {[
                  { label: 'Site Visits', value: visitCount, icon: Eye },
                  { label: 'Active Streams', value: events.filter(e => e.status === 'live').length, icon: Radio },
                  { label: 'Total Users', value: profiles.length, icon: ShieldCheck },
                  { label: 'Communities', value: communities.length, icon: Users },
                  { label: 'Pending Bookings', value: bookings.filter(b => b.status === 'pending').length, icon: BookOpen },
                ].map((stat, i) => (
                  <div key={i} className="bg-surface p-8 rounded-[2.5rem] border border-border-custom shadow-sm group hover:border-primary/30 transition-all">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-background border border-border-custom rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                          <stat.icon className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                      <h3 className="text-4xl font-display font-bold text-foreground tracking-tighter mb-1">{stat.value}</h3>
                      <p className="text-[10px] uppercase font-black text-foreground/30 tracking-widest italic">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-surface p-8 sm:p-10 rounded-[3rem] border border-border-custom space-y-8 shadow-sm">
                      <div className="flex items-center justify-between border-b border-border-custom pb-6">
                        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-3">
                           <Users className="w-5 h-5 text-primary" />
                           Community Sizes
                        </h2>
                      </div>
                      <div className="space-y-4">
                         {communities.map(c => (
                           <div key={c.id} className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border-custom shadow-inner hover:bg-foreground/5 transition-colors group">
                              <div className="flex items-center gap-4">
                                 <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center border border-border-custom shadow-sm overflow-hidden">
                                    {c.image_url ? <img src={c.image_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" /> : <Users className="w-5 h-5 text-foreground/20" />}
                                 </div>
                                 <span className="font-bold text-foreground text-sm tracking-tight">{c.name}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                 <span className="text-2xl font-display font-bold text-foreground tracking-tighter">{communityStats[c.id] || 0}</span>
                                 <span className="text-[8px] uppercase font-black text-foreground/20 tracking-widest italic">Members</span>
                              </div>
                           </div>
                         ))}
                      </div>
                  </div>

                  <div className="bg-surface p-8 sm:p-10 rounded-[3rem] border border-border-custom space-y-8 shadow-sm">
                      <div className="flex items-center justify-between border-b border-border-custom pb-6">
                        <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-3">
                           <ShieldAlert className="w-5 h-5 text-yellow-500" />
                           Verification Requests
                        </h2>
                        <span className="text-[10px] font-black text-yellow-500/80 uppercase tracking-widest bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                          {profiles.filter(p => p.verification_requested && !p.is_verified).length} Pending
                        </span>
                      </div>
                      <div className="space-y-4">
                         {profiles.filter(p => p.verification_requested && !p.is_verified).slice(0, 5).map(p => (
                           <div key={p.id} className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border-custom shadow-inner group">
                              <div className="flex items-center gap-4">
                                 <img src={p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.username}`} className="w-10 h-10 rounded-full border border-border-custom shadow-sm" />
                                 <div className="flex flex-col">
                                    <span className="font-black text-foreground text-[10px] uppercase tracking-widest">{p.username}</span>
                                    <span className="text-foreground/40 text-[10px] font-light italic">{p.full_name || 'No Full Name'}</span>
                                 </div>
                              </div>
                              <button onClick={() => setActiveTab('users')} className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm">Handle</button>
                           </div>
                         ))}
                         {profiles.filter(p => p.verification_requested && !p.is_verified).length === 0 && (
                           <div className="py-20 text-center bg-background rounded-[2rem] border border-dashed border-border-custom shadow-inner flex flex-col items-center justify-center space-y-4">
                              <ShieldCheck className="w-12 h-12 text-foreground/5" />
                              <p className="text-[10px] text-foreground/20 font-black tracking-[0.3em] uppercase italic">System Fully Verified</p>
                           </div>
                         )}
                      </div>
                  </div>
              </div>

              {/* Business Verification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <h2 className="text-xl font-display font-bold text-foreground px-4 flex items-center gap-2">
                       <Award className="w-5 h-5 text-primary" />
                       CAC Registration
                    </h2>
                    <div className="bg-surface p-10 rounded-[3rem] border border-border-custom flex flex-col gap-8 shadow-sm">
                      <div className="space-y-2">
                        <p className="text-sm text-foreground/60 font-medium tracking-tight leading-relaxed">FIDE TV MEDIA Registration (BN - 3647744)</p>
                        <p className="text-[10px] text-foreground/30 font-light italic">Verify official business documentation for regulatory compliance.</p>
                      </div>
                      <div className="flex items-center gap-6">
                          {certUrl && (
                            <div className="relative w-32 h-20 rounded-2xl overflow-hidden border border-border-custom group shrink-0 shadow-lg">
                              <img src={certUrl} alt="CAC" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                              <a href={certUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-[10px] font-black uppercase tracking-widest">View PDF</span>
                              </a>
                            </div>
                          )}
                          <label className={cn(
                            "flex-1 px-8 py-6 bg-background border border-border-custom text-foreground font-black text-[10px] uppercase tracking-widest rounded-[1.5rem] cursor-pointer hover:bg-foreground/5 transition-all shadow-inner flex items-center justify-center space-x-3 border-dashed",
                            certUploading && "opacity-50 cursor-wait"
                          )}>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'event-thumbnails', 'cac_certificate', setCertUrl)} />
                            <Plus className="w-4 h-4 text-primary" />
                            <span>{certUrl ? 'Replace DOC' : 'Upload DOC'}</span>
                          </label>
                      </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <h2 className="text-xl font-display font-bold text-foreground px-4 flex items-center gap-2">
                       <Briefcase className="w-5 h-5 text-primary" />
                       SMEDAN Certificate
                    </h2>
                    <div className="bg-surface p-10 rounded-[3rem] border border-border-custom flex flex-col gap-8 shadow-sm">
                      <div className="space-y-2">
                        <p className="text-sm text-foreground/60 font-medium tracking-tight leading-relaxed">Official business verification from SMEDAN (SUIN28515358).</p>
                        <p className="text-[10px] text-foreground/30 font-light italic">Small & Medium Enterprises Development Agency of Nigeria.</p>
                      </div>
                      <div className="flex items-center gap-6">
                          {smedanUrl && (
                            <div className="relative w-32 h-20 rounded-2xl overflow-hidden border border-border-custom group shrink-0 shadow-lg">
                              <img src={smedanUrl} alt="SMEDAN" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                              <a href={smedanUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-[10px] font-black uppercase tracking-widest">View PDF</span>
                              </a>
                            </div>
                          )}
                          <label className={cn(
                            "flex-1 px-8 py-6 bg-background border border-border-custom text-foreground font-black text-[10px] uppercase tracking-widest rounded-[1.5rem] cursor-pointer hover:bg-foreground/5 transition-all shadow-inner flex items-center justify-center space-x-3 border-dashed",
                            smedanUploading && "opacity-50 cursor-wait"
                          )}>
                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'event-thumbnails', 'smedan_certificate', setSmedanUrl)} />
                            <Plus className="w-4 h-4 text-primary" />
                            <span>{smedanUrl ? 'Replace DOC' : 'Upload DOC'}</span>
                          </label>
                      </div>
                    </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'channels' && (
            <div className="space-y-12">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {channels.map(channel => (
                   <div key={channel.id} className="bg-surface rounded-3xl border border-border-custom p-6 space-y-6 group hover:border-primary/20 transition-all shadow-sm">
                     <div className="relative aspect-video rounded-2xl overflow-hidden border border-border-custom bg-background shadow-inner">
                        <img src={channel.thumbnail || "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80"} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                        <div className="absolute top-4 left-4 bg-primary/90 text-white text-[8px] font-black uppercase px-2 py-1 rounded-md tracking-tighter">
                           {channel.category}
                        </div>
                        {channel.is_active && (
                          <div className="absolute top-4 right-4 bg-red-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase text-white tracking-widest border border-red-500/50 flex items-center gap-2">
                             <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                             LIVE
                          </div>
                        )}
                     </div>
                     <div className="space-y-1 px-2">
                        <h3 className="text-foreground font-display font-bold group-hover:text-primary transition-colors text-lg tracking-tight">{channel.name}</h3>
                        <p className="text-[10px] text-foreground/40 line-clamp-2 italic font-light leading-relaxed">{channel.description}</p>
                     </div>
                     <div className="flex justify-between items-center pt-6 border-t border-border-custom px-2">
                        <div className="flex items-center gap-2">
                           <Tv className="w-3 h-3 text-foreground/20" />
                           <span className="text-[8px] text-foreground/20 font-black uppercase tracking-[0.2em]">#{channel.order_index}</span>
                        </div>
                        <div className="flex space-x-2">
                           <button onClick={() => { 
                             setEditingId(channel.id); setTitle(channel.name); setCategory(channel.category); setDescription(channel.description || ''); setImageUrl(channel.thumbnail || ''); setStreamUrl(channel.url); setStatus(channel.is_active ? 'live' : 'offline'); 
                             setIsEditing(true); 
                           }} className="p-2.5 text-foreground/40 hover:text-foreground transition-colors bg-background border border-border-custom rounded-xl shadow-inner"><Edit2 className="w-3.5 h-3.5" /></button>
                           <button onClick={() => handleDelete('tv_channels', channel.id)} className="p-2.5 text-foreground/40 hover:text-red-500 transition-colors bg-background border border-border-custom rounded-xl shadow-inner"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                     </div>
                   </div>
                 ))}
                 
                 {channels.length === 0 && !loading && (
                   <div className="col-span-full py-32 text-center bg-surface rounded-[4rem] border border-border-custom border-dashed shadow-inner flex flex-col items-center justify-center space-y-8">
                      <div className="w-20 h-20 bg-background rounded-3xl flex items-center justify-center border border-border-custom shadow-sm text-foreground/10">
                         <Tv className="w-10 h-10" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-display font-bold text-foreground">No TV Channels Found</h3>
                        <p className="text-foreground/40 max-w-sm mx-auto italic font-light">You haven't added any channels to your broadcast network yet.</p>
                      </div>
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
                          className="px-10 py-5 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
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
                          title: 'Digital Engineering',
                          icon: 'Monitor',
                          description: 'Elite web architectures and specialized website creation engineered for high-performance digital ecosystems.',
                          features: ['Premium Web Design', 'Custom API Architecture', 'Cloud Infrastructure', 'Sophisticated UX/UI'],
                          price: 'Starting at ₦1,800,000',
                          order_index: 0
                        },
                        {
                          title: 'Hub Ecosystems',
                          icon: 'Smartphone',
                          description: 'Native and cross-platform mobile applications that deliver seamless, high-density user experiences.',
                          features: ['iOS & Android Systems', 'Real-time Synchronization', 'Premium UI Components', 'Store Optimization'],
                          price: 'Starting at ₦2,500,000',
                          order_index: 1
                        },
                        {
                          title: 'Premium Advertising',
                          icon: 'BarChart3',
                          description: 'Strategic brand placement and targeted media campaigns designed for maximum market penetration.',
                          features: ['Ad Placement Strategy', 'Targeted Campaigns', 'Performance Analytics', 'Media Buying'],
                          price: 'Starting at ₦1,000,000',
                          order_index: 2
                        },
                        {
                          title: 'Cinematic Production',
                          icon: 'Video',
                          description: 'High-end visual storytelling and brand cinematography that captures attention and elevates identity.',
                          features: ['8K Narrative Production', 'Elite Color Grading', 'Motion Directing', 'Sound Engineering'],
                          price: 'Starting at ₦3,000,000',
                          order_index: 3
                        },
                        {
                          title: 'Global Streaming',
                          icon: 'Radio',
                          description: 'Standard-setting live broadcasting with worldwide reach and ultra-low latency infrastructure.',
                          features: ['Multi-Region CDNs', 'Interactive Live Tools', 'Broadcast Engineering', 'Full Event Mastery'],
                          price: 'Starting at ₦2,200,000',
                          order_index: 4
                        },
                        {
                          title: 'Brand Architecture',
                          icon: 'Layout',
                          description: 'Strategic digital identity and ecosystem design that positions brands for market dominance.',
                          features: ['Design Systems', 'Strategy Research', 'Asset Architecture', 'Market Positioning'],
                          price: 'Starting at ₦1,500,000',
                          order_index: 5
                        },
                        {
                          title: 'Signature Shows',
                          icon: 'Mic',
                          description: 'Premium content frameworks and podcast architectures designed for maximum engagement and retention.',
                          features: ['Multi-Camera Setup', 'Audio Engineering', 'Guest Strategy', 'Post-Production'],
                          price: 'Starting at ₦1,200,000',
                          order_index: 6
                        },
                        {
                          title: 'Media Strategy',
                          icon: 'Globe',
                          description: 'Futuristic consulting and long-term content roadmaps for the evolving media landscape.',
                          features: ['Future Readiness', 'Content Roadmaps', 'Innovation Labs', 'Trend Analysis'],
                          price: 'Starting at ₦2,000,000',
                          order_index: 7
                        }
                      ];
                      
                      const { error } = await supabase.from('services').insert(defaultServices);
                      if (error) {
                        alert('Error seeding services: ' + error.message);
                      } else {
                        alert('Services seeded successfully!');
                        fetchServices();
                      }
                    }
                  }}
                  className="px-6 py-3 bg-surface hover:bg-surface-bright rounded-xl text-xs font-bold uppercase tracking-widest text-primary border border-border-custom transition-all font-mono shadow-sm"
                >
                  Seed Services Dataset
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {services.map((item, i) => (
                  <div key={item.id} className="bg-surface rounded-[2rem] p-8 space-y-6 group border border-border-custom hover:border-foreground/20 transition-all shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center border border-border-custom text-primary shadow-inner">
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
                        }} className="p-2 text-foreground/40 hover:text-foreground transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete('services', item.id)} className="p-2 text-foreground/40 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{item.title}</h3>
                      <p className="text-sm text-foreground/40 line-clamp-2 italic">{item.description}</p>
                      <div className="pt-2">
                        <span className="text-lg font-display font-bold text-primary">{item.price}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {services.length === 0 && !loading && (
                   <div className="col-span-full py-20 text-center bg-surface rounded-[2.5rem] border border-dashed border-border-custom shadow-sm">
                      <Zap className="w-12 h-12 text-foreground/10 mx-auto mb-4" />
                      <p className="text-foreground/40 font-bold uppercase tracking-widest text-xs italic">No Services Defined</p>
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
                        const { error } = await supabase.from('portfolio_items').insert(defaultVideos);
                        if (error) {
                          alert('Error seeding videos: ' + error.message);
                        } else {
                          alert('Videos seeded successfully!');
                          fetchPortfolio();
                        }
                      }
                    }}
                    className="px-6 py-3 bg-surface hover:bg-surface-bright rounded-xl text-xs font-bold uppercase tracking-widest text-primary border border-border-custom transition-all font-mono shadow-sm"
                  >
                    Seed YouTube Videos
                  </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {portfolio.map(item => (
                 <div key={item.id} className="bg-surface border border-border-custom rounded-[2rem] p-6 space-y-4 group hover:border-foreground/20 transition-all shadow-sm">
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-background">
                       {item.image_url && <img src={item.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 shadow-inner" />}
                       <div className="absolute top-4 left-4 bg-background/60 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase text-foreground tracking-widest border border-border-custom shadow-sm">
                          {item.category}
                       </div>
                       {item.is_featured && (
                         <div className="absolute top-4 right-4 bg-primary/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase text-white tracking-widest border border-white/10 shadow-sm">
                            Featured
                         </div>
                       )}
                    </div>
                    <div className="space-y-1">
                       <h3 className="text-foreground font-bold group-hover:text-primary transition-colors">{item.title}</h3>
                       <p className="text-[10px] text-foreground/40 line-clamp-2 italic">{item.description}</p>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-border-custom">
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
                          }} className="p-2 text-foreground/40 hover:text-foreground transition-colors bg-background rounded-lg shadow-inner"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete('portfolio_items', item.id)} className="p-2 text-foreground/40 hover:text-red-500 transition-colors bg-background rounded-lg shadow-inner"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="bg-surface rounded-[2.5rem] overflow-hidden border border-border-custom shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-background/50 text-foreground/40 uppercase text-[10px] font-black tracking-widest border-b border-border-custom">
                      <th className="px-8 py-6">Status</th>
                      <th className="px-8 py-6">Event Details</th>
                      <th className="px-8 py-6">Start Time</th>
                      <th className="px-8 py-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom bg-background/20">
                    {events.map(ev => (
                      <tr key={ev.id} className="group hover:bg-foreground/5 transition-colors">
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                            ev.status === 'live' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-foreground/5 text-foreground/40"
                          )}>
                            {ev.status}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                            <p className="font-bold text-foreground">{ev.title}</p>
                            <p className="text-[10px] text-foreground/40 truncate max-w-xs italic">{ev.description}</p>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-foreground/60 font-mono text-xs">
                          {format(new Date(ev.start_time), 'MMM dd, HH:mm')}
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex space-x-4">
                              <button onClick={() => { setEditingId(ev.id); setTitle(ev.title); setYoutubeId(ev.youtube_id || ''); setStreamUrl(ev.stream_url || ''); setImageUrl(ev.thumbnail_url || ''); setStartTime(ev.start_time.slice(0, 16)); setStatus(ev.status); setDescription(ev.description); setIsEditing(true); }} className="text-foreground/40 hover:text-foreground transition-colors"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete('events', ev.id)} className="text-foreground/40 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {news.map(n => (
                <div key={n.id} className="bg-surface border border-border-custom rounded-[2rem] p-6 space-y-4 group hover:border-foreground/20 transition-all flex flex-col shadow-sm">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-background">
                    {n.image_url && <img src={n.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 shadow-inner" />}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <div className={cn(
                        "bg-background/60 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase text-foreground tracking-widest border shadow-sm",
                        n.is_published ? "border-green-500/50 text-green-500" : "border-yellow-500/50 text-yellow-500"
                      )}>
                        {n.is_published ? 'Published' : 'Draft'}
                      </div>
                      {n.category && (
                        <div className="bg-primary/90 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black uppercase text-white tracking-widest border border-white/10 shadow-sm">
                          {n.category}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2 flex-grow">
                    <h3 className="text-foreground font-bold group-hover:text-primary transition-colors line-clamp-2">{n.title}</h3>
                    <p className="text-[10px] text-foreground/40 leading-relaxed line-clamp-2 italic">{n.excerpt || n.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                       {n.tags?.slice(0, 3).map((t, i) => (
                         <span key={i} className="text-[8px] bg-background px-2 py-0.5 rounded text-foreground/40 font-bold uppercase border border-border-custom shadow-sm">#{t}</span>
                       ))}
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-border-custom">
                    <div className="flex items-center space-x-2">
                       <Clock className="w-3 h-3 text-foreground/20" />
                       <span className="text-[10px] text-foreground/40 font-mono italic">{format(new Date(n.created_at), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex space-x-2">
                       <Link 
                         to={`/news/${n.slug}`} 
                         target="_blank" 
                         className="p-2 text-foreground/40 hover:text-primary bg-background rounded-lg transition-colors shadow-inner"
                         title="View Live"
                       >
                         <ExternalLink className="w-4 h-4" />
                       </Link>
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
                       }} className="p-2 text-foreground/40 hover:text-foreground bg-background rounded-lg transition-colors shadow-inner"><Edit2 className="w-4 h-4" /></button>
                       <button onClick={() => handleDelete('news', n.id)} className="p-2 text-foreground/40 hover:text-red-500 bg-background rounded-lg transition-colors shadow-inner"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-surface rounded-[2.5rem] overflow-hidden border border-border-custom shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-background/50 text-foreground/40 uppercase text-[10px] font-black tracking-widest border-b border-border-custom">
                      <th className="px-8 py-6">User</th>
                      <th className="px-8 py-6">Verification</th>
                      <th className="px-8 py-6">Details</th>
                      <th className="px-8 py-6">Join Date</th>
                      <th className="px-8 py-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom bg-background/20">
                    {profiles.map(user => (
                      <tr key={user.id} className="hover:bg-foreground/5 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <img 
                              src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                              className="w-10 h-10 rounded-full border border-border-custom shadow-sm" 
                            />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-foreground">{user.username}</p>
                                {user.is_verified && <Award className="w-3 h-3 text-primary" />}
                              </div>
                              <p className="text-[10px] text-foreground/40 italic">{user.full_name || 'No full name set'}</p>
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
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/20 italic">Standard</span>
                          )}
                        </td>
                        <td className="px-8 py-6 max-w-xs">
                          <p className="text-[10px] text-foreground/40 font-light truncate italic">
                            {user.verification_details || 'No details provided'}
                          </p>
                        </td>
                        <td className="px-8 py-6 text-[10px] text-foreground/40 font-mono tracking-widest uppercase italic">
                          {format(new Date(user.created_at), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-end space-x-2">
                            {user.verification_requested && (
                              <>
                                <button 
                                  onClick={() => handleVerification(user.id, true)}
                                  className="p-2 bg-background border border-border-custom text-green-500 hover:bg-green-500 hover:text-white transition-all rounded-lg shadow-sm"
                                  title="Approve Verification"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleVerification(user.id, false)}
                                  className="p-2 bg-background border border-border-custom text-red-500 hover:bg-red-500 hover:text-white transition-all rounded-lg shadow-sm"
                                  title="Reject Request"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {!user.is_verified && !user.verification_requested && (
                               <button 
                                 onClick={() => handleVerification(user.id, true)}
                                 className="p-2 bg-background border border-border-custom text-primary hover:bg-primary hover:text-white transition-all rounded-lg shadow-sm"
                                 title="Grant Badge Manually"
                               >
                                 <Award className="w-4 h-4" />
                               </button>
                            )}
                            {user.is_verified && (
                               <button 
                                 onClick={() => handleVerification(user.id, false)}
                                 className="p-2 bg-background border border-border-custom text-foreground/40 hover:bg-red-500 hover:text-white transition-all rounded-lg shadow-sm"
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
            </div>
          )}

          {activeTab === 'communities' && (
            <div className="space-y-12">
               {/* Sub-tab Navigation */}
               <div className="flex gap-4 p-2 bg-surface rounded-2xl border border-border-custom w-fit">
                  {[
                    { id: 'hubs', name: 'Elite Hubs', icon: Users },
                    { id: 'requests', name: 'Join Requests', icon: ShieldAlert },
                    { id: 'posts', name: 'Manage Feed', icon: MessageSquare }
                  ].map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => setCommunitySubTab(sub.id as any)}
                      className={cn(
                        "px-6 py-3 rounded-xl flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest transition-all",
                        communitySubTab === sub.id ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-foreground/40 hover:text-foreground"
                      )}
                    >
                      <sub.icon className="w-3.5 h-3.5" />
                      <span>{sub.name}</span>
                    </button>
                  ))}
               </div>

               {communitySubTab === 'hubs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {communities.map(c => (
                    <div key={c.id} className="bg-surface border border-border-custom rounded-[2rem] p-8 space-y-6 flex flex-col group hover:border-foreground/20 transition-all shadow-sm">
                        <div className="flex justify-between items-start">
                          <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center border border-border-custom text-primary group-hover:scale-105 transition-transform shadow-inner">
                              {c.image_url ? <img src={c.image_url} className="w-full h-full object-cover rounded-2xl" /> : <Users className="w-8 h-8 text-foreground/20" />}
                          </div>
                          <div className="flex space-x-2">
                              <button onClick={() => { setEditingId(c.id); setTitle(c.name); setDescription(c.description); setImageUrl(c.image_url || ''); setIsEditing(true); }} className="p-2 text-foreground/40 hover:text-foreground transition-colors"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete('communities', c.id)} className="p-2 text-foreground/40 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{c.name}</h3>
                          <p className="text-xs text-foreground/40 leading-relaxed line-clamp-2 italic">{c.description}</p>
                        </div>
                    </div>
                  ))}
                </div>
               )}

               {communitySubTab === 'requests' && (
                 <div className="bg-surface rounded-3xl border border-border-custom overflow-hidden">
                    {pendingRequests.length > 0 ? (
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-background/50 text-foreground/40 uppercase text-[10px] font-black tracking-widest border-b border-border-custom">
                            <th className="px-8 py-6">User</th>
                            <th className="px-8 py-6">Hub Requested</th>
                            <th className="px-8 py-6">Requested At</th>
                            <th className="px-8 py-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-custom">
                          {pendingRequests.map(req => (
                            <tr key={req.id} className="hover:bg-foreground/5 transition-colors">
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-3">
                                  <img src={req.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user_id}`} className="w-8 h-8 rounded-full" />
                                  <span className="font-bold">{req.profiles?.username}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-foreground/60">{req.communities?.name}</td>
                              <td className="px-8 py-6 text-xs italic text-foreground/40">{format(new Date(req.created_at), 'MMM dd, HH:mm')}</td>
                              <td className="px-8 py-6 text-right space-x-2">
                                <button onClick={() => handleRequestAction(req.id, true)} className="px-4 py-2 bg-green-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all">Approve</button>
                                <button onClick={() => handleRequestAction(req.id, false)} className="px-4 py-2 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all">Decline</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="py-20 text-center text-foreground/20 uppercase font-black tracking-widest text-xs italic">No Pending Requests</div>
                    )}
                 </div>
               )}

               {communitySubTab === 'posts' && (
                 <div className="bg-surface rounded-3xl border border-border-custom overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-background/50 text-foreground/40 uppercase text-[10px] font-black tracking-widest border-b border-border-custom">
                          <th className="px-8 py-6">Author</th>
                          <th className="px-8 py-6">Hub</th>
                          <th className="px-8 py-6">Content Snippet</th>
                          <th className="px-8 py-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-custom">
                        {allPosts.map(post => (
                          <tr key={post.id} className="hover:bg-foreground/5 transition-colors">
                            <td className="px-8 py-6 font-bold">{post.profiles?.username}</td>
                            <td className="px-8 py-6 text-[10px] uppercase font-black text-primary tracking-widest">{post.communities?.name}</td>
                            <td className="px-8 py-6 text-xs text-foreground/60 line-clamp-1 italic">{post.content}</td>
                            <td className="px-8 py-6 text-right">
                              <button onClick={() => deletePost(post.id)} className="p-2 text-foreground/40 hover:text-red-500 transition-colors">
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'ads' && (
            <div className="space-y-12">
               {dbErrors.ad_units && (
                 <div className="bg-red-500/10 border border-red-500/20 rounded-[2.5rem] p-10 space-y-6">
                    <div className="flex items-center gap-4 text-red-500">
                      <ShieldAlert className="w-6 h-6" />
                      <h3 className="text-xl font-display font-bold uppercase">Ad Units Table Missing</h3>
                    </div>
                    <pre className="bg-background/50 p-6 rounded-2xl text-[10px] font-mono text-foreground/40 overflow-x-auto border border-border-custom">
{`CREATE TABLE IF NOT EXISTS public.ad_units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios', 'web')),
  ad_unit_id TEXT NOT NULL,
  ad_type TEXT NOT NULL CHECK (ad_type IN ('banner', 'interstitial', 'rewarded', 'native', 'adsense')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ad_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ad units viewable by everyone" ON public.ad_units FOR SELECT USING (true);
CREATE POLICY "Admin manage ad units" ON public.ad_units FOR ALL USING (auth.jwt() ->> 'email' = 'fidetvonline@gmail.com');`}
                    </pre>
                 </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {adUnits.map(ad => (
                    <div key={ad.id} className="bg-surface rounded-3xl border border-border-custom p-8 space-y-6 group hover:border-primary/20 transition-all shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="w-14 h-14 bg-background border border-border-custom rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                          <Plus className="w-6 h-6 text-primary" />
                        </div>
                        <div className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          ad.is_active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        )}>
                          {ad.is_active ? 'Active' : 'Disabled'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">{ad.name}</h3>
                        <div className="flex flex-wrap gap-2">
                           <span className="px-2 py-1 bg-background border border-border-custom rounded text-[8px] font-black uppercase text-foreground/40">{ad.platform}</span>
                           <span className="px-2 py-1 bg-background border border-border-custom rounded text-[8px] font-black uppercase text-foreground/40">{ad.ad_type}</span>
                        </div>
                        <p className="text-[10px] font-mono text-foreground/30 break-all bg-background/50 p-3 rounded-xl border border-border-custom mt-4">{ad.ad_unit_id}</p>
                      </div>
                      <div className="flex justify-end pt-6 border-t border-border-custom space-x-2">
                        <button onClick={() => { 
                          setEditingId(ad.id); 
                          setTitle(ad.name); 
                          setAdUnitId(ad.ad_unit_id);
                          setPlatform(ad.platform);
                          setAdType(ad.ad_type);
                          setIsActive(ad.is_active);
                          setIsEditing(true); 
                        }} className="p-2.5 text-foreground/40 hover:text-foreground transition-colors bg-background border border-border-custom rounded-xl shadow-inner"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete('ad_units', ad.id)} className="p-2.5 text-foreground/40 hover:text-red-500 transition-colors bg-background border border-border-custom rounded-xl shadow-inner"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}

                  {adUnits.length === 0 && !loading && (
                    <div className="col-span-full py-32 text-center bg-surface rounded-[4rem] border border-border-custom border-dashed shadow-inner flex flex-col items-center justify-center space-y-8">
                       <Plus className="w-12 h-12 text-foreground/10 mx-auto" />
                       <div className="space-y-2">
                         <p className="text-foreground/40 font-bold uppercase tracking-widest text-xs italic">No Ad Units Configured</p>
                         <p className="text-[10px] text-foreground/30 italic max-w-sm mx-auto leading-relaxed">Let's seed custom ad mockups to your database so you can manage theme options live.</p>
                       </div>
                       <button
                         onClick={async () => {
                           if (confirm('Create default system ad units in your database?')) {
                             const defaultAds = [
                               { name: 'Community Sidebar', platform: 'web', ad_unit_id: 'ca-pub-fidetv-community-sidebar', ad_type: 'adsense', is_active: true },
                               { name: 'Home Portfolio Bottom', platform: 'web', ad_unit_id: 'ca-pub-fidetv-portfolio-bottom', ad_type: 'adsense', is_active: true },
                               { name: 'Home News Bottom', platform: 'web', ad_unit_id: 'ca-pub-fidetv-news-bottom', ad_type: 'adsense', is_active: true },
                               { name: 'Admin Dashboard Top', platform: 'web', ad_unit_id: 'ca-pub-fidetv-admin-top', ad_type: 'adsense', is_active: true },
                               { name: 'News Page Top', platform: 'web', ad_unit_id: 'ca-pub-fidetv-news-top', ad_type: 'adsense', is_active: true }
                             ];
                             
                             setLoading(true);
                             try {
                               for (const ad of defaultAds) {
                                 await supabase.from('ad_units').insert(ad);
                               }
                               alert('Default Ad Units seeded successfully!');
                               fetchAdUnits();
                             } catch (err: any) {
                               console.error(err);
                               alert('Error seeding ad units: ' + err.message);
                             } finally {
                               setLoading(false);
                             }
                           }
                         }}
                         className="px-10 py-5 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                       >
                         Seed Default Ad Units
                       </button>
                    </div>
                  )}
               </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="bg-surface rounded-[2.5rem] overflow-hidden border border-border-custom shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-background/50 text-foreground/40 uppercase text-[10px] font-black tracking-widest border-b border-border-custom">
                      <th className="px-8 py-6">Date</th>
                      <th className="px-8 py-6">Client</th>
                      <th className="px-8 py-6">Type</th>
                      <th className="px-8 py-6">Status</th>
                      <th className="px-8 py-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom bg-background/20">
                    {bookings.map(book => (
                      <tr key={book.id} className="hover:bg-foreground/5 transition-colors">
                        <td className="px-8 py-6 text-foreground/40 font-mono text-xs italic">{book.date}</td>
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                            <p className="font-bold text-foreground">{book.client_name}</p>
                            <p className="text-[10px] text-foreground/40 italic">{book.client_email}</p>
                            
                            {(book.budget || book.message) && (
                              <button 
                                onClick={() => setExpandedBookingId(expandedBookingId === book.id ? null : book.id)}
                                className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider block pt-1 cursor-pointer"
                              >
                                {expandedBookingId === book.id ? 'Collapse Proposal ▲' : 'View Full Proposal Details ▼'}
                              </button>
                            )}

                            {expandedBookingId === book.id && (
                              <div className="mt-3 p-4 bg-background border border-border-custom rounded-2xl space-y-3 xl:max-w-2xl">
                                {book.budget && (
                                  <div>
                                    <span className="text-[9px] text-foreground/40 font-black uppercase tracking-widest block">Metrics / Selection:</span>
                                    <span className="text-xs text-foreground/80 font-medium">{book.budget}</span>
                                  </div>
                                )}
                                {book.message && (
                                  <div>
                                    <span className="text-[9px] text-foreground/40 font-black uppercase tracking-widest block">Proposal Details:</span>
                                    <pre className="text-xs text-foreground/70 font-sans whitespace-pre-wrap leading-relaxed mt-1 break-words">
                                      {book.message}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-xs text-foreground/60 font-medium">{book.event_type}</td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
                            book.status === 'confirmed' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                          )}>
                            {book.status}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex space-x-2">
                             <button onClick={async () => { await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', book.id); fetchBookings(); }} className="p-2 bg-background border border-border-custom text-foreground/40 hover:text-green-500 transition-colors rounded-lg shadow-sm"><CheckCircle2 className="w-4 h-4" /></button>
                             <button onClick={async () => { await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', book.id); fetchBookings(); }} className="p-2 bg-background border border-border-custom text-foreground/40 hover:text-red-500 transition-colors rounded-lg shadow-sm"><XCircle className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
             {/* Form Modal */}
       <AnimatePresence>
          {isEditing && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100]" onClick={() => setIsEditing(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl bg-surface rounded-[3rem] border border-border-custom z-[101] p-10 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
                  <h2 className="text-3xl font-display font-bold text-foreground mb-8 tracking-tighter">
                    {editingId ? 'Edit' : 'Create'} <span className="text-primary italic">
                      {activeTab === 'ads' ? 'Ad Unit' : activeTab === 'events' ? 'Event' : activeTab === 'communities' ? 'Community' : activeTab === 'news' ? 'Article' : activeTab === 'portfolio' ? 'Portfolio Item' : activeTab === 'channels' ? 'TV Channel' : activeTab === 'services' ? 'Service' : activeTab}
                    </span>
                  </h2>
                 <form onSubmit={handleSave} className="space-y-6">
                    {activeTab === 'ads' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Ad Campaign Name</label>
                          <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g., Sidebar Banner" className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground focus:border-primary/50 transition-colors shadow-inner" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Ad Unit ID</label>
                          <input value={adUnitId} onChange={e => setAdUnitId(e.target.value)} required placeholder="ca-app-pub-..." className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground focus:border-primary/50 transition-colors shadow-inner" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Platform</label>
                          <select value={platform} onChange={e => setPlatform(e.target.value)} className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground focus:border-primary/50 transition-colors shadow-inner">
                            <option value="web">Web (AdSense)</option>
                            <option value="android">Android (AdMob)</option>
                            <option value="ios">iOS (AdMob)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Ad Type</label>
                          <select value={adType} onChange={e => setAdType(e.target.value)} className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground focus:border-primary/50 transition-colors shadow-inner">
                            <option value="banner">Banner</option>
                            <option value="interstitial">Interstitial</option>
                            <option value="rewarded">Rewarded</option>
                            <option value="native">Native</option>
                            <option value="adsense">AdSense Responsive</option>
                          </select>
                        </div>
                        <div className="md:col-span-2 flex items-center justify-between p-6 bg-background rounded-2xl border border-border-custom shadow-inner">
                          <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Enable Ad Unit</span>
                          <button 
                            type="button"
                            onClick={() => setIsActive(!isActive)}
                            className={cn(
                              "relative w-14 h-8 rounded-full transition-colors duration-300",
                              isActive ? "bg-primary" : "bg-border-custom"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-300",
                              isActive ? "translate-x-6" : "translate-x-0"
                            )} />
                          </button>
                        </div>
                      </div>
                    )}
                   {activeTab === 'news' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      {/* Main Editor */}
                      <div className="lg:col-span-2 space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] uppercase font-black tracking-widest text-primary ml-4">Article Title</label>
                           <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Enter broad title..." className="w-full bg-background border border-border-custom rounded-2xl p-6 text-xl font-bold text-foreground focus:border-primary transition-all shadow-inner" />
                        </div>

                        <div className="space-y-2">
                           <div className="flex justify-between items-center px-4 mb-2">
                              <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40">Short Excerpt</label>
                              <button type="button" onClick={generateWithAI} className="flex items-center space-x-2 text-[10px] font-black text-primary hover:text-foreground transition-colors">
                                 <Sparkles className="w-3 h-3" /><span>AI Generate Excerpt</span>
                              </button>
                           </div>
                           <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Catchy summary for cards..." className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground text-sm min-h-[80px] resize-none focus:border-primary transition-colors shadow-inner" />
                        </div>

                        <div className="space-y-2">
                           <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Full Content (Markdown Supported)</label>
                           <textarea value={content} onChange={e => setContent(e.target.value)} required placeholder="Once upon a time in FideTV..." className="w-full bg-background border border-border-custom rounded-3xl p-8 text-foreground min-h-[400px] resize-none focus:border-primary transition-colors font-mono text-sm leading-relaxed shadow-inner" />
                        </div>
                      </div>

                      {/* Side Settings */}
                      <div className="space-y-8 bg-background/20 p-6 rounded-[2.5rem] border border-border-custom h-fit shadow-sm">
                        <div className="space-y-4">
                           <h3 className="text-[10px] uppercase font-black tracking-widest text-foreground/40 px-2 border-b border-border-custom pb-2">Publishing</h3>
                           <div className="flex items-center justify-between p-4 bg-background rounded-2xl border border-border-custom shadow-inner">
                              <span className="text-[10px] text-foreground/40 font-bold uppercase tracking-widest">Status</span>
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", isPublished ? "bg-green-500" : "bg-yellow-500")} />
                                <span className="text-[10px] font-black text-foreground">{isPublished ? 'PUBLISHED' : 'DRAFT'}</span>
                              </div>
                           </div>
                           <button 
                             type="button"
                             onClick={() => setIsPublished(!isPublished)}
                             className={cn(
                               "w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm",
                               isPublished 
                                 ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20" 
                                 : "bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
                             )}
                           >
                             {isPublished ? 'Revert to Draft' : 'Publish Article'}
                           </button>
                        </div>

                        <div className="space-y-4">
                           <h3 className="text-[10px] uppercase font-black tracking-widest text-foreground/40 px-2 border-b border-border-custom pb-2">Organization</h3>
                           <div className="space-y-2">
                              <label className="text-[8px] font-black uppercase text-foreground/20 ml-2">Category</label>
                              <select 
                                value={blogCategory} 
                                onChange={e => setBlogCategory(e.target.value)}
                                className="w-full bg-background border border-border-custom rounded-xl p-3 text-foreground text-xs font-bold uppercase tracking-wider shadow-inner"
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
                              <label className="text-[8px] font-black uppercase text-foreground/20 ml-2">Permalink Slug</label>
                              <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="url-friendly-slug" className="w-full bg-background border border-border-custom rounded-xl p-3 text-foreground text-[10px] font-mono shadow-inner" />
                           </div>
                        </div>

                        <div className="space-y-4">
                           <h3 className="text-[10px] uppercase font-black tracking-widest text-foreground/40 px-2 border-b border-border-custom pb-2">Featured Image</h3>
                           <div className="relative aspect-video rounded-2xl overflow-hidden bg-background border-2 border-dashed border-border-custom flex flex-col items-center justify-center group cursor-pointer shadow-inner" onClick={() => document.getElementById('blog-upload')?.click()}>
                              {imageUrl ? (
                                <>
                                  <img src={imageUrl} className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-6 h-6 text-white" />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <Camera className="w-6 h-6 text-foreground/10 mb-2" />
                                  <span className="text-[8px] font-black text-foreground/20 uppercase tracking-widest">Select Image</span>
                                </>
                              )}
                              <input id="blog-upload" type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'event-thumbnails', `blog/${Date.now()}`, setImageUrl)} />
                           </div>
                           <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Or paste external URL..." className="w-full bg-background border border-border-custom rounded-xl p-3 text-foreground text-[8px] shadow-inner" />
                        </div>

                        <div className="space-y-4 pt-4">
                           <div className="flex gap-2">
                              <button type="button" onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-background border border-border-custom text-foreground/40 font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-surface-bright transition-all shadow-sm">Cancel</button>
                              <button type="submit" className="flex-1 py-4 bg-primary text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">Save Changes</button>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}

                {activeTab !== 'news' && activeTab !== 'bookings' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">{activeTab === 'communities' ? 'Hub Name' : 'Title'}</label>
                       <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Enter name/title..." className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground focus:border-primary/50 transition-colors shadow-inner" />
                    </div>

                    {activeTab === 'portfolio' && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Category</label>
                             <input value={category} onChange={e => setCategory(e.target.value)} required placeholder="e.g. Signature Productions" className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground focus:border-primary/50 transition-colors shadow-inner" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">YouTube ID (Optional)</label>
                             <input value={youtubeId} onChange={e => setYoutubeId(e.target.value)} placeholder="e.g. dQw4w9WgXcQ" className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground focus:border-primary/50 transition-colors shadow-inner" />
                          </div>
                       </div>
                    )}

                    {activeTab === 'channels' && (
                      <div className="grid grid-cols-1 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Category</label>
                            <input value={category} onChange={e => setCategory(e.target.value)} required placeholder="e.g. Sports" className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground focus:border-primary/50 transition-colors shadow-inner" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Stream URL (.m3u8, .mp4, YouTube URL, or &lt;iframe&gt;)</label>
                            <input value={streamUrl} onChange={e => setStreamUrl(e.target.value)} required placeholder="https://... or <iframe src='...'></iframe>" className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground focus:border-primary/50 transition-colors shadow-inner" />
                         </div>
                      </div>
                    )}

                    {activeTab === 'services' && (
                      <div className="grid grid-cols-1 gap-6">
                         <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-2">
                              <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Price / Investment</label>
                              <input value={price} onChange={e => setPrice(e.target.value)} required placeholder="e.g. Starting at ₦1,500,000" className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground focus:border-primary/50 transition-colors shadow-inner" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Icon (Lucide Name)</label>
                              <select value={icon} onChange={e => setIcon(e.target.value)} className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground focus:border-primary/50 transition-colors shadow-inner">
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
                               <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40">Service Features</label>
                               <button 
                                 type="button" 
                                 onClick={() => setFeatures([...features, ''])}
                                 className="text-[10px] font-black text-primary hover:text-foreground uppercase tracking-widest flex items-center space-x-1 transition-colors"
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
                                      className="flex-grow bg-background border border-border-custom rounded-xl p-4 text-foreground text-xs shadow-inner focus:border-primary/50 outline-none transition-colors" 
                                    />
                                    <button 
                                      type="button" 
                                      onClick={() => setFeatures(features.filter((_, i) => i !== idx))}
                                      className="p-4 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-colors border border-red-500/20 shadow-sm"
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
                          <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40">Description</label>
                          <button type="button" onClick={generateWithAI} className="flex items-center space-x-2 text-[10px] font-black text-primary hover:text-foreground transition-colors">
                             <Sparkles className="w-3 h-3" /><span>AI Optimize</span>
                          </button>
                       </div>
                       <textarea value={description} onChange={e => setDescription(e.target.value)} required placeholder="Describe this hub/event..." className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground min-h-[100px] resize-none focus:border-primary/50 transition-colors shadow-inner" />
                    </div>

                    <div className="space-y-4">
                       <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">
                         Media Accent
                       </label>
                       <div className="flex gap-4">
                          <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Paste Image URL..." className="flex-grow bg-background border border-border-custom rounded-2xl p-5 text-foreground text-xs shadow-inner" />
                          <label className="px-6 py-5 bg-background border border-dashed border-border-custom rounded-2xl cursor-pointer hover:bg-surface-bright transition-all shadow-sm">
                             <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'event-thumbnails', `uploads/${Date.now()}`, setImageUrl)} />
                             <Camera className="w-5 h-5 text-primary" />
                          </label>
                       </div>
                    </div>

                    {activeTab === 'events' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">YouTube ID</label>
                            <input value={youtubeId} onChange={e => setYoutubeId(e.target.value)} className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground shadow-inner" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 ml-4">Start Time</label>
                            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground shadow-inner" />
                         </div>
                      </div>
                    )}

                    {activeTab === 'portfolio' && (
                      <div className="flex items-center space-x-4 p-4 bg-background border border-border-custom rounded-2xl shadow-inner">
                         <input type="checkbox" id="feat" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="w-5 h-5 accent-primary" />
                         <label htmlFor="feat" className="text-xs font-bold text-foreground/40 uppercase tracking-widest italic">Feature on Homepage</label>
                      </div>
                    )}

                    {activeTab === 'channels' && (
                      <div className="flex items-center space-x-4 p-4 bg-background border border-border-custom rounded-2xl shadow-inner">
                         <input type="checkbox" id="act" checked={status === 'live'} onChange={e => setStatus(e.target.checked ? 'live' : 'offline')} className="w-5 h-5 accent-primary" />
                         <label htmlFor="act" className="text-xs font-bold text-foreground/40 uppercase tracking-widest italic">Mark as Live / Active</label>
                      </div>
                    )}

                    <div className="flex justify-end space-x-4 pt-8 border-t border-border-custom">
                       <button type="button" onClick={() => setIsEditing(false)} className="px-8 py-4 bg-background border border-border-custom text-foreground/40 font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-foreground/5 shadow-sm transition-all">Cancel</button>
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
    </div>
    </div>
  );
}
