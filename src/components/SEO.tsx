import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  publishedTime?: string;
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
  author,
  tags = []
}: SEOProps) => {
  const siteName = "FideTV Media";
  const fullTitle = title ? `${title} | FideTV Media` : "FideTV Media | Live Broadcasting, Creative Agency & Digital Innovation";
  const metaDesc = description || "FideTV Media is a certified digital creative agency and live broadcasting hub. We offer 24/7 live streaming, professional video production, and custom web design for brands and communities.";

  const structuredData = type === 'article' ? {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": title || siteName,
    "description": metaDesc,
    "image": [image],
    "datePublished": publishedTime || new Date().toISOString(),
    "author": {
      "@type": "Organization",
      "name": author || "FideTV News Desk"
    },
    "publisher": {
      "@type": "Organization",
      "name": "FideTV Media Hub",
      "logo": {
        "@type": "ImageObject",
        "url": "https://fidetv.online/icon.svg"
      }
    }
  } : {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": siteName,
    "url": "https://fidetv.online",
    "description": metaDesc,
    "applicationCategory": "MultimediaApplication",
    "operatingSystem": "All",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://fidetv.online/news?search={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {tags.map((tag, idx) => (
        <meta key={idx} property="article:tag" content={tag} />
      ))}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};
