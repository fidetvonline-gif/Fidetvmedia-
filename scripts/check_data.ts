
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function checkData() {
  const { data, error } = await supabase
    .from('tv_channels')
    .select('name, country, category')
    .limit(10);
    
  console.log(data);
}

checkData();
