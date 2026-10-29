import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkTable() {
  const { data, count, error } = await supabase
    .from('tv_channels')
    .select('id', { count: 'exact' });
  
  console.log("Count:", count, "Error:", error);
}

checkTable();
