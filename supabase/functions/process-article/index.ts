import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  // Atomic job claiming
  const { data: job, error: claimError } = await supabase
    .rpc('claim_news_job'); // Note: You'll need to create this RPC

  if (claimError || !job) {
    return new Response(JSON.stringify({ success: false, message: "No jobs available" }), { status: 200 });
  }

  try {
    // 1. Scrape content (using existing AutoBlogService logic or simplified logic)
    // 2. Insert into 'news' table
    // 3. Mark as completed in 'news_queue'
    
    // Placeholder for actual processing logic
    console.log("Processing article:", job.url);
    
    await supabase.from('news_queue').update({ status: 'completed' }).eq('id', job.id);
    
    return new Response(JSON.stringify({ success: true, url: job.url }), { status: 200 });
  } catch (err) {
    await supabase.from('news_queue').update({ status: 'failed', error_log: err.message }).eq('id', job.id);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
});
