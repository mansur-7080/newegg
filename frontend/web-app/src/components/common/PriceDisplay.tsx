import React from 'react';

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  size?: 'small' | 'medium' | 'large';
  showDiscount?: boolean;
  className?: string;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  originalPrice,
  currency = 'UZS',
  size = 'medium',
  showDiscount = true,
  className = '',
}) => {
  const formatPrice = (amount: number): string => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateDiscount = (): number => {
    if (!originalPrice || originalPrice <= price) return 0;
    return Math.round(((originalPrice - price) / originalPrice) * 100);
  };

  const discount = calculateDiscount();

  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-lg',
    large: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Current Price */}
      <span className={`font-bold text-primary ${sizeClasses[size]}`}>
        {formatPrice(price)}
      </span>

      {/* Original Price & Discount */}
      {originalPrice && originalPrice > price && (
        <>
          <span className="text-gray-500 line-through text-sm">
            {formatPrice(originalPrice)}
          </span>
          {showDiscount && discount > 0 && (
            <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold">
              -{discount}%
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default PriceDisplay;