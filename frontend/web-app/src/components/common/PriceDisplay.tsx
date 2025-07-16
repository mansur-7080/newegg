import React from 'react';

interface PriceDisplayProps {
  price: number;
  originalPrice?: number;
  currency?: string;
  size?: 'small' | 'medium' | 'large';
  showDiscount?: boolean;
  vertical?: boolean;
  style?: React.CSSProperties;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  originalPrice,
  currency = 'UZS',
  size = 'medium',
  showDiscount = true,
  vertical = false,
  style,
}) => {
  // UZS narxni formatlash
  const formatPrice = (amount: number, curr = currency) => {
    if (curr === 'UZS') {
      return new Intl.NumberFormat('uz-UZ', {
        style: 'currency',
        currency: 'UZS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }
    return `${amount.toLocaleString()} ${curr}`;
  };

  // Chegirma foizini hisoblash
  const discountPercentage = originalPrice && originalPrice > price 
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const hasDiscount = discountPercentage > 0;

  const getFontSize = () => {
    switch (size) {
      case 'small': return '14px';
      case 'medium': return '18px';
      case 'large': return '24px';
      default: return '18px';
    }
  };

  const getSmallFontSize = () => {
    switch (size) {
      case 'small': return '12px';
      case 'medium': return '14px';
      case 'large': return '16px';
      default: return '14px';
    }
  };

  return (
    <div style={style}>
      <div 
        style={{ 
          display: 'flex', 
          flexDirection: vertical ? 'column' : 'row',
          alignItems: vertical ? 'flex-start' : 'center',
          gap: '8px',
        }}
      >
        {/* Joriy narx */}
        <span 
          style={{ 
            fontSize: getFontSize(),
            fontWeight: 'bold',
            color: hasDiscount ? '#ff4d4f' : '#1890ff',
            margin: 0,
          }}
        >
          {formatPrice(price)}
        </span>

        {/* Asl narx (agar chegirma bo'lsa) */}
        {hasDiscount && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span 
              style={{ 
                fontSize: getSmallFontSize(),
                color: '#8c8c8c',
                textDecoration: 'line-through',
              }}
            >
              {formatPrice(originalPrice!)}
            </span>
            
            {showDiscount && (
              <span
                style={{
                  backgroundColor: '#ff4d4f',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                -{discountPercentage}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tejash miqdori */}
      {hasDiscount && (
        <div 
          style={{ 
            fontSize: getSmallFontSize(),
            color: '#52c41a',
            marginTop: '4px'
          }}
        >
          Tejaysiz: {formatPrice(originalPrice! - price)}
        </div>
      )}
    </div>
  );
};

export default PriceDisplay;