
import axios from 'axios';

async function testHealth() {
  const url = 'https://ais-dev-nnexx2zzz4yytqpqtufc7b-666571828915.europe-west2.run.app/api/health';
  
  try {
    console.log('Testing /api/health...');
    const response = await axios.get(url);
    console.log('Status:', response.status);
    console.log('Data:', response.data);
  } catch (e: any) {
    console.error('Test failed:', e.message);
  }
}

testHealth();
