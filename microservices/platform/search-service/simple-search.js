const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 3006;

// Middleware
app.use(cors());
app.use(express.json());

// Search index (in-memory for demo - use Elasticsearch in production)
let searchIndex = [];
let searchHistory = [];
let popularSearches = new Map();

// Initialize search index from product service
async function initializeSearchIndex() {
  try {
    const response = await axios.get('http://localhost:3002/api/products');
    if (response.data && response.data.products) {
      searchIndex = response.data.products.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        brand: product.brand || 'Unknown',
        price: product.price,
        discountPrice: product.discountPrice,
        inStock: product.inStock,
        featured: product.featured,
        tags: product.tags || [],
        // Create searchable text
        searchText: `${product.name} ${product.description} ${product.category} ${product.brand || ''} ${(product.tags || []).join(' ')}`.toLowerCase()
      }));
      console.log(`📊 Search index initialized with ${searchIndex.length} products`);
    }
  } catch (error) {
    console.error('Failed to initialize search index:', error.message);
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'search-service',
    timestamp: new Date().toISOString(),
    indexSize: searchIndex.length,
    features: ['text-search', 'filters', 'autocomplete', 'recommendations']
  });
});

// Search products
app.get('/api/search', (req, res) => {
  try {
    const { 
      q = '', 
      category, 
      minPrice, 
      maxPrice, 
      inStock, 
      featured,
      brand,
      sortBy = 'relevance',
      page = 1,
      limit = 20
    } = req.query;

    let results = [...searchIndex];

    // Text search
    if (q.trim()) {
      const searchTerm = q.toLowerCase().trim();
      
      // Record search query
      searchHistory.push({
        query: q,
        timestamp: new Date().toISOString(),
        resultsCount: 0 // Will be updated below
      });

      // Update popular searches
      const currentCount = popularSearches.get(searchTerm) || 0;
      popularSearches.set(searchTerm, currentCount + 1);

      // Filter by search term
      results = results.filter(product => {
        const relevanceScore = calculateRelevanceScore(product, searchTerm);
        product.relevanceScore = relevanceScore;
        return relevanceScore > 0;
      });
    }

    // Apply filters
    if (category) {
      results = results.filter(product => 
        product.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (brand) {
      results = results.filter(product => 
        product.brand.toLowerCase().includes(brand.toLowerCase())
      );
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      results = results.filter(product => 
        (product.discountPrice || product.price) >= min
      );
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      results = results.filter(product => 
        (product.discountPrice || product.price) <= max
      );
    }

    if (inStock === 'true') {
      results = results.filter(product => product.inStock);
    }

    if (featured === 'true') {
      results = results.filter(product => product.featured);
    }

    // Sorting
    switch (sortBy) {
      case 'price-asc':
        results.sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
        break;
      case 'price-desc':
        results.sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
        break;
      case 'name':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'relevance':
      default:
        if (q.trim()) {
          results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
        }
        break;
    }

    // Update search history with results count
    if (searchHistory.length > 0) {
      searchHistory[searchHistory.length - 1].resultsCount = results.length;
    }

    // Pagination
    const total = results.length;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    const paginatedResults = results.slice(offset, offset + limitNum);

    // Remove relevance score from response
    const cleanResults = paginatedResults.map(product => {
      const { relevanceScore, searchText, ...cleanProduct } = product;
      return cleanProduct;
    });

    res.json({
      query: q,
      results: cleanResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      filters: {
        category,
        brand,
        minPrice,
        maxPrice,
        inStock,
        featured
      },
      sortBy
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Calculate relevance score for search
function calculateRelevanceScore(product, searchTerm) {
  let score = 0;
  const terms = searchTerm.split(' ').filter(term => term.length > 0);

  terms.forEach(term => {
    // Exact match in name (highest score)
    if (product.name.toLowerCase().includes(term)) {
      score += 100;
    }

    // Match in description
    if (product.description.toLowerCase().includes(term)) {
      score += 50;
    }

    // Match in category
    if (product.category.toLowerCase().includes(term)) {
      score += 30;
    }

    // Match in brand
    if (product.brand && product.brand.toLowerCase().includes(term)) {
      score += 20;
    }

    // Match in tags
    if (product.tags && product.tags.some(tag => tag.toLowerCase().includes(term))) {
      score += 15;
    }

    // Partial match in searchText
    if (product.searchText.includes(term)) {
      score += 10;
    }
  });

  // Boost for featured products
  if (product.featured) {
    score += 5;
  }

  // Boost for in-stock products
  if (product.inStock) {
    score += 2;
  }

  return score;
}

// Autocomplete suggestions
app.get('/api/search/suggestions', (req, res) => {
  try {
    const { q = '' } = req.query;
    
    if (!q.trim() || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const searchTerm = q.toLowerCase().trim();
    const suggestions = new Set();

    // Product name suggestions
    searchIndex.forEach(product => {
      if (product.name.toLowerCase().includes(searchTerm)) {
        suggestions.add(product.name);
      }
      
      // Category suggestions
      if (product.category.toLowerCase().includes(searchTerm)) {
        suggestions.add(product.category);
      }

      // Brand suggestions
      if (product.brand && product.brand.toLowerCase().includes(searchTerm)) {
        suggestions.add(product.brand);
      }

      // Tag suggestions
      if (product.tags) {
        product.tags.forEach(tag => {
          if (tag.toLowerCase().includes(searchTerm)) {
            suggestions.add(tag);
          }
        });
      }
    });

    // Limit to 10 suggestions
    const suggestionArray = Array.from(suggestions).slice(0, 10);

    res.json({
      query: q,
      suggestions: suggestionArray
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({ error: 'Suggestions failed' });
  }
});

// Get popular searches
app.get('/api/search/popular', (req, res) => {
  try {
    const popular = Array.from(popularSearches.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    res.json({ popular });
  } catch (error) {
    console.error('Popular searches error:', error);
    res.status(500).json({ error: 'Failed to get popular searches' });
  }
});

// Get search history (last 50 searches)
app.get('/api/search/history', (req, res) => {
  try {
    const recentHistory = searchHistory
      .slice(-50)
      .reverse()
      .map(entry => ({
        query: entry.query,
        timestamp: entry.timestamp,
        resultsCount: entry.resultsCount
      }));

    res.json({ history: recentHistory });
  } catch (error) {
    console.error('Search history error:', error);
    res.status(500).json({ error: 'Failed to get search history' });
  }
});

// Get search filters/facets
app.get('/api/search/filters', (req, res) => {
  try {
    const categories = [...new Set(searchIndex.map(p => p.category))];
    const brands = [...new Set(searchIndex.map(p => p.brand).filter(Boolean))];
    const priceRange = {
      min: Math.min(...searchIndex.map(p => p.discountPrice || p.price)),
      max: Math.max(...searchIndex.map(p => p.discountPrice || p.price))
    };

    res.json({
      categories: categories.map(cat => ({
        name: cat,
        count: searchIndex.filter(p => p.category === cat).length
      })),
      brands: brands.map(brand => ({
        name: brand,
        count: searchIndex.filter(p => p.brand === brand).length
      })),
      priceRange,
      inStockCount: searchIndex.filter(p => p.inStock).length,
      featuredCount: searchIndex.filter(p => p.featured).length
    });
  } catch (error) {
    console.error('Filters error:', error);
    res.status(500).json({ error: 'Failed to get filters' });
  }
});

// Product recommendations
app.get('/api/search/recommendations/:productId', (req, res) => {
  try {
    const { productId } = req.params;
    const product = searchIndex.find(p => p.id === productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Find similar products
    const recommendations = searchIndex
      .filter(p => p.id !== productId)
      .map(p => {
        let score = 0;
        
        // Same category
        if (p.category === product.category) score += 50;
        
        // Same brand
        if (p.brand === product.brand) score += 30;
        
        // Similar price range (within 20%)
        const priceDiff = Math.abs((p.discountPrice || p.price) - (product.discountPrice || product.price));
        const priceThreshold = (product.discountPrice || product.price) * 0.2;
        if (priceDiff <= priceThreshold) score += 20;
        
        // Common tags
        if (product.tags && p.tags) {
          const commonTags = product.tags.filter(tag => p.tags.includes(tag));
          score += commonTags.length * 10;
        }
        
        // In stock bonus
        if (p.inStock) score += 5;
        
        // Featured bonus
        if (p.featured) score += 5;

        return { ...p, recommendationScore: score };
      })
      .filter(p => p.recommendationScore > 0)
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 6)
      .map(p => {
        const { recommendationScore, searchText, ...cleanProduct } = p;
        return cleanProduct;
      });

    res.json({
      productId,
      recommendations
    });

  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Refresh search index
app.post('/api/search/refresh', async (req, res) => {
  try {
    await initializeSearchIndex();
    res.json({ 
      success: true, 
      message: 'Search index refreshed',
      indexSize: searchIndex.length
    });
  } catch (error) {
    console.error('Index refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh search index' });
  }
});

// Default route
app.get('/', (req, res) => {
  res.json({
    name: 'UltraMarket Search Service',
    version: '1.0.0',
    indexSize: searchIndex.length,
    features: [
      'Full-text search',
      'Autocomplete suggestions',
      'Advanced filtering',
      'Product recommendations',
      'Search analytics'
    ],
    endpoints: [
      'GET /health',
      'GET /api/search',
      'GET /api/search/suggestions',
      'GET /api/search/popular',
      'GET /api/search/history',
      'GET /api/search/filters',
      'GET /api/search/recommendations/:productId',
      'POST /api/search/refresh'
    ]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Search service error:', err);
  res.status(500).json({ error: 'Internal search service error' });
});

// Initialize and start server
async function startServer() {
  await initializeSearchIndex();
  
  app.listen(PORT, () => {
    console.log(`🔍 Search Service running on port ${PORT}`);
    console.log(`📊 Search index: ${searchIndex.length} products indexed`);
    console.log(`🎯 Features: Text search, Filters, Autocomplete, Recommendations`);
  });
}

startServer().catch(console.error);

module.exports = app;