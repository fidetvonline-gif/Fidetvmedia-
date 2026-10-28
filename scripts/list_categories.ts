
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

async function listCategories() {
  const { data, error } = await supabase
    .from('tv_channels')
    .select('category');

  if (error) {
    console.error('Error:', error);
  } else {
    const categories = Array.from(new Set(data.map(item => item.category)));
    console.log('Unique Categories in Database:', categories);
  }
}

listCategories();
