import axios from 'axios';
const fetchVideo = async () => {
    try {
        const res = await axios.get('http://127.0.0.1:3000/api/youtube/content');
        console.log(res.data);
    } catch (e) {
        console.error(e.message);
    }
}
fetchVideo();
