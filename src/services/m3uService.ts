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
    const c = category.toLowerCase();
    
    if (country === 'NG') return 'Nigerian TV';
    if (n.includes('football') || n.includes('soccer')) return 'Football';
    if (c.includes('sport') || n.includes('sport')) return 'Sports';
    if (c.includes('movie') || n.includes('movie')) return 'Movies';
    if (c.includes('news') || n.includes('news')) return 'News';
    if (c.includes('religious') || n.includes('bible') || n.includes('god')) return 'Religious';
    if (c.includes('entertainment') || c.includes('general')) return 'Entertainment';
    
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
      const cat = channel.category.toLowerCase();
      const country = channel.country.toUpperCase();

      // 1. HARD REJECTION: Missing data & Blocked streams
      // Relaxed logo check: if (!channel.logo) return false;
      if (!channel.name || channel.name === 'Unknown Channel') return false;
      
      const blockedKeywords = [
        'blocked', 'restricted', 'offline', 'dead', 'location only', 
        'country only', 'n/a', 'token', 'expired', 'session'
      ];
      if (blockedKeywords.some(k => name.includes(k) || cat.includes(k))) {
        console.log(`[M3U Service] Rejecting restricted channel: ${channel.name}`);
        return false;
      }

      // 2. INDIAN CHANNEL LOGIC
      if (country === 'IN') {
        const keepKeywords = ['news', 'sports', 'movies', 'international', 'english', 'hd'];
        const rejectKeywords = ['tamil', 'telugu', 'bengali', 'marathi', 'kannada', 'hindi', 'punjabi'];
        
        const hasKeep = keepKeywords.some(k => name.includes(k));
        const hasReject = rejectKeywords.some(k => name.includes(k));
        
        // Only keep Indian channels that are specifically English/News/Sports/HD 
        // AND not primarily regional language feeds
        if (hasReject && !name.includes('english')) return false;
        if (!hasKeep && !hasReject) return false; // Generic local indian channels
      }

      // 3. SPECIFIC PRIORITY FILTERS
      // Religious Filters
      if (cat.includes('religious') || name.includes('daystar') || name.includes('tbn') || name.includes('ewtn') || name.includes('hope channel')) {
        return true;
      }

      // Sports Priorities
      if (cat.includes('sport') || name.includes('fifa+') || name.includes('red bull') || name.includes('sportsgrid')) {
        return true;
      }

      // News Priorities
      if (cat.includes('news') || name.includes('bbc') || name.includes('cnn') || name.includes('al jazeera') || name.includes('france 24') || name.includes('bloomberg')) {
        return true;
      }

      // Music & Kids
      if (cat.includes('music') || cat.includes('kids') || name.includes('mtv') || name.includes('nickelodeon') || name.includes('disney')) {
        return true;
      }

      // 4. GENERAL HIGH PRIORITY COUNTRIES
      if (this.HIGH_PRIORITY_COUNTRIES.includes(country)) return true;

      // 5. GLOBAL BRANDS
      const globalKeywords = ['pluto tv', 'plex', 'filmrise', 'rakuten', 'tv movie', 'documentary', 'wild'];
      if (globalKeywords.some(k => name.includes(k) || cat.includes(k))) return true;

      // If it doesn't match priority countries or global keywords, deprioritize
      return false;
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
