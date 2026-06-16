import axios from 'axios';
import fs from 'fs';

async function parseM3U() {
  const url = 'https://iptv-org.github.io/iptv/index.m3u';
  try {
    console.log('Fetching M3U...');
    const response = await axios.get(url);
    const content = response.data;
    const lines = content.split('\n');
    
    const channels = [];
    let currentChannel = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXTINF:')) {
            // Regex to parse EXTINF
            // Example: #EXTINF:-1 tvg-id="CNN.us" tvg-logo="https://..." group-title="News",CNN
            const logoMatch = line.match(/tvg-logo="([^"]*)"/);
            const groupMatch = line.match(/group-title="([^"]*)"/);
            const nameMatch = line.match(/,(.*)$/);
            const countryMatch = line.match(/tvg-country="([^"]*)"/);

            currentChannel = {
                id: Math.random().toString(36).substring(7),
                name: nameMatch ? nameMatch[1].trim() : 'Unknown',
                category: groupMatch ? groupMatch[1].trim() : 'Uncategorized',
                logo: logoMatch ? logoMatch[1] : '',
                country: countryMatch ? countryMatch[1] : ''
            };
        } else if (line.startsWith('http') && currentChannel) {
            currentChannel.url = line;
            channels.push(currentChannel);
            currentChannel = null;
        }
    }

    // Limit to a reasonable number for the response if it's too big
    const result = {
        total_channels: channels.length,
        channels: channels.slice(0, 100) // The user asked for JSON, but let's see how many we get
    };

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error fetching or parsing:', error.message);
  }
}

parseM3U();
