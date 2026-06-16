import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

const PLAYLIST_URL = process.argv[2] || 'https://iptv-org.github.io/iptv/index.m3u';
const OUTPUT_FILE = path.join(process.cwd(), 'src', 'data', 'channels.json');
const LOG_FILE = path.join(process.cwd(), 'ingestion.log');

async function log(message: string) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    console.log(message);
    await fs.appendFile(LOG_FILE, logEntry);
}

async function validateUrl(url: string, name: string): Promise<boolean> {
    try {
        const response = await axios.head(url, { timeout: 3000 });
        return response.status >= 200 && response.status < 400;
    } catch (e) {
        return false;
    }
}

async function startIngestion() {
    try {
        await fs.writeFile(LOG_FILE, ''); // Clear log
        await log('>>> STARTING M3U INGESTION PROCESS <<<');
        await log(`Source: ${PLAYLIST_URL}`);

        const response = await axios.get(PLAYLIST_URL, { timeout: 30000 });
        const content = response.data;
        const lines = content.split('\n');

        const channels: any[] = [];
        let current: any = null;

        await log('Parsing playlist structure...');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#EXTINF:')) {
                const logoMatch = line.match(/tvg-logo="([^"]*)"/);
                const groupMatch = line.match(/group-title="([^"]*)"/);
                const nameMatch = line.match(/,(.*)$/);
                const countryMatch = line.match(/tvg-country="([^"]*)"/);
                
                current = {
                    name: nameMatch ? nameMatch[1].trim() : 'Unknown',
                    category: groupMatch ? groupMatch[1].trim() : 'General',
                    logo: logoMatch ? logoMatch[1] : '',
                    country: countryMatch ? countryMatch[1] : ''
                };
            } else if (line.startsWith('http') && current) {
                current.url = line;
                current.id = Math.random().toString(36).substring(2, 10);
                channels.push(current);
                current = null;
            }
        }

        await log(`Found ${channels.length} raw channels.`);
        
        // Validation (limiting to first 200 for demonstration/speed, or filter by category)
        const toValidate = channels.slice(0, 150);
        await log(`Running technical validation on top ${toValidate.length} nodes...`);
        
        const validatedChannels = [];
        for (let i = 0; i < toValidate.length; i++) {
            const channel = toValidate[i];
            const isValid = await validateUrl(channel.url, channel.name);
            if (isValid) {
                validatedChannels.push(channel);
                process.stdout.write('.');
            } else {
                process.stdout.write('x');
            }
            if ((i + 1) % 50 === 0) console.log(` (${i + 1}/${toValidate.length})`);
        }

        console.log('\n');
        await log(`Validation complete. ${validatedChannels.length} active streams identified.`);

        await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(validatedChannels, null, 2));
        
        await log(`Database updated: ${OUTPUT_FILE}`);
        await log('>>> INGESTION SUCCESSFUL <<<');
        
    } catch (err: any) {
        await log(`FATAL ERROR: ${err.message}`);
        process.exit(1);
    }
}

startIngestion();
