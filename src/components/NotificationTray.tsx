import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Bell, UserPlus, Heart, MessageSquare, Star, Trash2, CheckCircle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string;
  type: 'follow' | 'like' | 'comment' | 'post';
  resource_id?: string;
  read: boolean;
  created_at: string;
  actor: {
    username: string;
    avatar_url: string;
    full_name: string;
  };
}

export default function NotificationTray() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const trayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchNotifications(user.id);
        setupSubscription(user.id);
      }
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (trayRef.current && !trayRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const setupSubscription = (userId: string) => {
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`
      }, async (payload) => {
        // Fetch actor info
        const { data: actor } = await supabase
          .from('profiles')
          .select('username, avatar_url, full_name')
          .eq('id', payload.new.actor_id)
          .single();

        const newNotif = { ...payload.new, actor } as Notification;
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification if permitted
        if (Notification.permission === 'granted' && !document.hasFocus()) {
           new Notification(`${actor?.username} ${getVerb(newNotif.type)}`, {
             body: `Check your FideTV notifications for more details.`,
             icon: actor?.avatar_url || '/pwa-192x192.png'
           });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchNotifications = async (userId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        actor:profiles!actor_id(username, avatar_url, full_name)
      `)
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data as any);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  const markAsRead = async () => {
    if (!user || unreadCount === 0) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', user.id)
      .eq('read', false);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = async () => {
    if (!user) return;
    await supabase.from('notifications').delete().eq('recipient_id', user.id);
    setNotifications([]);
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow': return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'like': return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment': return <MessageSquare className="w-4 h-4 text-green-500" />;
      default: return <Star className="w-4 h-4 text-primary" />;
    }
  };

  const getVerb = (type: string) => {
    switch (type) {
      case 'follow': return 'started following you';
      case 'like': return 'liked your post';
      case 'comment': return 'commented on your post';
      case 'post': return 'posted a new update';
      default: return 'sent a notification';
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={trayRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) markAsRead();
        }}
        className="relative p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-black text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-4 w-80 sm:w-96 bg-surface border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden z-[100]"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-white font-display font-bold">Notifications</h3>
              <div className="flex items-center space-x-3">
                <button 
                  onClick={clearAll}
                  className="text-[10px] uppercase font-black tracking-widest text-gray-600 hover:text-red-500 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <Link
                    key={notif.id}
                    to={notif.type === 'follow' ? `/profile/${notif.actor.username}` : '#'}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center p-4 hover:bg-white/5 transition-colors border-b border-white/5 gap-4 group",
                      !notif.read && "bg-primary/5"
                    )}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-surface-bright flex items-center justify-center overflow-hidden border border-white/5">
                        {notif.actor.avatar_url ? (
                          <img src={notif.actor.avatar_url} alt={notif.actor.username} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-gray-500" />
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-surface border border-white/5 p-1 rounded-full">
                        {getIcon(notif.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 leading-snug">
                        <span className="text-white font-bold">{notif.actor.full_name || notif.actor.username}</span> {getVerb(notif.type)}
                      </p>
                      <span className="text-[10px] text-gray-600 font-medium">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => deleteNotification(notif.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-gray-600 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </Link>
                ))
              ) : (
                <div className="py-12 text-center text-gray-600">
                  <CheckCircle className="w-10 h-10 mx-auto mb-4 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">No new notifications</p>
                </div>
              )}
            </div>
            
            <div className="p-4 bg-white/5 text-center">
               <button className="text-[10px] uppercase font-black tracking-widest text-gray-500 hover:text-primary transition-colors">View All Activity</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
