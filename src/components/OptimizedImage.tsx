import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export default function OptimizedImage({ src, fallbackSrc, className, alt, ...props }: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-surface", className)}>
      {!isLoaded && !error && (
        <div className="absolute inset-0 animate-pulse bg-surface-bright" />
      )}
      {(src || (error && fallbackSrc)) && (
        <img
          src={error ? fallbackSrc : (src || fallbackSrc)}
          alt={alt}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-500",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setIsLoaded(true)}
          onError={() => setError(true)}
          {...props}
        />
      )}
    </div>
  );
}
