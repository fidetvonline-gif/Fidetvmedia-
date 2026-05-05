import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPlus, UserMinus, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FollowButtonProps {
  targetUserId: string;
  className?: string;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ targetUserId, className, onFollowChange }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      if (user && user.id !== targetUserId) {
        checkFollowStatus(user.id);
      } else {
        setLoading(false);
      }
    });
  }, [targetUserId]);

  const checkFollowStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('followers')
        .select('*')
        .eq('follower_id', userId)
        .eq('following_id', targetUserId)
        .maybeSingle();

      if (!error && data) {
        setIsFollowing(true);
      }
    } catch (e) {
      console.warn("Follows checking error, if table doesn't exist, this is fine.", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentUser || loading) return;

    setLoading(true);
    try {
      if (isFollowing) {
        await supabase
          .from('followers')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetUserId);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await supabase
          .from('followers')
          .insert({
            follower_id: currentUser.id,
            following_id: targetUserId
          });
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (e) {
      console.error(e);
      alert("Followers system not initialized. Tell FideTV to run the setup SQL!");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || currentUser.id === targetUserId) return null;

  return (
    <button
      onClick={handleToggleFollow}
      disabled={loading}
      className={cn(
        "flex items-center space-x-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all",
        isFollowing 
          ? "bg-white/10 text-white hover:bg-white/20 border border-white/10" 
          : "bg-primary text-black hover:bg-primary/80",
        loading ? "opacity-50 cursor-not-allowed" : "",
        className
      )}
    >
      {isFollowing ? (
        <>
          <UserCheck className="w-4 h-4" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          <span>Follow</span>
        </>
      )}
    </button>
  );
}
