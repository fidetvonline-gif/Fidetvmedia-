
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

async function fixSpecificError() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing Supabase credentials");
    return;
  }

  const supabase = createClient(url, key);
  const targetUrls = [
    "http://line.tvdsz.cc/play/live.php?mac=00:1B:79:F8:22:9D&stream=384901&extension=ts&md5=UbbY_moupdl5A8kfJgufuA",
    "https://2gblive.akamaized.net/hls/live/2033805/2GB/2GB720P/chunklist.m3u8",
    "https://2gblive.akamaized.net/hls/live/2033805/2GB/2GB360P/chunklist.m3u8",
    "https://2gblive.akamaized.net/hls/live/2033805/2GB/2GB1080P/chunklist.m3u8",
    "https://2gblive.akamaized.net/hls/live/2033805-b/2GB/2GB1080B/chunklist.m3u8",
    "https://2gblive.akamaized.net/hls/live/2033805-b/2GB/2GB720B/chunklist.m3u8",
    "https://2gblive.akamaized.net/hls/live/2033805-b/2GB/2GB360B/chunklist.m3u8"
  ];

  console.log(`Marking ${targetUrls.length} broken streams as inactive...`);
  
  const { data, error } = await supabase
    .from('tv_channels')
    .update({ 
      is_active: false,
      description: "Signal lost: Checked and confirmed offline by system."
    })
    .in('url', targetUrls);

  if (error) {
    console.error("Error updating channel:", error);
  } else {
    console.log("Channel successfully marked inactive.");
  }
}

fixSpecificError();
