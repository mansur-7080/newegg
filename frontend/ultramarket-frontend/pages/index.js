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
        // Invalid user data
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
        
        // API chaqiruvlari
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
      // Bu yerda search results page-ga yo'naltirish kerak
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Yuklanmoqda...</p>
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

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-blue-600">UltraMarket</h1>
                <span className="ml-2 text-sm text-gray-500">O'zbekiston</span>
              </div>
              
              <nav className="hidden md:flex space-x-6">
                <a href="#" className="text-gray-600 hover:text-blue-600">Kategoriyalar</a>
                <a href="#" className="text-gray-600 hover:text-blue-600">Do'konlar</a>
                <a href="#" className="text-gray-600 hover:text-blue-600">Yordam</a>
              </nav>
              
              <div className="flex items-center space-x-4">
                {isAuthenticated ? (
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-600">
                      Salom, {user?.firstName}!
                    </span>
                    <button
                      onClick={handleLogout}
                      className="text-sm text-gray-600 hover:text-red-600"
                    >
                      Chiqish
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Link href="/auth/login">
                      <button className="text-blue-600 hover:text-blue-700 px-3 py-2 text-sm">
                        Kirish
                      </button>
                    </Link>
                    <Link href="/auth/register">
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm">
                        Ro'yxatdan o'tish
                      </button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Authentication Status Banner */}
        {isAuthenticated && (
          <div className="bg-green-50 border-b border-green-200">
            <div className="max-w-7xl mx-auto px-4 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-green-700 text-sm">
                    ✅ Siz tizimga kirdingiz
                  </span>
                </div>
                <div className="text-xs text-green-600">
                  Email: {user?.email}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              O'zbekiston #1 Marketplace
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              {stats ? `${stats.totalProducts} mahsulot, ${stats.totalStores} do'kon, ${stats.totalUsers} foydalanuvchi` : 'Eng yaxshi mahsulotlar'}
            </p>
            
            {/* Search */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="flex">
                <input
                  type="text"
                  placeholder="Mahsulot qidiring..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-l-lg text-gray-900 focus:outline-none"
                />
                <button 
                  type="submit"
                  className="bg-yellow-500 text-gray-900 px-6 py-3 rounded-r-lg font-semibold hover:bg-yellow-400"
                >
                  Qidirish
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Categories */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h3 className="text-3xl font-bold text-center mb-12">Kategoriyalar</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer text-center"
                >
                  <div className="text-4xl mb-3">
                    {category.id === 'electronics' && '📱'}
                    {category.id === 'fashion' && '👕'}
                    {category.id === 'home' && '🏠'}
                    {category.id === 'automotive' && '🚗'}
                  </div>
                  <h4 className="font-semibold text-gray-800">{category.nameUz}</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {category.productCount.toLocaleString()} mahsulot
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Products */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <h3 className="text-3xl font-bold text-center mb-12">Mashhur mahsulotlar</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-gray-50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">📱</span>
                  </div>
                  
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {product.nameUz || product.name}
                    </h4>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-lg font-bold text-blue-600">
                          {formatPrice(product.price)}
                        </p>
                        {product.originalPrice && (
                          <p className="text-sm text-gray-500 line-through">
                            {formatPrice(product.originalPrice)}
                          </p>
                        )}
                      </div>
                      
                      {product.discount && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                          -{product.discount}%
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-1">
                        <span className="text-yellow-500">⭐</span>
                        <span className="text-sm text-gray-600">
                          {product.rating} ({product.reviewCount})
                        </span>
                      </div>
                      
                      <span className="text-xs text-gray-500">
                        {product.store.name}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => addToCart(product.id)}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
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
        <section className="bg-gray-100 py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-4">🚚</div>
                <h4 className="text-xl font-semibold mb-2">Tez yetkazib berish</h4>
                <p className="text-gray-600">24 soat ichida O'zbekiston bo'ylab</p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl mb-4">🔒</div>
                <h4 className="text-xl font-semibold mb-2">Xavfsiz to'lov</h4>
                <p className="text-gray-600">Click, Payme, Apelsin orqali</p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl mb-4">📞</div>
                <h4 className="text-xl font-semibold mb-2">24/7 yordam</h4>
                <p className="text-gray-600">Har doim sizning xizmatingizda</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats - Real API data */}
        {stats && (
          <section className="bg-blue-600 text-white py-16">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold mb-2">{stats.totalProducts}+</div>
                  <div className="text-blue-200">Mahsulotlar</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-2">{stats.totalStores}+</div>
                  <div className="text-blue-200">Do'konlar</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-2">{stats.totalUsers}+</div>
                  <div className="text-blue-200">Foydalanuvchilar</div>
                </div>
                <div>
                  <div className="text-3xl font-bold mb-2">4.8⭐</div>
                  <div className="text-blue-200">Reyting</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h5 className="text-xl font-bold mb-4">UltraMarket</h5>
                <p className="text-gray-400">
                  O'zbekistonning eng ishonchli online marketplace
                </p>
                {stats && (
                  <div className="mt-4 text-sm text-gray-400">
                    <p>Platform: {stats.platform}</p>
                    <p>Hudud: {stats.region}</p>
                    <p>Valyuta: {stats.currency}</p>
                  </div>
                )}
              </div>
              
              <div>
                <h6 className="font-semibold mb-4">Foydali havolalar</h6>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white">Biz haqimizda</a></li>
                  <li><a href="#" className="hover:text-white">Yordam</a></li>
                  <li><a href="#" className="hover:text-white">Aloqa</a></li>
                </ul>
              </div>
              
              <div>
                <h6 className="font-semibold mb-4">Xizmatlar</h6>
                {stats && stats.features && (
                  <ul className="space-y-2 text-gray-400">
                    {stats.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 UltraMarket. Barcha huquqlar himoyalangan.</p>
              {isAuthenticated && (
                <p className="mt-2 text-xs">
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