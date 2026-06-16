
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

async function checkPublicAccess() {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error("Missing Supabase credentials in env");
    return;
  }

  const supabase = createClient(url, anonKey);

  console.log("Attempting to fetch channels as a PUBLIC user...");
  const { data, error, count } = await supabase
    .from('tv_channels')
    .select('*', { count: 'exact' })
    .limit(5);

  if (error) {
    console.error("PUBLIC ACCESS ERROR:", error.message);
    if (error.message.includes("permission denied")) {
      console.log("CRITICAL: TV Channels are NOT publicly accessible via RLS.");
    }
  } else {
    console.log(`Success! Fetched ${data?.length} channels. Total count: ${count}`);
  }
}

checkPublicAccess();
