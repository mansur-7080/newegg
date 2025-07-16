import React from 'react';
import { Card, Button, Typography, Rate, Tag, Space } from 'antd';
import { ShoppingCartOutlined, HeartOutlined, EyeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Meta } = Card;

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  category: string;
  brand: string;
  inStock: boolean;
  discount?: number;
  description?: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onAddToWishlist?: (productId: string) => void;
  onQuickView?: (productId: string) => void;
  onClick?: (product: Product) => void;
  loading?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onAddToWishlist,
  onQuickView,
  onClick,
  loading = false,
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ').format(price) + ' so\'m';
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(product);
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToWishlist) {
      onAddToWishlist(product.id);
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product.id);
    }
  };

  const actions = [
    <Button
      key="cart"
      type="primary"
      icon={<ShoppingCartOutlined />}
      onClick={handleAddToCart}
      disabled={!product.inStock}
      loading={loading}
    >
      Savatga
    </Button>,
    <Button
      key="wishlist"
      icon={<HeartOutlined />}
      onClick={handleAddToWishlist}
    />,
    <Button
      key="view"
      icon={<EyeOutlined />}
      onClick={handleQuickView}
    />
  ];

  return (
    <Card
      hoverable
      loading={loading}
      cover={
        <div style={{ 
          position: 'relative', 
          height: '200px', 
          overflow: 'hidden',
          cursor: 'pointer' 
        }} onClick={handleCardClick}>
          <img
            alt={product.name}
            src={product.image}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {product.discount && (
            <Tag
              color="red"
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                fontSize: '12px',
              }}
            >
              -{product.discount}%
            </Tag>
          )}
          {!product.inStock && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
              }}
            >
              Tugagan
            </div>
          )}
        </div>
      }
      actions={actions}
      style={{ width: '100%' }}
    >
      <div onClick={handleCardClick} style={{ cursor: 'pointer' }}>
        <Meta
          title={
            <Title level={5} ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
              {product.name}
            </Title>
          }
          description={
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Text type="secondary">{product.brand}</Text>
              
              <div>
                <Rate disabled value={product.rating} style={{ fontSize: '14px' }} />
                <Text style={{ marginLeft: '8px', fontSize: '12px' }}>
                  ({product.reviewCount} ta fikr)
                </Text>
              </div>

              <div>
                <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
                  {formatPrice(product.price)}
                </Title>
                {product.originalPrice && product.originalPrice > product.price && (
                  <Text delete style={{ marginLeft: '8px', fontSize: '14px' }}>
                    {formatPrice(product.originalPrice)}
                  </Text>
                )}
              </div>

              <Tag color="blue" size="small">
                {product.category}
              </Tag>
            </Space>
          }
        />
      </div>
    </Card>
  );
};

export default ProductCard;