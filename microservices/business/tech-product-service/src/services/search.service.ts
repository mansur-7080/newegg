import { PrismaClient, Product, Prisma } from '@prisma/client';
import { getPrismaClient } from '../config/database';
import { logger } from '../utils/logger';

export interface SearchOptions {
  query: string;
  filters: {
    categoryId?: string;
    brandId?: string;
    minPrice?: number;
    maxPrice?: number;
    specifications?: Record<string, any>;
  };
  pagination: {
    page: number;
    limit: number;
  };
  sortBy: string;
}

export interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  suggestions: string[];
  facets: SearchFacets;
}

export interface SearchFacets {
  categories: Array<{ id: string; name: string; count: number }>;
  brands: Array<{ id: string; name: string; count: number }>;
  priceRanges: Array<{ min: number; max: number; count: number }>;
  specifications: Record<string, Array<{ value: string; count: number }>>;
}

export class SearchService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  async searchProducts(options: SearchOptions): Promise<SearchResult> {
    try {
      const { query, filters, pagination, sortBy } = options;
      const { page, limit } = pagination;
      const offset = (page - 1) * limit;

      // Build search conditions
      const searchConditions: Prisma.ProductWhereInput = {
        status: 'ACTIVE',
        AND: [
          // Text search
          query ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { shortDescription: { contains: query, mode: 'insensitive' } },
              { sku: { contains: query, mode: 'insensitive' } },
              { brand: { name: { contains: query, mode: 'insensitive' } } },
              { category: { name: { contains: query, mode: 'insensitive' } } },
              {
                specifications: {
                  some: {
                    OR: [
                      { name: { contains: query, mode: 'insensitive' } },
                      { value: { contains: query, mode: 'insensitive' } },
                    ]
                  }
                }
              }
            ]
          } : {},
          // Category filter
          filters.categoryId ? { categoryId: filters.categoryId } : {},
          // Brand filter
          filters.brandId ? { brandId: filters.brandId } : {},
          // Price filters
          filters.minPrice ? { price: { gte: filters.minPrice } } : {},
          filters.maxPrice ? { price: { lte: filters.maxPrice } } : {},
          // Specification filters
          ...(filters.specifications ? this.buildSpecificationFilters(filters.specifications) : [])
        ]
      };

      // Build sort order
      const orderBy = this.buildSortOrder(sortBy, query);

      // Execute search
      const [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where: searchConditions,
          include: {
            category: true,
            brand: true,
            images: true,
            specifications: true,
            reviews: {
              select: {
                rating: true,
              }
            }
          },
          orderBy,
          skip: offset,
          take: limit,
        }),
        this.prisma.product.count({
          where: searchConditions,
        })
      ]);

      // Calculate average ratings
      const productsWithRatings = products.map(product => ({
        ...product,
        averageRating: product.reviews.length > 0 
          ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
          : 0,
        reviewCount: product.reviews.length,
      }));

      // Get search suggestions and facets
      const [suggestions, facets] = await Promise.all([
        this.getSearchSuggestions(query),
        this.getSearchFacets(searchConditions, filters)
      ]);

      return {
        products: productsWithRatings as any,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        suggestions,
        facets,
      };
    } catch (error) {
      logger.error('Search failed', error);
      throw new Error('Search operation failed');
    }
  }

  private buildSpecificationFilters(specifications: Record<string, any>): Prisma.ProductWhereInput[] {
    return Object.entries(specifications).map(([key, value]) => ({
      specifications: {
        some: {
          name: key,
          value: Array.isArray(value) ? { in: value } : { equals: value }
        }
      }
    }));
  }

  private buildSortOrder(sortBy: string, query?: string): Prisma.ProductOrderByWithRelationInput[] {
    switch (sortBy) {
      case 'price_asc':
        return [{ price: 'asc' }];
      case 'price_desc':
        return [{ price: 'desc' }];
      case 'name':
        return [{ name: 'asc' }];
      case 'newest':
        return [{ createdAt: 'desc' }];
      case 'rating':
        return [{ reviews: { _count: 'desc' } }];
      case 'relevance':
      default:
        // For relevance, prioritize exact matches and recent products
        return query ? [
          { name: 'asc' }, // Exact name matches first
          { createdAt: 'desc' }
        ] : [{ createdAt: 'desc' }];
    }
  }

  private async getSearchSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 2) return [];

    try {
      // Get suggestions from product names and categories
      const [productSuggestions, categorySuggestions, brandSuggestions] = await Promise.all([
        this.prisma.product.findMany({
          where: {
            name: { contains: query, mode: 'insensitive' },
            status: 'ACTIVE'
          },
          select: { name: true },
          take: 5,
        }),
        this.prisma.category.findMany({
          where: {
            name: { contains: query, mode: 'insensitive' },
            status: 'ACTIVE'
          },
          select: { name: true },
          take: 3,
        }),
        this.prisma.brand.findMany({
          where: {
            name: { contains: query, mode: 'insensitive' },
            status: 'ACTIVE'
          },
          select: { name: true },
          take: 3,
        })
      ]);

      const suggestions = [
        ...productSuggestions.map(p => p.name),
        ...categorySuggestions.map(c => c.name),
        ...brandSuggestions.map(b => b.name),
      ];

      return [...new Set(suggestions)].slice(0, 8);
    } catch (error) {
      logger.error('Failed to get search suggestions', error);
      return [];
    }
  }

  private async getSearchFacets(
    baseConditions: Prisma.ProductWhereInput,
    currentFilters: SearchOptions['filters']
  ): Promise<SearchFacets> {
    try {
      // Get facets without current filters to show all available options
      const baseConditionsWithoutFilters = {
        ...baseConditions,
        AND: baseConditions.AND?.filter(condition => 
          !('categoryId' in condition) && 
          !('brandId' in condition) && 
          !('price' in condition)
        )
      };

      const [categories, brands, priceStats, specifications] = await Promise.all([
        // Categories facet
        this.prisma.product.groupBy({
          by: ['categoryId'],
          where: { ...baseConditionsWithoutFilters, categoryId: { not: null } },
          _count: true,
          orderBy: { _count: { categoryId: 'desc' } },
          take: 10,
        }).then(async (groups) => {
          const categoryIds = groups.map(g => g.categoryId).filter(Boolean);
          const categories = await this.prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true }
          });
          return groups.map(group => {
            const category = categories.find(c => c.id === group.categoryId);
            return {
              id: group.categoryId!,
              name: category?.name || 'Unknown',
              count: group._count
            };
          });
        }),

        // Brands facet
        this.prisma.product.groupBy({
          by: ['brandId'],
          where: { ...baseConditionsWithoutFilters, brandId: { not: null } },
          _count: true,
          orderBy: { _count: { brandId: 'desc' } },
          take: 10,
        }).then(async (groups) => {
          const brandIds = groups.map(g => g.brandId).filter(Boolean);
          const brands = await this.prisma.brand.findMany({
            where: { id: { in: brandIds } },
            select: { id: true, name: true }
          });
          return groups.map(group => {
            const brand = brands.find(b => b.id === group.brandId);
            return {
              id: group.brandId!,
              name: brand?.name || 'Unknown',
              count: group._count
            };
          });
        }),

        // Price statistics
        this.prisma.product.aggregate({
          where: baseConditionsWithoutFilters,
          _min: { price: true },
          _max: { price: true },
          _avg: { price: true }
        }),

        // Specifications facet
        this.getSpecificationsFacets(baseConditionsWithoutFilters)
      ]);

      // Build price ranges
      const priceRanges = this.buildPriceRanges(priceStats._min.price || 0, priceStats._max.price || 0);

      return {
        categories,
        brands,
        priceRanges,
        specifications
      };
    } catch (error) {
      logger.error('Failed to get search facets', error);
      return {
        categories: [],
        brands: [],
        priceRanges: [],
        specifications: {}
      };
    }
  }

  private async getSpecificationsFacets(
    baseConditions: Prisma.ProductWhereInput
  ): Promise<Record<string, Array<{ value: string; count: number }>>> {
    try {
      // Get common specification names for this search
      const commonSpecs = await this.prisma.productSpecification.groupBy({
        by: ['name'],
        where: {
          product: baseConditions
        },
        _count: true,
        orderBy: { _count: { name: 'desc' } },
        take: 10
      });

      const specFacets: Record<string, Array<{ value: string; count: number }>> = {};

      // For each common spec, get value distribution
      for (const spec of commonSpecs) {
        const values = await this.prisma.productSpecification.groupBy({
          by: ['value'],
          where: {
            name: spec.name,
            product: baseConditions
          },
          _count: true,
          orderBy: { _count: { value: 'desc' } },
          take: 10
        });

        specFacets[spec.name] = values.map(v => ({
          value: v.value,
          count: v._count
        }));
      }

      return specFacets;
    } catch (error) {
      logger.error('Failed to get specifications facets', error);
      return {};
    }
  }

  private buildPriceRanges(minPrice: number, maxPrice: number): Array<{ min: number; max: number; count: number }> {
    if (minPrice === maxPrice) return [];

    const range = maxPrice - minPrice;
    const step = Math.ceil(range / 5); // Create 5 price ranges

    const ranges = [];
    for (let i = 0; i < 5; i++) {
      const min = minPrice + (i * step);
      const max = i === 4 ? maxPrice : minPrice + ((i + 1) * step) - 1;
      ranges.push({ min, max, count: 0 }); // Count will be calculated separately if needed
    }

    return ranges;
  }

  async getPopularSearchTerms(limit: number = 10): Promise<string[]> {
    try {
      // This would typically come from search analytics
      // For now, return popular product categories and brands
      const [categories, brands] = await Promise.all([
        this.prisma.category.findMany({
          where: { status: 'ACTIVE' },
          select: { name: true },
          take: 5,
        }),
        this.prisma.brand.findMany({
          where: { status: 'ACTIVE' },
          select: { name: true },
          take: 5,
        })
      ]);

      return [
        ...categories.map(c => c.name),
        ...brands.map(b => b.name),
        'gaming laptop',
        'graphics card',
        'processor',
        'motherboard',
        'RAM',
        'SSD'
      ].slice(0, limit);
    } catch (error) {
      logger.error('Failed to get popular search terms', error);
      return [];
    }
  }

  async indexProduct(productId: string): Promise<void> {
    try {
      // This would typically update an Elasticsearch index
      // For now, we'll just log the indexing operation
      logger.info(`Indexing product: ${productId}`);
      
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          brand: true,
          specifications: true,
        }
      });

      if (product) {
        // In a real implementation, this would update the search index
        logger.info(`Product indexed successfully: ${product.name}`);
      }
    } catch (error) {
      logger.error('Failed to index product', error);
      throw new Error('Product indexing failed');
    }
  }

  async removeFromIndex(productId: string): Promise<void> {
    try {
      logger.info(`Removing product from index: ${productId}`);
      // In a real implementation, this would remove from search index
    } catch (error) {
      logger.error('Failed to remove product from index', error);
      throw new Error('Product removal from index failed');
    }
  }
}