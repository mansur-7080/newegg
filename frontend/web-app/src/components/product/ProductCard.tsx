import React from 'react';

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  category?: string;
  discount?: number;
  isNew?: boolean;
  isBestseller?: boolean;
  brand?: string;
  description?: string;
}

interface ProductCardProps {
  product: Product;
  loading?: boolean;
  onAddToCart?: (product: Product) => void;
  onAddToWishlist?: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  onClick?: (product: Product) => void;
  className?: string;
  style?: React.CSSProperties;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  loading = false,
  onAddToCart,
  onAddToWishlist,
  onQuickView,
  onClick,
  className = '',
  style,
}) => {
  // UZS narxni formatlash
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
      onAddToWishlist(product);
    }
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickView) {
      onQuickView(product);
    }
  };

  if (loading) {
    return (
      <div
        className={`product-card loading ${className}`}
        style={{
          border: '1px solid #f0f0f0',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#fafafa',
          height: '350px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style,
        }}
      >
        <div>Yuklanmoqda...</div>
      </div>
    );
  }

  return (
    <div
      className={`product-card ${className}`}
      style={{
        border: '1px solid #f0f0f0',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.3s',
        backgroundColor: 'white',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Product Image */}
      <div
        style={{
          position: 'relative',
          height: '200px',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
        onClick={handleCardClick}
      >
        <img
          alt={product.name}
          src={product.image}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        
        {/* Discount Badge */}
        {product.discount && (
          <span
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: '#ff4d4f',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            -{product.discount}%
          </span>
        )}

        {/* New Badge */}
        {product.isNew && (
          <span
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: '#52c41a',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            Yangi
          </span>
        )}

        {/* Action Buttons */}
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            display: 'flex',
            gap: '4px',
            opacity: 0,
            transition: 'opacity 0.3s',
          }}
          className="product-actions"
        >
          <button
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid #d9d9d9',
              backgroundColor: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={handleAddToWishlist}
            title="Sevimlilarga qo'shish"
          >
            ♡
          </button>
          <button
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: '1px solid #d9d9d9',
              backgroundColor: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={handleQuickView}
            title="Tez ko'rish"
          >
            👁
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div style={{ padding: '16px' }}>
        {/* Brand */}
        {product.brand && (
          <div
            style={{
              fontSize: '12px',
              color: '#8c8c8c',
              marginBottom: '4px',
            }}
          >
            {product.brand}
          </div>
        )}

        {/* Product Name */}
        <h3
          style={{
            fontSize: '14px',
            fontWeight: '500',
            margin: '0 0 8px 0',
            lineHeight: '1.4',
            height: '40px',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
          onClick={handleCardClick}
        >
          {product.name}
        </h3>

        {/* Rating */}
        {product.rating && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginBottom: '8px',
            }}
          >
            <div style={{ color: '#faad14' }}>
              {'★'.repeat(Math.floor(product.rating))}
              {'☆'.repeat(5 - Math.floor(product.rating))}
            </div>
            {product.reviewCount && (
              <span style={{ fontSize: '12px', color: '#8c8c8c' }}>
                ({product.reviewCount})
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div style={{ marginBottom: '12px' }}>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: product.originalPrice ? '#ff4d4f' : '#262626',
            }}
          >
            {formatPrice(product.price)}
          </div>
          {product.originalPrice && product.originalPrice > product.price && (
            <div
              style={{
                fontSize: '12px',
                color: '#8c8c8c',
                textDecoration: 'line-through',
              }}
            >
              {formatPrice(product.originalPrice)}
            </div>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          style={{
            width: '100%',
            height: '32px',
            backgroundColor: product.inStock !== false ? '#1890ff' : '#d9d9d9',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: product.inStock !== false ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: '500',
          }}
          onClick={handleAddToCart}
          disabled={product.inStock === false}
        >
          {product.inStock === false ? 'Mavjud emas' : 'Savatga qo\'shish'}
        </button>
      </div>


    </div>
  );
};

export default ProductCard;