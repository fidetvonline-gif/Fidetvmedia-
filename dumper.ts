
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function dump() {
  const { data: events } = await supabase.from('events').select('*');
  console.log('--- EVENTS ---');
  console.log(JSON.stringify(events, null, 2));

  const { data: channels } = await supabase.from('tv_channels').select('*');
  console.log('--- TV CHANNELS ---');
  console.log(JSON.stringify(channels, null, 2));

  const { data: stable } = await supabase.from('stable_channels').select('*');
  console.log('--- STABLE CHANNELS ---');
  console.log(JSON.stringify(stable, null, 2));

  const { data: discovered } = await supabase.from('discovered_channels').select('*');
  console.log('--- DISCOVERED CHANNELS ---');
  console.log(JSON.stringify(discovered, null, 2));

  const { data: portfolio } = await supabase.from('portfolio_items').select('*');
  console.log('--- PORTFOLIO ITEMS ---');
  console.log(JSON.stringify(portfolio, null, 2));
}

dump();
