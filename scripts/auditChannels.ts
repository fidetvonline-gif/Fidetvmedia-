import { createClient } from "@supabase/supabase-js";
import { ChannelIngestionService } from "../src/services/channelIngestionService.js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ingestion = new ChannelIngestionService(supabase);

async function runAudit() {
  console.log("Starting audit...");
  const report = await ingestion.runFullAutomation();
  console.log("Audit report:", report);
}

runAudit();
