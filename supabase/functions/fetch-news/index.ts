import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Define sources as in AutoBlogService
const NEWS_SOURCES = [
  { name: 'Channels Television Nigeria', url: 'https://www.channelstv.com/feed/' },
  { name: 'Vanguard Nigeria News', url: 'https://www.vanguardngr.com/feed/' },
  { name: 'Punch Nigeria Wire', url: 'https://punchng.com/feed/' },
  { name: 'Tech & Digital Innovation', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { name: 'Entertainment & Arts Wire', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml' },
  { name: 'Media Tech Disruptions', url: 'https://techcrunch.com/feed/' }
];

Deno.serve(async (req) => {
  console.log("Fetching news feeds...");
  
  const items = [];
  
  for (const source of NEWS_SOURCES) {
    try {
      const resp = await fetch(source.url);
      const xml = await resp.text();
      // Simple regex-based extraction of links to avoid heavy parsing in Edge Function
      const linkRegex = /<link>(.*?)<\/link>/g;
      let match;
      let count = 0;
      while ((match = linkRegex.exec(xml)) !== null && count < 5) {
        if (match[1].startsWith('http')) {
          items.push({ url: match[1].trim(), source_name: source.name });
          count++;
        }
      }
    } catch (e) {
      console.error(`Error fetching ${source.name}:`, e);
    }
  }

  // Insert into queue (ON CONFLICT DO NOTHING for idempotency)
  const { error } = await supabase
    .from('news_queue')
    .upsert(items, { onConflict: 'url' });

  if (error) {
    console.error("Queue insert error:", error);
    return new Response(JSON.stringify({ success: false, error }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, added: items.length }), { status: 200 });
});
