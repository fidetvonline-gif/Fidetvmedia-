import axios from 'axios';

async function testFetch() {
  try {
    const targetUrl = encodeURIComponent("https://nl1.nghk.ai/ArenaSport3HD/tracks-v1a1/2026/06/17/21/44/00-06000.ts");
    const proxyUrl = `http://localhost:3000/api/proxy-stream?url=${targetUrl}&referer=${encodeURIComponent('https://nl1.nghk.ai/')}`;
    console.log("Fetching TS segment", proxyUrl);
    
    const response = await axios.get(proxyUrl, { responseType: 'arraybuffer' });
    console.log(response.status);
    console.log("Segment size:", response.data.byteLength);
  } catch (e) {
    if (e.response) {
      console.log("ERROR", e.response.status);
    } else {
      console.log("ERROR", e.message);
    }
  }
}
testFetch();
