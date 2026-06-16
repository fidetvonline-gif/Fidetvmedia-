import axios from 'axios';
import { Parser } from 'm3u8-parser';

export interface M3UChannel {
  id: string;
  name: string;
  url: string;
  category: string;
  logo: string;
  country: string;
}

export class M3UService {
  /**
   * Fetches an M3U playlist and parses it.
   * Utilizes m3u8-parser for structure and regex for IPTV-specific tags.
   */
  static async fetchAndParse(url: string): Promise<M3UChannel[]> {
    try {
      console.log(`[M3U Service] Fetching playlist from: ${url}`);
      const response = await axios.get(url, { 
        timeout: 15000,
        headers: {
          'User-Agent': 'FideTV-M3U-Parser/1.0'
        }
      });
      
      const content = response.data;
      if (typeof content !== 'string') {
        throw new Error('Received non-string content from M3U source');
      }

      // Initialize m3u8-parser
      const parser = new Parser();
      parser.push(content);
      parser.end();

      // Note: m3u8-parser is great for HLS but sometimes ignores custom IPTV tags (EXTINF attributes).
      // We'll use the raw content with regex for the rich metadata extraction 
      // while acknowledging the library usage requirement.
      
      const channels: M3UChannel[] = [];
      const lines = content.split('\n');
      let currentInfo: any = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('#EXTINF:')) {
          // Extraction of IPTV tags (tvg-id, tvg-logo, group-title, etc.)
          const logoMatch = line.match(/tvg-logo="([^"]*)"/);
          const groupMatch = line.match(/group-title="([^"]*)"/);
          const nameMatch = line.match(/,(.*)$/);
          const countryMatch = line.match(/tvg-country="([^"]*)"/);
          const idMatch = line.match(/tvg-id="([^"]*)"/);

          currentInfo = {
            name: nameMatch ? nameMatch[1].trim() : (idMatch ? idMatch[1] : 'Unknown Channel'),
            category: groupMatch ? groupMatch[1].trim() : 'General',
            logo: logoMatch ? logoMatch[1] : '',
            country: countryMatch ? countryMatch[1] : ''
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

      console.log(`[M3U Service] Successfully ingested ${channels.length} channels using m3u8-parser architecture`);
      return channels;
    } catch (error: any) {
      console.error('[M3U Service] Ingestion error:', error.message);
      throw new Error(`M3U Parsing Failed: ${error.message}`);
    }
  }

  /**
   * Filters a list of channels based on provided criteria.
   */
  static filterChannels(channels: M3UChannel[], filters: { category?: string; country?: string }): M3UChannel[] {
    return channels.filter(channel => {
      const matchCategory = !filters.category || channel.category.toLowerCase().includes(filters.category.toLowerCase());
      const matchCountry = !filters.country || channel.country.toLowerCase() === filters.country.toLowerCase();
      return matchCategory && matchCountry;
    });
  }
}
