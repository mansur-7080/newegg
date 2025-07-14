/**
 * Image optimization and CDN utilities
 * Professional image handling for UltraMarket
 */

/**
 * Image size configurations for different use cases
 */
export const IMAGE_SIZES = {
  THUMBNAIL: { width: 150, height: 150 },
  SMALL: { width: 300, height: 300 },
  MEDIUM: { width: 600, height: 600 },
  LARGE: { width: 1200, height: 1200 },
  HERO: { width: 1920, height: 1080 },
} as const;

/**
 * Supported image formats
 */
export const SUPPORTED_FORMATS = ['jpg', 'jpeg', 'png', 'webp', 'avif'] as const;

/**
 * CDN configuration for Uzbekistan
 */
const CDN_CONFIG = {
  BASE_URL: process.env.CDN_BASE_URL || 'https://cdn.ultramarket.uz',
  OPTIMIZATION_PARAMS: {
    quality: 85,
    format: 'auto',
    progressive: true,
  },
};

/**
 * Optimize image URLs with CDN parameters
 */
export async function optimizeImageUrls(imageUrls: string[]): Promise<string[]> {
  if (!imageUrls || imageUrls.length === 0) {
    return [];
  }

  return imageUrls.map(url => optimizeSingleImageUrl(url));
}

/**
 * Optimize single image URL
 */
export function optimizeSingleImageUrl(imageUrl: string, options?: {
  width?: number;
  height?: number;
  quality?: number;
  format?: string;
}): string {
  if (!imageUrl) {
    return '';
  }

  // If it's already a CDN URL, return as-is
  if (imageUrl.startsWith(CDN_CONFIG.BASE_URL)) {
    return imageUrl;
  }

  // If it's a relative URL, make it absolute with CDN
  if (imageUrl.startsWith('/')) {
    imageUrl = `${CDN_CONFIG.BASE_URL}${imageUrl}`;
  }

  // Add optimization parameters
  const params = new URLSearchParams();
  
  if (options?.width) {
    params.append('w', options.width.toString());
  }
  
  if (options?.height) {
    params.append('h', options.height.toString());
  }
  
  params.append('q', (options?.quality || CDN_CONFIG.OPTIMIZATION_PARAMS.quality).toString());
  params.append('f', options?.format || CDN_CONFIG.OPTIMIZATION_PARAMS.format);
  
  if (CDN_CONFIG.OPTIMIZATION_PARAMS.progressive) {
    params.append('prog', 'true');
  }

  const separator = imageUrl.includes('?') ? '&' : '?';
  return `${imageUrl}${separator}${params.toString()}`;
}

/**
 * Generate responsive image URLs for different screen sizes
 */
export function generateResponsiveImageUrls(baseImageUrl: string): {
  thumbnail: string;
  small: string;
  medium: string;
  large: string;
} {
  return {
    thumbnail: optimizeSingleImageUrl(baseImageUrl, IMAGE_SIZES.THUMBNAIL),
    small: optimizeSingleImageUrl(baseImageUrl, IMAGE_SIZES.SMALL),
    medium: optimizeSingleImageUrl(baseImageUrl, IMAGE_SIZES.MEDIUM),
    large: optimizeSingleImageUrl(baseImageUrl, IMAGE_SIZES.LARGE),
  };
}

/**
 * Generate image srcset for responsive images
 */
export function generateImageSrcSet(baseImageUrl: string): string {
  const sizes = [
    { ...IMAGE_SIZES.SMALL, descriptor: '300w' },
    { ...IMAGE_SIZES.MEDIUM, descriptor: '600w' },
    { ...IMAGE_SIZES.LARGE, descriptor: '1200w' },
  ];

  return sizes
    .map(size => {
      const optimizedUrl = optimizeSingleImageUrl(baseImageUrl, {
        width: size.width,
        height: size.height,
      });
      return `${optimizedUrl} ${size.descriptor}`;
    })
    .join(', ');
}

/**
 * Validate image URL format
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const extension = urlObj.pathname.split('.').pop()?.toLowerCase();
    return SUPPORTED_FORMATS.includes(extension as any);
  } catch {
    return false;
  }
}

/**
 * Extract image metadata from URL
 */
export function extractImageMetadata(url: string): {
  filename: string;
  extension: string;
  size?: string;
} {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || '';
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    return {
      filename,
      extension,
      size: urlObj.searchParams.get('w') 
        ? `${urlObj.searchParams.get('w')}x${urlObj.searchParams.get('h')}`
        : undefined,
    };
  } catch {
    return {
      filename: '',
      extension: '',
    };
  }
}

/**
 * Generate placeholder image URL
 */
export function generatePlaceholderImageUrl(width: number = 400, height: number = 400): string {
  return `${CDN_CONFIG.BASE_URL}/placeholder/${width}x${height}?text=UltraMarket&bg=f0f0f0&color=666`;
}

/**
 * Compress image quality based on file size estimation
 */
export function getOptimalQuality(estimatedSize: number): number {
  if (estimatedSize > 500000) { // > 500KB
    return 70;
  } else if (estimatedSize > 200000) { // > 200KB
    return 80;
  } else {
    return 90;
  }
}