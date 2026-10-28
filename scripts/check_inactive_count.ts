
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkStatus() {
  const { count: inactive, error } = await supabase
    .from('tv_channels')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', false);

  if (error) {
    console.error('Error checking inactive channels:', error);
  } else {
    console.log(`Channels marked as inactive: ${inactive}`);
  }
}

checkStatus();
