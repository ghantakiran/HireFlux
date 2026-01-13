/**
 * Optimized Image Component
 *
 * Wrapper around next/image with best practices:
 * - Automatic WebP/AVIF format selection
 * - Lazy loading for below-the-fold images
 * - Blur placeholder support
 * - Responsive sizing
 * - Accessibility built-in
 * - Issue #145: Image Optimization & Lazy Loading
 */

'use client';

import Image from 'next/image';
import { useState } from 'react';
import { generateBlurPlaceholder, RESPONSIVE_SIZES } from '@/lib/image-utils';

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
  loading, // Let Next.js decide by default
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [imgError, setImgError] = useState(false);

  // Enhanced blur placeholder (better visual experience)
  const defaultBlurDataURL = blurDataURL || generateBlurPlaceholder();

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
    loading: priority ? ('eager' as const) : (loading || 'lazy'),
    priority,
    onError: handleError,
    onLoad: handleLoad,
    placeholder: placeholder === 'blur' ? ('blur' as const) : ('empty' as const),
    blurDataURL: placeholder === 'blur' ? defaultBlurDataURL : undefined,
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
      sizes={RESPONSIVE_SIZES.logo}
      placeholder="blur"
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
      sizes={RESPONSIVE_SIZES.avatar}
      placeholder="blur"
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
        sizes={RESPONSIVE_SIZES.hero}
        objectFit="cover"
        placeholder="blur"
      />
    </div>
  );
}
