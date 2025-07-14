/**
 * SEO-friendly slug generation utilities
 * Supports Uzbek, Russian and English text
 */

/**
 * Generate SEO-friendly slug from text
 * Supports Uzbek, Russian, and English characters
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    // Replace Uzbek specific characters
    .replace(/ʻ/g, 'o')
    .replace(/ʼ/g, 'o')
    .replace(/ğ/g, 'g')
    .replace(/ş/g, 'sh')
    .replace(/ç/g, 'ch')
    .replace(/ñ/g, 'ng')
    // Replace Russian characters with Latin equivalents
    .replace(/а/g, 'a')
    .replace(/б/g, 'b')
    .replace(/в/g, 'v')
    .replace(/г/g, 'g')
    .replace(/д/g, 'd')
    .replace(/е/g, 'e')
    .replace(/ё/g, 'yo')
    .replace(/ж/g, 'zh')
    .replace(/з/g, 'z')
    .replace(/и/g, 'i')
    .replace(/й/g, 'y')
    .replace(/к/g, 'k')
    .replace(/л/g, 'l')
    .replace(/м/g, 'm')
    .replace(/н/g, 'n')
    .replace(/о/g, 'o')
    .replace(/п/g, 'p')
    .replace(/р/g, 'r')
    .replace(/с/g, 's')
    .replace(/т/g, 't')
    .replace(/у/g, 'u')
    .replace(/ф/g, 'f')
    .replace(/х/g, 'kh')
    .replace(/ц/g, 'ts')
    .replace(/ч/g, 'ch')
    .replace(/ш/g, 'sh')
    .replace(/щ/g, 'shch')
    .replace(/ъ/g, '')
    .replace(/ы/g, 'y')
    .replace(/ь/g, '')
    .replace(/э/g, 'e')
    .replace(/ю/g, 'yu')
    .replace(/я/g, 'ya')
    // Remove special characters and replace with hyphens
    .replace(/[^a-z0-9\s-]/g, '')
    // Replace spaces and multiple hyphens with single hyphen
    .replace(/[\s-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length
    .substring(0, 100);
}

/**
 * Generate product SKU
 */
export function generateSKU(category: string, brand: string, suffix?: string): string {
  const categoryCode = category.substring(0, 3).toUpperCase();
  const brandCode = brand.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  const randomSuffix = suffix || Math.random().toString(36).substring(2, 5).toUpperCase();
  
  return `${categoryCode}-${brandCode}-${timestamp}-${randomSuffix}`;
}

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugRegex.test(slug) && slug.length <= 100;
}