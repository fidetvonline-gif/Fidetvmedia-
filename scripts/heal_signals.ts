
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

async function healSignals() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing Supabase credentials");
    return;
  }

  const supabase = createClient(url, key);

  console.log("Fetching active channels from tv_channels...");
  const { data: channels, error } = await supabase
    .from('tv_channels')
    .select('id, name, url')
    .eq('is_active', true);

  if (error) {
    console.error("Error fetching channels:", error);
    return;
  }

  console.log(`Verifying ${channels.length} channels...`);

  for (const channel of channels) {
    try {
      // Use the local API health check
      const response = await axios.get(`http://localhost:3000/api/stream-health?url=${encodeURIComponent(channel.url)}`);
      const { valid, httpStatus, errorMessage } = response.data;

      if (!valid) {
        console.warn(`[FAIL] ${channel.name}: ${errorMessage || httpStatus}`);
        await supabase.from('tv_channels').update({ 
          is_active: false,
          description: `Signal lost: ${errorMessage || 'Offline'}`
        }).eq('id', channel.id);
      } else {
        console.log(`[OK] ${channel.name}`);
      }
    } catch (e: any) {
        console.error(`Error checking ${channel.name}:`, e.message);
    }
  }

  console.log("Heal process complete.");
}

healSignals();
