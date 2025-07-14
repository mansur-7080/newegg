import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardBody,
  Button,
  Badge,
  Chip,
  Tooltip
} from '@nextui-org/react';
import {
  Heart,
  ShoppingCart,
  Star,
  Eye,
  Compare,
  Share2,
  Zap,
  Truck,
  Shield
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Product {
  id: string;
  name: string;
  nameUz: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  rating: number;
  reviewCount: number;
  discount?: number;
  isNew?: boolean;
  isFeatured?: boolean;
  isInStock?: boolean;
  category: string;
  store: {
    id: string;
    name: string;
    location: string;
    rating?: number;
    isVerified?: boolean;
  };
  specifications?: {
    brand?: string;
    warranty?: string;
    color?: string;
  };
  tags?: string[];
  freeShipping?: boolean;
  fastDelivery?: boolean;
}

interface ProductCardProps {
  product: Product;
  showNewBadge?: boolean;
  showFeaturedBadge?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
  onAddToCart?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  showNewBadge = false,
  showFeaturedBadge = false,
  variant = 'default',
  onAddToCart,
  onAddToWishlist,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Calculate discount percentage
  const discountPercentage = product.originalPrice && product.price < product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : product.discount || 0;

  // Format price in UZS
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price).replace('UZS', 'so\'m');
  };

  // Handle add to cart
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart?.(product.id);
  };

  // Handle add to wishlist
  const handleAddToWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsInWishlist(!isInWishlist);
    onAddToWishlist?.(product.id);
  };

  // Handle share
  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `${product.name} - ${formatPrice(product.price)}`,
        url: `/products/${product.id}`
      });
    } else {
      // Fallback to copy to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/products/${product.id}`);
    }
  };

  // Get card size classes based on variant
  const getCardClasses = () => {
    switch (variant) {
      case 'compact':
        return 'w-full max-w-xs';
      case 'detailed':
        return 'w-full max-w-sm';
      default:
        return 'w-full max-w-xs';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`${getCardClasses()} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/products/${product.id}`}>
        <Card className="h-full hover:shadow-lg transition-all duration-300 cursor-pointer">
          <CardBody className="p-0">
            {/* Image Container */}
            <div className="relative aspect-square overflow-hidden">
              {/* Product Image */}
              <Image
                src={product.images?.[currentImageIndex] || product.image}
                alt={product.name}
                fill
                className={`object-cover transition-all duration-500 ${
                  isHovered ? 'scale-105' : 'scale-100'
                }`}
                onLoad={() => setImageLoading(false)}
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />

              {/* Loading Skeleton */}
              {imageLoading && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
              )}

              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                {(showNewBadge || product.isNew) && (
                  <Badge color="success" variant="solid" size="sm">
                    Yangi
                  </Badge>
                )}
                {(showFeaturedBadge || product.isFeatured) && (
                  <Badge color="warning" variant="solid" size="sm">
                    ⭐ Top
                  </Badge>
                )}
                {discountPercentage > 0 && (
                  <Badge color="danger" variant="solid" size="sm">
                    -{discountPercentage}%
                  </Badge>
                )}
                {!product.isInStock && (
                  <Badge color="default" variant="solid" size="sm">
                    Tugagan
                  </Badge>
                )}
              </div>

              {/* Quick Actions */}
              <div className={`absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300 ${
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
              }`}>
                <Tooltip content="Sevimlilaraga qo'shish">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    className="bg-white/90 backdrop-blur-sm"
                    onPress={handleAddToWishlist}
                  >
                    <Heart 
                      size={16} 
                      className={isInWishlist ? 'fill-red-500 text-red-500' : ''} 
                    />
                  </Button>
                </Tooltip>

                <Tooltip content="Tez ko'rish">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    className="bg-white/90 backdrop-blur-sm"
                  >
                    <Eye size={16} />
                  </Button>
                </Tooltip>

                <Tooltip content="Ulashish">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="flat"
                    className="bg-white/90 backdrop-blur-sm"
                    onPress={handleShare}
                  >
                    <Share2 size={16} />
                  </Button>
                </Tooltip>
              </div>

              {/* Image Navigation (for multiple images) */}
              {product.images && product.images.length > 1 && (
                <div className={`absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1 transition-all duration-300 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}>
                  {product.images.map((_, index) => (
                    <button
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        setCurrentImageIndex(index);
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Features */}
              {(product.freeShipping || product.fastDelivery) && (
                <div className="absolute bottom-3 left-3 flex gap-1">
                  {product.freeShipping && (
                    <Tooltip content="Bepul yetkazib berish">
                      <div className="p-1 bg-green-500 rounded-full">
                        <Truck size={12} className="text-white" />
                      </div>
                    </Tooltip>
                  )}
                  {product.fastDelivery && (
                    <Tooltip content="Tez yetkazib berish">
                      <div className="p-1 bg-blue-500 rounded-full">
                        <Zap size={12} className="text-white" />
                      </div>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-4 flex flex-col gap-3">
              {/* Store Info */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{product.store.name}</span>
                {product.store.isVerified && (
                  <Shield size={12} className="text-blue-500" />
                )}
                <span>•</span>
                <span>{product.store.location}</span>
              </div>

              {/* Product Name */}
              <h3 className="font-medium text-sm line-clamp-2 leading-relaxed text-gray-900">
                {product.name}
              </h3>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <Star size={14} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{product.rating}</span>
                </div>
                <span className="text-xs text-gray-500">
                  ({product.reviewCount} baho)
                </span>
              </div>

              {/* Price */}
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">
                  {formatPrice(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-sm text-gray-500 line-through">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>

              {/* Specifications (for detailed variant) */}
              {variant === 'detailed' && product.specifications && (
                <div className="flex flex-wrap gap-1">
                  {product.specifications.brand && (
                    <Chip size="sm" variant="flat" color="default">
                      {product.specifications.brand}
                    </Chip>
                  )}
                  {product.specifications.color && (
                    <Chip size="sm" variant="flat" color="default">
                      {product.specifications.color}
                    </Chip>
                  )}
                </div>
              )}

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {product.tags.slice(0, 3).map((tag, index) => (
                    <Chip 
                      key={index} 
                      size="sm" 
                      variant="flat" 
                      color="primary"
                      className="text-xs"
                    >
                      {tag}
                    </Chip>
                  ))}
                </div>
              )}

              {/* Add to Cart Button */}
              <Button
                color="primary"
                size="sm"
                className="w-full font-medium"
                startContent={<ShoppingCart size={16} />}
                onPress={handleAddToCart}
                isDisabled={!product.isInStock}
              >
                {product.isInStock ? 'Savatga qo\'shish' : 'Tugagan'}
              </Button>
            </div>
          </CardBody>
        </Card>
      </Link>
    </motion.div>
  );
};

export default ProductCard;