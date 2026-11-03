import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'video.movie' | 'video.tv_show';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  tags?: string[];
}

export const SEO = ({ 
  title, 
  description, 
  image = "https://fidetv.online/icon.svg", 
  url = typeof window !== 'undefined' ? window.location.href : 'https://fidetv.online',
  type = "website",
  publishedTime,
  modifiedTime,
  author,
  tags = []
}: SEOProps) => {
  const siteName = "FideTV Media";
  const canonicalUrl = url.startsWith('http') ? url : `https://fidetv.online${url}`;
  const fullTitle = title ? `${title} | FideTV Media` : "FideTV Media – Live Streaming, Breaking News & Broadcasting Network";
  const metaDesc = description 
    ? description.substring(0, 160).trim()
    : "FideTV Media is a certified digital broadcasting network. Watch 24/7 live TV streams, trending news, video downloads, and professional digital media services.";

  const structuredData = type === 'article' ? {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    "headline": title ? title.substring(0, 110) : siteName,
    "description": metaDesc,
    "image": [image],
    "datePublished": publishedTime || new Date().toISOString(),
    "dateModified": modifiedTime || publishedTime || new Date().toISOString(),
    "inLanguage": "en",
    "keywords": tags.length > 0 ? tags.join(', ') : "Broadcasting, News, Live Media, FideTV",
    "author": {
      "@type": "Organization",
      "name": author || "FideTV News Desk",
      "url": "https://fidetv.online"
    },
    "publisher": {
      "@type": "NewsMediaOrganization",
      "name": "FideTV Media",
      "url": "https://fidetv.online",
      "logo": {
        "@type": "ImageObject",
        "url": "https://fidetv.online/icon.svg"
      }
    }
  } : {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": siteName,
    "url": "https://fidetv.online",
    "description": metaDesc,
    "publisher": {
      "@type": "Organization",
      "name": siteName,
      "logo": {
        "@type": "ImageObject",
        "url": "https://fidetv.online/icon.svg"
      }
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://fidetv.online/news?search={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      <link rel="canonical" href={canonicalUrl} />

      {/* Search Engine Robots Directives for Complete Indexing */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {modifiedTime && <meta property="article:modified_time" content={modifiedTime} />}
      {tags.map((tag, idx) => (
        <meta key={idx} property="article:tag" content={tag} />
      ))}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data JSON-LD for Google Rich Results */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};
