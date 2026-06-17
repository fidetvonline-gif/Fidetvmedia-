import axios from 'axios';

async function testFetch() {
  try {
    const targetUrl = encodeURIComponent("https://nl1.nghk.ai/ArenaSport3HD/tracks-v1a1/mono.ts.m3u8");
    const proxyUrl = `http://localhost:3000/api/proxy-stream?url=${targetUrl}&referer=${encodeURIComponent('https://nl1.nghk.ai/')}`;
    console.log("Fetching", proxyUrl);
    
    const response = await axios.get(proxyUrl);
    console.log(response.status);
    console.log(response.data.substring(0, 500));
  } catch (e) {
    if (e.response) {
      console.log("ERROR", e.response.status, e.response.data);
    } else {
      console.log("ERROR", e.message);
    }
  }
}
testFetch();
