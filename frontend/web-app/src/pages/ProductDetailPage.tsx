import React from 'react';
import { Helmet } from 'react-helmet-async';

const ProductDetailPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Mahsulot | UltraMarket</title>
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Mahsulot Sahifasi</h1>
          <p className="text-gray-600">Mahsulot ma'lumotlari tez orada qo'shiladi.</p>
        </div>
      </div>
    </>
  );
};

export default ProductDetailPage; 