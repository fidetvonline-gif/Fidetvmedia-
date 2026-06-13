
import React, { useState, useEffect } from 'react';
import { Play, CheckCircle, XCircle, RefreshCcw, Plus, Activity, Zap, Youtube, Clock, History } from 'lucide-react';
import { cn } from '../lib/utils';

interface DiscoveredChannel {
  id: string;
  name: string;
  url: string;
  category: string;
  status: 'pending' | 'testing' | 'stable' | 'failed';
  fail_count: number;
  last_check: string;
}

export const ChannelIngestionManager = () => {
  const [channels, setChannels] = useState<DiscoveredChannel[]>([]);
  const [newChannel, setNewChannel] = useState({ name: '', url: '', category: 'General' });
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [discoveryReport, setDiscoveryReport] = useState<any>(null);
  const [triggeringDiscovery, setTriggeringDiscovery] = useState(false);

  useEffect(() => {
    fetchDiscoveredChannels();
    fetchDiscoveryReport();
  }, []);

  const fetchDiscoveryReport = async () => {
    try {
      const response = await fetch('/api/youtube/discovery-report');
      const data = await response.json();
      if (!data.error) {
        setDiscoveryReport(data);
      }
    } catch (err) {
      console.error('Error fetching discovery report:', err);
    }
  };

  const triggerDiscovery = async () => {
    setTriggeringDiscovery(true);
    try {
      const response = await fetch('/api/youtube/trigger-discovery', { method: 'POST' });
      const data = await response.json();
      setDiscoveryReport(data);
      alert('YouTube discovery cycle complete!');
    } catch (err) {
      console.error('Discovery trigger error:', err);
      alert('Discovery failed. Check server logs.');
    } finally {
      setTriggeringDiscovery(false);
    }
  };

  const fetchDiscoveredChannels = async () => {
    try {
      const response = await fetch('/api/channels/discovered');
      const data = await response.json();
      if (Array.isArray(data)) {
        setChannels(data);
      } else if (data.error) {
        console.warn('Backend returned error:', data.error);
        setChannels([]);
      }
    } catch (err) {
      console.error('Error fetching discovered channels:', err);
      setChannels([]);
    }
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/channels/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChannel)
      });
      if (response.ok) {
        setNewChannel({ name: '', url: '', category: 'General' });
        fetchDiscoveredChannels();
      } else {
        const err = await response.json();
        alert(err.error || 'Ingestion failed');
      }
    } catch (err) {
      console.error('Ingestion error:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerHealthCheck = async () => {
    setChecking(true);
    try {
      await fetch('/api/channels/trigger-check', { method: 'POST' });
      // Wait a bit for the worker to start working
      setTimeout(fetchDiscoveredChannels, 2000);
    } catch (err) {
      console.error('Trigger check error:', err);
    } finally {
      setChecking(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'stable': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'testing': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'failed': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card-custom border border-border-custom rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-primary">
            <Youtube className="w-5 h-5" />
            <h2 className="text-xl font-bold">YouTube Auto-Discovery</h2>
          </div>
          <button
            onClick={triggerDiscovery}
            disabled={triggeringDiscovery}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCcw className={cn("w-3.5 h-3.5", triggeringDiscovery && "animate-spin")} />
            Trigger Manual Scan
          </button>
        </div>

        {discoveryReport ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-background-custom border border-border-custom p-4 rounded-xl">
                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Status</div>
                <div className="flex items-center gap-2 text-sm font-bold text-green-500">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Continuous Monitoring
                </div>
              </div>
              <div className="bg-background-custom border border-border-custom p-4 rounded-xl">
                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Newly Added</div>
                <div className="text-xl font-display font-black text-text-main">
                  +{discoveryReport.new_channels?.length || 0}
                </div>
              </div>
              <div className="bg-background-custom border border-border-custom p-4 rounded-xl">
                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Active Streams</div>
                <div className="text-xl font-display font-black text-text-main">
                   {discoveryReport.total_active_count || 0}
                </div>
              </div>
              <div className="bg-background-custom border border-border-custom p-4 rounded-xl">
                <div className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Last Updated</div>
                <div className="text-sm font-bold text-text-main flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-text-muted" />
                  {discoveryReport.created_at ? new Date(discoveryReport.created_at).toLocaleTimeString() : 'Pending first run'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-text-muted">
                    <History className="w-3.5 h-3.5" /> Recent Additions
                  </div>
                  <div className="bg-background-custom border border-border-custom rounded-xl p-4 min-h-[100px]">
                     {discoveryReport.new_channels && discoveryReport.new_channels.length > 0 ? (
                       <ul className="space-y-2">
                         {discoveryReport.new_channels.slice(0, 5).map((ch: string, i: number) => (
                           <li key={i} className="text-xs flex items-center gap-2 text-text-main">
                             <div className="w-1 h-1 rounded-full bg-green-500" />
                             {ch}
                           </li>
                         ))}
                       </ul>
                     ) : (
                       <p className="text-xs text-text-muted italic">No new channels in recent cycle.</p>
                     )}
                  </div>
               </div>

               <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-text-muted">
                    <XCircle className="w-3.5 h-3.5" /> Dead Streams Removed
                  </div>
                  <div className="bg-background-custom border border-border-custom rounded-xl p-4 min-h-[100px]">
                     {discoveryReport.removed_channels && discoveryReport.removed_channels.length > 0 ? (
                       <ul className="space-y-2">
                         {discoveryReport.removed_channels.slice(0, 5).map((ch: string, i: number) => (
                           <li key={i} className="text-xs flex items-center gap-2 text-text-muted">
                             <div className="w-1 h-1 rounded-full bg-red-500" />
                             {ch}
                           </li>
                         ))}
                       </ul>
                     ) : (
                       <p className="text-xs text-text-muted italic">No dead streams identified.</p>
                     )}
                  </div>
               </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-background-custom border border-border-custom rounded-xl border-dashed">
             <div className="p-4 bg-primary/5 rounded-full mb-4">
                <Youtube className="w-8 h-8 text-primary/40" />
             </div>
             <p className="text-sm font-bold text-text-muted">No discovery reports available yet.</p>
             <p className="text-xs text-text-muted/60 mt-1">Discovery runs automatically every 60 minutes.</p>
          </div>
        )}
      </div>

      <div className="bg-card-custom border border-border-custom rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-6 text-primary">
          <Activity className="w-5 h-5" />
          <h2 className="text-xl font-bold">Stream Ingestion Engine</h2>
        </div>

        <form onSubmit={handleIngest} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Channel Name</label>
            <input
              type="text"
              value={newChannel.name}
              onChange={e => setNewChannel({ ...newChannel, name: e.target.value })}
              className="w-full bg-background-custom border border-border-custom rounded-lg px-4 py-2 text-text-main focus:ring-1 focus:ring-primary outline-none"
              placeholder="e.g. BBC News"
              required
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Stream HLS/DASH URL</label>
            <input
              type="url"
              value={newChannel.url}
              onChange={e => setNewChannel({ ...newChannel, url: e.target.value })}
              className="w-full bg-background-custom border border-border-custom rounded-lg px-4 py-2 text-text-main focus:ring-1 focus:ring-primary outline-none"
              placeholder="https://example.com/live.m3u8"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-primary hover:bg-primary-hover text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50"
            >
              {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Ingest & Verify
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text-main flex items-center gap-2">
            Discovered Streams Queue
            <span className="text-xs font-normal text-text-muted">({channels.length} items)</span>
          </h3>
          <button
            onClick={triggerHealthCheck}
            disabled={checking}
            className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 bg-background-hover hover:bg-background-custom border border-border-custom rounded-lg text-text-main transition-color"
          >
            <RefreshCcw className={cn("w-3.5 h-3.5", checking && "animate-spin")} />
            Sync Health Checks
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-custom text-xs font-medium text-text-muted uppercase tracking-wider">
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Failures</th>
                <th className="px-4 py-3">Last Check</th>
                <th className="px-4 py-3 text-right">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/50">
              {channels.map((channel) => (
                <tr key={channel.id} className="text-sm group hover:bg-accent-custom/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-main">{channel.name}</div>
                    <div className="text-xs text-text-muted truncate max-w-xs">{channel.url}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border tracking-tighter",
                      getStatusColor(channel.status)
                    )}>
                      {channel.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-background-custom rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full", channel.fail_count >= 3 ? "bg-red-500" : "bg-yellow-500")} 
                          style={{ width: `${Math.min(channel.fail_count * 33.3, 100)}%` }} 
                        />
                      </div>
                      <span className="text-xs font-mono">{channel.fail_count}/3</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {channel.last_check ? new Date(channel.last_check).toLocaleTimeString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-1.5 hover:bg-background-custom rounded-lg text-text-muted hover:text-primary transition-colors">
                      <Play className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {channels.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-text-muted italic">
                    No streams currently in the queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card-custom border border-border-custom rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-text-main">Stable Promotion Policy</h4>
              <p className="text-xs text-text-muted">Discovery pipeline logic</p>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-text-muted">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Must return HTTP 200 with valid HLS/DASH manifest headers.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Manifest must contain playable segments or sub-playlists.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">•</span>
              <span>Automatically promoted to <b>Stable Channels</b> upon first success.</span>
            </li>
          </ul>
        </div>

        <div className="bg-card-custom border border-border-custom rounded-xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-text-main">Eviction Policy</h4>
              <p className="text-xs text-text-muted">Active monitoring rules</p>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-text-muted">
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">•</span>
              <span>Failing a health check increments the <b>fail_count</b>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">•</span>
              <span>3 consecutive failures moves stream to <b>Failed</b> status.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500 font-bold">•</span>
              <span>Failed streams are automatically removed from the <b>Stable</b> list.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
