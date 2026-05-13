import {Helmet} from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  name?: string;
  type?: string;
}

export const SEO = ({ title, description, name = "FideTV Media", type = "website" }: SEOProps) => {
  return (
    <Helmet>
      {/* Standard metadata */}
      <title>{title ? `${title} | ${name}` : name}</title>
      <meta name='description' content={description || "Latest news, media, and updates from FideTV Media."} />
      
      {/* Open Graph metadata */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title || name} />
      <meta property="og:description" content={description || "Latest news, media, and updates from FideTV Media."} />
      
      {/* Twitter metadata */}
      <meta name="twitter:creator" content={name} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || name} />
      <meta name="twitter:description" content={description || "Latest news, media, and updates from FideTV Media."} />
    </Helmet>
  );
};
