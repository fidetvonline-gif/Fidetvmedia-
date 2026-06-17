import { createClient } from '@supabase/supabase-js';
import { ChannelIngestionService } from '../src/services/channelIngestionService';
import * as dotenv from 'dotenv';

dotenv.config();

const SOURCE_URL = process.argv[2];

if (!SOURCE_URL) {
  console.error('Usage: npx tsx scripts/ingest_m3u_v2.ts <m3u_url>');
  process.exit(1);
}

// Ensure non-VITE prefix for server-side usage if needed, 
// though our setup uses VITE_ prefixes often in code.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment.');
  process.exit(1);
}

async function run() {
  console.log(`[Ingest V2] Initializing Smart Ingestion for: ${SOURCE_URL}`);
  
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  const service = new ChannelIngestionService(supabase);

  try {
    const result = await service.importFromM3U(SOURCE_URL, {
      validateAll: false // We skip technical validation during bulk import for speed, let health checks handle it
    }) as any;
    
    console.log(`[Ingest V2] Success! Total: ${result.total}, Filtered: ${result.filtered}, Inserted: ${result.inserted}`);
  } catch (err: any) {
    console.error(`[Ingest V2] Ingestion failed: ${err.message}`);
    process.exit(1);
  }
}

run();
