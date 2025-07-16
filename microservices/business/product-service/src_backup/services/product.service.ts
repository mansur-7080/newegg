/**
 * UltraMarket Product Service
 * Professional product management service with comprehensive operations
 */

import { Product, IProduct } from '../models/Product';
import { logger } from '@ultramarket/shared/logging/logger';
import { NotFoundError, ValidationError } from '@ultramarket/shared/errors';

export interface CreateProductInput {
  name: string;
  description: string;
  shortDescription?: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  cost?: number;
  category: string;
  subcategory?: string;
  brand?: string;
  tags?: string[];
  images?: string[];
  inventory: {
    quantity: number;
    tracked?: boolean;
    allowBackorder?: boolean;
    lowStockThreshold?: number;
  };
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
  vendorId?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  shortDescription?: string;
  sku?: string;
  price?: number;
  compareAtPrice?: number;
  cost?: number;
  category?: string;
  subcategory?: string;
  brand?: string;
  tags?: string[];
  images?: string[];
  inventory?: {
    quantity?: number;
    tracked?: boolean;
    allowBackorder?: boolean;
    lowStockThreshold?: number;
  };
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface FindProductsOptions {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
  inStock?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Create a new product
 */
export async function createProduct(data: CreateProductInput): Promise<IProduct> {
  try {
    // Generate slug from name
    const slug = generateSlug(data.name);
    
    // Check if SKU already exists
    const existingSku = await Product.findOne({ sku: data.sku });
    if (existingSku) {
      throw new ValidationError('SKU already exists');
    }

    // Check if slug already exists
    let uniqueSlug = slug;
    let counter = 1;
    while (await Product.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    const product = new Product({
      ...data,
      slug: uniqueSlug,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedProduct = await product.save();
    
    logger.info('Product created successfully', {
      productId: savedProduct._id,
      sku: savedProduct.sku,
      name: savedProduct.name,
    });

    return savedProduct;
  } catch (error) {
    logger.error('Error creating product', { error: error.message, data });
    throw error;
  }
}

/**
 * Find product by ID
 */
export async function findProductById(id: string): Promise<IProduct | null> {
  try {
    const product = await Product.findById(id)
      .populate('category')
      .populate('subcategory')
      .lean();

    return product;
  } catch (error) {
    logger.error('Error finding product by ID', { error: error.message, id });
    throw error;
  }
}

/**
 * Find product by slug
 */
export async function findProductBySlug(slug: string): Promise<IProduct | null> {
  try {
    const product = await Product.findOne({ slug })
      .populate('category')
      .populate('subcategory')
      .lean();

    return product;
  } catch (error) {
    logger.error('Error finding product by slug', { error: error.message, slug });
    throw error;
  }
}

/**
 * Find products with filtering and pagination
 */
export async function findProducts(options: FindProductsOptions = {}): Promise<{
  products: IProduct[];
  total: number;
  page: number;
  totalPages: number;
}> {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      subcategory,
      brand,
      minPrice,
      maxPrice,
      tags,
      isActive,
      isFeatured,
      inStock,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    if (brand) query.brand = { $regex: brand, $options: 'i' };
    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = minPrice;
      if (maxPrice !== undefined) query.price.$lte = maxPrice;
    }
    if (tags && tags.length > 0) {
      query.tags = { $in: tags };
    }
    if (isActive !== undefined) query.isActive = isActive;
    if (isFeatured !== undefined) query.isFeatured = isFeatured;
    if (inStock !== undefined) {
      query['inventory.quantity'] = inStock ? { $gt: 0 } : { $lte: 0 };
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category')
        .populate('subcategory')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      products,
      total,
      page,
      totalPages,
    };
  } catch (error) {
    logger.error('Error finding products', { error: error.message, options });
    throw error;
  }
}

/**
 * Update product by ID
 */
export async function updateProduct(id: string, data: UpdateProductInput): Promise<IProduct | null> {
  try {
    // If name is being updated, regenerate slug
    if (data.name) {
      const slug = generateSlug(data.name);
      let uniqueSlug = slug;
      let counter = 1;
      
      // Check if slug already exists (excluding current product)
      while (await Product.findOne({ slug: uniqueSlug, _id: { $ne: id } })) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }
      
      (data as any).slug = uniqueSlug;
    }

    // If SKU is being updated, check for duplicates
    if (data.sku) {
      const existingSku = await Product.findOne({ sku: data.sku, _id: { $ne: id } });
      if (existingSku) {
        throw new ValidationError('SKU already exists');
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true, runValidators: true }
    )
      .populate('category')
      .populate('subcategory')
      .lean();

    if (!updatedProduct) {
      throw new NotFoundError('Product not found');
    }

    logger.info('Product updated successfully', {
      productId: id,
      updatedFields: Object.keys(data),
    });

    return updatedProduct;
  } catch (error) {
    logger.error('Error updating product', { error: error.message, id, data });
    throw error;
  }
}

/**
 * Delete product by ID
 */
export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const result = await Product.findByIdAndDelete(id);
    
    if (!result) {
      throw new NotFoundError('Product not found');
    }

    logger.info('Product deleted successfully', { productId: id });
    return true;
  } catch (error) {
    logger.error('Error deleting product', { error: error.message, id });
    throw error;
  }
}

/**
 * Search products with advanced text search
 */
export async function searchProducts(query: string, options: FindProductsOptions = {}): Promise<{
  products: IProduct[];
  total: number;
  page: number;
  totalPages: number;
}> {
  return findProducts({ ...options, search: query });
}

/**
 * Get all product categories
 */
export async function getProductCategories(): Promise<string[]> {
  try {
    const categories = await Product.distinct('category');
    return categories;
  } catch (error) {
    logger.error('Error getting product categories', { error: error.message });
    throw error;
  }
}

/**
 * Get all product brands
 */
export async function getProductBrands(): Promise<string[]> {
  try {
    const brands = await Product.distinct('brand');
    return brands.filter(brand => brand); // Remove null/undefined values
  } catch (error) {
    logger.error('Error getting product brands', { error: error.message });
    throw error;
  }
}

/**
 * Get product statistics
 */
export async function getProductStatistics(): Promise<{
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  featuredProducts: number;
  outOfStock: number;
  lowStock: number;
  averagePrice: number;
  totalCategories: number;
  totalBrands: number;
}> {
  try {
    const [
      totalProducts,
      activeProducts,
      inactiveProducts,
      featuredProducts,
      outOfStock,
      lowStock,
      averagePrice,
      totalCategories,
      totalBrands,
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: false }),
      Product.countDocuments({ isFeatured: true }),
      Product.countDocuments({ 'inventory.quantity': 0 }),
      Product.countDocuments({
        $expr: {
          $and: [
            { $gt: ['$inventory.quantity', 0] },
            { $lte: ['$inventory.quantity', '$inventory.lowStockThreshold'] },
          ],
        },
      }),
      Product.aggregate([
        { $group: { _id: null, avgPrice: { $avg: '$price' } } },
      ]).then(result => result[0]?.avgPrice || 0),
      Product.distinct('category').then(categories => categories.length),
      Product.distinct('brand').then(brands => brands.filter(brand => brand).length),
    ]);

    return {
      totalProducts,
      activeProducts,
      inactiveProducts,
      featuredProducts,
      outOfStock,
      lowStock,
      averagePrice: Math.round(averagePrice * 100) / 100,
      totalCategories,
      totalBrands,
    };
  } catch (error) {
    logger.error('Error getting product statistics', { error: error.message });
    throw error;
  }
}

/**
 * Generate slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, and hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
}

export default {
  createProduct,
  findProductById,
  findProductBySlug,
  findProducts,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductCategories,
  getProductBrands,
  getProductStatistics,
};