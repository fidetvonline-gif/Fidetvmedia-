import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('direct_messages_notifier')
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

        // Check if we are currently looking at the messages page. If we are, we don't necessarily want to send a desktop notification, 
        // or maybe we do if it's from a different chat. For simplicity, if we are on /messages we don't send notification, 
        // or we can send it but let's check `document.hasFocus()` and location
        if (location.pathname === '/messages' && document.hasFocus()) {
           return;
        }

        if ('Notification' in window && Notification.permission === 'granted') {
           const text = payload.new.is_view_once ? 'Sent you a view-once message' : payload.new.content;
           new Notification(`New message from ${senderName}`, {
             body: text,
             icon: '/pwa-192x192.png' // Adjust if needed
           });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user, location.pathname]);

  return null;
}
