import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Message {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string;
  };
}

export default function LiveChat({ eventId }: { eventId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newChat, setNewChat] = useState('');
  const [user, setUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Fetch initial messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(username, avatar_url)')
        .eq('post_id', `live_${eventId}`) // Use a prefix for live chat bits
        .order('created_at', { ascending: true })
        .limit(50);

      if (data) setMessages(data as any);
    };

    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`live-chat-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.live_${eventId}`,
        },
        async (payload) => {
          // Fetch the profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', payload.new.author_id)
            .single();

          const newMessage = {
            ...payload.new,
            profiles: profile,
          } as Message;

          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChat.trim() || !user) return;

    const messageContent = newChat;
    setNewChat('');

    const { error } = await supabase.from('comments').insert({
      post_id: `live_${eventId}`,
      author_id: user.id,
      content: messageContent,
    });

    if (error) {
      console.error('Error sending message:', error);
      // Optional: Show error
    }
  };

  return (
    <div className="flex flex-col h-[500px] lg:h-full glass rounded-3xl overflow-hidden border-white/5">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-surface-bright/50">
        <h3 className="font-display font-bold text-white text-sm uppercase tracking-widest">Live Discussion</h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] text-gray-400 font-bold uppercase">{messages.length} Messages</span>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-grow overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm italic">No messages yet. Be the first to start the conversation!</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className="group animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={cn(
              "flex flex-col space-y-1",
              msg.author_id === user?.id ? "items-end" : "items-start"
            )}>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-[10px] font-bold text-gray-500">{msg.profiles?.username || 'User'}</span>
                <span className="text-[8px] text-gray-600 tracking-tighter uppercase">{format(new Date(msg.created_at), 'HH:mm')}</span>
              </div>
              <div className={cn(
                "px-4 py-2 rounded-2xl text-sm max-w-[85%] break-words",
                msg.author_id === user?.id 
                  ? "bg-primary text-white rounded-tr-none" 
                  : "bg-surface-bright text-gray-200 rounded-tl-none border border-white/5"
              )}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-surface-bright/50 border-t border-white/10">
        {user ? (
          <form onSubmit={sendMessage} className="relative">
            <input
              type="text"
              value={newChat}
              onChange={(e) => setNewChat(e.target.value)}
              placeholder="Join the discussion..."
              className="w-full bg-black/40 border border-white/10 rounded-full px-6 py-3 text-sm focus:outline-none focus:border-primary/50 text-white placeholder-gray-600 transition-all"
            />
            <button
              type="submit"
              disabled={!newChat.trim()}
              className="absolute right-2 top-1.2 h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:grayscale transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="text-center p-2">
            <p className="text-xs text-gray-500">
              Please <Link to="/auth" className="text-primary hover:underline">sign in</Link> to chat.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Add Link import for the fallback
import { Link } from 'react-router-dom';
