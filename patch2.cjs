const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/const\s+ruhendMod\s*=\s*await\s+import\(["']ruhend-scraper["']\);/g, '');
content = content.replace(/const\s+ruhend\s*=\s*\(ruhendMod\s+as\s+any\)\.default\s*\|\|\s*ruhendMod;/g, 'const ruhend = (ruhend_static as any).default || ruhend_static;');

content = content.replace(/const\s+btchMod\s*=\s*await\s+import\(["']btch-downloader["']\);/g, '');
content = content.replace(/const\s+btch\s*=\s*\(btchMod\s+as\s+any\)\.default\s*\|\|\s*btchMod;/g, 'const btch = (btch_static as any).default || btch_static;');

content = content.replace(/const\s+ytdlModule\s*=\s*await\s+import\(["']@distube\/ytdl-core["']\);/g, '');
content = content.replace(/const\s+ytdl\s*=\s*\(ytdlModule\s+as\s+any\)\.default\s*\|\|\s*ytdlModule;/g, 'const ytdl = (ytdl_core_static as any).default || ytdl_core_static;');

content = content.replace(/const\s+\$\s*=\s*await\s+import\(["']cheerio["']\)\.then\(m\s*=>\s*m\.load\(pageRes\.data\)\);/g, 'const $ = cheerio_static.load(pageRes.data);');

fs.writeFileSync('server.ts', content);
