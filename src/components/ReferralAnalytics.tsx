import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend, Cell
} from 'recharts';
import { Users, TrendingUp, UserPlus, MousePointerClick, Percent, Calendar } from 'lucide-react';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { motion } from 'motion/react';

interface GrowthData {
  date: string;
  total: number;
  referral: number;
  conversion: number;
}

export const ReferralAnalytics: React.FC = () => {
  const [data, setData] = useState<GrowthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSignups: 0,
    referralSignups: 0,
    conversionRate: 0,
    referralShare: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      // Fetch profiles from the last 30 days
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('created_at, referred_by')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (pError) throw pError;

      // Fetch visits from the last 30 days
      let visits: any[] = [];
      try {
        const { data: vData } = await supabase
          .from('site_visits')
          .select('created_at')
          .gte('created_at', thirtyDaysAgo.toISOString());
        visits = vData || [];
      } catch (e) {
        console.warn("site_visits table not available for analytics");
        // Simulated visits for fallback if table doesn't exist
        visits = profiles.map(p => ({ created_at: p.created_at }));
      }

      const interval = eachDayOfInterval({
        start: startOfDay(thirtyDaysAgo),
        end: startOfDay(new Date())
      });

      const growthData: GrowthData[] = interval.map(day => {
        const dateStr = format(day, 'MMM dd');
        const dayProfiles = profiles?.filter(p => format(new Date(p.created_at), 'MMM dd') === dateStr) || [];
        const dayReferrals = dayProfiles.filter(p => p.referred_by).length;
        const dayVisits = visits.filter(v => format(new Date(v.created_at), 'MMM dd') === dateStr).length || 0;
        
        // Invite conversion rate: signups driven by referrals vs total referral attempts (visits with ref)
        // Since we don't track hits per ref yet, we'll use referral signup rate vs total signups as a proxy or vs visits
        const conversion = dayVisits > 0 ? (dayProfiles.length / dayVisits) * 100 : 0;

        return {
          date: dateStr,
          total: dayProfiles.length,
          referral: dayReferrals,
          conversion: parseFloat(conversion.toFixed(1))
        };
      });

      setData(growthData);

      // Overall stats
      const totalSignups = profiles?.length || 0;
      const referralSignups = profiles?.filter(p => p.referred_by).length || 0;
      const referralShare = totalSignups > 0 ? (referralSignups / totalSignups) * 100 : 0;
      const totalVisits = visits.length || 0;
      const overallConversion = totalVisits > 0 ? (totalSignups / totalVisits) * 100 : 0;

      setStats({
        totalSignups,
        referralSignups,
        conversionRate: parseFloat(overallConversion.toFixed(1)),
        referralShare: parseFloat(referralShare.toFixed(1))
      });

    } catch (err) {
      console.error('Error fetching referral analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-pulse">
        <div className="glass rounded-[2rem] h-[400px] bg-white/5" />
        <div className="glass rounded-[2rem] h-[400px] bg-white/5" />
      </div>
    );
  }

  return (
    <div id="referral-analytics-container" className="space-y-8">
      {/* Stats Overview */}
      <div id="referral-stats-grid" className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Growth (30d)', value: stats.totalSignups, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Referral Signups', value: stats.referralSignups, icon: UserPlus, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'Referral Share', value: `${stats.referralShare}%`, icon: Percent, color: 'text-purple-500', bg: 'bg-purple-500/10' },
          { label: 'Visit Conversion', value: `${stats.conversionRate}%`, icon: MousePointerClick, color: 'text-amber-500', bg: 'bg-amber-500/10' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            id={`referral-stat-card-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-3xl p-6 border border-white/5 flex items-center justify-between"
          >
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40">{stat.label}</p>
              <p className={`text-2xl font-display font-bold ${stat.color}`}>{stat.value}</p>
            </div>
            <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Growth Trends Chart */}
        <div id="referral-growth-chart-card" className="glass rounded-[2.5rem] p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Signup Growth
              </h3>
              <p className="text-xs text-foreground/40">Organic vs Referral acquisition</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] text-foreground/40 font-bold uppercase">Total</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] text-foreground/40 font-bold uppercase">Referral</span>
              </div>
            </div>
          </div>

          <div id="referral-growth-chart-container" className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorReferral" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00bcd4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00bcd4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }}
                  interval={6}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '16px',
                    fontSize: '12px'
                  }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="referral" 
                  stroke="#00bcd4" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorReferral)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invite Conversion Chart */}
        <div id="referral-conversion-chart-card" className="glass rounded-[2.5rem] p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-500" />
                Signup Conversion
              </h3>
              <p className="text-xs text-foreground/40">Percentage of visitors who join</p>
            </div>
            <Calendar className="w-5 h-5 text-foreground/20" />
          </div>

          <div id="referral-conversion-chart-container" className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }}
                  interval={6}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 700 }}
                  unit="%"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '16px'
                  }} 
                />
                <Bar dataKey="conversion" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.conversion > 10 ? '#f59e0b' : entry.conversion > 5 ? '#fbbf24' : '#d97706'} 
                      fillOpacity={0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
