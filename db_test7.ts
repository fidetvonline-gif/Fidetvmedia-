import axios from 'axios';

async function testFetch() {
  try {
    const targetUrl = encodeURIComponent("https://nl1.nghk.ai/ArenaSport3HD/tracks-v1a1/mono.ts.m3u8");
    const proxyUrl = `http://localhost:3000/api/proxy-stream?url=${targetUrl}&referer=${encodeURIComponent('https://nl1.nghk.ai/')}`;
    
    const response = await axios.get(proxyUrl);
    const lines = response.data.split('\n');
    const tsLines = lines.filter(l => l.includes('.ts'));
    
    if (tsLines.length > 0) {
        let tsUrl = tsLines[tsLines.length - 1]; // get the last segment
        console.log("Found TS proxy URL:", tsUrl);
        // It's already the proxy URL from the rewrite
        const tsResponse = await axios.get("http://localhost:3000" + tsUrl, { responseType: 'arraybuffer' });
        console.log("TS Status:", tsResponse.status);
        console.log("TS Size:", tsResponse.data.byteLength);
    } else {
        console.log("No TS segments found");
    }
  } catch (e) {
      console.log("ERROR", e.message);
  }
}
testFetch();
