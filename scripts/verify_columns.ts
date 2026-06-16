
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

async function verifySchemaColumns() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing Supabase credentials");
    return;
  }

  const supabase = createClient(url, key);

  console.log("Checking columns for tv_channels...");
  
  // Try to query the column specifically
  const { data, error } = await supabase
    .from('tv_channels')
    .select('last_verified_at')
    .limit(1);

  if (error) {
    console.warn("Column 'last_verified_at' seems to be missing or inaccessible:", error.message);
    console.log("Please run the following SQL in your Supabase SQL Editor if you have access:");
    console.log("ALTER TABLE tv_channels ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE;");
  } else {
    console.log("Column 'last_verified_at' exists.");
  }
}

verifySchemaColumns();
