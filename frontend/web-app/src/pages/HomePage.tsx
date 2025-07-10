import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const HomePage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>UltraMarket - O'zbekiston E-commerce Platformasi</title>
        <meta name="description" content="O'zbekiston uchun zamonaviy e-commerce platformasi" />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 mb-6">
              <span className="text-blue-600">Ultra</span>Market
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              O'zbekiston uchun zamonaviy e-commerce platformasi. 
              Eng yaxshi mahsulotlarni qulay narxlarda sotib oling!
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                to="/products"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-300 transform hover:scale-105"
              >
                Mahsulotlarni Ko'rish
              </Link>
              <Link
                to="/register"
                className="bg-white hover:bg-gray-50 text-blue-600 font-semibold py-3 px-8 rounded-lg border-2 border-blue-600 transition duration-300"
              >
                Ro'yxatdan O'tish
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Tez Yetkazish</h3>
              <p className="text-gray-600">O'zPost va Yandex orqali tez va ishonchli yetkazib berish xizmati</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Xavfsiz To'lov</h3>
              <p className="text-gray-600">Click, Payme, Uzcard orqali xavfsiz va qulay to'lov</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition duration-300">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">24/7 Qo'llab-quvvatlash</h3>
              <p className="text-gray-600">Har doim sizning xizmatingizdamiz, savollaringizga javob beramiz</p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="bg-white rounded-2xl p-8 mt-16 shadow-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">10K+</div>
                <div className="text-gray-600">Mahsulotlar</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">50K+</div>
                <div className="text-gray-600">Buyurtmalar</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">100K+</div>
                <div className="text-gray-600">Mijozlar</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">99.9%</div>
                <div className="text-gray-600">Uptime</div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="text-center mt-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-8">To'lov Usullari</h2>
            <div className="flex justify-center items-center space-x-8 flex-wrap gap-4">
              <div className="bg-white p-4 rounded-lg shadow-md">
                <span className="text-lg font-semibold text-blue-600">Click</span>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md">
                <span className="text-lg font-semibold text-green-600">Payme</span>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md">
                <span className="text-lg font-semibold text-purple-600">Uzcard</span>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md">
                <span className="text-lg font-semibold text-gray-600">Naqd</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomePage; 