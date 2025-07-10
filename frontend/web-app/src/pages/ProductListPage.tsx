import React from 'react';
import { Helmet } from 'react-helmet-async';

const ProductListPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Mahsulotlar | UltraMarket</title>
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mahsulotlar</h1>
        
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Mahsulotlar tez orada qo'shiladi
          </h2>
          <p className="text-gray-600">
            Bizning katalogimiz to'ldirilmoqda. Iltimos, keyinroq qaytib keling.
          </p>
        </div>
      </div>
    </>
  );
};

export default ProductListPage; 