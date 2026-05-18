import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, MessageSquare, X, Headset, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

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

export default function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newChat, setNewChat] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('comments')
        .select('*, profiles(username, avatar_url)')
        .eq('post_id', `support_${user.id}`)
        .order('created_at', { ascending: true });

      if (data) setMessages(data as any);
    };

    if (isOpen) {
      fetchMessages();
    }

    const channel = supabase
      .channel(`support-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.support_${user.id}`,
        },
        async (payload) => {
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
  }, [user]); // Only depend on user, not isOpen

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
      post_id: `support_${user.id}`,
      author_id: user.id,
      content: messageContent,
    });

    if (error) console.error('Error sending support message:', error);
  };

  if (!user) return null; // Support only for logged in users for now

  return (
    <div className="fixed bottom-8 right-8 z-[200]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-[350px] sm:w-[400px] h-[500px] glass rounded-[2.5rem] border-white/10 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="p-6 bg-surface-bright/50 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                  <Headset className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-sm uppercase tracking-widest text-[10px]">Live Support</h3>
                  <p className="text-[10px] text-gray-500 font-medium tracking-tight">Typical response: Under 5m</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div 
              ref={scrollRef}
              className="flex-grow overflow-y-auto p-6 space-y-6 scroll-smooth"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 px-4">
                  <MessageSquare className="w-12 h-12 text-gray-800" />
                  <p className="text-gray-500 text-xs italic">Hello! How can we help you today? Send us a message and our support team will get back to you shortly.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={cn(
                    "flex flex-col space-y-2",
                    msg.author_id === user?.id ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed",
                      msg.author_id === user?.id 
                        ? "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10" 
                        : "bg-surface-bright text-gray-200 rounded-tl-none border border-white/5"
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[8px] text-gray-600 font-bold uppercase tracking-widest px-1">
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-surface-bright/50 border-t border-white/10">
              <form onSubmit={sendMessage} className="relative">
                <input
                  type="text"
                  value={newChat}
                  onChange={(e) => setNewChat(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-primary/50 text-white placeholder-gray-600 transition-all pr-14"
                />
                <button
                  type="submit"
                  disabled={!newChat.trim()}
                  className="absolute right-2 top-1.2 h-10 w-10 bg-primary rounded-xl flex items-center justify-center text-white disabled:opacity-50 disabled:grayscale transition-all active:scale-95 shadow-lg shadow-primary/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all shadow-2xl hover:scale-110 active:scale-90",
          isOpen ? "bg-surface border border-white/10 text-gray-500" : "bg-primary text-white shadow-primary/20"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>
    </div>
  );
}
