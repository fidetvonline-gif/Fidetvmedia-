const http = require('https');

http.get('https://www.youtube.com/@fidetvmedia/videos', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const regex = /"videoId":"([^"]+)"/g;
    let match;
    const ids = new Set();
    while ((match = regex.exec(data)) !== null) {
      ids.add(match[1]);
    }
    const regexTitle = /"title":\{"runs":\[\{"text":"([^"]+)"\}\].*?"videoId":"([^"]+)"/g;
    const videos = [];
    while ((match = regexTitle.exec(data)) !== null) {
        videos.push({title: match[1], id: match[2]});
    }

    console.log(JSON.stringify(videos.slice(0, 5), null, 2));
  });
});
