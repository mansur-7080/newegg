/**
 * Product utility functions for UltraMarket Product Service
 */

import crypto from 'crypto';

/**
 * Generate a URL-friendly slug from product name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique SKU for a product
 */
export function generateSKU(category: string, brand: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const categoryCode = category.substring(0, 3).toUpperCase();
  const brandCode = brand.substring(0, 3).toUpperCase();
  
  return `${categoryCode}-${brandCode}-${timestamp}-${random}`.toUpperCase();
}

/**
 * Calculate new average rating
 */
export function calculateRating(currentAverage: number, currentCount: number, newRating: number): number {
  const totalRating = (currentAverage * currentCount) + newRating;
  const newCount = currentCount + 1;
  return Math.round((totalRating / newCount) * 10) / 10; // Round to 1 decimal place
}

/**
 * Format price with currency
 */
export function formatPrice(price: number, currency: string = 'USD'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatter.format(price);
}

/**
 * Calculate discount amount and percentage
 */
export function calculateDiscount(originalPrice: number, currentPrice: number): number {
  return Math.max(0, originalPrice - currentPrice);
}

/**
 * Check stock availability status
 */
export function checkStockAvailability(inventory: any): string {
  if (!inventory.trackInventory) {
    return 'unlimited';
  }
  
  if (inventory.totalStock <= 0) {
    return 'out_of_stock';
  }
  
  if (inventory.totalStock <= inventory.lowStockThreshold) {
    return 'low_stock';
  }
  
  return 'in_stock';
}

/**
 * Generate SEO metadata for a product
 */
export function generateSEOMetadata(name: string, description: string, tags: string[]): any {
  const metaTitle = `${name} - UltraMarket`;
  const metaDescription = description.length > 160 
    ? description.substring(0, 157) + '...'
    : description;
  
  const keywords = [
    name.toLowerCase(),
    ...tags.map(tag => tag.toLowerCase()),
    'ultramarket',
    'online shopping',
    'ecommerce'
  ].join(', ');

  return {
    metaTitle,
    metaDescription,
    keywords: keywords.split(',').map(k => k.trim()),
    canonicalUrl: `https://ultramarket.com/products/${generateSlug(name)}`
  };
}

/**
 * Calculate shipping cost based on weight and dimensions
 */
export function calculateShippingCost(
  weight: number, 
  dimensions: any, 
  shippingClass: string = 'standard',
  destination: string = 'domestic'
): number {
  let baseCost = 0;
  
  // Base cost by shipping class
  switch (shippingClass) {
    case 'express':
      baseCost = 15.99;
      break;
    case 'priority':
      baseCost = 9.99;
      break;
    case 'standard':
    default:
      baseCost = 5.99;
      break;
  }
  
  // Add weight-based cost
  const weightCost = Math.ceil(weight / 2) * 1.50; // $1.50 per 2 lbs
  
  // Add dimensional weight cost if applicable
  const dimensionalWeight = (dimensions.length * dimensions.width * dimensions.height) / 166;
  const dimensionalCost = Math.max(0, dimensionalWeight - weight) * 0.50;
  
  // Destination multiplier
  const destinationMultiplier = destination === 'international' ? 2.5 : 1;
  
  return Math.round((baseCost + weightCost + dimensionalCost) * destinationMultiplier * 100) / 100;
}

/**
 * Validate product data
 */
export function validateProductData(productData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!productData.name || productData.name.trim().length < 3) {
    errors.push('Product name must be at least 3 characters long');
  }
  
  if (!productData.description || productData.description.trim().length < 10) {
    errors.push('Product description must be at least 10 characters long');
  }
  
  if (!productData.price || productData.price.current <= 0) {
    errors.push('Product must have a valid price');
  }
  
  if (!productData.category) {
    errors.push('Product must have a category');
  }
  
  if (!productData.brand) {
    errors.push('Product must have a brand');
  }
  
  if (productData.inventory && productData.inventory.totalStock < 0) {
    errors.push('Product stock cannot be negative');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Generate product hash for caching
 */
export function generateProductHash(productId: string, lastModified: Date): string {
  const data = `${productId}-${lastModified.getTime()}`;
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Calculate product popularity score
 */
export function calculatePopularityScore(product: any): number {
  let score = 0;
  
  // Views weight: 30%
  score += (product.analytics?.views || 0) * 0.3;
  
  // Sales weight: 40%
  score += (product.analytics?.sales || 0) * 0.4;
  
  // Rating weight: 20%
  score += (product.rating?.average || 0) * 20;
  
  // Review count weight: 10%
  score += (product.rating?.count || 0) * 0.1;
  
  return Math.round(score);
}

/**
 * Check if product is eligible for free shipping
 */
export function isEligibleForFreeShipping(
  product: any, 
  cartTotal: number = 0, 
  freeShippingThreshold: number = 50
): boolean {
  // Product has free shipping flag
  if (product.shipping?.freeShipping) {
    return true;
  }
  
  // Cart total meets threshold
  if (cartTotal >= freeShippingThreshold) {
    return true;
  }
  
  return false;
}

/**
 * Generate product recommendations
 */
export function generateProductRecommendations(
  product: any, 
  allProducts: any[], 
  limit: number = 4
): any[] {
  const recommendations = [];
  
  // Find products in same category
  const sameCategory = allProducts.filter(p => 
    p.category === product.category && 
    p._id.toString() !== product._id.toString()
  );
  
  // Find products with similar tags
  const similarTags = allProducts.filter(p => 
    p._id.toString() !== product._id.toString() &&
    p.tags.some((tag: string) => product.tags.includes(tag))
  );
  
  // Find products in same price range (±20%)
  const priceRange = product.price.current * 0.2;
  const similarPrice = allProducts.filter(p => 
    p._id.toString() !== product._id.toString() &&
    Math.abs(p.price.current - product.price.current) <= priceRange
  );
  
  // Combine and sort by relevance
  const allCandidates = [...sameCategory, ...similarTags, ...similarPrice];
  const uniqueCandidates = allCandidates.filter((p, index, arr) => 
    arr.findIndex(c => c._id.toString() === p._id.toString()) === index
  );
  
  // Sort by popularity score
  uniqueCandidates.sort((a, b) => 
    calculatePopularityScore(b) - calculatePopularityScore(a)
  );
  
  return uniqueCandidates.slice(0, limit);
}

/**
 * Format product for API response
 */
export function formatProductForResponse(product: any, includeAnalytics: boolean = false): any {
  const formatted = {
    id: product._id,
    name: product.name,
    description: product.description,
    shortDescription: product.shortDescription,
    sku: product.sku,
    slug: product.slug,
    category: product.category,
    subcategory: product.subcategory,
    brand: product.brand,
    price: {
      current: product.price.current,
      original: product.price.original,
      currency: product.price.currency,
      formatted: formatPrice(product.price.current, product.price.currency)
    },
    images: product.images,
    specifications: product.specifications,
    features: product.features,
    tags: product.tags,
    variants: product.variants,
    inventory: {
      ...product.inventory,
      status: checkStockAvailability(product.inventory)
    },
    shipping: product.shipping,
    seo: product.seo,
    status: product.status,
    visibility: product.visibility,
    featured: product.featured,
    bestSeller: product.bestSeller,
    newArrival: product.newArrival,
    rating: product.rating,
    vendor: product.vendor,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
  
  if (includeAnalytics) {
    (formatted as any).analytics = product.analytics;
  }
  
  return formatted;
}