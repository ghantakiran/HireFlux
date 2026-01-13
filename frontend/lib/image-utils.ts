/**
 * Image Utilities for Optimization
 *
 * Utilities for image optimization including:
 * - Blur placeholder generation
 * - Responsive sizes calculation
 * - Image format detection
 */

/**
 * Generate a blur placeholder data URL
 * Creates a lightweight SVG blur placeholder for better UX
 *
 * @param width - Image width (optional)
 * @param height - Image height (optional)
 * @param color - Base color for the blur (default: light gray)
 * @returns Base64 encoded SVG data URL
 */
export function generateBlurPlaceholder(
  width: number = 4,
  height: number = 4,
  color: string = '#f3f4f6'
): string {
  // Create a simple SVG with the specified dimensions and color
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${color}"/>
    </svg>
  `.trim();

  // Convert to base64 (works in both Node.js and browser)
  if (typeof window === 'undefined') {
    // Server-side: use Buffer
    const base64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  } else {
    // Client-side: use btoa
    const base64 = btoa(svg);
    return `data:image/svg+xml;base64,${base64}`;
  }
}

/**
 * Generate responsive image sizes attribute
 * Creates proper sizes attribute for responsive images
 *
 * @param breakpoints - Array of breakpoints with sizes
 * @returns Sizes attribute string
 *
 * @example
 * generateResponsiveSizes([
 *   { breakpoint: 640, size: '100vw' },
 *   { breakpoint: 1024, size: '50vw' },
 *   { breakpoint: null, size: '33vw' }
 * ])
 * // Returns: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
 */
export function generateResponsiveSizes(
  breakpoints: Array<{ breakpoint: number | null; size: string }>
): string {
  return breakpoints
    .map(({ breakpoint, size }) => {
      if (breakpoint === null) {
        return size; // Default size (no media query)
      }
      return `(max-width: ${breakpoint}px) ${size}`;
    })
    .join(', ');
}

/**
 * Common responsive sizes presets
 */
export const RESPONSIVE_SIZES = {
  // Full width on mobile, half on tablet, third on desktop
  hero: generateResponsiveSizes([
    { breakpoint: 640, size: '100vw' },
    { breakpoint: 1024, size: '100vw' },
    { breakpoint: null, size: '100vw' },
  ]),

  // Full width on mobile, half on tablet, third on desktop
  card: generateResponsiveSizes([
    { breakpoint: 640, size: '100vw' },
    { breakpoint: 1024, size: '50vw' },
    { breakpoint: null, size: '33vw' },
  ]),

  // Full width on mobile, third on tablet, quarter on desktop
  thumbnail: generateResponsiveSizes([
    { breakpoint: 640, size: '100vw' },
    { breakpoint: 1024, size: '33vw' },
    { breakpoint: null, size: '25vw' },
  ]),

  // Fixed small size for avatars/icons
  avatar: '48px',

  // Fixed medium size for logos
  logo: '128px',
};

/**
 * Detect if image format is modern (WebP/AVIF)
 */
export function isModernImageFormat(src: string): boolean {
  return src.includes('.webp') || src.includes('.avif') || src.includes('fm=webp') || src.includes('fm=avif');
}

/**
 * Calculate optimal image dimensions for a container
 * Useful for dynamic sizing
 *
 * @param containerWidth - Container width in pixels
 * @param containerHeight - Container height in pixels
 * @param aspectRatio - Desired aspect ratio (width/height)
 * @returns Object with optimal width and height
 */
export function calculateOptimalDimensions(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number = 16 / 9
): { width: number; height: number } {
  const containerAspectRatio = containerWidth / containerHeight;

  if (containerAspectRatio > aspectRatio) {
    // Container is wider than desired aspect ratio
    return {
      width: Math.round(containerHeight * aspectRatio),
      height: containerHeight,
    };
  } else {
    // Container is taller than desired aspect ratio
    return {
      width: containerWidth,
      height: Math.round(containerWidth / aspectRatio),
    };
  }
}

/**
 * Get Next.js image loader URL with optimization params
 * Useful for custom image sources
 *
 * @param src - Image source URL
 * @param width - Desired width
 * @param quality - Image quality (1-100)
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(
  src: string,
  width: number,
  quality: number = 75
): string {
  // For external URLs, return as-is (Next.js will handle optimization)
  if (src.startsWith('http')) {
    return src;
  }

  // For internal URLs, add optimization params
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}
