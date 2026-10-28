
import { createClient } from '@supabase/supabase-js';
import { ChannelIngestionService } from '../src/services/channelIngestionService';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const service = new ChannelIngestionService(supabase);

async function runHealthCheck() {
  console.log('Starting full health check automation...');
  const report = await service.runFullAutomation();
  console.log('Report:', JSON.stringify(report, null, 2));
}

runHealthCheck();
