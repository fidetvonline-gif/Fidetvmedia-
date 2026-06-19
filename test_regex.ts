const getEmbedId = (idOrUrl) => {
    if (!idOrUrl) return '';
    
    let processed = idOrUrl.trim();

    if (processed.startsWith('<iframe')) {
        const match = processed.match(/src="([^"]+)"/);
        if (match) {
            processed = match[1];
        }
    }
    
    const match = processed.match(/(?:v=|embed\/|youtu\.be\/|\/v\/|watch\?v=|^)([a-zA-Z0-9_-]{11})(?:[?&]|$)/);
    return match ? match[1] : processed;
};

console.log(getEmbedId('https://www.youtube.com/watch?v=S3QBYyaUKic'));
console.log(getEmbedId('S3QBYyaUKic'));
