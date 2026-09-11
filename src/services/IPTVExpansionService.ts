import { M3UService, M3UChannel } from './m3uService.js';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

export class IPTVExpansionService {
  private static readonly SOURCES = [
    { name: 'IPTV-org Index', url: 'https://iptv-org.github.io/iptv/index.m3u' },
    { name: 'Movies', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u' },
    { name: 'Entertainment', url: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u' },
    { name: 'News', url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
    { name: 'Sports', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u' },
    { name: 'Kids', url: 'https://iptv-org.github.io/iptv/categories/kids.m3u' },
    { name: 'Music', url: 'https://iptv-org.github.io/iptv/categories/music.m3u' },
    { name: 'Documentary', url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u' },
    { name: 'Religious', url: 'https://iptv-org.github.io/iptv/categories/religious.m3u' },
    { name: 'Nigeria', url: 'https://iptv-org.github.io/iptv/countries/ng.m3u' },
    { name: 'India', url: 'https://iptv-org.github.io/iptv/countries/in.m3u' },
    { name: 'Philippines', url: 'https://iptv-org.github.io/iptv/countries/ph.m3u' },
    { name: 'English Language', url: 'https://iptv-org.github.io/iptv/languages/eng.m3u' }
  ];

  static async runExpansion() {
    console.log('[IPTV Expansion] Starting massive expansion...');
    let allChannels: M3UChannel[] = [];

    for (const source of this.SOURCES) {
      const channels = await M3UService.fetchAndParse(source.url, source.name);
      allChannels = [...allChannels, ...channels];
    }

    // Deduplicate by URL
    const uniqueChannels = Array.from(new Map(allChannels.map(item => [item.url, item])).values());
    console.log(`[IPTV Expansion] Found ${uniqueChannels.length} unique channels after ingestion.`);

    // Perform background validation in batches
    return uniqueChannels;
  }

  static async validateStream(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url, { 
        timeout: 8000,
        headers: { 'User-Agent': 'FideTV-Validator/1.0' }
      });
      return response.status === 200;
    } catch (e) {
      return false;
    }
  }

  static async saveToJson(channels: M3UChannel[]) {
    const dataPath = path.join(process.cwd(), 'src', 'data', 'channels.json');
    await fs.mkdir(path.dirname(dataPath), { recursive: true });
    await fs.writeFile(dataPath, JSON.stringify(channels, null, 2));
    console.log(`[IPTV Expansion] Saved ${channels.length} channels to ${dataPath}`);
  }
}
