import axios from 'axios';

async function testFetch() {
  try {
    const response = await axios.get('https://nl1.nghk.ai/ArenaSport3HD/index.m3u8', {
        headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://nl1.nghk.ai/',
        'Origin': 'https://nl1.nghk.ai'
        },
        timeout: 10000
    });
    console.log(response.status);
    console.log(response.headers);
    console.log(response.data);
  } catch (e) {
    console.log("ERROR", e.message);
  }
}
testFetch();
