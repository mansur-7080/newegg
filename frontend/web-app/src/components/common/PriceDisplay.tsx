import React from 'react';
import { Typography, Space, Tag } from 'antd';

const { Title, Text } = Typography;

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
  style = {},
}) => {
  const formatPrice = (amount: number) => {
    if (currency === 'UZS') {
      return new Intl.NumberFormat('uz-UZ').format(amount) + ' so\'m';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercentage = hasDiscount 
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  const getTitleLevel = () => {
    switch (size) {
      case 'small': return 5;
      case 'medium': return 4;
      case 'large': return 3;
      default: return 4;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small': return '12px';
      case 'medium': return '14px';
      case 'large': return '16px';
      default: return '14px';
    }
  };

  return (
    <div style={style}>
      <Space direction={vertical ? 'vertical' : 'horizontal'} size="small" align="start">
        {/* Joriy narx */}
        <Title 
          level={getTitleLevel()} 
          style={{ 
            margin: 0, 
            color: hasDiscount ? '#ff4d4f' : '#1890ff' 
          }}
        >
          {formatPrice(price)}
        </Title>

        {/* Asl narx (agar chegirma bo'lsa) */}
        {hasDiscount && (
          <Space size="small">
            <Text 
              delete 
              style={{ 
                fontSize: getTextSize(),
                color: '#8c8c8c'
              }}
            >
              {formatPrice(originalPrice)}
            </Text>
            
            {showDiscount && (
              <Tag color="red" size="small">
                -{discountPercentage}%
              </Tag>
            )}
          </Space>
        )}
      </Space>

      {/* Tejash miqdori */}
      {hasDiscount && (
        <Text 
          style={{ 
            fontSize: getTextSize(),
            color: '#52c41a',
            display: 'block',
            marginTop: '4px'
          }}
        >
          Tejaysiz: {formatPrice(originalPrice - price)}
        </Text>
      )}
    </div>
  );
};

export default PriceDisplay;