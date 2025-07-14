import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './ProductListPage.css';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  comparePrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  category: string;
  brand: string;
  discount?: number;
}

interface FilterState {
  category: string;
  brand: string;
  priceMin: string;
  priceMax: string;
  rating: number;
  inStock: boolean;
}

const ProductListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const itemsPerPage = 12;
  
  // Filters
  const [filters, setFilters] = useState<FilterState>({
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    priceMin: searchParams.get('priceMin') || '',
    priceMax: searchParams.get('priceMax') || '',
    rating: parseInt(searchParams.get('rating') || '0'),
    inStock: searchParams.get('inStock') === 'true',
  });
  
  // Sorting
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(
    (searchParams.get('order') as 'asc' | 'desc') || 'asc'
  );
  
  // Categories and brands for filter options
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, [currentPage, sortBy, sortOrder, filters, searchParams]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.set('page', currentPage.toString());
      queryParams.set('limit', itemsPerPage.toString());
      queryParams.set('sort', sortBy);
      queryParams.set('order', sortOrder);
      
      if (filters.category) queryParams.set('category', filters.category);
      if (filters.brand) queryParams.set('brand', filters.brand);
      if (filters.priceMin) queryParams.set('priceMin', filters.priceMin);
      if (filters.priceMax) queryParams.set('priceMax', filters.priceMax);
      if (filters.rating > 0) queryParams.set('rating', filters.rating.toString());
      if (filters.inStock) queryParams.set('inStock', 'true');
      
      const searchQuery = searchParams.get('q');
      if (searchQuery) queryParams.set('q', searchQuery);

      const response = await fetch(`/api/v1/products?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data.products);
        setTotalProducts(data.data.total);
        setTotalPages(Math.ceil(data.data.total / itemsPerPage));
        setCategories(data.data.categories || []);
        setBrands(data.data.brands || []);
      } else {
        throw new Error(data.message || 'Failed to fetch products');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
    
    // Update URL parameters
    const newSearchParams = new URLSearchParams(searchParams);
    if (value) {
      newSearchParams.set(key, value.toString());
    } else {
      newSearchParams.delete(key);
    }
    setSearchParams(newSearchParams);
  };

  // Handle sorting
  const handleSortChange = (newSortBy: string) => {
    const newOrder = newSortBy === sortBy && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(newSortBy);
    setSortOrder(newOrder);
    
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('sort', newSortBy);
    newSearchParams.set('order', newOrder);
    setSearchParams(newSearchParams);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      category: '',
      brand: '',
      priceMin: '',
      priceMax: '',
      rating: 0,
      inStock: false,
    });
    setCurrentPage(1);
    setSearchParams(new URLSearchParams());
  };

  // Format price in UZS
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  // Calculate discount percentage
  const getDiscountPercentage = (price: number, comparePrice: number) => {
    return Math.round(((comparePrice - price) / comparePrice) * 100);
  };

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="star filled">★</span>);
    }

    if (hasHalfStar) {
      stars.push(<span key="half" className="star half">★</span>);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="star empty">☆</span>);
    }

    return stars;
  };

  if (loading) {
    return (
      <div className="products-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Mahsulotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="products-page">
        <div className="error-container">
          <h2>Xatolik yuz berdi</h2>
          <p>{error}</p>
          <button onClick={fetchProducts} className="retry-button">
            Qayta urinish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="products-page">
      {/* Page Header */}
      <div className="page-header">
        <h1>Mahsulotlar</h1>
        <div className="results-info">
          {totalProducts} mahsulot topildi
          {searchParams.get('q') && (
            <span className="search-query">
              "{searchParams.get('q')}" bo'yicha qidiruv
            </span>
          )}
        </div>
      </div>

      <div className="products-container">
        {/* Sidebar Filters */}
        <aside className="filters-sidebar">
          <div className="filters-header">
            <h3>Filtrlar</h3>
            <button onClick={clearFilters} className="clear-filters">
              Tozalash
            </button>
          </div>

          {/* Category Filter */}
          <div className="filter-group">
            <h4>Kategoriya</h4>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">Barcha kategoriyalar</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div className="filter-group">
            <h4>Brend</h4>
            <select
              value={filters.brand}
              onChange={(e) => handleFilterChange('brand', e.target.value)}
            >
              <option value="">Barcha brendlar</option>
              {brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range Filter */}
          <div className="filter-group">
            <h4>Narx oralig'i</h4>
            <div className="price-inputs">
              <input
                type="number"
                placeholder="Dan"
                value={filters.priceMin}
                onChange={(e) => handleFilterChange('priceMin', e.target.value)}
              />
              <span>-</span>
              <input
                type="number"
                placeholder="Gacha"
                value={filters.priceMax}
                onChange={(e) => handleFilterChange('priceMax', e.target.value)}
              />
            </div>
          </div>

          {/* Rating Filter */}
          <div className="filter-group">
            <h4>Reyting</h4>
            <div className="rating-filters">
              {[5, 4, 3, 2, 1].map((rating) => (
                <label key={rating} className="rating-option">
                  <input
                    type="radio"
                    name="rating"
                    value={rating}
                    checked={filters.rating === rating}
                    onChange={(e) => handleFilterChange('rating', parseInt(e.target.value))}
                  />
                  <span className="rating-display">
                    {renderStars(rating)} va yuqori
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Stock Filter */}
          <div className="filter-group">
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={filters.inStock}
                onChange={(e) => handleFilterChange('inStock', e.target.checked)}
              />
              Faqat mavjud mahsulotlar
            </label>
          </div>
        </aside>

        {/* Main Content */}
        <main className="products-main">
          {/* Sorting Controls */}
          <div className="sorting-controls">
            <div className="sort-options">
              <label>Saralash:</label>
              <button
                className={sortBy === 'name' ? 'active' : ''}
                onClick={() => handleSortChange('name')}
              >
                Nomi {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                className={sortBy === 'price' ? 'active' : ''}
                onClick={() => handleSortChange('price')}
              >
                Narxi {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                className={sortBy === 'rating' ? 'active' : ''}
                onClick={() => handleSortChange('rating')}
              >
                Reyting {sortBy === 'rating' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                className={sortBy === 'createdAt' ? 'active' : ''}
                onClick={() => handleSortChange('createdAt')}
              >
                Yangilik {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
            </div>
          </div>

          {/* Products Grid */}
          {products.length === 0 ? (
            <div className="no-products">
              <h3>Mahsulotlar topilmadi</h3>
              <p>Filtrlarni o'zgartirib ko'ring yoki boshqa qidiruv so'rovini kiriting.</p>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="product-card"
                  onClick={() => navigate(`/products/${product.id}`)}
                >
                  <div className="product-image">
                    <img src={product.image} alt={product.name} />
                    {product.comparePrice && product.comparePrice > product.price && (
                      <div className="discount-badge">
                        -{getDiscountPercentage(product.price, product.comparePrice)}%
                      </div>
                    )}
                    {!product.inStock && (
                      <div className="out-of-stock-overlay">
                        Mavjud emas
                      </div>
                    )}
                  </div>
                  
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <p className="product-description">{product.description}</p>
                    
                    <div className="product-rating">
                      <div className="stars">{renderStars(product.rating)}</div>
                      <span className="review-count">({product.reviewCount})</span>
                    </div>
                    
                    <div className="product-price">
                      <span className="current-price">{formatPrice(product.price)}</span>
                      {product.comparePrice && product.comparePrice > product.price && (
                        <span className="original-price">{formatPrice(product.comparePrice)}</span>
                      )}
                    </div>
                    
                    <div className="product-meta">
                      <span className="brand">{product.brand}</span>
                      <span className="category">{product.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-button"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                ← Oldingi
              </button>
              
              <div className="page-numbers">
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 7) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 4) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNumber = totalPages - 6 + i;
                  } else {
                    pageNumber = currentPage - 3 + i;
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      className={`page-button ${currentPage === pageNumber ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>
              
              <button
                className="page-button"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Keyingi →
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductListPage;
