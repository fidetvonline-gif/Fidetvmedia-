import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    const { data } = await supabase.from('tv_channels').select('name, url').ilike('name', '%Arena Sport 3%');
    console.log(data);
}
main();
