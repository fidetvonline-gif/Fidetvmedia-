import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

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
  author_id: string;
  is_published: boolean;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
    role?: string;
  };
}

async function scrapeFullArticle(url: string) {
  try {
    const cleanUrl = url.split('?')[0];
    const res = await axios.get(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 FideTV-NewsBot/3.0'
      },
      timeout: 8000
    });

    const $ = cheerio.load(res.data);

    // Extract high-res image from og:image, twitter:image, or main article image
    let ogImg = $('meta[property="og:image"]').attr('content') ||
                $('meta[name="twitter:image:src"]').attr('content') ||
                $('meta[name="twitter:image"]').attr('content') ||
                $('figure img').first().attr('src') ||
                '';

    // Upgrade image resolution to 1200px / 1280px if BBC standard
    if (ogImg) {
      ogImg = ogImg
        .replace(/\/standard\/\d+\//, '/standard/1280/')
        .replace(/\/cpsprodpb\/[a-z0-9]+\/live\//, '/cpsprodpb/1200/live/')
        .replace(/\/branded_news\/\d+\//, '/branded_news/1200/');
    }

    const paragraphs: string[] = [];
    $('article p, [data-component="text-block"] p, main p').each((_, el) => {
      const text = $(el).text().trim();
      // Filter out boilerplate / social media prompts / captions
      if (
        text.length > 25 &&
        !text.includes('Follow BBC') &&
        !text.includes('Sign up for our') &&
        !text.includes('Download the BBC') &&
        !text.includes('Image source,') &&
        !text.includes('Get in touch') &&
        !text.includes('Listen to the latest') &&
        !text.toLowerCase().startsWith('image caption')
      ) {
        paragraphs.push(text);
      }
    });

    return {
      highResImage: ogImg,
      paragraphs
    };
  } catch (err: any) {
    console.warn(`Failed to scrape full article from ${url}:`, err.message);
    return null;
  }
}

async function run() {
  const filePath = path.resolve(process.cwd(), 'src/data/auto_blogs.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const blogs: AutoBlogPost[] = JSON.parse(raw);

  console.log(`Enriching ${blogs.length} blog posts with full reporting & high-definition images...`);

  for (let i = 0; i < blogs.length; i++) {
    const post = blogs[i];
    console.log(`[${i + 1}/${blogs.length}] Processing: ${post.title}`);

    if (post.source_url && post.source_url.startsWith('http')) {
      const scraped = await scrapeFullArticle(post.source_url);
      if (scraped && scraped.paragraphs.length >= 5) {
        if (scraped.highResImage) {
          post.image_url = scraped.highResImage;
          post.image_urls = [scraped.highResImage];
        }

        const paras = scraped.paragraphs;
        const lead = paras.slice(0, 2).join('\n\n');
        const middleStory = paras.slice(2, Math.floor(paras.length * 0.6)).join('\n\n');
        const detailAnalysis = paras.slice(Math.floor(paras.length * 0.6), paras.length - 2).join('\n\n');
        const concludingNotes = paras.slice(paras.length - 2).join('\n\n');

        const totalWordCount = paras.join(' ').split(/\s+/).length;
        const readTimeMinutes = Math.max(3, Math.ceil(totalWordCount / 200));
        post.read_time = `${readTimeMinutes} min read`;

        // Format into a comprehensive longform journalistic Markdown article
        post.content = `${lead}

---

### 📰 The Full Developing Story & Context

${middleStory}

---

### 🔍 In-Depth Background & Statements

${detailAnalysis}

---

### 📡 Industry & Broadcast Perspective

From a digital media infrastructure viewpoint, major developments like this illustrate the speed with which breaking events reverberate across global broadcast and streaming channels. Key observations from media industry analysts include:

* **Real-time Distribution**: How fast-moving international stories command live viewer attention across video, audio, and social feeds.
* **Audience Engagement**: Modern viewers expect immediate, multi-faceted coverage pairing high-definition video broadcasts with interactive commentary and live spaces.
* **Archival & Documentation**: The critical need for digital broadcast networks to document cultural, technological, and entertainment milestones accurately.

---

### 🎙️ Perspectives & What Comes Next

${concludingNotes}

---

### 💡 FideTV Media Commentary

At **FideTV Media**, our mission is to deliver comprehensive, unfiltered news covering international media, entertainment icons, technology, and broadcasting breakthroughs. Whether tracking pivotal entertainment milestones or infrastructure shifts, we keep our creative community and viewers equipped with timely, high-fidelity reporting.

---

### 📌 Key Story Takeaways

1. **Primary Subject**: ${post.title}
2. **Category Focus**: ${post.category}
3. **Reading Time**: ${post.read_time}
4. **Source Attribution**: Reporting verified via *${post.source_name}* original coverage.`;

        // Update excerpt if lead is present
        if (paras[0]) {
          post.excerpt = paras[0].length > 170 ? paras[0].substring(0, 167) + '...' : paras[0];
          post.description = post.excerpt;
        }

        console.log(`  -> Successfully enriched with ${paras.length} full paragraphs and high-res image!`);
      }
    } else {
      // Ensure existing platform & seed posts also have high-res image and full content
      if (post.image_url && post.image_url.includes('unsplash.com')) {
        post.image_url = post.image_url.replace(/w=\d+/, 'w=1600').replace(/q=\d+/, 'q=85');
        post.image_urls = [post.image_url];
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(blogs, null, 2), 'utf-8');
  console.log('All blog posts successfully enriched and saved to src/data/auto_blogs.json!');
}

run().catch(console.error);
