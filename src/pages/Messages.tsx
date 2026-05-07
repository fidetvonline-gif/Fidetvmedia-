import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Send, User, Check, CheckCheck, EyeOff, X, Eye, Paperclip, Image as ImageIcon, Trash2, Loader2, MessageSquare, DownloadCloud, Zap } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(false);
  
  const [viewingMessageId, setViewingMessageId] = useState<string | null>(null);
  const [viewedTimeout, setViewedTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const { data: msgData, error } = await supabase.from('direct_messages').insert({
      sender_id: user.id,
      receiver_id: activeChat.id,
      content: msgContent,
      is_view_once: msgIsViewOnce
    }).select().single();

    if (!error && msgData) {
      // Notify recipient
      await supabase.from('notifications').insert({
        recipient_id: activeChat.id,
        actor_id: user.id,
        type: 'direct_message',
        resource_id: msgData.id,
        read: false
      });
    } else if (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !activeChat) return;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(filePath);

      const isImage = file.type.startsWith('image/');
      
      const { data: msgData, error: msgError } = await supabase.from('direct_messages').insert({
        sender_id: user.id,
        receiver_id: activeChat.id,
        media_url: publicUrl,
        media_type: isImage ? 'image' : 'file',
        is_view_once: isViewOnce
      }).select().single();

      if (!msgError && msgData) {
        // Notify recipient
        await supabase.from('notifications').insert({
          recipient_id: activeChat.id,
          actor_id: user.id,
          type: 'direct_message',
          resource_id: msgData.id,
          read: false
        });
      }

      setIsViewOnce(false);
    } catch (err: any) {
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteMessage = async (msgId: string) => {
    if (!window.confirm("Delete this message permanently?")) return;
    
    // Explicitly check for ownership or recipient to delete
    const { error } = await supabase
      .from('direct_messages')
      .delete()
      .match({ id: msgId })
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    if (error) {
      console.error("Error deleting message:", error);
      alert("Could not delete message. You may not have permission.");
    } else {
      // Optistically remove from UI
      setMessages(prev => prev.filter(m => m.id !== msgId));
    }
  };

  const deleteConversation = async () => {
    if (!user || !activeChat) return;
    if (!window.confirm("Are you sure you want to delete this entire conversation? This cannot be undone.")) return;

    setDeletingConversation(true);
    const { error } = await supabase
      .from('direct_messages')
      .delete()
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeChat.id}),and(sender_id.eq.${activeChat.id},receiver_id.eq.${user.id})`);

    if (!error) {
      setActiveChat(null);
      setMessages(messages.filter(m => 
        !((m.sender_id === user.id && m.receiver_id === activeChat.id) || 
          (m.sender_id === activeChat.id && m.receiver_id === user.id))
      ));
    }
    setDeletingConversation(false);
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
        <p className="text-foreground">Please sign in to view messages.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 h-[calc(100vh-100px)]">
      <div className="bg-background border border-border-custom rounded-[2.5rem] overflow-hidden flex h-full shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        {/* Sidebar */}
        <div className={`
          w-full md:w-96 border-r border-border-custom flex flex-col z-20 transition-all
          ${activeChat ? 'hidden md:flex' : 'flex'}
        `}>
          <div className="p-8 border-b border-border-custom space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-display font-black text-foreground tracking-tighter">Inbox.</h1>
              <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
            </div>
            
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface border border-border-custom rounded-2xl py-4 pl-12 pr-4 text-sm text-foreground focus:border-primary/50 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Syncing Messages</span>
              </div>
            ) : displayContacts.length > 0 ? (
              displayContacts.map((contact: any) => {
                const isActive = activeChat?.id === contact.profile.id;
                const unread = contact.lastMessage && contact.lastMessage.receiver_id === user.id && !contact.lastMessage.is_view_once && !contact.lastMessage.is_viewed;

                return (
                  <button
                    key={contact.profile.id}
                    onClick={() => setActiveChat(contact.profile)}
                    className={`
                      w-full flex items-center justify-between p-4 rounded-3xl transition-all relative group
                      ${isActive 
                        ? 'bg-primary/20 border border-primary/30 shadow-xl shadow-primary/5' 
                        : 'hover:bg-foreground/5 border border-transparent hover:border-border-custom'
                      }
                    `}
                  >
                    {unread && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-full shadow-[0_0_12px_#FFD700]" />}
                    
                    <div className="flex items-center gap-4 overflow-hidden text-left relative z-10">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-[1.25rem] overflow-hidden bg-surface-bright shrink-0 border border-border-custom group-hover:scale-105 transition-transform duration-500">
                          {contact.profile.avatar_url ? (
                            <img src={contact.profile.avatar_url} alt={contact.profile.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <User className="w-6 h-6 text-primary" />
                            </div>
                          )}
                        </div>
                        {unread && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background flex" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-foreground text-[15px] truncate max-w-[120px]">
                            {contact.profile.full_name || contact.profile.username}
                          </span>
                          {contact.lastMessage && (
                            <span className="text-[9px] text-foreground/40 font-bold uppercase tracking-tighter shrink-0">
                              {formatDistanceToNow(new Date(contact.lastMessage.created_at))}
                            </span>
                          )}
                        </div>
                        {contact.lastMessage && (
                          <div className={`text-xs truncate ${unread ? 'text-foreground font-bold' : 'text-foreground/40'}`}>
                            {contact.lastMessage.sender_id === user.id && <span className="text-primary mr-1">You:</span>}
                            {contact.lastMessage.is_view_once 
                              ? 'Sent a view-once message'
                              : contact.lastMessage.content || 'Sent an attachment'}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto">
                   <Search className="w-6 h-6 text-foreground/20" />
                </div>
                <p className="text-foreground/40 text-[10px] font-black uppercase tracking-[0.2em]">No Users Found</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        {activeChat ? (
          <div className="flex-1 flex flex-col h-full bg-foreground/5">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-custom flex items-center gap-4 bg-surface/50">
              <button 
                onClick={() => setActiveChat(null)}
                className="md:hidden p-2 -ml-2 text-foreground/40 hover:text-foreground"
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
                <h3 className="font-bold text-foreground">{activeChat.full_name || activeChat.username}</h3>
                <p className="text-xs text-foreground/40">@{activeChat.username}</p>
              </div>
              <button 
                onClick={deleteConversation}
                disabled={deletingConversation}
                className="ml-auto p-2 text-foreground/40 hover:text-red-500 transition-colors"
                title="Delete Conversation"
              >
                {deletingConversation ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
              {activeChatMessages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                  <div className="w-20 h-20 bg-foreground/5 rounded-full flex items-center justify-center mb-6">
                    <Zap className="w-8 h-8 text-foreground" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground mb-2">No messages yet</h3>
                  <p className="text-foreground/40 text-xs uppercase tracking-widest">Start the conversation with @{activeChat.username}</p>
                </div>
              ) : activeChatMessages.map((msg: any) => {
                const isMine = msg.sender_id === user.id;
                
                return (
                  <div key={msg.id} className={`flex flex-col group ${isMine ? 'items-end' : 'items-start'} mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className="flex items-center gap-3 max-w-[85%] relative">
                      {isMine && !msg.is_view_once && (
                        <button 
                          onClick={() => deleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-foreground/40 hover:text-red-500 transition-all hover:scale-110"
                          title="Delete message"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {!isMine && (
                         <button 
                          onClick={() => deleteMessage(msg.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-foreground/40 hover:text-red-500 transition-all hover:scale-110 order-last"
                          title="Delete message for me"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      
                      {msg.is_view_once ? (
                        <div className={`
                          p-1 rounded-3xl flex flex-col gap-1 transition-all
                          ${isMine ? 'bg-primary/20 border border-primary/30 shadow-lg shadow-primary/5' : 'bg-foreground/5 border border-border-custom'}
                        `}>
                          {isMine ? (
                            <div className="px-5 py-4 text-sm text-foreground/60 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <EyeOff className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">View-once sent</span>
                                {msg.is_viewed && <span className="text-[9px] text-primary/70 font-black uppercase tracking-tighter">Recipient opened</span>}
                              </div>
                            </div>
                          ) : msg.is_viewed ? (
                            <div className="px-5 py-4 text-sm text-foreground/40 flex items-center gap-3 italic">
                              <EyeOff className="w-4 h-4 opacity-50" />
                              Message viewed
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleViewMessage(msg.id)}
                              className="px-6 py-4 text-sm text-foreground font-bold flex items-center gap-4 hover:bg-foreground/5 rounded-2xl transition-all group/btn"
                            >
                              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center group-hover/btn:scale-110 transition-transform shadow-xl shadow-primary/20 text-white">
                                <Eye className="w-6 h-6" />
                              </div>
                              <div className="flex flex-col items-start">
                                <span>Tap to view</span>
                                <span className="text-[10px] text-foreground/40 font-normal">Disappears after viewing</span>
                              </div>
                            </button>
                          )}
                        </div>
                      ) : (
                      <div className={`
                        px-5 py-4 rounded-[2rem] text-[15px] leading-relaxed relative overflow-hidden transition-all
                        ${isMine 
                          ? 'bg-primary text-white rounded-tr-none shadow-[0_10px_30px_rgba(242,125,38,0.1)]' 
                          : 'bg-surface text-foreground border border-border-custom rounded-tl-none shadow-lg'
                        }
                      `}>
                          {msg.media_url && (
                            <div className="mb-3 -mx-1 -mt-1 group/media">
                              {msg.media_type === 'image' ? (
                                <div className="rounded-2xl overflow-hidden border border-border-custom relative">
                                  <img src={msg.media_url} alt="Shared" className="w-full h-auto max-h-[400px] object-cover hover:scale-105 transition-transform duration-700 ease-out" />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                                    <a href={msg.media_url} target="_blank" rel="noopener noreferrer" className="p-3 bg-white text-black rounded-full shadow-2xl scale-0 group-hover/media:scale-100 transition-transform">
                                      <ImageIcon className="w-5 h-5" />
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <a 
                                  href={msg.media_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="flex items-center gap-4 p-5 bg-background/40 rounded-2xl text-foreground hover:bg-background/60 transition-all border border-border-custom group/file"
                                >
                                  <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center group-hover/file:bg-primary transition-all duration-300">
                                    <Paperclip className="w-6 h-6 text-primary group-hover/file:text-white" />
                                  </div>
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-sm font-bold truncate">File Attachment</span>
                                    <span className="text-[10px] text-foreground/40 uppercase font-black tracking-widest mt-0.5 group-hover/file:text-primary transition-colors">Click to Download</span>
                                  </div>
                                  <div className="w-8 h-8 rounded-lg bg-foreground/5 flex items-center justify-center opacity-0 group-hover/file:opacity-100 transition-opacity">
                                    <DownloadCloud className="w-4 h-4" />
                                  </div>
                                </a>
                              )}
                            </div>
                          )}
                          {msg.content && <p className="whitespace-pre-wrap">{msg.content}</p>}
                        </div>
                      )}
                    </div>
                    
                    <div className={`flex items-center gap-2 mt-1.5 px-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-[10px] text-foreground/40 font-medium uppercase tracking-widest">
                        {formatDistanceToNow(new Date(msg.created_at))} ago
                      </span>
                      {isMine && !msg.is_deleted && (
                        <div className="flex items-center gap-1">
                          {msg.is_viewed ? (
                            <CheckCheck className="w-3 h-3 text-primary" />
                          ) : (
                            <Check className="w-3 h-3 text-foreground/40" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-surface/50 border-t border-border-custom">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <input
                  type="file"
                  hidden
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-12 h-12 shrink-0 bg-foreground/5 text-foreground/40 rounded-full flex items-center justify-center hover:bg-foreground/10 hover:text-foreground transition-all mb-px"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </button>
                <div className="flex-1 bg-background border border-border-custom rounded-2xl overflow-hidden focus-within:border-primary/50 transition-colors">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full bg-transparent px-4 py-3 text-sm text-foreground focus:outline-none resize-none max-h-32 min-h-[44px]"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                    }}
                  />
                  <div className="px-4 pb-2 flex items-center justify-between bg-surface">
                    <button
                      type="button"
                      onClick={() => setIsViewOnce(!isViewOnce)}
                      className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors ${
                        isViewOnce ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-foreground/5 text-foreground/40 hover:text-foreground'
                      }`}
                    >
                      <EyeOff className="w-3 h-3" />
                      View Once
                    </button>
                    <span className="text-[10px] text-foreground/20 uppercase tracking-widest">
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
          <div className="hidden md:flex flex-1 items-center justify-center flex-col text-center p-8 bg-foreground/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(242,125,38,0.05)_0%,transparent_70%)]" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative z-10"
            >
              <div className="w-32 h-32 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mb-8 mx-auto border border-primary/20 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                <MessageSquare className="w-12 h-12 text-primary opacity-60" />
              </div>
              <h2 className="text-3xl font-display font-black text-foreground mb-4 tracking-tighter italic">Select a conversation</h2>
              <p className="text-foreground/40 text-sm max-w-xs mx-auto leading-relaxed font-medium uppercase tracking-[0.2em]">
                Pick a contact from the sidebar or use search to start a new chat session.
              </p>
            </motion.div>
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
            className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-8"
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
              className="absolute top-6 right-6 w-12 h-12 bg-foreground/10 rounded-full flex items-center justify-center text-foreground hover:bg-foreground/20 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="max-w-2xl w-full text-center">
              <p className="text-foreground/40 uppercase tracking-[0.3em] font-black text-xs mb-8">View Once Message</p>
              
              <div className="bg-surface border border-border-custom rounded-[2rem] p-8 sm:p-16 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                <p className="text-2xl sm:text-4xl font-display font-medium text-foreground leading-relaxed relative z-10">
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
