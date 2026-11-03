import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const BASE_URL = 'https://fidetv.online';

const staticPages = [
  { url: '', priority: '1.0', changefreq: 'daily' },
  { url: '/news', priority: '1.0', changefreq: 'always' },
  { url: '/live', priority: '0.9', changefreq: 'always' },
  { url: '/content', priority: '0.9', changefreq: 'daily' },
  { url: '/services', priority: '0.9', changefreq: 'weekly' },
  { url: '/broadcast-hub', priority: '0.8', changefreq: 'weekly' },
  { url: '/fidesave', priority: '0.8', changefreq: 'daily' },
  { url: '/downloader', priority: '0.8', changefreq: 'daily' },
  { url: '/about', priority: '0.6', changefreq: 'monthly' },
  { url: '/contact', priority: '0.6', changefreq: 'monthly' },
  { url: '/partner', priority: '0.6', changefreq: 'monthly' },
  { url: '/advertise', priority: '0.6', changefreq: 'monthly' },
  { url: '/booking', priority: '0.6', changefreq: 'monthly' },
  { url: '/policies', priority: '0.4', changefreq: 'yearly' },
];

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function fetchPostsFromSupabase(): Promise<any[]> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('[Generate Sitemap] Supabase credentials not found in env, attempting fallback');
    return [];
  }

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from('news')
      .select('id, title, slug, image_url, created_at, is_published')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      console.warn('[Generate Sitemap] Supabase query error:', error.message);
      return [];
    }

    return data || [];
  } catch (err: any) {
    console.warn('[Generate Sitemap] Failed to fetch from Supabase:', err.message);
    return [];
  }
}

async function generateSitemap() {
  console.log('[Generate Sitemap] Starting XML sitemap generation for', BASE_URL);

  let posts = await fetchPostsFromSupabase();

  // Fallback to local storage if supabase query returned empty
  if (posts.length === 0) {
    try {
      const localDataPath = path.join(process.cwd(), 'data', 'news_posts.json');
      if (fs.existsSync(localDataPath)) {
        const raw = fs.readFileSync(localDataPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          posts = parsed;
        } else if (Array.isArray(parsed.posts)) {
          posts = parsed.posts;
        }
        console.log(`[Generate Sitemap] Loaded ${posts.length} posts from local fallback cache`);
      }
    } catch (e: any) {
      console.warn('[Generate Sitemap] Could not read local news cache:', e.message);
    }
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  // Static site pages
  for (const page of staticPages) {
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}${page.url}</loc>\n`;
    xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
    xml += `    <priority>${page.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  // Published news articles
  let articleCount = 0;
  for (const post of posts) {
    const rawSlug = post.slug && post.slug.trim() !== '' ? post.slug.trim() : post.id;
    if (!rawSlug) continue;

    const slug = encodeURIComponent(rawSlug);
    const postUrl = `${BASE_URL}/news/${slug}`;
    const pubDate = post.created_at ? new Date(post.created_at).toISOString().split('T')[0] : '';
    const imgUrl = post.image_url && typeof post.image_url === 'string' && post.image_url.startsWith('http')
      ? post.image_url.trim()
      : '';

    xml += `  <url>\n`;
    xml += `    <loc>${postUrl}</loc>\n`;
    if (pubDate) {
      xml += `    <lastmod>${pubDate}</lastmod>\n`;
    }
    xml += `    <changefreq>daily</changefreq>\n`;
    xml += `    <priority>0.85</priority>\n`;

    if (imgUrl) {
      xml += `    <image:image>\n`;
      xml += `      <image:loc>${escapeXml(imgUrl)}</image:loc>\n`;
      if (post.title) {
        xml += `      <image:title>${escapeXml(post.title)}</image:title>\n`;
      }
      xml += `    </image:image>\n`;
    }

    xml += `  </url>\n`;
    articleCount++;
  }

  xml += `</urlset>\n`;

  // Write to public/sitemap.xml
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const publicSitemapPath = path.join(publicDir, 'sitemap.xml');
  fs.writeFileSync(publicSitemapPath, xml, 'utf8');
  console.log(`[Generate Sitemap] Successfully wrote public/sitemap.xml with ${staticPages.length} pages and ${articleCount} articles.`);

  // If dist/ exists, also write to dist/sitemap.xml
  const distDir = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distDir)) {
    const distSitemapPath = path.join(distDir, 'sitemap.xml');
    fs.writeFileSync(distSitemapPath, xml, 'utf8');
    console.log(`[Generate Sitemap] Synced dist/sitemap.xml`);
  }
}

generateSitemap().catch(err => {
  console.error('[Generate Sitemap] Error:', err);
  process.exit(1);
});
