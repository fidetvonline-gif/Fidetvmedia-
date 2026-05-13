import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Post, Comment } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageCircle, Share2, MoreHorizontal, User, Trash2, Edit2, Send, Award, Maximize2, Flag, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import ReactPlayer from 'react-player';
import MediaLightbox from './MediaLightbox';

const Player = ReactPlayer as any;

export default function PostCard({ post, onDelete, onUpdate }: { post: Post, onDelete?: () => void, onUpdate?: () => void }) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.post_likes?.length || 0);
  const [showComments, setShowComments] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState<any>(null);
  const [loadingComments, setLoadingComments] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isPlaying, setIsPlaying] = useState(false);

  const [lightbox, setLightbox] = useState<{ open: boolean; url: string; type: 'image' | 'video', isNative?: boolean }>({
    open: false,
    url: '',
    type: 'image',
    isNative: false
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user && post.post_likes) {
        setIsLiked(post.post_likes.some(l => l.user_id === session.user.id));
      }
    });
  }, [post.post_likes]);

  const handleUpdate = async () => {
    if (!editContent.trim()) return;
    const { error } = await supabase.from('posts').update({ content: editContent }).eq('id', post.id);
    if (!error) {
      setIsEditing(false);
      if (onUpdate) onUpdate();
    }
  };

  const handleLike = async () => {
    if (!user) return;

    if (isLiked) {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', post.id)
        .eq('user_id', user.id);
      
      if (!error) {
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      }
    } else {
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: post.id, user_id: user.id });
      
      if (!error) {
        setIsLiked(true);
        setLikesCount(prev => prev + 1);

        // Create notification for post owner
        if (post.author_id !== user.id) {
          await supabase
            .from('notifications')
            .insert({
              recipient_id: post.author_id,
              actor_id: user.id,
              type: 'like',
              resource_id: post.id,
              read: false
            });
        }
      }
    }
  };

  const fetchComments = async () => {
    setLoadingComments(true);
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    
    if (data) setComments(data as any);
    setLoadingComments(false);
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    const { error } = await supabase.from('comments').insert({
      post_id: post.id,
      author_id: user.id,
      content: newComment
    });

    if (!error) {
      setNewComment('');
      fetchComments();

      // Create notification for post owner
      if (post.author_id !== user.id) {
        await supabase
          .from('notifications')
          .insert({
            recipient_id: post.author_id,
            actor_id: user.id,
            type: 'comment',
            resource_id: post.id,
            read: false
          });
      }
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (!error && onDelete) onDelete();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'FideTV Post',
        text: post.content,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleReport = () => {
    alert("Post reported successfully. Our team will review it shortly.");
  };

  useEffect(() => {
    if (showComments) fetchComments();
  }, [showComments]);

  const canManage = user && (user.id === post.author_id || user.email === 'fidetvonline@gmail.com');

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = post.content.match(urlRegex) || [];
  const playableUrl = urls.find(u => Player.canPlay(u));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-surface border border-border-custom rounded-3xl p-6 space-y-6 hover:bg-surface-bright/50 transition-all duration-300 shadow-2xl shadow-black/5"
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <Link to={`/profile/${post.profiles?.username}`} className="w-12 h-12 bg-surface-bright rounded-2xl flex items-center justify-center overflow-hidden border border-border-custom group cursor-pointer shadow-sm">
            {post.profiles?.avatar_url ? (
              <img src={post.profiles.avatar_url} alt={post.profiles.username} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
            ) : (
              <User className="w-6 h-6 text-foreground/20" />
            )}
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <Link to={`/profile/${post.profiles?.username}`} className="font-display font-bold text-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-2">
                {post.profiles?.username || 'Anonymous'}
                {post.profiles?.is_verified && <Award className="w-3 h-3 text-primary" />}
              </Link>
              {user && user.id !== post.author_id && (
                <Link to="/messages" className="bg-foreground/5 hover:bg-foreground/10 px-2 py-1 rounded-md text-[10px] text-foreground/40 hover:text-foreground uppercase font-black items-center gap-1 flex transition-colors shadow-sm">
                  <Send className="w-3 h-3" /> Message
                </Link>
              )}
            </div>
            <p className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mt-0.5">
              {formatDistanceToNow(new Date(post.created_at))} ago
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {canManage && (
            <>
              <button onClick={() => setIsEditing(!isEditing)} className="p-2 text-foreground/40 hover:text-primary transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={handleDelete} className="p-2 text-foreground/40 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          <div className="relative group">
            <button className="p-2 text-foreground/40 hover:text-foreground transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border-custom rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-2xl">
              <button 
                onClick={handleReport}
                className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-foreground/5 flex items-center gap-2"
              >
                <Flag className="w-4 h-4" /> Report Post
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full bg-background border border-border-custom rounded-2xl p-4 text-foreground min-h-[100px] focus:border-primary/50 shadow-inner"
            />
            <div className="flex justify-end space-x-2">
               <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-[10px] uppercase font-black text-foreground/40 hover:text-foreground">Cancel</button>
               <button onClick={handleUpdate} className="px-6 py-2 bg-primary text-white text-[10px] font-black uppercase rounded-lg shadow-lg shadow-primary/20">Save Changes</button>
            </div>
          </div>
        ) : (
          <p className="text-foreground/80 leading-relaxed font-medium whitespace-pre-wrap">
            {post.content}
          </p>
        )}
        
        {(post.media_url || playableUrl) && (
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-background border border-border-custom group/media">
            {post.type === 'image' && post.media_url ? (
              <div 
                className="w-full h-full cursor-pointer relative overflow-hidden"
                onClick={() => setLightbox({ open: true, url: post.media_url!, type: 'image' })}
              >
                <img 
                  src={post.media_url} 
                  alt="Post content" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover/media:scale-110" 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
              </div>
            ) : null}
            {post.type === 'video' && post.media_url ? (
              <div className="relative w-full h-full bg-black">
                {!isPlaying ? (
                  <div 
                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-surface-bright/10 backdrop-blur-[2px] group-hover/media:bg-surface-bright/20 transition-all duration-500"
                    onClick={() => setIsPlaying(true)}
                  >
                    <div className="w-16 h-16 bg-primary/20 backdrop-blur-md rounded-full flex items-center justify-center border border-primary/30 group-hover/media:scale-110 group-hover/media:bg-primary/40 transition-all duration-500 shadow-2xl shadow-primary/20">
                      <Play className="w-8 h-8 text-primary fill-primary/20" />
                    </div>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40 group-hover/media:text-primary transition-colors">Play Video</p>
                  </div>
                ) : (
                  <video 
                    src={post.media_url} 
                    className="absolute top-0 left-0 w-full h-full object-contain"
                    controls
                    autoPlay
                    playsInline
                  />
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox({ open: true, url: post.media_url!, type: 'video', isNative: true });
                  }}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-primary rounded-full text-white opacity-0 group-hover/media:opacity-100 transition-all z-10 shadow-lg"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            ) : null}
            {!post.media_url && playableUrl ? (
              <div className="relative w-full h-full">
                {!isPlaying ? (
                  <div 
                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-surface-bright/10 backdrop-blur-[2px] group-hover/media:bg-surface-bright/20 transition-all duration-500"
                    onClick={() => setIsPlaying(true)}
                  >
                    <div className="w-16 h-16 bg-primary/20 backdrop-blur-md rounded-full flex items-center justify-center border border-primary/30 group-hover/media:scale-110 group-hover/media:bg-primary/40 transition-all duration-500 shadow-2xl shadow-primary/20">
                      <Play className="w-8 h-8 text-primary fill-primary/20" />
                    </div>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-foreground/40 group-hover/media:text-primary transition-colors">Stream Content</p>
                  </div>
                ) : (
                  <Player 
                    url={playableUrl} 
                    className="absolute top-0 left-0"
                    width="100%"
                    height="100%"
                    playing={true}
                    controls 
                  />
                )}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightbox({ open: true, url: playableUrl, type: 'video' });
                  }}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-primary rounded-full text-white opacity-0 group-hover/media:opacity-100 transition-all z-10 shadow-lg"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            ) : null}
          </div>
        )}

        <MediaLightbox 
          isOpen={lightbox.open}
          onClose={() => setLightbox({ ...lightbox, open: false })}
          mediaUrl={lightbox.url}
          type={lightbox.type}
          title={post.profiles?.username ? `Post by @${post.profiles.username}` : 'FideTV Media'}
          isNative={lightbox.isNative}
        />
      </div>

      <div className="pt-6 border-t border-border-custom flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <button 
            onClick={handleLike}
            className={cn(
              "flex items-center space-x-2 transition-colors group",
              isLiked ? "text-red-500" : "text-foreground/40 hover:text-red-500"
            )}
          >
            <Heart className={cn("w-5 h-5 transition-transform group-active:scale-125", isLiked && "fill-current")} />
            <span className="text-sm font-bold">{likesCount}</span>
          </button>
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center space-x-2 text-foreground/40 hover:text-primary transition-colors group"
          >
            <MessageCircle className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
            <span className="text-sm font-bold">{comments.length}</span>
          </button>
        </div>
        
        <button onClick={handleShare} className="p-2 text-foreground/40 hover:text-foreground transition-colors">
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-6 pt-4"
          >
            <form onSubmit={handleComment} className="flex gap-4">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-grow bg-background border border-border-custom rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary/50 shadow-inner placeholder:text-text-muted"
              />
              <button disabled={!newComment.trim()} className="p-3 bg-primary rounded-xl text-white disabled:opacity-50 shadow-lg shadow-primary/20">
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="space-y-4">
              {loadingComments ? (
                <div className="text-center p-4 text-foreground/40 text-xs">Loading comments...</div>
              ) : comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <Link to={`/profile/${comment.profiles?.username}`} className="w-8 h-8 rounded-lg bg-surface-bright flex items-center justify-center overflow-hidden shrink-0 border border-border-custom">
                    {comment.profiles?.avatar_url ? (
                      <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-foreground/20" />
                    )}
                  </Link>
                  <div className="flex-grow bg-foreground/5 rounded-2xl px-4 py-3 border border-border-custom shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                      <Link to={`/profile/${comment.profiles?.username}`} className="text-[10px] font-black text-foreground uppercase flex items-center gap-1 hover:text-primary transition-colors">
                        {comment.profiles?.username}
                        {comment.profiles?.is_verified && <Award className="w-2 h-2 text-primary" />}
                      </Link>
                      <span className="text-[9px] text-foreground/40 font-medium italic">{formatDistanceToNow(new Date(comment.created_at))} ago</span>
                    </div>
                    <p className="text-sm text-foreground/60 italic font-light">"{comment.content}"</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
