
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function backup() {
  console.log('Backing up tv_channels table...');
  const { data, error } = await supabase.from('tv_channels').select('*');

  if (error) {
    console.error('Backup failed:', error);
    process.exit(1);
  }
  fs.writeFileSync('tv_channels_backup.json', JSON.stringify(data, null, 2));
  console.log(`Backup completed. ${data.length} channels saved to tv_channels_backup.json`);
}

backup();
