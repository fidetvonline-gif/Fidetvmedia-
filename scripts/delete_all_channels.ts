import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing Supabase URL or Key in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log('Deleting all channels from tv_channels...');
  const { error } = await supabase.from('tv_channels').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error('Delete failed:', error);
  } else {
    console.log('All channels successfully deleted from tv_channels.');
  }
}

run();
