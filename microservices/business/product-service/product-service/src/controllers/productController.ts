import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { logger } from '@ultramarket/shared/logging/logger';
import { ApiError } from '@ultramarket/shared/errors/ApiError';
import { validateProductCreate, validateProductUpdate, validateProductSearch } from '../validators/productValidator';
import { 
  generateSlug, 
  generateSKU, 
  calculateRating, 
  formatPrice, 
  calculateDiscount,
  checkStockAvailability,
  generateSEOMetadata,
  calculateShippingCost
} from '../utils/productUtils';

export class ProductController {
  /**
   * Create a new product
   */
  static async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = validateProductCreate(req.body);
      if (error) {
        throw new ApiError(400, 'Validation error', error.details);
      }

      // Generate slug and SKU
      const slug = generateSlug(value.name);
      const sku = value.sku || generateSKU(value.category, value.brand);

      // Check if product with same SKU exists
      const existingProduct = await Product.findOne({ sku });
      if (existingProduct) {
        throw new ApiError(409, 'Product with this SKU already exists');
      }

      // Generate SEO metadata
      const seoMetadata = generateSEOMetadata(value.name, value.description, value.tags);

      // Create product
      const product = new Product({
        ...value,
        sku,
        slug,
        status: 'draft',
        visibility: 'private',
        rating: {
          average: 0,
          count: 0
        },
        seo: {
          ...seoMetadata,
          slug
        },
        analytics: {
          views: 0,
          sales: 0,
          revenue: 0,
          conversionRate: 0
        }
      });

      await product.save();

      logger.info('Product created successfully', { 
        productId: product._id, 
        sku: product.sku,
        name: product.name 
      });

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Create product error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Get all products with advanced filtering and search
   */
  static async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = validateProductSearch(req.query);
      if (error) {
        throw new ApiError(400, 'Validation error', error.details);
      }

      const {
        page = 1,
        limit = 20,
        category,
        brand,
        minPrice,
        maxPrice,
        status = 'active',
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search,
        featured,
        bestSeller,
        newArrival,
        inStock,
        rating,
        tags,
        vendor
      } = value;

      // Build filter query
      const filter: any = { status };

      if (category) filter.category = category;
      if (brand) filter.brand = brand;
      if (vendor) filter['vendor.id'] = vendor;
      if (minPrice || maxPrice) {
        filter['price.current'] = {};
        if (minPrice) filter['price.current'].$gte = minPrice;
        if (maxPrice) filter['price.current'].$lte = maxPrice;
      }
      if (featured !== undefined) filter.featured = featured;
      if (bestSeller !== undefined) filter.bestSeller = bestSeller;
      if (newArrival !== undefined) filter.newArrival = newArrival;
      if (inStock !== undefined) {
        if (inStock) {
          filter['inventory.totalStock'] = { $gt: 0 };
        } else {
          filter['inventory.totalStock'] = { $lte: 0 };
        }
      }
      if (rating) {
        filter['rating.average'] = { $gte: rating };
      }
      if (tags && tags.length > 0) {
        filter.tags = { $in: tags };
      }

      // Advanced search functionality
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { shortDescription: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } },
          { 'vendor.name': { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort query
      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute query with aggregation for better performance
      const [products, total] = await Promise.all([
        Product.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select('-__v')
          .lean(),
        Product.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      logger.info('Products retrieved successfully', { 
        count: products.length, 
        total, 
        page, 
        limit,
        filters: Object.keys(filter).length
      });

      res.status(200).json({
        success: true,
        data: {
          products,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage,
            hasPrevPage
          },
          filters: {
            applied: Object.keys(filter).length,
            available: {
              categories: await Product.distinct('category'),
              brands: await Product.distinct('brand'),
              priceRange: {
                min: await Product.findOne({ status: 'active' }).sort({ 'price.current': 1 }).select('price.current'),
                max: await Product.findOne({ status: 'active' }).sort({ 'price.current': -1 }).select('price.current')
              }
            }
          }
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Get products error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Get product by ID with enhanced analytics
   */
  static async getProductById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const product = await Product.findById(id).select('-__v');
      
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      // Increment view count for analytics
      await Product.findByIdAndUpdate(id, { 
        $inc: { 'analytics.views': 1 } 
      });

      // Check stock availability
      const stockStatus = checkStockAvailability(product.inventory);

      // Calculate current price with any active discounts
      const currentPrice = product.price.current;
      const originalPrice = product.price.original || currentPrice;
      const discount = calculateDiscount(originalPrice, currentPrice);

      logger.info('Product retrieved successfully', { 
        productId: id,
        views: product.analytics?.views || 0
      });

      res.status(200).json({
        success: true,
        data: { 
          product: {
            ...product.toObject(),
            stockStatus,
            discount: discount > 0 ? {
              amount: discount,
              percentage: Math.round((discount / originalPrice) * 100)
            } : null
          }
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Get product error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Get product by slug with SEO optimization
   */
  static async getProductBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      const product = await Product.findOne({ 
        slug, 
        status: 'active' 
      }).select('-__v');
      
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      // Increment view count
      await Product.findByIdAndUpdate(product._id, { 
        $inc: { 'analytics.views': 1 } 
      });

      // Get related products
      const relatedProducts = await Product.find({
        category: product.category,
        _id: { $ne: product._id },
        status: 'active'
      })
      .limit(4)
      .select('name price images rating slug')
      .lean();

      logger.info('Product retrieved by slug', { 
        slug,
        productId: product._id,
        relatedCount: relatedProducts.length
      });

      res.status(200).json({
        success: true,
        data: { 
          product,
          relatedProducts,
          seo: {
            title: product.seo.metaTitle,
            description: product.seo.metaDescription,
            keywords: product.seo.keywords
          }
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Get product by slug error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Update product with validation and SEO updates
   */
  static async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { error, value } = validateProductUpdate(req.body);
      
      if (error) {
        throw new ApiError(400, 'Validation error', error.details);
      }

      const product = await Product.findById(id);
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      // Update slug if name changed
      if (value.name && value.name !== product.name) {
        value.slug = generateSlug(value.name);
      }

      // Update SEO metadata if content changed
      if (value.name || value.description || value.tags) {
        const seoMetadata = generateSEOMetadata(
          value.name || product.name,
          value.description || product.description,
          value.tags || product.tags
        );
        value.seo = { ...product.seo, ...seoMetadata };
      }

      // Update product
      const updatedProduct = await Product.findByIdAndUpdate(
        id,
        { ...value, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select('-__v');

      logger.info('Product updated successfully', { 
        productId: id,
        updatedFields: Object.keys(value)
      });

      res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: { product: updatedProduct }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Update product error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Delete product with soft delete option
   */
  static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { permanent = false } = req.query;

      const product = await Product.findById(id);
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      if (permanent === 'true') {
        // Permanent deletion
        await Product.findByIdAndDelete(id);
        logger.info('Product permanently deleted', { productId: id });
      } else {
        // Soft delete - change status to inactive
        await Product.findByIdAndUpdate(id, { 
          status: 'inactive',
          updatedAt: new Date()
        });
        logger.info('Product soft deleted', { productId: id });
      }

      res.status(200).json({
        success: true,
        message: permanent === 'true' ? 'Product permanently deleted' : 'Product deactivated'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Delete product error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Get featured products
   */
  static async getFeaturedProducts(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 8 } = req.query;

      const products = await Product.find({
        featured: true,
        status: 'active'
      })
      .sort({ 'analytics.views': -1, createdAt: -1 })
      .limit(parseInt(limit as string))
      .select('name price images rating slug brand')
      .lean();

      logger.info('Featured products retrieved', { count: products.length });

      res.status(200).json({
        success: true,
        data: { products }
      });
    } catch (error) {
      logger.error('Get featured products error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Get best seller products
   */
  static async getBestSellerProducts(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 8 } = req.query;

      const products = await Product.find({
        bestSeller: true,
        status: 'active'
      })
      .sort({ 'analytics.sales': -1, 'rating.average': -1 })
      .limit(parseInt(limit as string))
      .select('name price images rating slug brand')
      .lean();

      logger.info('Best seller products retrieved', { count: products.length });

      res.status(200).json({
        success: true,
        data: { products }
      });
    } catch (error) {
      logger.error('Get best seller products error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Get new arrival products
   */
  static async getNewArrivalProducts(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 8 } = req.query;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const products = await Product.find({
        newArrival: true,
        status: 'active',
        createdAt: { $gte: thirtyDaysAgo }
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .select('name price images rating slug brand')
      .lean();

      logger.info('New arrival products retrieved', { count: products.length });

      res.status(200).json({
        success: true,
        data: { products }
      });
    } catch (error) {
      logger.error('Get new arrival products error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Get products by category with subcategories
   */
  static async getProductsByCategory(req: Request, res: Response): Promise<void> {
    try {
      const { category, subcategory, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

      const filter: any = { status: 'active' };
      if (category) filter.category = category;
      if (subcategory) filter.subcategory = subcategory;

      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [products, total] = await Promise.all([
        Product.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit as string))
          .select('-__v')
          .lean(),
        Product.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / parseInt(limit as string));

      // Get subcategories for this category
      const subcategories = await Product.distinct('subcategory', { 
        category, 
        status: 'active',
        subcategory: { $exists: true, $ne: null }
      });

      logger.info('Products by category retrieved', { 
        category,
        subcategory,
        count: products.length,
        total
      });

      res.status(200).json({
        success: true,
        data: {
          products,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages
          },
          category: {
            name: category,
            subcategories
          }
        }
      });
    } catch (error) {
      logger.error('Get products by category error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Advanced search with filters and suggestions
   */
  static async searchProducts(req: Request, res: Response): Promise<void> {
    try {
      const { 
        q, 
        page = 1, 
        limit = 20, 
        category, 
        brand, 
        minPrice, 
        maxPrice,
        sortBy = 'relevance',
        sortOrder = 'desc'
      } = req.query;

      if (!q) {
        throw new ApiError(400, 'Search query is required');
      }

      // Build search query
      const searchQuery: any = {
        status: 'active',
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { shortDescription: { $regex: q, $options: 'i' } },
          { brand: { $regex: q, $options: 'i' } },
          { tags: { $in: [new RegExp(q as string, 'i')] } },
          { category: { $regex: q, $options: 'i' } },
          { subcategory: { $regex: q as string, $options: 'i' } }
        ]
      };

      // Add filters
      if (category) searchQuery.category = category;
      if (brand) searchQuery.brand = brand;
      if (minPrice || maxPrice) {
        searchQuery['price.current'] = {};
        if (minPrice) searchQuery['price.current'].$gte = parseFloat(minPrice as string);
        if (maxPrice) searchQuery['price.current'].$lte = parseFloat(maxPrice as string);
      }

      // Build sort query
      const sort: any = {};
      if (sortBy === 'relevance') {
        // Custom relevance scoring
        sort.score = -1;
      } else {
        sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;
      }

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      let products = await Product.find(searchQuery)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit as string))
        .select('-__v')
        .lean();

      // Calculate relevance score for relevance sorting
      if (sortBy === 'relevance') {
        products = products.map(product => ({
          ...product,
          score: calculateRelevanceScore(product, q as string)
        })).sort((a, b) => (b.score || 0) - (a.score || 0));
      }

      const total = await Product.countDocuments(searchQuery);
      const totalPages = Math.ceil(total / parseInt(limit as string));

      // Get search suggestions
      const suggestions = await getSearchSuggestions(q as string);

      logger.info('Product search completed', { 
        query: q,
        count: products.length,
        total,
        suggestions: suggestions.length
      });

      res.status(200).json({
        success: true,
        data: {
          products,
          pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages
          },
          search: {
            query: q,
            suggestions
          }
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Search products error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Get product analytics and insights
   */
  static async getProductAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { period = '30d' } = req.query;

      const product = await Product.findById(id);
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      // Calculate analytics based on period
      const analytics = await calculateProductAnalytics(id, period as string);

      logger.info('Product analytics retrieved', { 
        productId: id,
        period
      });

      res.status(200).json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Get product analytics error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }

  /**
   * Update product rating
   */
  static async updateProductRating(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rating, review } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        throw new ApiError(400, 'Valid rating (1-5) is required');
      }

      const product = await Product.findById(id);
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      // Update rating
      const newAverage = calculateRating(product.rating.average, product.rating.count, rating);
      const newCount = product.rating.count + 1;

      await Product.findByIdAndUpdate(id, {
        'rating.average': newAverage,
        'rating.count': newCount,
        updatedAt: new Date()
      });

      logger.info('Product rating updated', { 
        productId: id,
        newRating: newAverage,
        totalReviews: newCount
      });

      res.status(200).json({
        success: true,
        message: 'Rating updated successfully',
        data: {
          rating: {
            average: newAverage,
            count: newCount
          }
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      logger.error('Update product rating error', { error: error.message });
      throw new ApiError(500, 'Internal server error');
    }
  }
}

// Helper functions
function calculateRelevanceScore(product: any, query: string): number {
  let score = 0;
  const queryLower = query.toLowerCase();

  // Exact matches get higher scores
  if (product.name.toLowerCase().includes(queryLower)) score += 10;
  if (product.brand.toLowerCase().includes(queryLower)) score += 8;
  if (product.category.toLowerCase().includes(queryLower)) score += 6;
  if (product.tags.some((tag: string) => tag.toLowerCase().includes(queryLower))) score += 4;

  // Popularity factors
  score += (product.analytics?.views || 0) * 0.001;
  score += (product.rating.average || 0) * 2;
  score += (product.rating.count || 0) * 0.1;

  return score;
}

async function getSearchSuggestions(query: string): Promise<string[]> {
  const suggestions = await Product.aggregate([
    {
      $match: {
        status: 'active',
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { brand: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } }
        ]
      }
    },
    {
      $group: {
        _id: null,
        brands: { $addToSet: '$brand' },
        categories: { $addToSet: '$category' }
      }
    }
  ]);

  return suggestions.length > 0 ? [
    ...suggestions[0].brands.slice(0, 3),
    ...suggestions[0].categories.slice(0, 3)
  ] : [];
}

async function calculateProductAnalytics(productId: string, period: string): Promise<any> {
  // This would typically integrate with a separate analytics service
  // For now, return basic analytics from the product document
  const product = await Product.findById(productId).select('analytics rating');
  
  return {
    views: product?.analytics?.views || 0,
    sales: product?.analytics?.sales || 0,
    revenue: product?.analytics?.revenue || 0,
    conversionRate: product?.analytics?.conversionRate || 0,
    rating: product?.rating || { average: 0, count: 0 },
    period
  };
}
