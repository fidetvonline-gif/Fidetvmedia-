import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Edit2, Plus, Search, X, Upload, Zap, RefreshCw } from 'lucide-react';
import { BatchChannelImport } from './BatchChannelImport';
import { EditChannelModal } from './EditChannelModal';
import { DEFAULT_CHANNELS } from '../constants/channels';
import { cn } from '../lib/utils';

export const ChannelManagement = () => {
  const [channels, setChannels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [currentChannel, setCurrentChannel] = useState(null);
  
  // Custom non-blocking modal and alert states
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [toast, setToast] = useState(null);
  const [syncingThumbnails, setSyncingThumbnails] = useState(false);
  const [runningHealthCheck, setRunningHealthCheck] = useState(false);
  const [restoringDefaults, setRestoringDefaults] = useState(false);

  const handleHealthCheck = async () => {
    if (!confirm('This will perform a technical validation of all live channels. Broken signals will be marked inactive. Continue?')) return;
    
    setRunningHealthCheck(true);
    try {
      const response = await fetch('/api/channels/trigger-check', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      });
      
      const data = await response.json();
      showToast(data.message || "Health check cycle completed!", 'success');
      fetchChannels();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setRunningHealthCheck(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchChannels = async () => {
    let allChannels: any[] = [];
    let rangeStart = 0;
    const rangeSize = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data: dbChannels, error } = await supabase
            .from('tv_channels')
            .select('*')
            .order('order_index')
            .range(rangeStart, rangeStart + rangeSize - 1);

        if (error) {
            console.error('Error fetching channels:', error);
            break;
        }

        if (dbChannels && dbChannels.length > 0) {
            allChannels = [...allChannels, ...dbChannels];
            if (dbChannels.length < rangeSize) {
                hasMore = false;
            } else {
                rangeStart += rangeSize;
            }
        } else {
            hasMore = false;
        }
    }
    
    // Merge logic to show what the user actually sees in the app
    const merged = [...allChannels];
    
    setChannels(merged);
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const broadcastChange = (action: string) => {
    const channelName = 'live-events';
    const channel = supabase.channel(channelName);
    
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Admin] Subscribed for ${action}, sending broadcast...`);
        channel.send({
          type: 'broadcast',
          event: 'channel-changed',
          payload: { action, timestamp: new Date().toISOString(), sender: 'admin' }
        }).then((resp) => {
          console.log('[Admin] Broadcast response:', resp);
          // Keep channel open briefly for delivery confirmation
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 2000);
        });
      }
    });
  };

  const handleSync = () => {
    broadcastChange('sync');
    showToast("Sync signal sent to all live screens!", 'success');
    fetchChannels();
  };

  const handleRestoreDefaults = async () => {
    if (!confirm(`This will restore ${DEFAULT_CHANNELS.length} default channels. Existing channels with the same URLs will be skipped. Continue?`)) return;
    
    setRestoringDefaults(true);
    try {
      let restoredCount = 0;
      
      for (const ch of DEFAULT_CHANNELS) {
        // Skip channels with empty URL
        if (!ch.url) continue;

        // Check if exists
        const { data: existing } = await supabase
          .from('tv_channels')
          .select('id')
          .eq('url', ch.url)
          .single();

        if (!existing) {
          const { error } = await supabase.from('tv_channels').insert([{
            name: ch.name,
            category: ch.category,
            url: ch.url,
            thumbnail: ch.thumbnail,
            description: ch.description,
            is_active: true, // Force active on restore
            icon: ch.icon?.name || 'Tv',
            order_index: restoredCount
          }]);
          
          if (!error) restoredCount++;
        }
      }
      
      showToast(`Successfully restored ${restoredCount} channels!`, 'success');
      broadcastChange('restore');
      fetchChannels();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setRestoringDefaults(false);
    }
  };

  const handleThumbnailSync = async () => {
    if (!confirm('This will refresh all YouTube thumbnails for all existing channels by fetching the latest ones from YouTube. Continue?')) return;
    
    setSyncingThumbnails(true);
    try {
      const response = await fetch('/api/channels/sync-thumbnails', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      });
      
      const data = await response.json();
      if (data.success) {
        showToast(`Successfully refreshed ${data.updatedCount} thumbnails!`, 'success');
        fetchChannels();
      } else {
        throw new Error(data.error || 'Failed to sync thumbnails');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSyncingThumbnails(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    const { error } = await supabase.from('tv_channels').delete().eq('id', deleteConfirmId);
    if (!error) {
      showToast(`Channel "${deleteConfirmName}" deleted successfully`, 'success');
      setDeleteConfirmId(null);
      setDeleteConfirmName('');
      // Broadcast the delete to other clients
      broadcastChange('delete');
      fetchChannels();
    } else {
      showToast("Delete failed: " + error.message, 'error');
    }
  };

  const filteredChannels = channels.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-background rounded-xl border border-border-custom shadow-inner relative">
      {/* Visual Toast Notification Banner */}
      {toast && (
        <div className={cn(
          "fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-xl border text-sm flex items-center gap-2 animate-fade-in",
          toast.type === 'success' 
            ? "bg-emerald-950/90 text-emerald-200 border-emerald-800/50" 
            : "bg-red-950/90 text-red-200 border-red-800/50"
        )}>
          <span className="font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80 text-xs font-bold">×</button>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Channel Management</h2>
        <div className="flex gap-2">
            <button 
              onClick={handleThumbnailSync} 
              disabled={syncingThumbnails}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors border border-zinc-700 disabled:opacity-50"
              title="Refresh all YouTube thumbnails"
            >
              <Zap className={cn("w-4 h-4", syncingThumbnails && "animate-pulse")} /> 
              {syncingThumbnails ? 'Syncing...' : 'Refresh Thumbnails'}
            </button>
            <button 
              onClick={handleSync} 
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-lg active:scale-95"
              title="Force update all users' screens"
            >
              <Zap className="w-4 h-4" /> Sync All Screens
            </button>
            <button 
              onClick={handleHealthCheck} 
              disabled={runningHealthCheck}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors shadow-lg active:scale-95 disabled:opacity-50",
                runningHealthCheck ? "bg-amber-600" : "bg-red-600 hover:bg-red-700"
              )}
              title="Repair broken signals / Mark dead links"
            >
              <RefreshCw className={cn("w-4 h-4", runningHealthCheck && "animate-spin")} /> 
              {runningHealthCheck ? 'Healing...' : 'Heal All Signals'}
            </button>
            <button 
              onClick={handleRestoreDefaults} 
              disabled={restoringDefaults}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-lg active:scale-95 disabled:opacity-50"
              title="Restore 50+ original channels from setup"
            >
              <RefreshCw className={cn("w-4 h-4", restoringDefaults && "animate-spin")} /> 
              {restoringDefaults ? 'Restoring...' : 'Restore Defaults'}
            </button>
            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors">
              <Upload className="w-4 h-4" /> Import
            </button>
            <button onClick={() => { setCurrentChannel(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Add New
            </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-foreground/40" />
        <input 
          type="text" 
          placeholder="Search channels..." 
          className="w-full p-2 border border-border-custom rounded-lg bg-zinc-900 text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isImportModalOpen && (
        <BatchChannelImport onClose={() => setIsImportModalOpen(false)} onImportComplete={() => { fetchChannels(); broadcastChange('import'); }} />
      )}
      
      <EditChannelModal 
        isOpen={isModalOpen}
        channel={currentChannel}
        onClose={() => {
          setIsModalOpen(false);
          setCurrentChannel(null);
        }}
        onSave={() => {
          fetchChannels();
          broadcastChange(currentChannel ? 'update' : 'insert');
          showToast(currentChannel ? "Channel updated successfully" : "Channel added successfully", 'success');
        }}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border-custom text-zinc-400">
              <th className="p-2 text-left text-sm font-medium">Name</th>
              <th className="p-2 text-left text-sm font-medium">Category</th>
              <th className="p-2 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredChannels.map(channel => (
              <tr key={channel.id || channel.name} className="border-b border-border-custom hover:bg-white/5 transition-colors">
                <td className="p-2 text-sm font-medium text-white">
                  <div className="flex items-center gap-2">
                    {channel.name}
                  </div>
                </td>
                <td className="p-2 text-sm text-zinc-400">
                  <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs select-none">{channel.category}</span>
                </td>
                <td className="p-2 text-sm flex gap-2">
                  <button onClick={() => { setCurrentChannel(channel); setIsModalOpen(true); }} className="text-blue-500 hover:text-blue-400 p-1 rounded hover:bg-blue-500/10 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                  <button 
                    onClick={() => { setDeleteConfirmId(channel.id); setDeleteConfirmName(channel.name); }} 
                    className="p-1 rounded transition-colors text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredChannels.length === 0 && (
              <tr>
                <td colSpan={3} className="text-center p-8 text-zinc-500 text-sm">No channels found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

        {/* Custom Confirmation Modal for TV Channel Deletes */}
        {deleteConfirmId && (
            <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl w-full max-w-md shadow-2xl">
                    <h3 className="text-lg font-bold text-white mb-2">Delete TV Channel</h3>
                    <p className="text-sm text-zinc-400 mb-6">Are you sure you want to delete <span className="font-semibold text-zinc-200">"{deleteConfirmName}"</span>? This will permanently remove it from the live channel directory.</p>
                    <div className="flex justify-end gap-3">
                        <button 
                          type="button"
                          onClick={() => { setDeleteConfirmId(null); setDeleteConfirmName(''); }}
                          className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors text-sm font-medium"
                        >
                          Cancel
                        </button>
                        <button 
                          type="button"
                          onClick={executeDelete}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-semibold active:scale-95 shadow-md shadow-red-950/20"
                        >
                          Delete Channel
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
