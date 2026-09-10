import React, { useState, useEffect } from 'react';
import { parseResponseJson } from '@/lib/api';
import { X, Upload, Check, AlertCircle, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface EditChannelModalProps {
  channel: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedChannel: any) => void;
}

export const EditChannelModal: React.FC<EditChannelModalProps> = ({ 
  channel, 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [formData, setFormData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (channel) {
      setFormData({
        name: channel.name || '',
        category: channel.category || '',
        url: channel.url || '',
        thumbnail: channel.thumbnail || '',
        description: channel.description || '',
        is_active: channel.is_active ?? true,
        is_featured: channel.is_featured ?? false,
        country: channel.country || '',
        language: channel.language || '',
        stream_type: channel.stream_type || 'HLS',
        epg_id: channel.epg_id || '',
      });
    } else {
      setFormData({
        name: '',
        category: '',
        url: '',
        thumbnail: '',
        description: '',
        is_active: true,
        is_featured: false,
        country: '',
        language: '',
        stream_type: 'HLS',
        epg_id: '',
      });
    }
  }, [channel]);

  if (!isOpen || !formData) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result;
      // If it's a default channel (no UUID), we insert it as a new record
      const isNew = !channel || !channel.id || channel.is_default;

      if (!isNew) {
        result = await supabase
          .from('tv_channels')
          .update(formData)
          .eq('id', channel.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('tv_channels')
          .insert([formData])
          .select()
          .single();
      }

      if (result.error) throw result.error;
      
      onSave(result.data);
      onClose();
    } catch (err: any) {
      console.error('Error saving channel:', err);
      setError(err.message || 'Failed to save channel');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('bucket', 'event-thumbnails');

      const response = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: form,
        credentials: 'include'
      });

      const data = await parseResponseJson(response);
      if (!response.ok) throw new Error(data.error || 'Upload failed');
      
      const publicUrl = data.publicUrl;
      setFormData({ ...formData, thumbnail: publicUrl });
    } catch (err: any) {
      console.error('Upload error:', err);
      setError('Thumbnail upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">{channel ? 'Edit Configuration' : 'New Channel Node'}</h2>
            <p className="text-[10px] text-primary font-mono uppercase tracking-widest mt-0.5">{channel ? `Signal Node: ${channel.name}` : 'Initialize Broadcast Signal'}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-2xl flex gap-3 items-center text-red-500 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Channel Label</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. FideTv Pro"
                  className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Broadcast Category</label>
                <input 
                  type="text"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Entertainment"
                  className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Ingest Signal (URL)</label>
              <input 
                type="text"
                value={formData.url}
                onChange={e => setFormData({ ...formData, url: e.target.value })}
                placeholder="HLS Link or YouTube URL"
                className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono text-xs shadow-inner"
                required
              />
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Visual Branding (Thumbnail)</label>
                <div className="relative group">
                   <div className="absolute inset-y-0 right-3 flex items-center pr-2">
                      <label className="cursor-pointer hover:scale-105 transition-transform p-2 bg-zinc-800 rounded-lg">
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        <Upload className={cn("w-4 h-4 text-zinc-400 group-hover:text-primary transition-colors", uploading && "animate-bounce")} />
                      </label>
                   </div>
                   <input 
                    type="text"
                    value={formData.thumbnail}
                    onChange={e => setFormData({ ...formData, thumbnail: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-16 text-sm shadow-inner"
                  />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Stream Format</label>
                <select 
                  value={formData.stream_type}
                  onChange={e => setFormData({ ...formData, stream_type: e.target.value })}
                  className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm appearance-none shadow-inner"
                >
                  <option value="HLS">HLS (.m3u8)</option>
                  <option value="MP4">MP4 (.mp4)</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Vimeo">Vimeo</option>
                  <option value="MPEG-TS">MPEG-TS</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Metadata ID (EPG)</label>
                <input 
                  type="text"
                  value={formData.epg_id}
                  onChange={e => setFormData({ ...formData, epg_id: e.target.value })}
                  placeholder="e.g. fide_main"
                  className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Technical Summary / Description</label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Channel technical details or user-facing description..."
                rows={3}
                className="w-full px-5 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none text-sm shadow-inner"
              />
            </div>

            <div className="flex gap-4 p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
              <label className="flex-1 flex items-center gap-3 cursor-pointer group bg-background/40 p-3 rounded-xl border border-zinc-800 hover:border-primary/30 transition-all">
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                  formData.is_active ? "bg-primary border-primary" : "border-zinc-700"
                )}>
                  {formData.is_active && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={formData.is_active} 
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })} 
                />
                <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-400 group-hover:text-white transition-colors">Broadcast Signal Live</span>
              </label>

              <label className="flex-1 flex items-center gap-3 cursor-pointer group bg-background/40 p-3 rounded-xl border border-zinc-800 hover:border-amber-500/30 transition-all">
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-all text-[10px]",
                  formData.is_featured ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-700 text-transparent"
                )}>
                  ★
                </div>
                <input 
                  type="checkbox" 
                  className="hidden" 
                  checked={formData.is_featured} 
                  onChange={e => setFormData({ ...formData, is_featured: e.target.checked })} 
                />
                <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-400 group-hover:text-white transition-colors">Feature In Carousel</span>
              </label>
            </div>
          </div>
        </form>

        <div className="p-6 bg-zinc-900/50 border-t border-zinc-800 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-4 bg-background border border-zinc-800 text-zinc-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Abort
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 max-w-[200px] py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading ? 'Committing Signal...' : 'Save Configuration'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
