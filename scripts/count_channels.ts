import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { count, error } = await supabase.from('tv_channels').select('*', { count: 'exact', head: true });
    if (error) {
        console.error('Error counting:', error);
        process.exit(1);
    }
    console.log('Total channels in database:', count);
}

run();
