import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Megaphone, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Eye, 
  EyeOff, 
  Camera, 
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Upload,
  Globe,
  Smartphone
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface AdUnit {
  id: string;
  name: string;
  platform: string;
  ad_type: string;
  ad_unit_id: string;
  image_url: string | null;
  target_url: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminAdManagement() {
  const [ads, setAds] = useState<AdUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Partial<AdUnit> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ad_units')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (err) {
      console.error('Error fetching ads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (ad: AdUnit) => {
    try {
      const { error } = await supabase
        .from('ad_units')
        .update({ is_active: !ad.is_active })
        .eq('id', ad.id);

      if (error) throw error;
      setAds(ads.map(a => a.id === ad.id ? { ...a, is_active: !a.is_active } : a));
    } catch (err) {
      console.error('Error toggling ad status:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this advertisement?')) return;
    try {
      const { error } = await supabase.from('ad_units').delete().eq('id', id);
      if (error) throw error;
      setAds(ads.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error deleting ad:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAd) return;
    setSaveLoading(true);

    try {
      const payload = {
        name: editingAd.name,
        platform: editingAd.platform,
        ad_unit_id: editingAd.ad_unit_id,
        ad_type: editingAd.ad_type || 'native',
        image_url: editingAd.image_url,
        target_url: editingAd.target_url,
        is_active: editingAd.is_active ?? true
      };

      if (editingAd.id) {
        const { error } = await supabase
          .from('ad_units')
          .update(payload)
          .eq('id', editingAd.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ad_units')
          .insert([payload]);
        if (error) throw error;
      }
      setIsEditorOpen(false);
      fetchAds();
    } catch (err) {
      console.error('Error saving ad:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const { publicUrl } = await response.json();
      setEditingAd(prev => ({ ...prev, image_url: publicUrl }));
    } catch (err: any) {
      console.error('Error uploading file:', err);
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredAds = ads.filter(ad => 
    ad.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-display font-black text-foreground">Advertisement Management</h2>
          <p className="text-foreground/40 text-sm">Control site-wide banners and sponsored content.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30" />
            <input 
              type="text" 
              placeholder="Search ads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border-custom rounded-xl pl-11 pr-4 py-3 text-sm focus:border-primary/50 transition-colors"
            />
          </div>
          <button 
            onClick={() => {
              setEditingAd({ is_active: true, platform: 'web', ad_type: 'native' });
              setIsEditorOpen(true);
            }}
            className="px-6 py-3 bg-primary text-white rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            New Ad
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4 border border-border-custom bg-background/50 rounded-3xl border-dashed">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-foreground/40">Loading Campaigns</p>
        </div>
      ) : ads.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4 border border-border-custom bg-background/50 rounded-3xl border-dashed text-center p-8">
          <Megaphone className="w-12 h-12 text-foreground/10" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">No advertisements found</p>
            <p className="text-xs text-foreground/40">Start by creating your first sponsored campaign.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredAds.map((ad) => (
              <motion.div
                key={ad.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-surface border border-border-custom rounded-3xl overflow-hidden group hover:border-primary/20 transition-all flex flex-col"
              >
                {/* Preview */}
                <div className="aspect-[16/6] relative bg-background overflow-hidden border-b border-border-custom">
                  {ad.image_url ? (
                    <img src={ad.image_url} alt={ad.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-foreground/10">
                      <Megaphone className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <button 
                      onClick={() => handleToggleStatus(ad)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-md border transition-all",
                        ad.is_active 
                          ? "bg-green-500/10 border-green-500/30 text-green-500" 
                          : "bg-red-500/10 border-red-500/30 text-red-500"
                      )}
                    >
                      <div className={cn("w-1 h-1 rounded-full", ad.is_active ? "bg-green-500" : "bg-red-500")} />
                      {ad.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-6 space-y-4 flex-grow">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 min-w-0">
                      <h4 className="text-base font-bold text-foreground truncate">{ad.name}</h4>
                      <div className="flex items-center gap-2">
                        {ad.platform === 'web' ? <Globe className="w-3 h-3 text-foreground/30" /> : <Smartphone className="w-3 h-3 text-foreground/30" />}
                        <span className="text-[10px] uppercase font-black tracking-widest text-foreground/30">
                          {ad.platform} · {ad.ad_type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => {
                          setEditingAd(ad);
                          setIsEditorOpen(true);
                        }}
                        className="p-2 hover:bg-background rounded-lg text-foreground/40 hover:text-primary transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(ad.id)}
                        className="p-2 hover:bg-background rounded-lg text-foreground/40 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {ad.target_url && (
                    <div className="flex items-center gap-3 p-3 bg-background rounded-xl border border-border-custom">
                      <LinkIcon className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-mono text-foreground/40 truncate">{ad.target_url}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {isEditorOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => !saveLoading && setIsEditorOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-surface border border-border-custom rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                      <Megaphone className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-black text-foreground">
                        {editingAd?.id ? 'Edit Advertisement' : 'New Campaign'}
                      </h3>
                      <p className="text-foreground/40 text-xs">Define your sponsored content details.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsEditorOpen(false)}
                    className="p-3 hover:bg-background rounded-2xl text-foreground/40 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 px-4">Campaign Name</label>
                       <input 
                         required
                         value={editingAd?.name || ''} 
                         onChange={e => setEditingAd(prev => ({ ...prev, name: e.target.value }))}
                         placeholder="e.g., Summer Blowout Banner"
                         className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground focus:border-primary/50 transition-colors shadow-inner"
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 px-4">Environment</label>
                       <select 
                         value={editingAd?.platform || 'web'} 
                         onChange={e => setEditingAd(prev => ({ ...prev, platform: e.target.value }))}
                         className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground focus:border-primary/50 transition-colors shadow-inner"
                       >
                         <option value="web">Web Browser</option>
                         <option value="android">Android App</option>
                         <option value="ios">iOS App</option>
                       </select>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                       <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 px-4">Ad Unit ID / Placement Reference</label>
                       <input 
                         value={editingAd?.ad_unit_id || ''} 
                         onChange={e => setEditingAd(prev => ({ ...prev, ad_unit_id: e.target.value }))}
                         placeholder="e.g., ca-pub-XXXXXX / banner_home_sidebar"
                         className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground focus:border-primary/50 transition-colors shadow-inner font-mono text-xs"
                       />
                    </div>

                    <div className="md:col-span-2 space-y-4">
                       <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 px-4">Creative Asset</label>
                       <div 
                         className="relative aspect-[16/5] rounded-3xl border-2 border-dashed border-border-custom flex flex-col items-center justify-center gap-3 group cursor-pointer hover:border-primary/30 transition-all bg-background/50 overflow-hidden"
                         onClick={() => document.getElementById('ad-upload-input')?.click()}
                       >
                         {isUploading ? (
                           <Loader2 className="w-8 h-8 text-primary animate-spin" />
                         ) : editingAd?.image_url ? (
                           <>
                             <img src={editingAd.image_url} className="w-full h-full object-cover" />
                             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-8 h-8 text-white" />
                             </div>
                           </>
                         ) : (
                           <>
                             <Upload className="w-8 h-8 text-foreground/10" />
                             <span className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Upload Image</span>
                           </>
                         )}
                         <input id="ad-upload-input" type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                       </div>
                       <input 
                         value={editingAd?.image_url || ''} 
                         onChange={e => setEditingAd(prev => ({ ...prev, image_url: e.target.value }))}
                         placeholder="Or paste external Image URL..."
                         className="w-full bg-background border border-border-custom rounded-xl p-4 text-[10px] text-foreground/50 shadow-inner"
                       />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                       <label className="text-[10px] uppercase font-black tracking-widest text-foreground/40 px-4">Redirect Link</label>
                       <input 
                         value={editingAd?.target_url || ''} 
                         onChange={e => setEditingAd(prev => ({ ...prev, target_url: e.target.value }))}
                         placeholder="https://yourlink.com"
                         className="w-full bg-background border border-border-custom rounded-2xl p-5 text-foreground focus:border-primary/50 transition-colors shadow-inner"
                       />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button 
                      type="button" 
                      onClick={() => setIsEditorOpen(false)}
                      className="flex-1 py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-foreground/40 hover:bg-background transition-colors border border-border-custom"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={saveLoading}
                      className="flex-[2] py-5 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {saveLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                      {editingAd?.id ? 'Update Campaign' : 'Launch Campaign'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
