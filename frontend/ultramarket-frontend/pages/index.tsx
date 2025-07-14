import React from 'react';
import Head from 'next/head';

const HomePage: React.FC = () => {
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
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  Kirish
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              O'zbekiston #1 Marketplace
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Eng yaxshi mahsulotlar, qulay narxlar, ishonchli xizmat
            </p>
            
            {/* Search */}
            <div className="max-w-2xl mx-auto">
              <div className="flex">
                <input
                  type="text"
                  placeholder="Mahsulot qidiring..."
                  className="flex-1 px-4 py-3 rounded-l-lg text-gray-900 focus:outline-none"
                />
                <button className="bg-yellow-500 text-gray-900 px-6 py-3 rounded-r-lg font-semibold hover:bg-yellow-400">
                  Qidirish
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h3 className="text-3xl font-bold text-center mb-12">Kategoriyalar</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {[
                { name: 'Elektronika', emoji: '📱' },
                { name: 'Kiyim', emoji: '👕' },
                { name: 'Uy-rozgor', emoji: '🏠' },
                { name: 'Avtomobil', emoji: '🚗' },
                { name: 'Kitoblar', emoji: '📚' },
                { name: 'Sport', emoji: '⚽' }
              ].map((category, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer text-center"
                >
                  <div className="text-4xl mb-3">{category.emoji}</div>
                  <h4 className="font-semibold text-gray-800">{category.name}</h4>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-white py-16">
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

        {/* Stats */}
        <section className="bg-blue-600 text-white py-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold mb-2">1M+</div>
                <div className="text-blue-200">Mahsulotlar</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">50K+</div>
                <div className="text-blue-200">Mijozlar</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">5K+</div>
                <div className="text-blue-200">Do'konlar</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-2">4.8⭐</div>
                <div className="text-blue-200">Reyting</div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h5 className="text-xl font-bold mb-4">UltraMarket</h5>
                <p className="text-gray-400">
                  O'zbekistonning eng ishonchli online marketplace
                </p>
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
                <h6 className="font-semibold mb-4">Aloqa</h6>
                <ul className="space-y-2 text-gray-400">
                  <li>📞 +998 71 123-45-67</li>
                  <li>📧 info@ultramarket.uz</li>
                  <li>📍 Toshkent, O'zbekiston</li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 UltraMarket. Barcha huquqlar himoyalangan.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default HomePage;