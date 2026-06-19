import axios from 'axios';
import { Parser } from 'm3u8-parser';

export interface M3UChannel {
  id: string;
  name: string;
  url: string;
  category: string;
  logo: string;
  country: string;
  language: string;
  website: string;
  source: string;
  stream_type: string;
  resolution: string;
  tvgId?: string;
  last_checked?: string;
}

export class M3UService {
  /**
   * High Priority Countries based on Strategy
   */
  private static readonly HIGH_PRIORITY_COUNTRIES = [
    'NG', 'ZA', 'KE', 'GH', 'US', 'GB', 'CA', 'AU', 'FR', 'DE'
  ];

  private static normalizeCategory(name: string, groupTitle: string, country: string): string {
    const n = name.toLowerCase();
    const g = groupTitle ? groupTitle.toLowerCase() : '';
    const combined = `${n} ${g}`;
    
    if (combined.includes('movie') || combined.includes('cinema') || combined.includes('film')) return 'Movies';
    if (combined.includes('news')) return 'News';
    if (combined.includes('sport')) return 'Sports';
    if (combined.includes('kids') || combined.includes('cartoon') || combined.includes('animation')) return 'Kids';
    if (combined.includes('music')) return 'Music';
    if (combined.includes('religious') || combined.includes('christian') || combined.includes('islamic') || combined.includes('catholic') || combined.includes('gospel')) return 'Religious';
    if (combined.includes('doc')) return 'Documentary';
    if (combined.includes('lifestyle') || combined.includes('fashion') || combined.includes('travel')) return 'Lifestyle';
    if (combined.includes('action')) return 'Movies / Action';
    if (combined.includes('comedy')) return 'Comedy';
    if (combined.includes('drama')) return 'Drama';
    if (combined.includes('entertainment')) return 'Entertainment';
    
    // Country specific overrides
    if (country === 'NG') return 'Nigerian';
    if (country === 'IN' && (combined.includes('movie') || combined.includes('cinema'))) return 'Indian Movies';
    if (country === 'IN') return 'Indian';
    if (country === 'PH') return 'Philippines';
    
    return 'General'; // Default
  }

  /**
   * Fetches an M3U playlist and parses it.
   */
  static async fetchAndParse(url: string, sourceName: string = 'External M3U'): Promise<M3UChannel[]> {
    try {
      console.log(`[M3U Service] Fetching playlist from: ${url}`);
      const response = await axios.get(url, { 
        timeout: 30000,
        headers: {
          'User-Agent': 'FideTV-M3U-Parser/1.2'
        }
      });
      
      const content = response.data;
      if (typeof content !== 'string') {
        throw new Error('Received non-string content from M3U source');
      }

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
          const languageMatch = line.match(/tvg-language="([^"]*)"/);

          // Robust name extraction
          let name = '';
          const commaIndex = line.lastIndexOf(',');
          if (commaIndex !== -1) {
            name = line.substring(commaIndex + 1).trim();
          }

          if (!name) {
            name = idMatch ? idMatch[1] : 'Unknown Channel';
          }
          
          const groupTitle = groupMatch ? groupMatch[1].trim() : '';
          const country = countryMatch ? countryMatch[1].toUpperCase() : '';
          
          currentInfo = {
            name,
            category: this.normalizeCategory(name, groupTitle, country),
            logo: logoMatch ? logoMatch[1] : '',
            country,
            language: languageMatch ? languageMatch[1] : 'Unknown',
            website: '',
            source: sourceName,
            stream_type: '', // Will be detected
            resolution: 'Unknown',
            tvgId: idMatch ? idMatch[1] : undefined,
            last_checked: new Date().toISOString()
          };
        } else if (line.startsWith('http') && currentInfo) {
          // Detect stream type
          let st = 'HLS';
          if (line.includes('.mpd')) st = 'DASH';
          else if (line.includes('.mp4')) st = 'MP4';
          else if (line.includes('youtube.com') || line.includes('youtu.be')) st = 'YouTube Live';

          channels.push({
            id: Math.random().toString(36).substring(2, 11),
            url: line,
            ...currentInfo,
            stream_type: st
          });
          currentInfo = null;
        }
      }

      console.log(`[M3U Service] Successfully parsed ${channels.length} channels from ${sourceName}`);
      return channels;
    } catch (error: any) {
      console.error(`[M3U Service] Ingestion error for ${sourceName}:`, error.message);
      return [];
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
