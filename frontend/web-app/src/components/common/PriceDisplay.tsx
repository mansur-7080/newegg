import React from 'react';

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showDiscount?: boolean;
  className?: string;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  originalPrice,
  currency = 'UZS',
  size = 'md',
  showDiscount = true,
  className = '',
}) => {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateDiscount = () => {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  const discount = calculateDiscount();

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`font-bold text-gray-900 ${sizeClasses[size]}`}>
        {formatPrice(price)}
      </span>
      
      {originalPrice && originalPrice > price && (
        <span className={`text-gray-500 line-through ${sizeClasses[size]}`}>
          {formatPrice(originalPrice)}
        </span>
      )}
      
      {showDiscount && discount > 0 && (
        <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full">
          -{discount}%
        </span>
      )}
    </div>
  );
};

export default PriceDisplay;