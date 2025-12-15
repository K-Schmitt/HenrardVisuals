/**
 * OptimizedImage Component
 * Lazy-loaded image with intersection observer and zoom effect
 */

import { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  enableZoom?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  onClick,
  loading = 'lazy',
  priority = false,
  enableZoom = false,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px', threshold: 0.01 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [priority]);

  const imageStyle = {
    transform: enableZoom && isHovered ? 'scale(1.05)' : 'scale(1)',
    transition: 'transform 0.7s ease-out, opacity 0.3s ease-out, filter 0.5s ease-out',
    opacity: isLoaded ? 1 : 0,
    filter: isHovered ? 'grayscale(0)' : 'grayscale(1)',
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isInView && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          onLoad={() => setIsLoaded(true)}
          decoding="async"
          style={imageStyle}
          className={className}
          fetchPriority={priority ? 'high' : 'auto'}
        />
      )}
    </div>
  );
}
