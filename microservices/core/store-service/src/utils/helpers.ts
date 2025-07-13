import crypto from 'crypto';

/**
 * Generate a unique slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a unique store ID
 */
export function generateStoreId(): string {
  return `store_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'UZS'): string {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100; // Round to 2 decimal places
}

/**
 * Generate pagination metadata
 */
export function generatePaginationMeta(
  page: number,
  limit: number,
  total: number
): {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Uzbekistan format)
 */
export function isValidUzbekPhoneNumber(phone: string): boolean {
  const uzbekPhoneRegex = /^(\+998|998)?[0-9]{9}$/;
  return uzbekPhoneRegex.test(phone.replace(/\s|-/g, ''));
}

/**
 * Generate random string
 */
export function generateRandomString(length: number = 8): string {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
}

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Remove undefined/null values from object
 */
export function removeEmptyValues(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Convert string to title case
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate file upload path
 */
export function generateUploadPath(storeId: string, type: 'logo' | 'banner' | 'product'): string {
  const timestamp = Date.now();
  const random = generateRandomString(6);
  return `stores/${storeId}/${type}/${timestamp}_${random}`;
}

/**
 * Calculate distance between two coordinates
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate QR code data for store
 */
export function generateStoreQRData(storeId: string, slug: string): string {
  const baseUrl = process.env.FRONTEND_URL || 'https://ultramarket.uz';
  return `${baseUrl}/stores/${slug}`;
}

/**
 * Validate business license format (Uzbekistan)
 */
export function isValidBusinessLicense(license: string): boolean {
  // Uzbekistan business license format: XXXX-XXXX-XXXX
  const licenseRegex = /^\d{4}-\d{4}-\d{4}$/;
  return licenseRegex.test(license);
}

/**
 * Generate order number
 */
export function generateOrderNumber(storeId: string): string {
  const timestamp = Date.now().toString().slice(-8);
  const storePrefix = storeId.slice(0, 4).toUpperCase();
  const random = generateRandomString(4).toUpperCase();
  
  return `${storePrefix}-${timestamp}-${random}`;
}

/**
 * Calculate commission amount
 */
export function calculateCommission(amount: number, commissionRate: number): number {
  return Math.round((amount * commissionRate / 100) * 100) / 100;
}

/**
 * Get time ago string
 */
export function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
}