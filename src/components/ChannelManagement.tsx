import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Edit2, Plus, Search, X, Upload, Zap } from 'lucide-react';
import { BatchChannelImport } from './BatchChannelImport';
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
  const [uploading, setUploading] = useState(false);
  const [syncingThumbnails, setSyncingThumbnails] = useState(false);
  const [currentThumbnail, setCurrentThumbnail] = useState('');
  const [channelName, setChannelName] = useState('');
  const [category, setCategory] = useState('');
  const [streamUrl, setStreamUrl] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchChannels = async () => {
    const { data, error } = await supabase.from('tv_channels').select('*').order('order_index');
    if (data) setChannels(data);
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (currentChannel) {
      setCurrentThumbnail(currentChannel.thumbnail || '');
      setChannelName(currentChannel.name || '');
      setCategory(currentChannel.category || '');
      setStreamUrl(currentChannel.url || '');
    } else {
      setCurrentThumbnail('');
      setChannelName('');
      setCategory('');
      setStreamUrl('');
    }
  }, [currentChannel]);

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

  const handleUrlBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const url = e.target.value;
    if (!url || (!url.includes('youtube.com') && !url.includes('youtu.be'))) return;
    
    try {
      const res = await fetch(`/api/youtube/metadata?url=${encodeURIComponent(url)}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        credentials: 'include'
      });
      if (res.ok) {
        const metadata = await res.json();
        
        // Auto-fill fields if they are empty
        if (metadata.title && (!channelName || channelName === '')) {
          setChannelName(metadata.title);
          showToast(`Auto-fetched: ${metadata.title}`, 'success');
        }
        if (metadata.thumbnail) setCurrentThumbnail(metadata.thumbnail);
        if (metadata.channelTitle && (!category || category === '')) setCategory(metadata.channelTitle);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.warn('Failed to auto-fetch YT metadata', errData.error);
      }
    } catch (err) {
      console.warn('Failed to auto-fetch YT metadata', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'event-thumbnails');

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData,
        credentials: 'include'
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Upload failed');
        
        const publicUrl = data.publicUrl;
        setCurrentThumbnail(publicUrl);
        showToast("Thumbnail uploaded successfully", 'success');
      } else {
        const text = await response.text();
        console.error("Non-JSON upload response:", text);
        
        if (text.includes('Cookie check') || text.includes('redirectToReturnUrl')) {
          throw new Error("Authentication interaction required by platform. Please refresh the page and try again.");
        }
        
        throw new Error(`Server returned invalid response (${response.status}). Please try a smaller image or contact support.`);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      showToast("Upload failed: " + err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Convert types if necessary or construct object
    const channelData = {
        name: data.name,
        category: data.category,
        url: data.url,
        thumbnail: currentThumbnail,
        country: data.country,
        language: data.language,
        stream_type: data.stream_type,
        epg_id: data.epg_id,
        is_active: data.is_active === 'on',
        is_featured: data.is_featured === 'on',
    };

    if (currentChannel) {
        const { error, data: updatedData } = await supabase.from('tv_channels').update(channelData).eq('id', currentChannel.id).select();
        if (error) {
            console.error("Update failed", error);
            showToast("Update failed: " + error.message, 'error');
            return;
        }
        console.log("Updated channel successfully:", updatedData);
        showToast("Channel updated successfully", 'success');
    } else {
        const { error, data: insertedData } = await supabase.from('tv_channels').insert(channelData).select();
        if (error) {
            console.error("Insert failed", error);
            showToast("Insert failed: " + error.message, 'error');
            return;
        }
        console.log("Inserted channel successfully:", insertedData);
        showToast("Channel added successfully", 'success');
    }
    
    // Broadcast the update/delete to other clients
    broadcastChange(currentChannel ? 'update' : 'insert');
    
    setIsModalOpen(false);
    setCurrentChannel(null);
    fetchChannels();
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
              <tr key={channel.id} className="border-b border-border-custom hover:bg-white/5 transition-colors">
                <td className="p-2 text-sm font-medium text-white">{channel.name}</td>
                <td className="p-2 text-sm text-zinc-400">
                  <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs select-none">{channel.category}</span>
                </td>
                <td className="p-2 text-sm flex gap-2">
                  <button onClick={() => { setCurrentChannel(channel); setIsModalOpen(true); }} className="text-blue-500 hover:text-blue-400 p-1 rounded hover:bg-blue-500/10 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => { setDeleteConfirmId(channel.id); setDeleteConfirmName(channel.name); }} className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
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

        {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-40">
                <form onSubmit={handleSave} className="bg-zinc-950 p-6 rounded-xl w-full max-w-lg border border-zinc-800 shadow-2xl scrollbar-thin max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white">{currentChannel ? 'Edit Channel' : 'Add Channel'}</h3>
                        <button type="button" onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"><X className="w-5 h-5"/></button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 block mb-1">Channel Name *</label>
                        <input 
                          name="name" 
                          placeholder="Channels TV" 
                          value={channelName}
                          onChange={(e) => setChannelName(e.target.value)}
                          className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-primary text-sm" 
                          required 
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 block mb-1">Category *</label>
                        <input 
                          name="category" 
                          placeholder="Nigeria" 
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-primary text-sm" 
                          required 
                        />
                      </div>
                      
                      <div>
                        <label className="text-xs font-semibold text-zinc-400 block mb-1">Source URL (M3U8 HLS link or YouTube Video Link) *</label>
                        <input 
                          onBlur={handleUrlBlur} 
                          name="url" 
                          placeholder="https://..." 
                          value={streamUrl}
                          onChange={(e) => setStreamUrl(e.target.value)}
                          className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-primary text-sm" 
                          required 
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-zinc-400 block mb-1">Thumbnail URL (Auto-fetched for YouTube)</label>
                        <div className="flex gap-2">
                          <input 
                            name="thumbnail" 
                            placeholder="https://example.com/thumb.jpg" 
                            value={currentThumbnail} 
                            onChange={(e) => setCurrentThumbnail(e.target.value)}
                            className="flex-1 p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-primary text-sm" 
                          />
                          <div className="relative">
                            <input 
                              type="file" 
                              id="thumbnail-upload" 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleFileUpload}
                              disabled={uploading}
                            />
                            <label 
                              htmlFor="thumbnail-upload"
                              className={cn(
                                "flex items-center gap-2 px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all cursor-pointer text-xs font-bold",
                                uploading && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <Upload className={cn("w-4 h-4", uploading && "animate-bounce")} />
                              {uploading ? '...' : 'Upload'}
                            </label>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-zinc-400 block mb-1">Country</label>
                          <input name="country" placeholder="Nigeria" defaultValue={currentChannel?.country} className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-primary text-sm" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-zinc-400 block mb-1">Language</label>
                          <input name="language" placeholder="English" defaultValue={currentChannel?.language} className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-primary text-sm" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-zinc-400 block mb-1">Stream Format</label>
                          <select name="stream_type" defaultValue={currentChannel?.stream_type || 'HLS'} className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-primary text-sm">
                              <option value="HLS">HLS (.m3u8)</option>
                              <option value="DASH">DASH (.mpd)</option>
                              <option value="MP4">MP4 (.mp4)</option>
                              <option value="embed">Embed (Iframe)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-zinc-400 block mb-1">EPG ID (For Guide data)</label>
                          <input name="epg_id" placeholder="e.g. channelstv" defaultValue={currentChannel?.epg_id} className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:border-primary text-sm" />
                        </div>
                      </div>

                      <div className="flex gap-6 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" name="is_active" defaultChecked={currentChannel?.is_active ?? true} className="w-4 h-4 rounded border-zinc-800 text-primary focus:ring-primary focus:ring-offset-zinc-950" />
                            <span className="text-sm font-medium text-zinc-300">Active (Visible in App)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" name="is_featured" defaultChecked={currentChannel?.is_featured ?? false} className="w-4 h-4 rounded border-zinc-800 text-primary focus:ring-primary focus:ring-offset-zinc-950" />
                            <span className="text-sm font-medium text-zinc-300">Featured</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-zinc-900">
                      <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all text-sm font-medium">Cancel</button>
                      <button type="submit" className="px-5 py-2 bg-primary hover:bg-primary/95 text-white rounded-lg transition-all text-sm font-semibold shadow-lg active:scale-95">Save Channel</button>
                    </div>
                </form>
            </div>
        )}

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
