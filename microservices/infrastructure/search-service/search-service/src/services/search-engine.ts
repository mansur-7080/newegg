// Mock logger for demonstration
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta),
};

// Enhanced logger for search events
const searchLogger = {
  info: (message: string, meta?: any) => console.log(`[SEARCH-INFO] ${message}`, meta),
  error: (message: string, meta?: any) => console.error(`[SEARCH-ERROR] ${message}`, meta),
  warn: (message: string, meta?: any) => console.warn(`[SEARCH-WARN] ${message}`, meta),
  security: (message: string, meta?: any) => console.log(`[SECURITY] ${message}`, meta),
};

export interface SearchDocument {
  id: string;
  type: 'product' | 'category' | 'brand' | 'article';
  title: string;
  description: string;
  content: string;
  tags: string[];
  metadata: Record<string, any>;
  popularity: number;
  relevanceScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchQuery {
  query: string;
  filters?: Record<string, any>;
  sortBy?: 'relevance' | 'popularity' | 'price' | 'date';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  userId?: string;
  sessionId?: string;
}

export interface SearchResult {
  documents: SearchDocument[];
  total: number;
  page: number;
  limit: number;
  query: string;
  suggestions: string[];
  facets: SearchFacets;
  processingTime: number;
}

export interface SearchFacets {
  categories: Array<{ name: string; count: number }>;
  brands: Array<{ name: string; count: number }>;
  priceRanges: Array<{ range: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
}

export interface SearchAnalytics {
  totalSearches: number;
  uniqueUsers: number;
  averageQueryLength: number;
  topQueries: Array<{ query: string; count: number }>;
  zeroResultQueries: Array<{ query: string; count: number }>;
  conversionRate: number;
  averageSearchTime: number;
}

export interface SearchSuggestion {
  query: string;
  type: 'popular' | 'trending' | 'related' | 'autocomplete';
  score: number;
  count: number;
}

// Mock search index for demonstration
class MockSearchIndex {
  private documents: Map<string, SearchDocument> = new Map();
  private invertedIndex: Map<string, Set<string>> = new Map();
  private searchHistory: Array<{ query: string; userId?: string; timestamp: Date }> = [];

  async indexDocument(document: SearchDocument): Promise<void> {
    this.documents.set(document.id, document);
    
    // Build inverted index
    const tokens = this.tokenize(document.title + ' ' + document.description + ' ' + document.content);
    
    for (const token of tokens) {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set());
      }
      this.invertedIndex.get(token)!.add(document.id);
    }
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const startTime = Date.now();
    
    // Tokenize query
    const queryTokens = this.tokenize(query.query);
    
    // Find matching documents
    const matchingDocs = new Set<string>();
    
    for (const token of queryTokens) {
      const docIds = this.invertedIndex.get(token);
      if (docIds) {
        for (const docId of docIds) {
          matchingDocs.add(docId);
        }
      }
    }

    // Get documents and calculate relevance
    const documents = Array.from(matchingDocs)
      .map(id => this.documents.get(id))
      .filter((doc): doc is SearchDocument => doc !== undefined)
      .map(doc => ({
        ...doc,
        relevanceScore: this.calculateRelevanceScore(doc, queryTokens, query.query)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply filters
    let filteredDocs = documents;
    if (query.filters) {
      filteredDocs = this.applyFilters(documents, query.filters);
    }

    // Apply sorting
    if (query.sortBy) {
      filteredDocs = this.sortDocuments(filteredDocs, query.sortBy, query.sortOrder || 'desc');
    }

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedDocs = filteredDocs.slice(start, end);

    // Generate suggestions
    const suggestions = this.generateSuggestions(query.query, queryTokens);

    // Generate facets
    const facets = this.generateFacets(filteredDocs);

    // Record search
    this.recordSearch(query);

    const processingTime = Date.now() - startTime;

    return {
      documents: paginatedDocs,
      total: filteredDocs.length,
      page,
      limit,
      query: query.query,
      suggestions,
      facets,
      processingTime,
    };
  }

  async getAnalytics(): Promise<SearchAnalytics> {
    const totalSearches = this.searchHistory.length;
    const uniqueUsers = new Set(this.searchHistory.map(s => s.userId).filter(Boolean)).size;
    
    const queryLengths = this.searchHistory.map(s => s.query.split(' ').length);
    const averageQueryLength = queryLengths.length > 0 
      ? queryLengths.reduce((sum, len) => sum + len, 0) / queryLengths.length 
      : 0;

    // Count query frequencies
    const queryCounts = new Map<string, number>();
    for (const search of this.searchHistory) {
      queryCounts.set(search.query, (queryCounts.get(search.query) || 0) + 1);
    }

    const topQueries = Array.from(queryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    return {
      totalSearches,
      uniqueUsers,
      averageQueryLength,
      topQueries,
      zeroResultQueries: [], // Would be populated from actual zero-result searches
      conversionRate: 0.15, // Mock conversion rate
      averageSearchTime: 150, // Mock average search time in ms
    };
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  private calculateRelevanceScore(document: SearchDocument, queryTokens: string[], originalQuery: string): number {
    let score = 0;

    // Title match (highest weight)
    const titleTokens = this.tokenize(document.title);
    const titleMatches = queryTokens.filter(token => titleTokens.includes(token)).length;
    score += titleMatches * 10;

    // Description match (medium weight)
    const descTokens = this.tokenize(document.description);
    const descMatches = queryTokens.filter(token => descTokens.includes(token)).length;
    score += descMatches * 5;

    // Content match (lower weight)
    const contentTokens = this.tokenize(document.content);
    const contentMatches = queryTokens.filter(token => contentTokens.includes(token)).length;
    score += contentMatches * 2;

    // Tag matches
    const tagMatches = queryTokens.filter(token => document.tags.includes(token)).length;
    score += tagMatches * 3;

    // Popularity boost
    score += document.popularity * 0.1;

    // Exact phrase match bonus
    if (document.title.toLowerCase().includes(originalQuery.toLowerCase()) ||
        document.description.toLowerCase().includes(originalQuery.toLowerCase())) {
      score += 20;
    }

    return score;
  }

  private applyFilters(documents: SearchDocument[], filters: Record<string, any>): SearchDocument[] {
    return documents.filter(doc => {
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'type' && doc.type !== value) return false;
        if (key === 'category' && !doc.metadata.category?.includes(value)) return false;
        if (key === 'brand' && doc.metadata.brand !== value) return false;
        if (key === 'priceMin' && doc.metadata.price < value) return false;
        if (key === 'priceMax' && doc.metadata.price > value) return false;
        if (key === 'tags' && !value.some((tag: string) => doc.tags.includes(tag))) return false;
      }
      return true;
    });
  }

  private sortDocuments(documents: SearchDocument[], sortBy: string, sortOrder: 'asc' | 'desc'): SearchDocument[] {
    return documents.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'relevance':
          comparison = b.relevanceScore - a.relevanceScore;
          break;
        case 'popularity':
          comparison = b.popularity - a.popularity;
          break;
        case 'price':
          comparison = (a.metadata.price || 0) - (b.metadata.price || 0);
          break;
        case 'date':
          comparison = b.updatedAt.getTime() - a.updatedAt.getTime();
          break;
        default:
          comparison = b.relevanceScore - a.relevanceScore;
      }

      return sortOrder === 'asc' ? -comparison : comparison;
    });
  }

  private generateSuggestions(query: string, tokens: string[]): string[] {
    const suggestions: string[] = [];
    
    // Popular queries that start with the same tokens
    const popularQueries = ['laptop', 'smartphone', 'headphones', 'camera', 'book'];
    
    for (const popularQuery of popularQueries) {
      if (popularQuery.startsWith(tokens[0] || '') && popularQuery !== query) {
        suggestions.push(popularQuery);
      }
    }

    // Related terms
    const relatedTerms: Record<string, string[]> = {
      'laptop': ['computer', 'notebook', 'macbook'],
      'phone': ['smartphone', 'mobile', 'iphone'],
      'headphones': ['earphones', 'wireless', 'bluetooth'],
    };

    for (const token of tokens) {
      const related = relatedTerms[token];
      if (related) {
        suggestions.push(...related);
      }
    }

    return [...new Set(suggestions)].slice(0, 5);
  }

  private generateFacets(documents: SearchDocument[]): SearchFacets {
    const categories = new Map<string, number>();
    const brands = new Map<string, number>();
    const tags = new Map<string, number>();
    const priceRanges = new Map<string, number>();

    for (const doc of documents) {
      // Categories
      const category = doc.metadata.category;
      if (category) {
        categories.set(category, (categories.get(category) || 0) + 1);
      }

      // Brands
      const brand = doc.metadata.brand;
      if (brand) {
        brands.set(brand, (brands.get(brand) || 0) + 1);
      }

      // Tags
      for (const tag of doc.tags) {
        tags.set(tag, (tags.get(tag) || 0) + 1);
      }

      // Price ranges
      const price = doc.metadata.price || 0;
      let range = '';
      if (price < 50) range = 'Under $50';
      else if (price < 100) range = '$50-$100';
      else if (price < 500) range = '$100-$500';
      else if (price < 1000) range = '$500-$1000';
      else range = 'Over $1000';

      priceRanges.set(range, (priceRanges.get(range) || 0) + 1);
    }

    return {
      categories: Array.from(categories.entries()).map(([name, count]) => ({ name, count })),
      brands: Array.from(brands.entries()).map(([name, count]) => ({ name, count })),
      tags: Array.from(tags.entries()).map(([name, count]) => ({ name, count })),
      priceRanges: Array.from(priceRanges.entries()).map(([range, count]) => ({ range, count })),
    };
  }

  private recordSearch(query: SearchQuery): void {
    this.searchHistory.push({
      query: query.query,
      userId: query.userId,
      timestamp: new Date(),
    });

    // Keep only last 1000 searches
    if (this.searchHistory.length > 1000) {
      this.searchHistory = this.searchHistory.slice(-1000);
    }
  }
}

export class SearchEngine {
  private index: MockSearchIndex;
  private suggestions: Map<string, SearchSuggestion[]> = new Map();

  constructor() {
    this.index = new MockSearchIndex();
    this.initializeSampleData();
  }

  /**
   * ENHANCED: Index document with comprehensive metadata
   */
  async indexDocument(documentData: {
    id: string;
    type: 'product' | 'category' | 'brand' | 'article';
    title: string;
    description: string;
    content: string;
    tags: string[];
    metadata: Record<string, any>;
    popularity?: number;
  }): Promise<{
    success: boolean;
    errors: string[];
  }> {
    try {
      // Validate document data
      const validation = this.validateDocumentData(documentData);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
        };
      }

      // Create search document
      const document: SearchDocument = {
        id: documentData.id,
        type: documentData.type,
        title: documentData.title,
        description: documentData.description,
        content: documentData.content,
        tags: documentData.tags,
        metadata: documentData.metadata,
        popularity: documentData.popularity || 0,
        relevanceScore: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Index document
      await this.index.indexDocument(document);

      // Update suggestions
      await this.updateSuggestions(document);

      searchLogger.info('Document indexed successfully', {
        documentId: document.id,
        type: document.type,
        title: document.title,
      });

      return {
        success: true,
        errors: [],
      };
    } catch (error) {
      searchLogger.error('Failed to index document', { error, documentData });
      return {
        success: false,
        errors: ['Failed to index document due to system error'],
      };
    }
  }

  /**
   * ENHANCED: Search with advanced features
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    try {
      const startTime = Date.now();

      // Validate query
      const validation = this.validateSearchQuery(query);
      if (!validation.isValid) {
        return {
          documents: [],
          total: 0,
          page: query.page || 1,
          limit: query.limit || 20,
          query: query.query,
          suggestions: [],
          facets: {
            categories: [],
            brands: [],
            priceRanges: [],
            tags: [],
          },
          processingTime: Date.now() - startTime,
        };
      }

      // Perform search
      const result = await this.index.search(query);

      // Log search analytics
      searchLogger.info('Search performed', {
        query: query.query,
        results: result.documents.length,
        total: result.total,
        processingTime: result.processingTime,
        userId: query.userId,
      });

      return result;
    } catch (error) {
      searchLogger.error('Search failed', { error, query });
      return {
        documents: [],
        total: 0,
        page: query.page || 1,
        limit: query.limit || 20,
        query: query.query,
        suggestions: [],
        facets: {
          categories: [],
          brands: [],
          priceRanges: [],
          tags: [],
        },
        processingTime: 0,
      };
    }
  }

  /**
   * ENHANCED: Get search suggestions
   */
  async getSuggestions(query: string, limit: number = 5): Promise<SearchSuggestion[]> {
    try {
      const suggestions: SearchSuggestion[] = [];

      // Popular suggestions
      const popularSuggestions = await this.getPopularSuggestions(query);
      suggestions.push(...popularSuggestions);

      // Trending suggestions
      const trendingSuggestions = await this.getTrendingSuggestions(query);
      suggestions.push(...trendingSuggestions);

      // Related suggestions
      const relatedSuggestions = await this.getRelatedSuggestions(query);
      suggestions.push(...relatedSuggestions);

      // Sort by score and limit
      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      searchLogger.error('Failed to get suggestions', { error, query });
      return [];
    }
  }

  /**
   * ENHANCED: Get search analytics
   */
  async getSearchAnalytics(): Promise<SearchAnalytics> {
    try {
      return await this.index.getAnalytics();
    } catch (error) {
      searchLogger.error('Failed to get search analytics', { error });
      return {
        totalSearches: 0,
        uniqueUsers: 0,
        averageQueryLength: 0,
        topQueries: [],
        zeroResultQueries: [],
        conversionRate: 0,
        averageSearchTime: 0,
      };
    }
  }

  /**
   * ENHANCED: Update document popularity
   */
  async updateDocumentPopularity(documentId: string, popularity: number): Promise<{
    success: boolean;
    errors: string[];
  }> {
    try {
      // In a real implementation, this would update the document in the index
      searchLogger.info('Document popularity updated', { documentId, popularity });
      
      return {
        success: true,
        errors: [],
      };
    } catch (error) {
      searchLogger.error('Failed to update document popularity', { error, documentId });
      return {
        success: false,
        errors: ['Failed to update document popularity'],
      };
    }
  }

  /**
   * Validate document data
   */
  private validateDocumentData(data: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!data.id) {
      errors.push('Document ID is required');
    }

    if (!data.title) {
      errors.push('Document title is required');
    }

    if (!data.description) {
      errors.push('Document description is required');
    }

    if (!data.content) {
      errors.push('Document content is required');
    }

    if (!data.type) {
      errors.push('Document type is required');
    } else if (!['product', 'category', 'brand', 'article'].includes(data.type)) {
      errors.push('Invalid document type');
    }

    // Content length validation
    if (data.title && data.title.length > 200) {
      errors.push('Title is too long (max 200 characters)');
    }

    if (data.description && data.description.length > 1000) {
      errors.push('Description is too long (max 1000 characters)');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate search query
   */
  private validateSearchQuery(query: SearchQuery): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!query.query || query.query.trim().length === 0) {
      errors.push('Search query is required');
    }

    if (query.query && query.query.length > 100) {
      errors.push('Search query is too long (max 100 characters)');
    }

    if (query.page && query.page < 1) {
      errors.push('Page number must be greater than 0');
    }

    if (query.limit && (query.limit < 1 || query.limit > 100)) {
      errors.push('Limit must be between 1 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update search suggestions
   */
  private async updateSuggestions(document: SearchDocument): Promise<void> {
    // Extract keywords from document
    const keywords = this.extractKeywords(document.title + ' ' + document.description);
    
    for (const keyword of keywords) {
      if (!this.suggestions.has(keyword)) {
        this.suggestions.set(keyword, []);
      }

      const existingSuggestions = this.suggestions.get(keyword)!;
      const existingIndex = existingSuggestions.findIndex(s => s.query === keyword);

      if (existingIndex >= 0) {
        existingSuggestions[existingIndex].count++;
        existingSuggestions[existingIndex].score += document.popularity * 0.1;
      } else {
        existingSuggestions.push({
          query: keyword,
          type: 'related',
          score: document.popularity * 0.1,
          count: 1,
        });
      }
    }
  }

  /**
   * Get popular suggestions
   */
  private async getPopularSuggestions(query: string): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];
    const queryLower = query.toLowerCase();

    // Mock popular suggestions
    const popularQueries = [
      { query: 'laptop', count: 150, score: 8.5 },
      { query: 'smartphone', count: 120, score: 8.2 },
      { query: 'headphones', count: 80, score: 7.8 },
      { query: 'camera', count: 60, score: 7.5 },
      { query: 'book', count: 100, score: 8.0 },
    ];

    for (const item of popularQueries) {
      if (item.query.includes(queryLower) || queryLower.includes(item.query)) {
        suggestions.push({
          query: item.query,
          type: 'popular',
          score: item.score,
          count: item.count,
        });
      }
    }

    return suggestions;
  }

  /**
   * Get trending suggestions
   */
  private async getTrendingSuggestions(query: string): Promise<SearchSuggestion[]> {
         // Mock trending suggestions
     return [
       {
         query: 'wireless earbuds',
         type: 'trending' as const,
         score: 9.0,
         count: 45,
       },
       {
         query: 'gaming laptop',
         type: 'trending' as const,
         score: 8.8,
         count: 38,
       },
     ].filter(s => s.query.toLowerCase().includes(query.toLowerCase()));
  }

  /**
   * Get related suggestions
   */
  private async getRelatedSuggestions(query: string): Promise<SearchSuggestion[]> {
    const suggestions = this.suggestions.get(query) || [];
    return suggestions.slice(0, 3);
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);
  }

  /**
   * Initialize sample data
   */
  private async initializeSampleData(): Promise<void> {
    const sampleDocuments = [
      {
        id: 'prod_1',
        type: 'product' as const,
        title: 'MacBook Pro 13-inch',
        description: 'Powerful laptop for professionals with M2 chip',
        content: 'The latest MacBook Pro features the M2 chip for incredible performance...',
        tags: ['laptop', 'apple', 'macbook', 'professional'],
        metadata: { brand: 'Apple', category: 'Electronics', price: 1299 },
        popularity: 95,
      },
      {
        id: 'prod_2',
        type: 'product' as const,
        title: 'iPhone 14 Pro',
        description: 'Latest smartphone with advanced camera system',
        content: 'The iPhone 14 Pro features a 48MP camera and A16 Bionic chip...',
        tags: ['smartphone', 'apple', 'iphone', 'camera'],
        metadata: { brand: 'Apple', category: 'Electronics', price: 999 },
        popularity: 98,
      },
      {
        id: 'prod_3',
        type: 'product' as const,
        title: 'Sony WH-1000XM4',
        description: 'Premium wireless noise-canceling headphones',
        content: 'Industry-leading noise canceling with Dual Noise Sensor technology...',
        tags: ['headphones', 'wireless', 'noise-canceling', 'sony'],
        metadata: { brand: 'Sony', category: 'Electronics', price: 349 },
        popularity: 87,
      },
    ];

    for (const doc of sampleDocuments) {
      await this.indexDocument(doc);
    }

    searchLogger.info('Sample data initialized', { count: sampleDocuments.length });
  }
}

// Export singleton instance
export const searchEngine = new SearchEngine();