
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";

dotenv.config();

const URL_SETS = [
  {
    name: "Africa",
    urls: [
      "https://raw.githubusercontent.com/AfricaIPTV/AfricaIPTV/main/africa.m3u",
      "https://raw.githubusercontent.com/AfricaIPTV/AfricaIPTV/master/africa.m3u",
      "https://iptv-org.github.io/iptv/regions/africa.m3u"
    ]
  },
  {
    name: "Sports",
    urls: [
      "https://raw.githubusercontent.com/fortn1te/streamlinks/main/Sport.m3u8",
      "https://raw.githubusercontent.com/fortn1te/streamlinks/master/Sport.m3u8",
      "https://iptv-org.github.io/iptv/categories/sports.m3u"
    ]
  },
  {
    name: "Movies",
    urls: [
      "https://raw.githubusercontent.com/freesamples/IPTV/master/movies.m3u",
      "https://raw.githubusercontent.com/freesamples/IPTV/main/movies.m3u",
      "https://iptv-org.github.io/iptv/categories/movies.m3u"
    ]
  },
  {
    name: "News",
    urls: ["https://iptv-org.github.io/iptv/categories/news.m3u"]
  },
  {
    name: "Entertainment",
    urls: ["https://iptv-org.github.io/iptv/categories/entertainment.m3u"]
  }
];

const TARGET_CATEGORIES = ["Sports", "Movies", "Entertainment", "News"];

interface M3UChannel {
  name: string;
  url: string;
  category: string;
  logo: string;
}

async function fetchAndParse(urls: string[]): Promise<M3UChannel[]> {
  for (const url of urls) {
    try {
      console.log(`Fetching ${url}...`);
      const response = await axios.get(url, { timeout: 10000 });
      const content = response.data;
      if (typeof content !== 'string' || !content.includes('#EXTM3U')) continue;

      const lines = content.split('\n');
      const channels: M3UChannel[] = [];
      let currentInfo: any = null;

      for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('#EXTINF:')) {
              const logoMatch = line.match(/tvg-logo="([^"]*)"/);
              const groupMatch = line.match(/group-title="([^"]*)"/);
              const nameMatch = line.match(/,(.*)$/);
              currentInfo = {
                  name: nameMatch ? nameMatch[1].trim() : 'Unknown',
                  category: groupMatch ? groupMatch[1].trim() : 'General',
                  logo: logoMatch ? logoMatch[1] : ''
              };
          } else if (line.startsWith('http') && currentInfo) {
              channels.push({
                  url: line,
                  ...currentInfo
              });
              currentInfo = null;
          }
      }
      if (channels.length > 0) {
        console.log(`Successfully parsed ${channels.length} channels from ${url}`);
        return channels;
      }
    } catch (e: any) {
      console.warn(`Failed to fetch ${url}: ${e.message}`);
    }
  }
  return [];
}

async function validateUrl(url: string): Promise<boolean> {
  try {
    const response = await axios.head(url, { 
      timeout: 5000, 
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
      validateStatus: () => true 
    });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

async function runImport() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Supabase credentials missing.");
    return;
  }

  const supabase = createClient(url, key);
  
  let allChannels: M3UChannel[] = [];
  for (const set of URL_SETS) {
    const channels = await fetchAndParse(set.urls);
    allChannels = [...allChannels, ...channels];
  }

  console.log(`Found ${allChannels.length} total raw channels from all sets.`);
  if (allChannels.length === 0) {
    console.error("No channels found to process. Exiting.");
    return;
  }

  // Filter by category
  const filtered = allChannels.filter(c => {
    const cat = c.category.toLowerCase();
    const name = c.name.toLowerCase();
    
    // Check if category or name matches target
    const isSports = cat.includes("sport") || name.includes("sport") || name.includes("world cup");
    const isMovies = cat.includes("movie") || cat.includes("cinema") || name.includes("movie");
    const isNews = cat.includes("news") || name.includes("news");
    const isEnt = cat.includes("ent") || cat.includes("series") || cat.includes("variety") || cat.includes("general");

    if (isSports) {
      if (name.includes("world cup") || cat.includes("world cup")) {
        c.category = "Sports (World Cup)";
      } else {
        c.category = "Sports";
      }
    }
    else if (isMovies) c.category = "Movies";
    else if (isNews) c.category = "News";
    else if (isEnt) c.category = "Entertainment";
    
    return isSports || isMovies || isNews || isEnt;
  });

  console.log(`Filtered to ${filtered.length} relevant channels.`);

  // Deduplicate by URL
  const unique = Array.from(new Map(filtered.map(item => [item.url, item])).values());
  console.log(`Unique channels for testing: ${unique.length}`);

  // Test signals - get a balanced mix from each category
  const categoriesToTest = ["Sports", "Sports (World Cup)", "Movies", "Entertainment", "News"];
  const verified: M3UChannel[] = [];
  const batchSize = 10;
  
  console.log(`Testing stream availability (balanced mix)...`);
  
  for (const cat of categoriesToTest) {
    const catChannels = unique.filter(c => c.category === cat);
    const toTest = catChannels.slice(0, 30); // Get up to 30 from each
    
    if (toTest.length === 0) continue;
    
    console.log(`Testing up to 30 channels for category: ${cat}...`);
    
    for (let i = 0; i < toTest.length; i += batchSize) {
      const batch = toTest.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(async c => ({ ...c, ok: await validateUrl(c.url) })));
      verified.push(...results.filter(r => r.ok).map(({ ok, ...rest }) => rest));
    }
  }

  console.log(`Verified ${verified.length} total working channels.`);

  // Save to JSON
  const outputDir = path.join(process.cwd(), 'src', 'data');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'imported_channels.json');
  
  const organizedByCat: Record<string, M3UChannel[]> = {};
  ["Sports", "Sports (World Cup)", "Movies", "Entertainment", "News"].forEach(cat => organizedByCat[cat] = []);
  verified.forEach(c => {
     if (organizedByCat[c.category]) organizedByCat[c.category].push(c);
     else organizedByCat["Entertainment"].push(c);
  });

  await fs.writeFile(outputPath, JSON.stringify(organizedByCat, null, 2));
  console.log(`Saved organized JSON to ${outputPath}`);

  // Import to DB - deduplicate against existing
  console.log("Fetching existing URLs to avoid duplicates...");
  const { data: existing } = await supabase.from('tv_channels').select('url');
  const existingUrls = new Set(existing?.map(e => e.url) || []);

  const toInsert = verified.filter(v => !existingUrls.has(v.url));
  console.log(`Preparing to insert ${toInsert.length} new channels...`);

  if (toInsert.length > 0) {
    const { error } = await supabase.from('tv_channels').insert(toInsert.map(c => ({
      name: c.name,
      category: c.category,
      url: c.url,
      thumbnail: c.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=random`,
      is_active: true
    })));

    if (error) {
      console.error("DB Import Error:", error);
    } else {
      console.log(`Inserted ${toInsert.length} channels into the database.`);
    }
  } else {
    console.log("No new channels to insert (all duplicates).");
  }
}

runImport();
