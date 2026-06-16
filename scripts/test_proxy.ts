
import axios from 'axios';

async function testProxy() {
  const proxyUrl = 'https://ais-dev-nnexx2zzz4yytqpqtufc7b-666571828915.europe-west2.run.app/api/proxy-stream?url=https%3A%2F%2Frbmn-live.akamaized.net%2Fhls%2Flive%2F590964%2FBoRB-AT%2Fmaster.m3u8';
  
  try {
    console.log('Testing proxy for Red Bull TV...');
    const response = await axios.get(proxyUrl);
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Body start:', response.data.substring(0, 100));
  } catch (e: any) {
    console.error('Proxy test failed:', e.message);
    if (e.response) {
       console.error('Response Status:', e.response.status);
       console.error('Response Data:', e.response.data);
    }
  }
}

testProxy();
