import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import apiClient from '../lib/api';

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Authentication state check
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        const [productsRes, categoriesRes, statsRes] = await Promise.all([
          apiClient.getProducts({ limit: 4 }),
          apiClient.getCategories(),
          apiClient.getStats()
        ]);

        setProducts(productsRes.data.data || []);
        setCategories(categoriesRes.data.data || []);
        setStats(statsRes.data.data || {});
        
      } catch (error) {
        console.error('API Error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await apiClient.searchProducts(searchQuery);
      console.log('Search results:', response.data);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  // Add to cart
  const addToCart = async (productId) => {
    try {
      const response = await apiClient.addToCart(productId, 1);
      alert(response.data.message);
    } catch (error) {
      console.error('Cart error:', error);
      alert('Xatolik yuz berdi');
    }
  };

  if (isLoading) {
    return (
      <div style={{minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{textAlign: 'center'}}>
          <div className="loading-spinner" style={{width: '3rem', height: '3rem', margin: '0 auto 1rem'}}></div>
          <p style={{color: '#6b7280'}}>Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>UltraMarket - O'zbekiston Marketplace</title>
        <meta name="description" content="UltraMarket - O'zbekiston marketplace" />
      </Head>

      <div className="homepage">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <div className="header-left">
              <h1 className="header-logo">UltraMarket</h1>
              <span style={{marginLeft: '0.5rem', fontSize: '0.875rem', color: '#6b7280'}}>O'zbekiston</span>
            </div>
            
            <nav className="header-nav">
              <a href="#">Kategoriyalar</a>
              <a href="#">Do'konlar</a>
              <a href="#">Yordam</a>
            </nav>
            
            <div className="header-right">
              {isAuthenticated ? (
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                  <span style={{fontSize: '0.875rem', color: '#6b7280'}}>
                    Salom, {user?.firstName}!
                  </span>
                  <button
                    onClick={handleLogout}
                    style={{fontSize: '0.875rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer'}}
                  >
                    Chiqish
                  </button>
                </div>
              ) : (
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <Link href="/auth/login">
                    <button className="btn" style={{color: '#2563eb', background: 'none', border: 'none'}}>
                      Kirish
                    </button>
                  </Link>
                  <Link href="/auth/register">
                    <button className="btn btn-primary">
                      Ro'yxatdan o'tish
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Authentication Status Banner */}
        {isAuthenticated && (
          <div className="status-banner">
            <div className="status-content">
              <div style={{fontSize: '0.875rem', color: '#15803d'}}>
                ✅ Siz tizimga kirdingiz
              </div>
              <div style={{fontSize: '0.75rem', color: '#16a34a'}}>
                Email: {user?.email}
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="hero-section">
          <div className="container" style={{textAlign: 'center'}}>
            <h2 className="hero-title">
              O'zbekiston #1 Marketplace
            </h2>
            <p className="hero-subtitle">
              {stats ? `${stats.totalProducts} mahsulot, ${stats.totalStores} do'kon, ${stats.totalUsers} foydalanuvchi` : 'Eng yaxshi mahsulotlar'}
            </p>
            
            {/* Search */}
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                placeholder="Mahsulot qidiring..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-btn">
                Qidirish
              </button>
            </form>
          </div>
        </section>

        {/* Categories */}
        <section className="section">
          <div className="container">
            <h3 className="section-title">Kategoriyalar</h3>
            
            <div className="grid grid-4">
              {categories.map((category) => (
                <div key={category.id} className="card">
                  <div style={{fontSize: '2.5rem', marginBottom: '1rem'}}>
                    {category.id === 'electronics' && '📱'}
                    {category.id === 'fashion' && '👕'}
                    {category.id === 'home' && '🏠'}
                    {category.id === 'automotive' && '🚗'}
                  </div>
                  <h4 style={{fontWeight: '600', color: '#111827'}}>{category.nameUz}</h4>
                  <p style={{fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem'}}>
                    {category.productCount.toLocaleString()} mahsulot
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="section section-white">
          <div className="container">
            <h3 className="section-title">Mashhur mahsulotlar</h3>
            
            <div className="grid grid-4">
              {products.map((product) => (
                <div key={product.id} className="product-card">
                  <div className="product-image">
                    <span style={{color: '#6b7280'}}>📱</span>
                  </div>
                  
                  <div className="product-info">
                    <h4 className="product-title">
                      {product.nameUz || product.name}
                    </h4>
                    
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem'}}>
                      <div>
                        <p className="product-price">
                          {formatPrice(product.price)}
                        </p>
                        {product.originalPrice && (
                          <p className="product-original-price">
                            {formatPrice(product.originalPrice)}
                          </p>
                        )}
                      </div>
                      
                      {product.discount && (
                        <span className="discount-badge">
                          -{product.discount}%
                        </span>
                      )}
                    </div>
                    
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                        <span style={{color: '#eab308'}}>⭐</span>
                        <span style={{fontSize: '0.875rem', color: '#6b7280'}}>
                          {product.rating} ({product.reviewCount})
                        </span>
                      </div>
                      
                      <span style={{fontSize: '0.75rem', color: '#6b7280'}}>
                        {product.store.name}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => addToCart(product.id)}
                      className="btn btn-primary btn-full"
                    >
                      Savatga qo'shish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="section section-gray">
          <div className="container">
            <div className="grid grid-3">
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '2.5rem', marginBottom: '1rem'}}>🚚</div>
                <h4 style={{fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem'}}>Tez yetkazib berish</h4>
                <p style={{color: '#6b7280'}}>24 soat ichida O'zbekiston bo'ylab</p>
              </div>
              
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '2.5rem', marginBottom: '1rem'}}>🔒</div>
                <h4 style={{fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem'}}>Xavfsiz to'lov</h4>
                <p style={{color: '#6b7280'}}>Click, Payme, Apelsin orqali</p>
              </div>
              
              <div style={{textAlign: 'center'}}>
                <div style={{fontSize: '2.5rem', marginBottom: '1rem'}}>📞</div>
                <h4 style={{fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem'}}>24/7 yordam</h4>
                <p style={{color: '#6b7280'}}>Har doim sizning xizmatingizda</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        {stats && (
          <section style={{background: '#2563eb', color: 'white', padding: '4rem 0'}}>
            <div className="container">
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem', textAlign: 'center'}}>
                <div>
                  <div style={{fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>{stats.totalProducts}+</div>
                  <div style={{color: '#bfdbfe'}}>Mahsulotlar</div>
                </div>
                <div>
                  <div style={{fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>{stats.totalStores}+</div>
                  <div style={{color: '#bfdbfe'}}>Do'konlar</div>
                </div>
                <div>
                  <div style={{fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>{stats.totalUsers}+</div>
                  <div style={{color: '#bfdbfe'}}>Foydalanuvchilar</div>
                </div>
                <div>
                  <div style={{fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem'}}>4.8⭐</div>
                  <div style={{color: '#bfdbfe'}}>Reyting</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="footer">
          <div className="footer-content">
            <div className="footer-grid">
              <div>
                <h5 className="footer-title">UltraMarket</h5>
                <p className="footer-text">
                  O'zbekistonning eng ishonchli online marketplace
                </p>
                {stats && (
                  <div style={{marginTop: '1rem', fontSize: '0.875rem', color: '#9ca3af'}}>
                    <p>Platform: {stats.platform}</p>
                    <p>Hudud: {stats.region}</p>
                    <p>Valyuta: {stats.currency}</p>
                  </div>
                )}
              </div>
              
              <div>
                <h6 className="footer-title">Foydali havolalar</h6>
                <a href="#" className="footer-link">Biz haqimizda</a>
                <a href="#" className="footer-link">Yordam</a>
                <a href="#" className="footer-link">Aloqa</a>
              </div>
              
              <div>
                <h6 className="footer-title">Xizmatlar</h6>
                {stats && stats.features && (
                  <div>
                    {stats.features.map((feature, index) => (
                      <div key={index} className="footer-text" style={{marginBottom: '0.5rem'}}>{feature}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="footer-bottom">
              <p>&copy; 2024 UltraMarket. Barcha huquqlar himoyalangan.</p>
              {isAuthenticated && (
                <p style={{marginTop: '0.5rem', fontSize: '0.75rem'}}>
                  Authenticated as: {user?.email} | Role: {user?.role}
                </p>
              )}
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default HomePage;