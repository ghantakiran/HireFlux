/**
 * Optimized Image Component
 *
 * Wrapper around next/image with best practices:
 * - Automatic WebP/AVIF format selection
 * - Lazy loading for below-the-fold images
 * - Blur placeholder support
 * - Responsive sizing
 * - Accessibility built-in
 */

'use client';

import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  priority = false,
  className = '',
  sizes,
  quality = 75,
  placeholder = 'blur',
  blurDataURL,
  objectFit = 'cover',
  loading = 'lazy',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [imgError, setImgError] = useState(false);

  // Default blur placeholder (1x1 transparent gray pixel)
  const defaultBlurDataURL =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNjY2MiLz48L3N2Zz4=';

  // Fallback image for broken images
  const fallbackSrc = '/images/placeholders/no-image.svg';

  const handleError = () => {
    setImgError(true);
    onError?.();
  };

  const handleLoad = () => {
    onLoad?.();
  };

  // If image failed to load, show fallback
  const imageSrc = imgError ? fallbackSrc : src;

  // Common props
  const commonProps = {
    alt,
    className,
    quality,
    loading: priority ? undefined : loading,
    priority,
    onError: handleError,
    onLoad: handleLoad,
    placeholder: placeholder === 'blur' ? ('blur' as const) : undefined,
    blurDataURL: placeholder === 'blur' ? (blurDataURL || defaultBlurDataURL) : undefined,
  };

  // Render with fill (responsive)
  if (fill) {
    return (
      <Image
        {...commonProps}
        src={imageSrc}
        fill
        sizes={sizes}
        style={{ objectFit }}
      />
    );
  }

  // Render with fixed dimensions
  return (
    <Image
      {...commonProps}
      src={imageSrc}
      width={width!}
      height={height!}
      sizes={sizes}
      style={{ objectFit }}
    />
  );
}

/**
 * Company Logo Component
 * Pre-configured for company logos with consistent sizing
 */
export function CompanyLogo({
  src,
  alt,
  size = 48,
  priority = false,
  className = '',
}: {
  src: string;
  alt: string;
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={`rounded ${className}`}
      objectFit="contain"
      sizes={`${size}px`}
    />
  );
}

/**
 * Avatar Component
 * Pre-configured for user avatars
 */
export function Avatar({
  src,
  alt,
  size = 40,
  priority = false,
  className = '',
}: {
  src: string;
  alt: string;
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      priority={priority}
      className={`rounded-full ${className}`}
      objectFit="cover"
      sizes={`${size}px`}
    />
  );
}

/**
 * Hero Image Component
 * Pre-configured for hero/banner images
 */
export function HeroImage({
  src,
  alt,
  priority = true,
  className = '',
  aspectRatio = '16/9',
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  aspectRatio?: string;
}) {
  return (
    <div className={`relative w-full ${className}`} style={{ aspectRatio }}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="100vw"
        objectFit="cover"
      />
    </div>
  );
}
