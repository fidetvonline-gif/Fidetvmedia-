import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'react-router-dom';

export default function MessageNotifier() {
  const [user, setUser] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Request permission for notifications if not granted
    if (user && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, [user]);

  const locationRef = useRef(location.pathname);
  useEffect(() => {
    locationRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;

    let sub: any;

    const setupSubscription = async () => {
      const channelName = 'direct_messages_notifier';
      const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
      if (existing) {
        await supabase.removeChannel(existing);
      }

      sub = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `receiver_id=eq.${user.id}`
        }, async (payload) => {
          // Find who sent it
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('username, full_name')
            .eq('id', payload.new.sender_id)
            .single();

          const senderName = senderProfile?.full_name || senderProfile?.username || 'Someone';

          // Check if we are currently looking at the messages page.
          if (locationRef.current === '/messages' && document.hasFocus()) {
             return;
          }

          if ('Notification' in window && Notification.permission === 'granted') {
             const text = payload.new.is_view_once ? 'Sent you a view-once message' : payload.new.content;
             new Notification(`New message from ${senderName}`, {
               body: text,
               icon: '/icon.svg' 
             });
          }
        })
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (sub) {
        supabase.removeChannel(sub);
      }
    };
  }, [user]);

  return null;
}
