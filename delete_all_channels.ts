import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllChannels() {
  console.log('Deleting all channels from tv_channels...');

  const { error } = await supabase
    .from('tv_channels')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // This is a trick to delete all rows as it will match all ids

  if (error) {
    console.error('Error deleting channels:', error);
  } else {
    console.log('Successfully deleted all channels.');
  }
}

deleteAllChannels();
