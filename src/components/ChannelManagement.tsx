import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Edit2, Plus, Search, X, Upload } from 'lucide-react';
import { BatchChannelImport } from './BatchChannelImport';

export const ChannelManagement = () => {
  const [channels, setChannels] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [currentChannel, setCurrentChannel] = useState(null);

  const fetchChannels = async () => {
    const { data, error } = await supabase.from('tv_channels').select('*').order('order_index');
    if (data) setChannels(data);
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this channel?")) return;
    const { error } = await supabase.from('tv_channels').delete().eq('id', id);
    if (!error) {
      alert("Deleted successfully");
      fetchChannels();
    } else {
      alert("Delete failed: " + error.message);
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
            alert("Update failed: " + error.message);
            return;
        }
        console.log("Updated data:", updatedData);
    } else {
        const { error, data: insertedData } = await supabase.from('tv_channels').insert(channelData).select();
        if (error) {
            console.error("Insert failed", error);
            alert("Insert failed: " + error.message);
            return;
        }
        console.log("Inserted data:", insertedData);
    }
    
    setIsModalOpen(false);
    setCurrentChannel(null);
    fetchChannels();
  };

  const filteredChannels = channels.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-background rounded-xl border border-border-custom shadow-inner">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Channel Management</h2>
        <div className="flex gap-2">
            <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg">
              <Upload className="w-4 h-4" /> Import Channels
            </button>
            <button onClick={() => { setCurrentChannel(null); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
              <Plus className="w-4 h-4" /> Add Channel
            </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Search className="w-5 h-5 text-foreground/40" />
        <input 
          type="text" 
          placeholder="Search channels..." 
          className="w-full p-2 border border-border-custom rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isImportModalOpen && (
        <BatchChannelImport onClose={() => setIsImportModalOpen(false)} onImportComplete={fetchChannels} />
      )}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-custom">
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Category</th>
            <th className="p-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredChannels.map(channel => (
            <tr key={channel.id} className="border-b border-border-custom">
              <td className="p-2">{channel.name}</td>
              <td className="p-2">{channel.category}</td>
              <td className="p-2 flex gap-2">
                <button onClick={() => { setCurrentChannel(channel); setIsModalOpen(true); }} className="text-blue-500"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(channel.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
                <form onSubmit={handleSave} className="bg-background p-6 rounded-lg w-full max-w-lg border border-border-custom">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">{currentChannel ? 'Edit Channel' : 'Add Channel'}</h3>
                        <button onClick={() => setIsModalOpen(false)}><X/></button>
                    </div>
                    <input name="name" placeholder="Name" defaultValue={currentChannel?.name} className="w-full p-2 mb-2 border rounded" required />
                    <input name="category" placeholder="Category" defaultValue={currentChannel?.category} className="w-full p-2 mb-2 border rounded" required />
                    <input name="url" placeholder="Source URL" defaultValue={currentChannel?.url} className="w-full p-2 mb-2 border rounded" required />
                    <input name="country" placeholder="Country" defaultValue={currentChannel?.country} className="w-full p-2 mb-2 border rounded" />
                    <input name="language" placeholder="Language" defaultValue={currentChannel?.language} className="w-full p-2 mb-2 border rounded" />
                    <select name="stream_type" defaultValue={currentChannel?.stream_type} className="w-full p-2 mb-2 border rounded">
                        <option value="HLS">HLS</option>
                        <option value="DASH">DASH</option>
                        <option value="MP4">MP4</option>
                        <option value="embed">Embed</option>
                    </select>
                    <input name="epg_id" placeholder="EPG ID" defaultValue={currentChannel?.epg_id} className="w-full p-2 mb-2 border rounded" />
                    <label className="flex items-center gap-2 mb-2">
                        <input type="checkbox" name="is_active" defaultChecked={currentChannel?.is_active ?? true} /> Active
                    </label>
                    <label className="flex items-center gap-2 mb-2">
                        <input type="checkbox" name="is_featured" defaultChecked={currentChannel?.is_featured ?? false} /> Featured
                    </label>
                    <button type="submit" className="w-full p-2 bg-primary text-white rounded">Save</button>
                </form>
            </div>
        )}
    </div>
  );
};
