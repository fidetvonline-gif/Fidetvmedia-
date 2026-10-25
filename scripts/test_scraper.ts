import axios from 'axios';
import * as cheerio from 'cheerio';

async function checkChannelsFeed() {
  const chRes = await axios.get('https://www.channelstv.com/feed/', { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 });
  const $ = cheerio.load(chRes.data, { xmlMode: true });
  $('item').each((i, el) => {
    const title = $(el).find('title').first().text();
    const link = $(el).find('link').first().text();
    const raw = $(el).html() || '';
    const featuredMatch = raw.match(/<media:featured[^>]+url="([^">]+)"/i);
    const content = $(el).find('content\\:encoded').text();
    const $c = cheerio.load(content);
    const paras: string[] = [];
    $c('p').each((_, p) => {
      const t = $c(p).text().trim();
      if (t.length > 20) paras.push(t);
    });
    console.log(`\nItem ${i+1}: ${title}`);
    console.log('Link:', link);
    console.log('Featured Img:', featuredMatch ? featuredMatch[1] : 'NONE');
    console.log('Paras in content:encoded:', paras.length);
    if (paras[0]) console.log('Para 1:', paras[0].substring(0, 100));
  });
}
checkChannelsFeed();
