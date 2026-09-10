
import React, { useState, useEffect } from 'react';
import { parseResponseJson } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Shield, Database, Signal, Terminal, AlertTriangle, CheckCircle2, Loader2, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export default function Health() {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      setLoading(true);
      try {
        const stats: any = {
          timestamp: new Date().toISOString(),
          supabase: { status: 'checking', url: '...' },
          database: { tables: {} },
          auth: { status: 'checking' },
          network: { proxy: 'checking' }
        };

        // 1. Supabase Connection & Latency
        const start = Date.now();
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        stats.supabase.latency = Date.now() - start;
        stats.supabase.status = authError ? 'error' : 'connected';
        stats.auth.status = session ? 'authenticated' : 'anonymous (anon key active)';
        stats.auth.user = session?.user?.email || 'Public Guest';

        // 2. Table Access (Check the disputed 'channels' vs 'tv_channels')
        const tables = ['tv_channels', 'channels', 'site_settings', 'portfolio_items'];
        for (const table of tables) {
          try {
            const { count, error: tableError } = await supabase
              .from(table)
              .select('*', { count: 'exact', head: true });
            
            if (tableError) {
              stats.database.tables[table] = { status: 'failed', error: tableError.message };
            } else {
              stats.database.tables[table] = { status: 'ok', count };
            }
          } catch (e: any) {
            stats.database.tables[table] = { status: 'critical', error: e.message };
          }
        }

        // 3. Backend Proxy Check
        try {
          const proxyStart = Date.now();
          const proxyRes = await fetch('/api/health');
          stats.network.proxy_latency = Date.now() - proxyStart;
          if (proxyRes.ok) {
            const proxyData = await parseResponseJson(proxyRes);
            stats.network.proxy = { status: 'ok', version: proxyData.version || '1.0.0', ...proxyData };
          } else {
            stats.network.proxy = { status: 'failed', code: proxyRes.status };
          }
        } catch (e: any) {
          stats.network.proxy = { status: 'error', error: e.message };
        }

        // 4. Signal Bridge Check
        try {
          const bridgeRes = await fetch('/api/channels');
          if (bridgeRes.ok) {
            const bridgeData = await parseResponseJson(bridgeRes);
            stats.network.bridge = { status: 'ok', count: Array.isArray(bridgeData) ? bridgeData.length : 0 };
          } else {
            const errData = await parseResponseJson(bridgeRes);
            stats.network.bridge = { status: 'failed', error: errData.error || errData.message || bridgeRes.statusText };
          }
        } catch (e: any) {
          stats.network.bridge = { status: 'error', error: e.message };
        }

        setResults(stats);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center p-8">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
        <h1 className="text-white text-xl font-black uppercase tracking-[0.2em] animate-pulse">Running FIDE Diagnostics...</h1>
      </div>
    );
  }

  const isHealthy = results && 
    results.supabase.status === 'connected' && 
    results.database.tables['tv_channels']?.status === 'ok' &&
    results.network.proxy.status === 'ok';

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-6 md:p-12 font-sans selection:bg-primary selection:text-white">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="px-3 py-1 bg-primary text-[10px] font-black uppercase tracking-widest rounded-full">System Health</div>
              {isHealthy ? (
                <div className="flex items-center gap-1.5 text-green-500">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">All Systems Operational</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-500">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Issues Detected</span>
                </div>
              )}
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none italic">
              FIDE TV <span className="text-primary italic">Status</span>
            </h1>
          </div>
          <p className="text-white/40 text-[10px] font-mono uppercase">Last Diagnostic: {results?.timestamp}</p>
        </header>

        {/* Global Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard 
            icon={<Database className="w-5 h-5 text-primary" />}
            label="Supabase"
            value={results?.supabase.status === 'connected' ? 'Connected' : 'Error'}
            sub={`RTT: ${results?.supabase.latency}ms`}
            status={results?.supabase.status === 'connected' ? 'success' : 'error'}
          />
          <StatCard 
            icon={<Signal className="w-5 h-5 text-primary" />}
            label="Signal Bridge"
            value={results?.network.bridge?.status === 'ok' ? 'Bypassing RLS' : 'Inactive'}
            sub={results?.network.bridge?.status === 'ok' ? `${results.network.bridge.count} signals found` : results?.network.bridge?.error || 'Check server logs'}
            status={results?.network.bridge?.status === 'ok' ? 'success' : 'error'}
          />
          <StatCard 
            icon={<Globe className="w-5 h-5 text-primary" />}
            label="Proxy Edge"
            value={results?.network.proxy.status === 'ok' ? 'Online' : 'Offline'}
            sub={`RTT: ${results?.network.proxy_latency}ms`}
            status={results?.network.proxy.status === 'ok' ? 'success' : 'error'}
          />
          <StatCard 
            icon={<Shield className="w-5 h-5 text-primary" />}
            label="Identity"
            value={results?.auth.user === 'Public Guest' ? 'Guest' : 'Admin'}
            sub={results?.auth.user}
            status="info"
          />
        </div>

        {/* Database Audit */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 whitespace-nowrap">Database Audit</h2>
            <div className="h-px w-full bg-white/5"></div>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Object</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/40">Result</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(results?.database.tables || {}).map(([name, data]: [string, any]) => (
                  <tr key={name} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{name}</td>
                    <td className="px-6 py-4">
                      {data.status === 'ok' ? (
                        <span className="flex items-center gap-2 text-green-500 text-[10px] font-black uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" /> Accessible
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-red-500 text-[10px] font-black uppercase tracking-wider">
                          <AlertTriangle className="w-3 h-3" /> {data.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-white/60 text-xs">
                      {data.status === 'ok' ? `${data.count} rows active` : data.error}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Root Cause Prediction */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white/30 whitespace-nowrap">Diagnostics Insight</h2>
            <div className="h-px w-full bg-white/5"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-[#e24b4a]/10 border border-[#e24b4a]/20 rounded-2xl">
              <h3 className="text-[#e24b4a] text-xs font-black uppercase tracking-widest mb-3">Potential Issue: RLS Lockdown</h3>
              <p className="text-white/60 text-xs leading-relaxed">
                If 'tv_channels' shows 0 rows but exists, Row Level Security is active but missing an 'anon' select policy. 
                Users see no content, while admins with service keys see everything.
              </p>
            </div>
            <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl">
              <h3 className="text-primary text-xs font-black uppercase tracking-widest mb-3">Potential Issue: Vercel Timeout</h3>
              <p className="text-white/60 text-xs leading-relaxed">
                If the Proxy Edges show high latency, Vercel may be timing out before segments load. 
                IPTV streams are often slow; check the 'Connect Timeout' logs in Vercel.
              </p>
            </div>
          </div>
        </section>

        <footer className="pt-12 text-center text-white/20 text-[10px] font-black uppercase tracking-widest">
          FIDE TV Signal Bridge v2.4.0 • Node Runtime
        </footer>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, status }: { icon: any, label: string, value: string, sub: string, status: 'success' | 'error' | 'info' }) {
  const statusColors = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-primary'
  };

  return (
    <div className="p-6 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.08] transition-all group">
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 group-hover:text-white/50 transition-colors">{label}</span>
      </div>
      <div className={cn("text-2xl font-black uppercase tracking-tighter italic", statusColors[status])}>{value}</div>
      <div className="text-[10px] font-mono text-white/40 mt-1 truncate">{sub}</div>
    </div>
  );
}
