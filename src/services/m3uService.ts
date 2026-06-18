import axios from 'axios';
import { Parser } from 'm3u8-parser';

export interface M3UChannel {
  id: string;
  name: string;
  url: string;
  category: string;
  logo: string;
  country: string;
  tvgId?: string;
}

export class M3UService {
  /**
   * High Priority Countries based on Strategy
   */
  private static readonly HIGH_PRIORITY_COUNTRIES = [
    'NG', 'ZA', 'KE', 'GH', 'US', 'GB', 'CA', 'AU', 'FR', 'DE'
  ];

  private static normalizeCategory(name: string, category: string, country: string): string {
    const n = name.toLowerCase();
    
    if (n.includes('action')) return 'Action';
    if (n.includes('comedy')) return 'Comedy';
    if (n.includes('drama')) return 'Drama';
    if (n.includes('crime')) return 'Crime';
    if (n.includes('horror')) return 'Horror';
    if (n.includes('family') || n.includes('kids')) return 'Family';
    if (n.includes('classic')) return 'Classics';
    if (n.includes('sci-fi') || n.includes('science')) return 'Sci-Fi';
    if (n.includes('thriller')) return 'Thriller';
    if (n.includes('romance')) return 'Romance';
    
    return 'Entertainment'; // Default
  }

  /**
   * Fetches an M3U playlist and parses it.
   */
  static async fetchAndParse(url: string): Promise<M3UChannel[]> {
    try {
      console.log(`[M3U Service] Fetching playlist from: ${url}`);
      const response = await axios.get(url, { 
        timeout: 25000,
        headers: {
          'User-Agent': 'FideTV-M3U-Parser/1.1'
        }
      });
      
      const content = response.data;
      if (typeof content !== 'string') {
        throw new Error('Received non-string content from M3U source');
      }

      const parser = new Parser();
      parser.push(content);
      parser.end();
      
      const channels: M3UChannel[] = [];
      const lines = content.split('\n');
      let currentInfo: any = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('#EXTINF:')) {
          const logoMatch = line.match(/tvg-logo="([^"]*)"/);
          const groupMatch = line.match(/group-title="([^"]*)"/);
          const countryMatch = line.match(/tvg-country="([^"]*)"/);
          const idMatch = line.match(/tvg-id="([^"]*)"/);

          // Robust name extraction: find the first comma NOT inside quotes
          let name = '';
          let inQuotes = false;
          for (let j = 0; j < line.length; j++) {
            if (line[j] === '"') inQuotes = !inQuotes;
            if (line[j] === ',' && !inQuotes) {
              name = line.substring(j + 1).trim();
              break;
            }
          }

          if (!name) {
            name = idMatch ? idMatch[1] : 'Unknown Channel';
          }
          
          const category = groupMatch ? groupMatch[1].trim() : 'General';
          const country = countryMatch ? countryMatch[1].toUpperCase() : '';
          const tvgId = idMatch ? idMatch[1] : undefined;

          currentInfo = {
            name,
            category: this.normalizeCategory(name, category, country),
            logo: logoMatch ? logoMatch[1] : '',
            country,
            tvgId
          };
        } else if ((line.startsWith('http') || line.startsWith('rtmp') || line.startsWith('mmsh')) && currentInfo) {
          channels.push({
            id: Math.random().toString(36).substring(2, 11),
            url: line,
            ...currentInfo
          });
          currentInfo = null;
        }
      }

      console.log(`[M3U Service] Raw ingested: ${channels.length} channels`);
      return channels;
    } catch (error: any) {
      console.error('[M3U Service] Ingestion error:', error.message);
      throw new Error(`M3U Parsing Failed: ${error.message}`);
    }
  }

  /**
   * Smart Filter based on Fide TV Premium Strategy
   */
  static smartFilter(channels: M3UChannel[]): M3UChannel[] {
    return channels.filter(channel => {
      const name = channel.name.toLowerCase();
      
      // 1. Only English channels (approx based on country or name)
      // M3U doesn't have language explicitly, we rely on country 
      // or if it's in the English M3U list (inferred by user request)
      
      // Filter for movies/entertainment keywords
      if (!name.includes('movie') && !name.includes('entertainment') && !name.includes('film') && !name.includes('cinema')) {
        // If not explicitly a movie/ent channel, check if it fits in categories
        const categories = ['action', 'comedy', 'drama', 'crime', 'horror', 'family', 'classic', 'sci-fi', 'thriller', 'romance'];
        if (!categories.some(c => name.includes(c))) return false;
      }

      // 2. HARD REJECTION: Missing data & Blocked streams
      if (!channel.name || channel.name === 'Unknown Channel' || !channel.url) return false;
      
      const blockedKeywords = [
        'blocked', 'restricted', 'offline', 'dead', 'location only', 
        'country only', 'n/a', 'token', 'expired', 'session'
      ];
      if (blockedKeywords.some(k => name.includes(k))) return false;

      return true;
    });
  }

  /**
   * Filters a list of channels based on provided criteria.
   */
  static filterChannels(channels: M3UChannel[], filters: { category?: string; country?: string }): M3UChannel[] {
    return channels.filter(channel => {
      const matchCategory = !filters.category || channel.category.toLowerCase().includes(filters.category.toLowerCase());
      const matchCountry = !filters.country || (channel.country && channel.country.toLowerCase() === filters.country.toLowerCase());
      return matchCategory && matchCountry;
    });
  }
}
