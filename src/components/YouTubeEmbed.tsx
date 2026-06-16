import React from 'react';

interface YouTubeEmbedProps {
  videoId: string;
}

export const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ videoId }) => {
  // Logic to extract video ID if it's already a full URL
  const getEmbedId = (idOrUrl: string) => {
    // Check if it's an iframe tag
    if (idOrUrl.trim().startsWith('<iframe')) {
        const match = idOrUrl.match(/src="([^"]+)"/);
        if (match) {
            const url = match[1];
            const urlMatch = url.match(/(?:v=|embed\/|youtu\.be\/|\/v\/|watch\?v=|^)([a-zA-Z0-9_-]{11})/);
            return urlMatch ? urlMatch[1] : url;
        }
    }
    
    // Check for standard YouTube URL patterns
    const match = idOrUrl.match(/(?:v=|embed\/|youtu\.be\/|\/v\/|watch\?v=|^)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : idOrUrl;
  };

  const finalId = getEmbedId(videoId);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900">
      <iframe
        src={`https://www.youtube.com/embed/${finalId}`}
        title="YouTube video player"
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
};
