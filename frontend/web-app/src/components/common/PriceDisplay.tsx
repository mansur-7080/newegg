import React from 'react';

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg';
  showDiscount?: boolean;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  originalPrice,
  currency = 'UZS',
  size = 'md',
  showDiscount = true,
}) => {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
  };

  const discountPercentage = originalPrice && originalPrice > price 
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <div className="flex items-center gap-2">
      <span className={`font-bold text-green-600 ${sizeClasses[size]}`}>
        {formatPrice(price)}
      </span>
      
      {originalPrice && originalPrice > price && (
        <>
          <span className={`text-gray-500 line-through ${sizeClasses.sm}`}>
            {formatPrice(originalPrice)}
          </span>
          {showDiscount && discountPercentage > 0 && (
            <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
              -{discountPercentage}%
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default PriceDisplay;