
import { createClient } from '@supabase/supabase-js';
import { ChannelIngestionService } from '../src/services/channelIngestionService';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const service = new ChannelIngestionService(supabase);

async function runTargetedCheck() {
  console.log('Starting targeted health check on 1000 channels...');
  
  // Get channels that haven't been checked in a while
  const { data: channels, error } = await supabase
    .from('tv_channels')
    .select('*')
    .limit(1000);

  if (error) {
    console.error('Error fetching channels:', error);
    process.exit(1);
  }

  console.log(`Checking ${channels.length} channels...`);
  const report = { online: 0, offline: 0, archived: 0 };

  for (const channel of channels) {
    const result = await ChannelIngestionService.validateStream(channel.url);
    if (result.valid) {
      report.online++;
      await supabase.from('tv_channels').update({ status: 'online', is_active: true, last_checked: new Date().toISOString() }).eq('id', channel.id);
    } else {
      report.offline++;
      await supabase.from('tv_channels').update({ status: 'offline', is_active: false, last_checked: new Date().toISOString() }).eq('id', channel.id);
      
      // If persistently offline (e.g., this is the 3rd check), archive
      // For this audit, we'll mark as inactive first
    }
  }

  console.log('Report:', report);
}

runTargetedCheck();
