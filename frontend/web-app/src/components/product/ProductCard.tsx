import React from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  rating?: number;
  reviews?: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onAddToWishlist?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onAddToCart, 
  onAddToWishlist 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-w-16 aspect-h-9">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-48 object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://via.placeholder.com/300x200?text=Product';
          }}
        />
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {product.name}
        </h3>
        
        <div className="flex items-center justify-between mb-3">
          <span className="text-xl font-bold text-blue-600">
            {product.price.toLocaleString('uz-UZ')} UZS
          </span>
          
          {product.rating && (
            <div className="flex items-center">
              <span className="text-yellow-400">★</span>
              <span className="text-sm text-gray-600 ml-1">
                {product.rating} ({product.reviews || 0})
              </span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2">
          {onAddToCart && (
            <button
              onClick={() => onAddToCart(product)}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Savatga qo'shish
            </button>
          )}
          
          {onAddToWishlist && (
            <button
              onClick={() => onAddToWishlist(product)}
              className="p-2 border border-gray-300 rounded-md hover:border-gray-400 transition-colors"
            >
              ♡
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;