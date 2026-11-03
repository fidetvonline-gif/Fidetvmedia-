import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { load } from 'https://esm.sh/cheerio@1.0.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  // 1. Atomic job claiming
  const { data: job, error: claimError } = await supabase
    .rpc('claim_news_job');

  if (claimError) {
    console.error("Claim error:", claimError);
    return new Response(JSON.stringify({ success: false, message: "Claim error" }), { status: 500 });
  }

  if (!job || job.length === 0) {
    return new Response(JSON.stringify({ success: false, message: "No jobs available" }), { status: 200 });
  }

  const article = job[0];
  console.log("Processing article:", article.url);

  try {
    // 2. Scrape Content
    const response = await fetch(article.url, {
      headers: { 'User-Agent': 'FideTV-NewsBot/3.0' }
    });
    const html = await response.text();
    const $ = load(html);

    // Extract Title/Content (simplified version of existing AutoBlogService logic)
    const title = $('h1').text().trim() || $('meta[property="og:title"]').attr('content') || 'Untitled';
    const content = $('article p').map((_, el) => $(el).text()).get().join('\n\n');
    const imageUrl = $('meta[property="og:image"]').attr('content') || '';

    const rawSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 80) || `article-${Date.now()}`;
    const slug = `${rawSlug}-${Math.random().toString(36).substring(2, 7)}`;
    const excerpt = content ? content.substring(0, 180).trim() + '...' : '';

    // 3. Save to 'news' table (upsert by slug)
    const { error: insertError } = await supabase
      .from('news')
      .upsert({
        title,
        excerpt,
        description: excerpt,
        content: content.substring(0, 10000),
        image_url: imageUrl || 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=800',
        slug,
        is_published: true,
        category: 'Global News & Culture',
        source_name: (article as any).source_name || 'FideTV Wire',
        source_url: article.url,
        read_time: '4 min read',
        created_at: new Date().toISOString()
      }, { onConflict: 'slug' });

    if (insertError) throw insertError;

    // 4. Mark completed
    await supabase.from('news_queue').update({ status: 'completed' }).eq('id', article.id);
    
    return new Response(JSON.stringify({ success: true, url: article.url }), { status: 200 });
  } catch (err: any) {
    console.error("Processing error:", err);
    await supabase.from('news_queue').update({ status: 'failed', error_log: err.message }).eq('id', article.id);
    return new Response(JSON.stringify({ success: false, error: err.message }), { status: 500 });
  }
});
