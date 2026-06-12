import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

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

export default function LiveChat({ 
  eventId, 
  onPresenceUpdate 
}: { 
  eventId: string; 
  onPresenceUpdate?: (count: number) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newChat, setNewChat] = useState('');
  const [user, setUser] = useState<any>(null);
  const [presenceCount, setPresenceCount] = useState(1);
  const [reactions, setReactions] = useState<{ id: string; emoji: string }[]>([]);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
    setShowScrollBottom(!isAtBottom);
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*, profiles(username, avatar_url)')
          .eq('post_id', `live_${eventId}`)
          .order('created_at', { ascending: true })
          .limit(100);

        if (!error && data) {
          setMessages(data as any);
          setTimeout(scrollToBottom, 500);
        }
      } catch (e) {
        console.error("Error fetching chat history", e);
      }
    };

    fetchMessages();

    // Real-time subscription with Presence and Broadcast
    let channel: any;

    const setupChat = async () => {
      const channelName = `live-chat-${eventId}`;
      
      channel = supabase.channel(channelName);

      channel
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

            setMessages((prev) => {
              // Avoid duplicates
              if (prev.find(m => m.id === newMessage.id)) return prev;
              const next = [...prev, newMessage];
              // Keep last 150 messages for performance
              return next.length > 150 ? next.slice(-150) : next;
            });
          }
        )
        .on('broadcast', { event: 'reaction' }, ({ payload }) => {
          const id = Math.random().toString(36).substring(7);
          setReactions(prev => [...prev.slice(-15), { id, emoji: payload.emoji }]);
          // Auto remove after animation
          setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== id));
          }, 3000);
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const count = Object.keys(state).length;
          setPresenceCount(count || 1);
          onPresenceUpdate?.(count || 1);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          // You could show a small "User joined" toast here if desired
        })
        .subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED' && channel) {
            await channel.track({
              user_id: user?.id || `anon-${Math.random().toString(36).substring(7)}`,
              online_at: new Date().toISOString(),
            });
          }
        });
    };

    setupChat();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [eventId, user?.id]);

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
    }
  };

  const sendReaction = (emoji: string) => {
    const channelName = `live-chat-${eventId}`;
    const channel = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'reaction',
        payload: { emoji }
      });
      
      // Also show locally
      const id = Math.random().toString(36).substring(7);
      setReactions(prev => [...prev.slice(-15), { id, emoji }]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id));
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col h-[500px] lg:h-full glass rounded-3xl overflow-hidden border-border-custom relative">
      {/* Floating Reactions Layer */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ y: 400, x: 200 + Math.random() * 100, opacity: 0, scale: 0.5 }}
            animate={{ 
              y: -100, 
              x: 200 + Math.random() * 100 + (Math.random() - 0.5) * 100, 
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.2, 1, 0.8]
            }}
            transition={{ duration: 3, ease: "easeOut" }}
            className="absolute text-3xl"
          >
            {r.emoji}
          </motion.div>
        ))}
      </div>

      <div className="p-4 border-b border-border-custom flex justify-between items-center bg-surface-bright/50 shrink-0">
        <div className="flex flex-col">
          <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-widest leading-none">Live Discussion</h3>
          <div className="flex items-center space-x-1.5 mt-1">
             <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
             <span className="text-[9px] text-text-muted font-black uppercase tracking-tighter">{presenceCount} Watching Live</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-[10px] text-text-muted font-bold uppercase">{messages.length} Messages</span>
        </div>
      </div>

      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-grow overflow-y-auto p-4 space-y-4 scroll-smooth custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-12 h-12 bg-foreground/5 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-foreground/20" />
            </div>
            <p className="text-text-muted text-sm italic">No messages yet. Be the first to start the conversation!</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className="group animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={cn(
              "flex flex-col space-y-1",
              msg.author_id === user?.id ? "items-end" : "items-start"
            )}>
              <div className="flex items-center space-x-2 mb-0.5">
                <Link to={`/profile/${msg.profiles?.username}`} className="text-[10px] font-bold text-text-muted hover:text-primary transition-colors cursor-pointer">
                  {msg.profiles?.username || 'User'}
                </Link>
                <span className="text-[8px] text-foreground/20 tracking-tighter uppercase">{format(new Date(msg.created_at), 'HH:mm')}</span>
              </div>
              <div className={cn(
                "px-4 py-2.5 rounded-2xl text-sm max-w-[90%] break-words",
                msg.author_id === user?.id 
                  ? "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/20" 
                  : "bg-surface-bright text-foreground rounded-tl-none border border-border-custom shadow-sm"
              )}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {showScrollBottom && (
          <button 
            onClick={scrollToBottom}
            className="fixed bottom-32 right-8 z-50 p-2 bg-primary text-white rounded-full shadow-lg animate-bounce"
          >
            <Send className="w-4 h-4 rotate-90" />
          </button>
        )}
      </div>

      {/* Shared Reactions Bar */}
      <div className="px-4 py-2 bg-black/20 flex items-center justify-around border-t border-border-custom gap-2 shrink-0">
        {['🔥', '❤️', '👏', '😂', '😮', '🙌'].map(emoji => (
          <button
            key={emoji}
            onClick={() => sendReaction(emoji)}
            className="text-lg hover:scale-125 transition-transform active:scale-95 p-1"
          >
            {emoji}
          </button>
        ))}
      </div>

      <div className="p-4 bg-surface-bright/50 border-t border-border-custom shrink-0">
        {user ? (
          <form onSubmit={sendMessage} className="relative">
            <input
              type="text"
              value={newChat}
              onChange={(e) => setNewChat(e.target.value)}
              placeholder="Type message..."
              className="w-full bg-background border border-border-custom rounded-full px-5 py-3 text-sm focus:outline-none focus:border-primary/50 text-foreground placeholder-text-muted transition-all"
            />
            <button
              type="submit"
              disabled={!newChat.trim()}
              className="absolute right-1.5 top-1.5 w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:grayscale transition-all active:scale-95 shadow-md"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="text-center">
            <Link 
              to="/auth" 
              className="inline-flex w-full items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest rounded-full transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              <span>Login to join chat</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
