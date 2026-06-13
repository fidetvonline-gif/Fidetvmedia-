import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, Download } from 'lucide-react';

export const BatchChannelImport = ({ onClose, onImportComplete }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [failures, setFailures] = useState([]);
  const [importStatus, setImportStatus] = useState<'pending' | 'completed' | null>(null);

  const handleImport = async () => {
    try {
      const data = JSON.parse(jsonInput);
      if (!Array.isArray(data)) throw new Error("Input must be a JSON array of channel objects");

      setLoading(true);
      setSuccessCount(0);
      setFailures([]);

      const results = { success: 0, failed: [] as any[] };

      // Process items for individual error tracking
      for (const item of data) {
        const channelToInsert = {
          ...item,
          is_active: item.is_active ?? true, // Default to true if not specified
          order_index: item.order_index ?? 0
        };
        const { error } = await supabase.from('tv_channels').insert([channelToInsert]);
        if (error) {
          results.failed.push({ item, error: error.message });
        } else {
          results.success++;
        }
      }

      setSuccessCount(results.success);
      setFailures(results.failed);
      setImportStatus('completed');
      
      onImportComplete();
    } catch (err) {
      alert("Import failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadFailures = () => {
    const blob = new Blob([JSON.stringify(failures, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'import_failures.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-background p-6 rounded-lg w-full max-w-2xl border border-border-custom">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Batch Channel Import (JSON)</h3>
          <button onClick={onClose}><X/></button>
        </div>
        
        {importStatus === 'completed' ? (
          <div className="space-y-4">
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="font-bold mb-2">Import Summary</h4>
              <p>Successfully imported: {successCount}</p>
              <p>Failed entries: {failures.length}</p>
            </div>
            {failures.length > 0 && (
              <button 
                onClick={downloadFailures}
                className="flex items-center gap-2 p-2 bg-secondary text-white rounded"
              >
                 <Download className="w-4 h-4" /> Download Failure Report (JSON)
              </button>
            )}
            <button 
              onClick={onClose}
              className="w-full p-2 bg-primary text-white rounded"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <textarea 
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='[{"name": "Channel 1", "category": "News", "url": "https://..."}, ...]'
              className="w-full h-64 p-2 mb-4 border rounded font-mono text-sm"
            />
            <button 
              onClick={handleImport}
              disabled={loading}
              className="w-full p-2 bg-primary text-white rounded"
            >
              {loading ? 'Importing...' : 'Start Import'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
