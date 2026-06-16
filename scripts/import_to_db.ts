import axios from 'axios';
async function importChannels() {
    try {
        const response = await axios.post('http://localhost:3000/api/channels/import-to-db');
        console.log('Import result:', response.data);
    } catch (e: any) {
        console.error('Import failed:', e.message);
    }
}
importChannels();
