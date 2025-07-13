import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { SearchService } from '../services/search.service';
import { SpecificationService } from '../services/specification.service';
import { CompatibilityService } from '../services/compatibility.service';
import { ReviewService } from '../services/review.service';
import { BenchmarkService } from '../services/benchmark.service';
import { PriceService } from '../services/price.service';
import { logger } from '../utils/logger';
import { validationResult } from 'express-validator';

const productService = new ProductService();
const searchService = new SearchService();
const specificationService = new SpecificationService();
const compatibilityService = new CompatibilityService();
const reviewService = new ReviewService();
const benchmarkService = new BenchmarkService();
const priceService = new PriceService();

export class TechProductController {
  static async getProducts(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 20,
        categoryId,
        brandId,
        minPrice,
        maxPrice,
        inStock,
        featured,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const filters = {
        categoryId: categoryId as string,
        brandId: brandId as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        inStock: inStock === 'true',
        featured: featured === 'true',
      };

      const options = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        include: {
          category: true,
          brand: true,
          images: true,
          specifications: true,
        },
      };

      const result = await productService.getProducts(filters, options);

      res.json({
        success: true,
        data: result.products,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      logger.error('Failed to get products', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get products',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async searchProducts(req: Request, res: Response) {
    try {
      const {
        q: query,
        category,
        brand,
        minPrice,
        maxPrice,
        page = 1,
        limit = 20,
        sortBy = 'relevance',
      } = req.query;

      if (!query || typeof query !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
      }

      const searchOptions = {
        query: query.trim(),
        filters: {
          categoryId: category as string,
          brandId: brand as string,
          minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
          maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        },
        pagination: {
          page: parseInt(page as string),
          limit: Math.min(parseInt(limit as string), 100),
        },
        sortBy: sortBy as string,
      };

      const searchResults = await searchService.searchProducts(searchOptions);

      res.json({
        success: true,
        data: searchResults.products,
        searchQuery: query,
        filters: searchOptions.filters,
        pagination: {
          page: searchResults.page,
          limit: searchResults.limit,
          total: searchResults.total,
          totalPages: searchResults.totalPages,
        },
        suggestions: searchResults.suggestions,
        facets: searchResults.facets,
      });
    } catch (error) {
      logger.error('Search failed', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async filterProducts(req: Request, res: Response) {
    try {
      const {
        category,
        brand,
        minPrice,
        maxPrice,
        specifications,
        inStock,
        condition,
        page = 1,
        limit = 20,
        sortBy = 'price',
        sortOrder = 'asc',
      } = req.query;

      // Parse specifications filter
      let specFilters = {};
      if (specifications && typeof specifications === 'string') {
        try {
          specFilters = JSON.parse(specifications);
        } catch (e) {
          logger.warn('Invalid specifications filter format', e);
        }
      }

      const filters = {
        categoryId: category as string,
        brandId: brand as string,
        minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        inStock: inStock === 'true',
        condition: condition as string,
        specifications: specFilters,
      };

      const options = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        include: {
          category: true,
          brand: true,
          images: true,
          specifications: true,
        },
      };

      const result = await productService.getFilteredProducts(filters, options);

      res.json({
        success: true,
        data: result.products,
        filters: filters,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
        availableFilters: result.availableFilters,
      });
    } catch (error) {
      logger.error('Filter failed', error);
      res.status(500).json({
        success: false,
        error: 'Filter failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const product = await productService.getProductById(id, {
        category: true,
        brand: true,
        images: true,
        specifications: true,
        reviews: true,
        variants: true,
        inventory: true,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      }

      // Get additional data
      const [compatibility, priceHistory, relatedProducts] = await Promise.all([
        compatibilityService.getProductCompatibility(id),
        priceService.getPriceHistory(id, 30), // Last 30 days
        productService.getRelatedProducts(id, 6),
      ]);

      res.json({
        success: true,
        data: {
          ...product,
          compatibility,
          priceHistory,
          relatedProducts,
        },
      });
    } catch (error) {
      logger.error('Failed to fetch product', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch product',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getProductBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;

      const product = await productService.getProductBySlug(slug, {
        category: true,
        brand: true,
        images: true,
        specifications: true,
        reviews: true,
        variants: true,
        inventory: true,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      logger.error('Failed to fetch product by slug', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch product',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async createProduct(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const product = await productService.createProduct(req.body);

      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully',
      });
    } catch (error) {
      logger.error('Failed to create product', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create product',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = { ...req.body, id };

      const product = await productService.updateProduct(updateData);

      res.json({
        success: true,
        data: product,
        message: 'Product updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update product', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update product',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await productService.deleteProduct(id);

      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete product', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete product',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getFeaturedProducts(req: Request, res: Response) {
    try {
      const { limit = 10, categoryId } = req.query;

      const products = await productService.getFeaturedProducts(
        parseInt(limit as string),
        categoryId as string
      );

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      logger.error('Failed to get featured products', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get featured products',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getTopRatedProducts(req: Request, res: Response) {
    try {
      const { limit = 10, categoryId } = req.query;

      const products = await productService.getTopRatedProducts(
        parseInt(limit as string),
        categoryId as string
      );

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      logger.error('Failed to get top rated products', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get top rated products',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Professional specification methods
  static async getDetailedSpecs(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const specifications = await specificationService.getDetailedSpecifications(id);

      if (!specifications) {
        return res.status(404).json({
          success: false,
          error: 'Product specifications not found',
        });
      }

      res.json({
        success: true,
        data: specifications,
      });
    } catch (error) {
      logger.error('Failed to get detailed specs', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get detailed specs',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getCompatibility(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { checkWith } = req.query;

      let compatibility;
      if (checkWith) {
        // Check compatibility with specific products
        const productIds = Array.isArray(checkWith) ? checkWith : [checkWith];
        compatibility = await compatibilityService.checkCompatibility(id, productIds as string[]);
      } else {
        // Get all compatibility information
        compatibility = await compatibilityService.getProductCompatibility(id);
      }

      res.json({
        success: true,
        data: compatibility,
      });
    } catch (error) {
      logger.error('Failed to get compatibility', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get compatibility',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getReviews(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 10, rating, sortBy = 'newest' } = req.query;

      const filters = {
        productId: id,
        rating: rating ? parseInt(rating as string) : undefined,
      };

      const options = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 50),
        sortBy: sortBy as string,
      };

      const reviews = await reviewService.getProductReviews(filters, options);

      res.json({
        success: true,
        data: reviews,
      });
    } catch (error) {
      logger.error('Failed to get reviews', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get reviews',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getBenchmarkData(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { benchmarkType, comparison } = req.query;

      let benchmarkData;
      if (comparison) {
        // Compare with other products
        const compareIds = Array.isArray(comparison) ? comparison : [comparison];
        benchmarkData = await benchmarkService.compareBenchmarks(id, compareIds as string[]);
      } else {
        // Get all benchmark data for product
        benchmarkData = await benchmarkService.getProductBenchmarks(
          id,
          benchmarkType as string
        );
      }

      res.json({
        success: true,
        data: benchmarkData,
      });
    } catch (error) {
      logger.error('Failed to get benchmark data', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get benchmark data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async compareProducts(req: Request, res: Response) {
    try {
      const { ids } = req.query;

      if (!ids) {
        return res.status(400).json({
          success: false,
          error: 'Product IDs are required for comparison',
        });
      }

      const productIds = Array.isArray(ids) ? ids : (ids as string).split(',');

      if (productIds.length < 2 || productIds.length > 5) {
        return res.status(400).json({
          success: false,
          error: 'You can compare between 2 and 5 products',
        });
      }

      const comparison = await productService.compareProducts(productIds as string[]);

      res.json({
        success: true,
        data: comparison,
      });
    } catch (error) {
      logger.error('Failed to compare products', error);
      res.status(500).json({
        success: false,
        error: 'Failed to compare products',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getPriceHistory(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { days = 30, interval = 'daily' } = req.query;

      const priceHistory = await priceService.getPriceHistory(
        id,
        parseInt(days as string),
        interval as string
      );

      res.json({
        success: true,
        data: priceHistory,
      });
    } catch (error) {
      logger.error('Failed to get price history', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get price history',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async createPriceAlert(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { targetPrice, email, userId } = req.body;

      if (!targetPrice || (!email && !userId)) {
        return res.status(400).json({
          success: false,
          error: 'Target price and email or user ID are required',
        });
      }

      const priceAlert = await priceService.createPriceAlert({
        productId: id,
        targetPrice: parseFloat(targetPrice),
        email,
        userId,
      });

      res.status(201).json({
        success: true,
        data: priceAlert,
        message: 'Price alert created successfully',
      });
    } catch (error) {
      logger.error('Failed to create price alert', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create price alert',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getUserPriceAlerts(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { active = true } = req.query;

      const priceAlerts = await priceService.getUserPriceAlerts(
        userId,
        active === 'true'
      );

      res.json({
        success: true,
        data: priceAlerts,
      });
    } catch (error) {
      logger.error('Failed to get user price alerts', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user price alerts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getRelatedProducts(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { limit = 6, type = 'similar' } = req.query;

      const relatedProducts = await productService.getRelatedProducts(
        id,
        parseInt(limit as string),
        type as string
      );

      res.json({
        success: true,
        data: relatedProducts,
      });
    } catch (error) {
      logger.error('Failed to get related products', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get related products',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  static async getProductAnalytics(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { period = '30d' } = req.query;

      const analytics = await productService.getProductAnalytics(id, period as string);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Failed to get product analytics', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get product analytics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
