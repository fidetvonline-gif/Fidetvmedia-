
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function verify() {
  const categoriesToVerify = ['Nigerian TV', 'Nollywood & African Movies'];
  
  for (const category of categoriesToVerify) {
    console.log(`\n--- Verifying Category: ${category} ---`);
    const { data, error } = await supabase
      .from('tv_channels')
      .select('name, category')
      .eq('category', category)
      .limit(5);

    if (error) {
      console.error(`Error verifying ${category}:`, error);
    } else {
      console.table(data);
    }
  }
}

verify();
