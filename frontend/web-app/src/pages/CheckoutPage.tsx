import React from 'react';
import { Helmet } from 'react-helmet-async';

const CheckoutPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>To'lov | UltraMarket</title>
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">To'lov Sahifasi</h1>
          <p className="text-gray-600">To'lov tizimi tez orada qo'shiladi.</p>
        </div>
      </div>
    </>
  );
};

export default CheckoutPage; 