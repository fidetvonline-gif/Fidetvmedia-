
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function runReport() {
  console.log('Generating Channel Database Report...\n');

  // Total Channels
  const { count: total, error: totalErr } = await supabase
    .from('tv_channels')
    .select('*', { count: 'exact', head: true });

  // Nigerian Channels (Country = 'NG' or Category = 'Nigerian TV')
  const { count: nigeriaCount, error: nigErr } = await supabase
    .from('tv_channels')
    .select('*', { count: 'exact', head: true })
    .or('country.eq.NG,category.eq.Nigerian TV');

  console.log(`Total Channels: ${total}`);
  console.log(`Nigerian Channels: ${nigeriaCount}\n`);

  console.log('--- SQL Queries for your database ---');
  console.log('-- 1. View total counts:');
  console.log('SELECT category, COUNT(*) FROM tv_channels GROUP BY category ORDER BY COUNT(*) DESC;');
  console.log('\n-- 2. List all Nigerian Channels:');
  console.log("SELECT name, category FROM tv_channels WHERE country = 'NG' OR category = 'Nigerian TV';");
}

runReport();
