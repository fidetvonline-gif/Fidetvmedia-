import axios from 'axios';

async function testFetch() {
  try {
    const targetUrl = encodeURIComponent("https://nl1.nghk.ai/ArenaSport3HD/index.m3u8");
    const proxyUrl = `http://localhost:3000/api/proxy-stream?url=${targetUrl}`;
    console.log("Fetching", proxyUrl);
    
    const response = await axios.get(proxyUrl);
    console.log(response.status);
    console.log(response.data);
  } catch (e) {
    console.log("ERROR", e.message);
  }
}
testFetch();
