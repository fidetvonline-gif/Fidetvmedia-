import { createClient } from '@supabase/supabase-js';
import { M3UService } from '../src/services/m3uService';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function cleanup() {
  console.log('>>> [Cleanup] Starting Smart Channel Pruning <<<');
  
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  
  // 1. Fetch all channels
  const { data: channels, error } = await supabase
    .from('tv_channels')
    .select('*');

  if (error) {
    console.error('Error fetching channels:', error.message);
    return;
  }

  console.log(`[Cleanup] Analyzing ${channels.length} existing channels...`);

  const toKeep: string[] = [];
  const toDelete: string[] = [];

  for (const ch of channels) {
    // Map DB record to M3UChannel interface for filter logic
    const m3uChannel = {
      id: ch.id,
      name: ch.name,
      url: ch.url,
      category: ch.category || '',
      logo: ch.thumbnail || '',
      country: '' // We don't have country in DB record directly often, maybe from description
    };

    // Try to extract country if we stored it in the description
    const countryMatch = ch.description?.match(/Country: ([A-Z]{2})/);
    if (countryMatch) m3uChannel.country = countryMatch[1];

    const result = M3UService.smartFilter([m3uChannel]);
    
    if (result.length > 0) {
      toKeep.push(ch.id);
    } else {
      toDelete.push(ch.id);
    }
  }

  console.log(`[Cleanup] Pruning Decision: Keep ${toKeep.length}, Delete ${toDelete.length}`);

  if (toDelete.length > 0) {
    // Chunk deletions
    for (let i = 0; i < toDelete.length; i += 100) {
      const chunk = toDelete.slice(i, i + 100);
      const { error: delError } = await supabase
        .from('tv_channels')
        .delete()
        .in('id', chunk);
      
      if (delError) console.error('[Cleanup] Delete error:', delError.message);
    }
    console.log('[Cleanup] Deletion complete.');
  }

  // 2. Remove Duplicates by Name (Case Insensitive)
  console.log('[Cleanup] Checking for name duplicates...');
  const { data: latest } = await supabase.from('tv_channels').select('id, name').order('created_at', { ascending: false });
  if (latest) {
    const seenNames = new Set();
    const dupeIds = [];
    for (const item of latest) {
      const lowerName = item.name.toLowerCase();
      if (seenNames.has(lowerName)) {
        dupeIds.push(item.id);
      } else {
        seenNames.add(lowerName);
      }
    }

    if (dupeIds.length > 0) {
      console.log(`[Cleanup] Removing ${dupeIds.length} duplicate name records...`);
      await supabase.from('tv_channels').delete().in('id', dupeIds);
    }
  }

  console.log('>>> [Cleanup] Completed Successfully <<<');
}

cleanup();
