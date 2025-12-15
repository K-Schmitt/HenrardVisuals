/**
 * OptimizedImage Component
 * Lazy-loaded image with intersection observer and zoom effect
 * On mobile: activates color/zoom when image is centered on screen
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
  const [isCentered, setIsCentered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy loading observer
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

  // Center detection for mobile - activates effect when image is near center of viewport
  useEffect(() => {
    if (!enableZoom || !containerRef.current) return;

    // Check if mobile/touch device
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Calculate how centered the element is
        const rect = entry.boundingClientRect;
        const viewportHeight = window.innerHeight;
        const elementCenter = rect.top + rect.height / 2;
        const viewportCenter = viewportHeight / 2;
        
        // Consider "centered" if element center is within 20% of viewport center
        const threshold = viewportHeight * 0.25;
        const isCenteredNow = Math.abs(elementCenter - viewportCenter) < threshold && entry.isIntersecting;
        
        setIsCentered(isCenteredNow);
      },
      { 
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '-20% 0px -20% 0px'
      }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [enableZoom]);

  const isActive = isHovered || isCentered;

  const imageStyle = {
    transform: enableZoom && isActive ? 'scale(1.05)' : 'scale(1)',
    transition: 'transform 0.7s ease-out, opacity 0.3s ease-out, filter 0.5s ease-out',
    opacity: isLoaded ? 1 : 0,
    filter: isActive ? 'grayscale(0)' : 'grayscale(1)',
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
