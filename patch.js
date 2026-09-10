const fs = require('fs');
let content = fs.readFileSync('server/media/adapters/permitted-sources.ts', 'utf8');
content = content.replace("import axios from 'axios';", "import axios from 'axios';\nimport { load } from 'cheerio';\nimport ytdl from '@distube/ytdl-core';\nimport btch from 'btch-downloader';\nimport ruhend from 'ruhend-scraper';\n");
fs.writeFileSync('server/media/adapters/permitted-sources.ts', content);
