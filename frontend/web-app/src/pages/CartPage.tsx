import React from 'react';
import { Helmet } from 'react-helmet-async';

const CartPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Savat | UltraMarket</title>
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Savatcha</h1>
        
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h8" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Savatcha bo'sh
          </h2>
          <p className="text-gray-600">
            Hozircha savatchangizda hech qanday mahsulot yo'q.
          </p>
        </div>
      </div>
    </>
  );
};

export default CartPage; 