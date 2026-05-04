import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Send, User, Check, CheckCheck, EyeOff, X, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Messages() {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null); // The other user's profile
  const [newMessage, setNewMessage] = useState('');
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [viewingMessageId, setViewingMessageId] = useState<string | null>(null);
  const [viewedTimeout, setViewedTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      fetchData(user.id);
    }
  };

  const fetchData = async (userId: string) => {
    setLoading(true);
    // Fetch all profiles so we can search and message anyone
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*');
      
    if (profilesData) {
      setProfiles(profilesData.filter(p => p.id !== userId));
    }

    // Fetch all messages for the current user
    const { data: msgs } = await supabase
      .from('direct_messages')
      .select(`
        *,
        sender:profiles!sender_id(id, username, avatar_url, full_name),
        receiver:profiles!receiver_id(id, username, avatar_url, full_name)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: true });

    if (msgs) {
      setMessages(msgs);
    }
    setLoading(false);

    // Subscribe to new messages
    const subscription = supabase
      .channel('direct_messages_sync')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'direct_messages',
        filter: `receiver_id=eq.${userId}`
      }, (payload) => {
        // Needs a full refetch to get profile joins easily, or we can just refetch all
        fetchData(userId);
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'direct_messages',
        filter: `sender_id=eq.${userId}`
      }, (payload) => {
        fetchData(userId);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  useEffect(() => {
    if (activeChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeChat]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeChat || !newMessage.trim()) return;

    const msgContent = newMessage.trim();
    const msgIsViewOnce = isViewOnce;
    
    setNewMessage('');
    setIsViewOnce(false);

    const { error } = await supabase.from('direct_messages').insert({
      sender_id: user.id,
      receiver_id: activeChat.id,
      content: msgContent,
      is_view_once: msgIsViewOnce
    });

    if (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleViewMessage = async (msgId: string) => {
    setViewingMessageId(msgId);
    
    // Auto-close after 5 seconds
    const timeout = setTimeout(async () => {
      setViewingMessageId(null);
      // Mark as viewed in DB
      await supabase.from('direct_messages')
        .update({ is_viewed: true })
        .eq('id', msgId);
    }, 5000);
    
    setViewedTimeout(timeout);
  };

  const closeViewedMessage = async (msgId: string) => {
    if (viewedTimeout) clearTimeout(viewedTimeout);
    setViewingMessageId(null);
    await supabase.from('direct_messages')
      .update({ is_viewed: true })
      .eq('id', msgId);
  };

  // Group messages to find recent contacts
  const getRecentContacts = () => {
    const sortedMsgs = [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const contactsMap = new Map();
    
    sortedMsgs.forEach(msg => {
      const otherUser = msg.sender_id === user?.id ? msg.receiver : msg.sender;
      if (otherUser && !contactsMap.has(otherUser.id)) {
        contactsMap.set(otherUser.id, {
          profile: otherUser,
          lastMessage: msg
        });
      }
    });

    return Array.from(contactsMap.values());
  };

  const recentContacts = getRecentContacts();
  
  // Filter for sidebar search
  const displayContacts = searchQuery 
    ? profiles.filter(p => (p.username || '').toLowerCase().includes(searchQuery.toLowerCase()) || (p.full_name || '').toLowerCase().includes(searchQuery.toLowerCase())).map(p => ({ profile: p, lastMessage: null }))
    : recentContacts;

  const activeChatMessages = activeChat 
    ? messages.filter(m => 
        (m.sender_id === user?.id && m.receiver_id === activeChat.id) ||
        (m.sender_id === activeChat.id && m.receiver_id === user?.id)
      )
    : [];

  // Finding the message currently being viewed
  const viewingMessage = messages.find(m => m.id === viewingMessageId);

  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <p className="text-white">Please sign in to view messages.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-[calc(100vh-80px)]">
      <div className="bg-surface/50 border border-white/5 rounded-[2rem] overflow-hidden flex h-full backdrop-blur-md">
        
        {/* Sidebar */}
        <div className={`w-full md:w-80 border-r border-white/5 flex flex-col pb-4 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6">
            <h1 className="text-2xl font-display font-black text-white mb-6">Messages</h1>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-2">
            {loading ? (
              <div className="text-center p-4 text-sm text-gray-500">Loading...</div>
            ) : displayContacts.length > 0 ? (
              displayContacts.map((contact: any) => {
                const isActive = activeChat?.id === contact.profile.id;
                const unread = contact.lastMessage && contact.lastMessage.receiver_id === user.id && !contact.lastMessage.is_view_once && !contact.lastMessage.is_viewed;
                return (
                  <button
                    key={contact.profile.id}
                    onClick={() => setActiveChat(contact.profile)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${isActive ? 'bg-primary/20 border border-primary/30' : 'hover:bg-white/5 border border-transparent'}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden text-left">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-primary/20 shrink-0">
                          {contact.profile.avatar_url ? (
                            <img src={contact.profile.avatar_url} alt={contact.profile.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                          )}
                        </div>
                        {unread && (
                          <div className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-[#1a1a1a]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white text-sm truncate">
                          {contact.profile.full_name || contact.profile.username}
                        </div>
                        {contact.lastMessage && (
                          <div className={`text-xs truncate ${unread ? 'text-white font-medium' : 'text-gray-500'}`}>
                            {contact.lastMessage.is_view_once 
                              ? (contact.lastMessage.sender_id === user.id ? 'You sent a view-once message' : 'Received a view-once message')
                              : contact.lastMessage.content}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center p-8 text-gray-500 text-sm">
                No users found.
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        {activeChat ? (
          <div className="flex-1 flex flex-col h-full bg-black/20">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-4 bg-surface/50">
              <button 
                onClick={() => setActiveChat(null)}
                className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/20 shrink-0">
                {activeChat.avatar_url ? (
                  <img src={activeChat.avatar_url} alt={activeChat.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-bold text-white">{activeChat.full_name || activeChat.username}</h3>
                <p className="text-xs text-gray-400">@{activeChat.username}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeChatMessages.map((msg: any) => {
                const isMine = msg.sender_id === user.id;
                
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {msg.is_view_once ? (
                      <div className={`
                        p-1 rounded-2xl max-w-[80%] flex flex-col gap-1
                        ${isMine ? 'bg-primary/20 border border-primary/30' : 'bg-white/5 border border-white/10'}
                      `}>
                        {isMine ? (
                          <div className="px-4 py-3 text-sm text-gray-300 flex items-center gap-2">
                            <EyeOff className="w-4 h-4 text-primary" />
                            View-once message sent
                            {msg.is_viewed && <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded text-gray-500 uppercase tracking-widest ml-2">Opened</span>}
                          </div>
                        ) : msg.is_viewed ? (
                          <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2 italic">
                            <EyeOff className="w-4 h-4 opacity-50" />
                            Message viewed
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleViewMessage(msg.id)}
                            className="px-6 py-4 text-sm text-white font-bold flex items-center gap-3 hover:bg-white/5 rounded-xl transition-colors group"
                          >
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-primary/20">
                              <Eye className="w-5 h-5" />
                            </div>
                            Tap to view (View Once)
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className={`
                        px-5 py-3 rounded-2xl max-w-[80%] text-sm
                        ${isMine ? 'bg-primary text-white rounded-br-sm' : 'bg-white/10 text-white border border-white/5 rounded-bl-sm'}
                      `}>
                        {msg.content}
                      </div>
                    )}
                    <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest px-1">
                      {formatDistanceToNow(new Date(msg.created_at))} ago
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-surface/50 border-t border-white/5">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl overflow-hidden focus-within:border-primary/50 transition-colors">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full bg-transparent px-4 py-3 text-sm text-white focus:outline-none resize-none max-h-32 min-h-[44px]"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <div className="px-4 pb-2 flex items-center justify-between bg-black/20">
                    <button
                      type="button"
                      onClick={() => setIsViewOnce(!isViewOnce)}
                      className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors ${
                        isViewOnce ? 'bg-primary text-white' : 'bg-white/10 text-gray-400 hover:text-white'
                      }`}
                    >
                      <EyeOff className="w-3 h-3" />
                      View Once
                    </button>
                    <span className="text-[10px] text-gray-600 uppercase tracking-widest">
                      Press Enter to send
                    </span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 shrink-0 bg-primary text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:scale-100 hover:scale-105 transition-all shadow-lg shadow-primary/20 mb-px"
                >
                  <Send className="w-5 h-5 ml-1" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center flex-col text-center p-8 bg-black/20">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Send className="w-10 h-10 text-primary opacity-50 ml-1" />
            </div>
            <h2 className="text-2xl font-display font-black text-white mb-3">Your Messages</h2>
            <p className="text-gray-400 text-sm max-w-sm">
              Select a conversation from the sidebar or search for a user to start messaging securely.
            </p>
          </div>
        )}
      </div>

      {/* View Once Modal */}
      <AnimatePresence>
        {viewingMessageId && viewingMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8"
          >
            {/* Progress Bar (5s default) */}
            <motion.div 
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 5, ease: "linear" }}
              className="absolute top-0 left-0 right-0 h-1 bg-primary origin-left"
            />
            
            <button 
              onClick={() => closeViewedMessage(viewingMessage.id)}
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="max-w-2xl w-full text-center">
              <p className="text-gray-500 uppercase tracking-[0.3em] font-black text-xs mb-8">View Once Message</p>
              
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 sm:p-16 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <p className="text-2xl sm:text-4xl font-display font-medium text-white leading-relaxed relative z-10">
                  {viewingMessage.content}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
