import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

interface AutoBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  image_url: string;
  image_urls?: string[];
  read_time: string;
  source_name: string;
  source_url?: string;
  region?: string;
  author_id: string;
  is_published: boolean;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
    role?: string;
  };
}

async function scrapeWebArticle(url: string) {
  try {
    const cleanUrl = url.split('?')[0];
    const res = await axios.get(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 FideTV-NewsBot/3.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 8000
    });

    const $ = cheerio.load(res.data);

    // Extract real news photo from og:image, twitter:image, or article figure
    let ogImg = $('meta[property="og:image"]').attr('content') ||
                $('meta[name="twitter:image:src"]').attr('content') ||
                $('meta[name="twitter:image"]').attr('content') ||
                $('.post-content figure img').first().attr('src') ||
                $('article figure img').first().attr('src') ||
                $('.entry-content figure img').first().attr('src') ||
                $('figure img').first().attr('src') ||
                '';

    if (ogImg) {
      ogImg = ogImg.trim();
      if (ogImg.includes('ichef.bbci.co.uk')) {
        ogImg = ogImg
          .replace(/\/ace\/standard\/\d+\//, '/ace/standard/1200/')
          .replace(/\/cpsprodpb\/[a-z0-9]+\/live\//, '/cpsprodpb/1200/live/')
          .replace(/\/branded_news\/\d+\//, '/branded_news/1200/');
      }
      // Strictly reject logos
      const isLogo = ogImg.toLowerCase().includes('punch-logo') ||
                     ogImg.toLowerCase().includes('logo-500x179') ||
                     ogImg.toLowerCase().includes('default-avatar') ||
                     ogImg.toLowerCase().includes('1x1');
      if (isLogo) {
        ogImg = '';
      }
    }

    const paragraphs: string[] = [];
    const selectors = [
      '.post-content p',
      'article p',
      '[data-component="text-block"] p',
      '.entry-content p',
      'main article p',
      '.story-body p',
      'main p'
    ];

    for (const sel of selectors) {
      if (paragraphs.length >= 4) break;
      $(sel).each((_, el) => {
        const text = $(el).text().trim();
        if (
          text.length > 25 &&
          !text.toLowerCase().startsWith('file photo') &&
          !text.toLowerCase().startsWith('photo:') &&
          !text.toLowerCase().startsWith('image caption') &&
          !text.includes('All rights reserved') &&
          !text.includes('Contact:') &&
          !text.includes('Follow BBC') &&
          !text.includes('Sign up for our') &&
          !text.includes('Download the BBC') &&
          !text.includes('Image source,') &&
          !text.includes('Get in touch') &&
          !text.includes('Listen to the latest') &&
          !text.includes('Read More:') &&
          !text.includes('advertisement')
        ) {
          paragraphs.push(text);
        }
      });
    }

    return {
      highResImage: ogImg,
      paragraphs
    };
  } catch (err: any) {
    return null;
  }
}

async function run() {
  const filePath = path.resolve(process.cwd(), 'src/data/auto_blogs.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const blogs: AutoBlogPost[] = JSON.parse(raw);

  console.log(`[Enricher] Loaded ${blogs.length} posts. Fetching RSS feeds for Channels TV and Vanguard...`);

  // Fetch Channels TV RSS
  let channelsFeed = '';
  try {
    const chRes = await axios.get('https://www.channelstv.com/feed/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 8000
    });
    channelsFeed = chRes.data;
    console.log('[Enricher] Channels TV feed fetched successfully.');
  } catch (e: any) {
    console.warn('[Enricher] Channels TV feed fetch warning:', e.message);
  }

  // Fetch Vanguard RSS
  let vanguardFeed = '';
  try {
    const vgRes = await axios.get('https://www.vanguardngr.com/feed/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 8000
    });
    vanguardFeed = vgRes.data;
    console.log('[Enricher] Vanguard feed fetched successfully.');
  } catch (e: any) {
    console.warn('[Enricher] Vanguard feed fetch warning:', e.message);
  }

  const $ch = cheerio.load(channelsFeed, { xmlMode: true });
  const $vg = cheerio.load(vanguardFeed, { xmlMode: true });

  // Map Channels TV items
  const channelsItems: { title: string; link: string; image: string; paras: string[] }[] = [];
  $ch('item').each((_, el) => {
    const title = $ch(el).find('title').first().text().trim();
    const link = $ch(el).find('link').first().text().trim();
    const rawXml = $ch(el).html() || '';
    const featuredMatch = rawXml.match(/<media:featured[^>]+url="([^">]+)"/i);
    let img = featuredMatch ? featuredMatch[1] : '';
    const content = $ch(el).find('content\\:encoded').text();
    const paras: string[] = [];
    if (content) {
      const $c = cheerio.load(content);
      if (!img) img = $c('img').first().attr('src') || '';
      $c('p').each((_, p) => {
        const t = $c(p).text().trim();
        if (t.length > 20 && !t.includes('All rights reserved')) paras.push(t);
      });
    }
    channelsItems.push({ title, link, image: img, paras });
  });

  // Map Vanguard items
  const vanguardItems: { title: string; link: string; image: string; paras: string[] }[] = [];
  $vg('item').each((_, el) => {
    const title = $vg(el).find('title').first().text().trim();
    const link = $vg(el).find('link').first().text().trim();
    const content = $vg(el).find('content\\:encoded').text();
    let img = '';
    const paras: string[] = [];
    if (content) {
      const $c = cheerio.load(content);
      img = $c('img').first().attr('src') || '';
      $c('p').each((_, p) => {
        const t = $c(p).text().trim();
        if (t.length > 20 && !t.includes('Vanguard News') && !t.includes('All rights reserved')) {
          paras.push(t);
        }
      });
    }
    vanguardItems.push({ title, link, image: img, paras });
  });

  console.log(`[Enricher] Parsed ${channelsItems.length} Channels items, ${vanguardItems.length} Vanguard items.`);

  for (let i = 0; i < blogs.length; i++) {
    const post = blogs[i];
    console.log(`\n[${i + 1}/${blogs.length}] Processing: ${post.title}`);

    let extractedImg = '';
    let paras: string[] = [];

    // Method A: Channels TV feed matching
    if (post.source_name?.includes('Channels') || post.source_url?.includes('channelstv.com')) {
      const match = channelsItems.find(c => 
        (post.source_url && c.link.includes(post.source_url.split('/')[4] || 'xyz')) ||
        c.title.toLowerCase().includes(post.title.substring(0, 25).toLowerCase()) ||
        post.title.toLowerCase().includes(c.title.substring(0, 25).toLowerCase())
      );
      if (match) {
        if (match.image) extractedImg = match.image;
        if (match.paras.length >= 3) paras = match.paras;
        console.log(`  -> Matched in Channels TV feed! Found ${paras.length} paras, img: ${extractedImg.substring(0, 50)}`);
      }
    }

    // Method B: Vanguard feed matching
    if (post.source_name?.includes('Vanguard') || post.source_url?.includes('vanguardngr.com')) {
      const match = vanguardItems.find(v => 
        (post.source_url && v.link.includes(post.source_url.split('/')[4] || 'xyz')) ||
        v.title.toLowerCase().includes(post.title.substring(0, 25).toLowerCase()) ||
        post.title.toLowerCase().includes(v.title.substring(0, 25).toLowerCase())
      );
      if (match) {
        if (match.image) extractedImg = match.image;
        if (match.paras.length >= 3) paras = match.paras;
        console.log(`  -> Matched in Vanguard feed! Found ${paras.length} paras, img: ${extractedImg.substring(0, 50)}`);
      }
    }

    // Method C: Webpage scrape for Punch, BBC, TechCrunch or any article lacking paragraphs
    if ((paras.length < 3 || !extractedImg || extractedImg.includes('punch-logo')) && post.source_url && post.source_url.startsWith('http')) {
      const scraped = await scrapeWebArticle(post.source_url);
      if (scraped) {
        if (scraped.highResImage && !scraped.highResImage.includes('punch-logo')) {
          extractedImg = scraped.highResImage;
        }
        if (scraped.paragraphs.length >= 3) {
          paras = scraped.paragraphs;
        }
        console.log(`  -> Web scraped! Found ${paras.length} paras, img: ${extractedImg.substring(0, 50)}`);
      }
    }

    // Update image if an authentic photo was extracted and it is not a logo
    if (extractedImg && !extractedImg.includes('punch-logo') && !extractedImg.includes('500x179')) {
      post.image_url = extractedImg;
      post.image_urls = [extractedImg];
    }

    // Format full article content if paragraphs are present
    if (paras.length >= 3) {
      const lead = paras.slice(0, 2).join('\n\n');
      const middleStory = paras.slice(2, Math.floor(paras.length * 0.65)).join('\n\n');
      const deepDetails = paras.slice(Math.floor(paras.length * 0.65), Math.max(paras.length - 2, 2)).join('\n\n');
      const concluding = paras.slice(Math.max(paras.length - 2, 2)).join('\n\n');

      const totalWordCount = paras.join(' ').split(/\s+/).length;
      const readTimeMinutes = Math.max(3, Math.ceil(totalWordCount / 200));
      post.read_time = `${readTimeMinutes} min read`;

      post.content = `${lead}

---

### 📰 The Full Developing Story & Context

${middleStory}

---

### 🔍 Background, Statements & Official Perspectives

${deepDetails || concluding}

${concluding && deepDetails ? `\n\n---\n\n### 🎙️ Perspectives & What Comes Next\n\n${concluding}` : ''}

---

### 📡 Industry & Broadcast Perspective

From a digital media infrastructure viewpoint, major developments like this illustrate the speed with which breaking events reverberate across national and international broadcast channels:
* **Live Wire Distribution**: Real-time multi-platform reporting delivering instantaneous updates to viewers.
* **In-Depth Journalistic Context**: Bringing verified facts, official statements, and unfiltered context over brief summaries.
* **Community Engagement**: Enabling audiences to follow continuous updates and engage through digital broadcasts.

---

### 💡 FideTV Media Editorial Note

At **FideTV Media**, our mission is to deliver comprehensive, unfiltered news covering international media, industry icons, technology, and broadcasting breakthroughs. Whether tracking pivotal governance milestones, cultural shifts, or technological infrastructure, we keep our community equipped with timely, high-fidelity reporting.

---

### 📌 Key Story Takeaways

1. **Primary Subject**: ${post.title}
2. **Category Focus**: ${post.category}
3. **Reading Time**: ${post.read_time}
4. **Source Attribution**: Reporting verified via *${post.source_name}* original coverage.`;

      if (paras[0]) {
        post.excerpt = paras[0].length > 180 ? paras[0].substring(0, 177) + '...' : paras[0];
        post.description = post.excerpt;
      }
      console.log(`  -> ENRICHED FULL CONTENT (${post.read_time}, ${paras.length} paragraphs)!`);
    } else {
      console.log(`  -> Preserving existing content (length: ${post.content?.length || 0})`);
    }
  }

  // Save enriched posts to src/data/auto_blogs.json
  fs.writeFileSync(filePath, JSON.stringify(blogs, null, 2), 'utf-8');
  console.log('\n[Enricher] Successfully saved all enriched posts to src/data/auto_blogs.json!');

  // Sync to Supabase if configured
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      console.log('[Enricher] Syncing enriched posts to Supabase database...');
      const sb = createClient(supabaseUrl, supabaseKey);
      let dbUpdated = 0;
      for (const p of blogs) {
        if (!p.id || !p.title) continue;
        const { error } = await sb.from('news').upsert({
          id: p.id,
          slug: p.slug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: p.title,
          excerpt: p.excerpt || '',
          description: p.description || '',
          content: p.content || '',
          category: p.category || 'News',
          tags: p.tags || [],
          image_url: p.image_url || '',
          image_urls: p.image_urls || (p.image_url ? [p.image_url] : []),
          is_published: true,
          created_at: p.created_at,
          author_id: p.author_id || 'fidetv_admin',
          read_time: p.read_time || '4 min read',
          source_name: p.source_name || 'FideTV Media',
          source_url: p.source_url || ''
        });
        if (!error) dbUpdated++;
      }
      console.log(`[Enricher] Successfully synced ${dbUpdated} posts to Supabase news table.`);
    } catch (dbErr: any) {
      console.warn('[Enricher] Supabase sync note:', dbErr.message);
    }
  }
}

run().catch(console.error);
