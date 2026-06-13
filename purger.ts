
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function purge() {
  console.log('Searching for "Mexico" in events, tv_channels, and portfolio_items...');

  // 1. Check events
  const { data: events, error: eError } = await supabase
    .from('events')
    .select('id, title')
    .ilike('title', '%Mexico%');
  
  if (eError) console.error('Error fetching events:', eError);
  else if (events.length > 0) {
    console.log('Found events:', events);
    for (const ev of events) {
      const { error } = await supabase.from('events').delete().eq('id', ev.id);
      if (error) console.error(`Failed to delete event ${ev.id}:`, error);
      else console.log(`Deleted event: ${ev.title}`);
    }
  }

  // 2. Check tv_channels
  const { data: channels, error: cError } = await supabase
    .from('tv_channels')
    .select('id, name')
    .ilike('name', '%Mexico%');
  
  if (cError) console.error('Error fetching channels:', cError);
  else if (channels.length > 0) {
    console.log('Found channels:', channels);
    for (const ch of channels) {
      const { error } = await supabase.from('tv_channels').delete().eq('id', ch.id);
      if (error) console.error(`Failed to delete channel ${ch.id}:`, error);
      else console.log(`Deleted channel: ${ch.name}`);
    }
  }

  // 3. Check portfolio_items
  const { data: portfolio, error: pError } = await supabase
    .from('portfolio_items')
    .select('id, title')
    .ilike('title', '%Mexico%');
  
  if (pError) console.error('Error fetching portfolio items:', pError);
  else if (portfolio.length > 0) {
    console.log('Found portfolio items:', portfolio);
    for (const item of portfolio) {
      const { error } = await supabase.from('portfolio_items').delete().eq('id', item.id);
      if (error) console.error(`Failed to delete portfolio item ${item.id}:`, error);
      else console.log(`Deleted portfolio item: ${item.title}`);
    }
  }

  // 4. Check discovered_channels
  const { data: discovered, error: dError } = await supabase
    .from('discovered_channels')
    .select('id, name')
    .ilike('name', '%Mexico%');
  
  if (dError) console.error('Error fetching discovered channels:', dError);
  else if (discovered.length > 0) {
    console.log('Found discovered channels:', discovered);
    for (const ch of discovered) {
      const { error } = await supabase.from('discovered_channels').delete().eq('id', ch.id);
      if (error) console.error(`Failed to delete discovered channel ${ch.id}:`, error);
      else console.log(`Deleted discovered channel: ${ch.name}`);
    }
  }

  console.log('Purge cycle complete.');
}

purge();
