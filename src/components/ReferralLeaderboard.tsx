import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy, Medal, Users, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

interface TopReferrer {
  username: string;
  full_name: string;
  avatar_url?: string;
  count: number;
}

export const ReferralLeaderboard: React.FC = () => {
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles that have been referred
      const { data, error } = await supabase
        .from('profiles')
        .select('referred_by')
        .not('referred_by', 'is', null);

      if (error) throw error;

      // Count occurrences of each referrer (username)
      const counts: Record<string, number> = {};
      if (data) {
        data.forEach(p => {
          if (p.referred_by) {
            counts[p.referred_by] = (counts[p.referred_by] || 0) + 1;
          }
        });
      }

      // Sort referrers by count
      const sortedEntries = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

      // Fetch profiles for these usernames
      const usernames = sortedEntries.map(([username]) => username);
      
      if (usernames.length === 0) {
        setTopReferrers([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .in('username', usernames);

      if (pError) throw pError;

      const leaderboard = sortedEntries.map(([username, count]) => {
        const profile = profiles.find(p => p.username === username);
        return {
          username,
          count,
          full_name: profile?.full_name || username,
          avatar_url: profile?.avatar_url
        };
      });

      setTopReferrers(leaderboard);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-[2.5rem] p-8 space-y-4 animate-pulse">
        <div className="h-6 w-48 bg-white/5 rounded-lg" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 w-full bg-white/5 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="glass rounded-[3rem] overflow-hidden">
      <div className="p-8 border-b border-white/5 bg-gradient-to-br from-primary/10 to-transparent">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Top Referrers
          </h2>
          <div className="px-3 py-1 bg-primary/20 rounded-full">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Leaderboard</span>
          </div>
        </div>
        <p className="text-sm text-foreground/60">The community members who brought the most friends to FideTV.</p>
      </div>

      <div className="p-4">
        {topReferrers.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-8 h-8 text-foreground/20" />
            </div>
            <p className="text-foreground/40 font-medium">No referrals yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topReferrers.map((referrer, index) => (
              <motion.div
                key={referrer.username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={`/profile/${referrer.username}`}
                  className="flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group border border-transparent hover:border-white/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-2xl overflow-hidden border-2 ${
                        index === 0 ? 'border-yellow-500/50' : 
                        index === 1 ? 'border-gray-400/50' : 
                        index === 2 ? 'border-amber-600/50' : 
                        'border-white/10'
                      }`}>
                        {referrer.avatar_url ? (
                          <img src={referrer.avatar_url} alt={referrer.username} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-surface-light flex items-center justify-center">
                            <span className="text-lg font-bold text-primary">{referrer.username[0].toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <div className={`absolute -top-2 -left-2 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                        index === 0 ? 'bg-yellow-500 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 
                        index === 1 ? 'bg-gray-400 text-black' : 
                        index === 2 ? 'bg-amber-700 text-white' : 
                        'bg-surface-light text-foreground/60 border border-white/10'
                      }`}>
                        {index + 1}
                      </div>
                    </div>
                    <div>
                      <p className="font-display font-bold text-foreground group-hover:text-primary transition-colors">{referrer.full_name}</p>
                      <p className="text-[10px] text-foreground/40 font-mono tracking-wider">@{referrer.username}</p>
                    </div>
                  </div>
                  
                  <div className="text-right flex items-center gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-xl font-display font-black text-primary">{referrer.count}</span>
                        <Users className="w-3 h-3 text-primary/60" />
                      </div>
                      <p className="text-[8px] uppercase tracking-[0.2em] font-black text-foreground/30">Invites</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-foreground/20 group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {topReferrers.length > 0 && (
        <div className="p-6 border-t border-white/5 bg-white/5">
          <Link 
            to="/auth" 
            className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-black font-display font-black uppercase tracking-widest text-xs rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_20px_-5px_rgba(0,188,212,0.4)]"
          >
            Join & Start Referring
          </Link>
        </div>
      )}
    </div>
  );
};
