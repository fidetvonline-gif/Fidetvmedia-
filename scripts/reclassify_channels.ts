
import { createClient } from '@supabase/supabase-js';
import { M3UService } from '../src/services/m3uService';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

// Expose the private method for this script by casting to any
const normalizeCategory = (M3UService as any).normalizeCategory;

async function run() {
  console.log('Fetching all channels for re-classification...');
  const { data: channels, error } = await supabase
    .from('tv_channels')
    .select('id, name, category, country');

  if (error) {
    console.error('Error fetching channels:', error);
    process.exit(1);
  }

  const updates: any[] = [];
  
  for (const ch of channels || []) {
    const newCategory = normalizeCategory(ch.name, ch.category, ch.country || '');
    if (newCategory !== ch.category) {
      updates.push({ id: ch.id, category: newCategory });
    }
  }

  console.log(`Found ${updates.length} channels to re-classify.`);

  for (const update of updates) {
    await supabase.from('tv_channels').update({ category: update.category }).eq('id', update.id);
  }

  console.log('Re-classification complete.');
}

run();
