import { createClient } from '@supabase/supabase-js';
import { ChannelIngestionService } from '../src/services/channelIngestionService';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function healthCheck() {
  console.log('>>> [Health Check] Running Stream Validation <<<');
  
  const supabase = createClient(supabaseUrl!, supabaseKey!);
  const service = new ChannelIngestionService(supabase);

  // We reuse the existing logic in the service
  await service.runHealthChecks();

  console.log('>>> [Health Check] Cycle Complete <<<');
}

healthCheck();
