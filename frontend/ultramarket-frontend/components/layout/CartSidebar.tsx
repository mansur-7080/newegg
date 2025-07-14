import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Button,
  Badge,
  Divider,
  Chip,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure
} from '@nextui-org/react';
import {
  X,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  Gift,
  Tag,
  Truck,
  Shield,
  Clock,
  CreditCard,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Heart,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  maxQuantity?: number;
  variantId?: string;
  variantName?: string;
  store: {
    id: string;
    name: string;
  };
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity?: (itemId: string, quantity: number) => void;
  onRemoveItem?: (itemId: string) => void;
  onClearCart?: () => void;
}

const CartSidebar: React.FC<CartSidebarProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const { isOpen: isClearModalOpen, onOpen: onClearModalOpen, onClose: onClearModalClose } = useDisclosure();

  // Calculate cart summary
  const calculateSummary = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    
    // Calculate shipping (free shipping over 1,000,000 UZS)
    const shipping = subtotal >= 1000000 ? 0 : 50000;
    
    // Calculate tax (12% in Uzbekistan)
    const tax = subtotal * 0.12;
    
    // Apply promo discount
    const discount = (subtotal * promoDiscount) / 100;
    
    const total = subtotal + shipping + tax - discount;

    return {
      totalItems,
      subtotal,
      shipping,
      tax,
      discount,
      total,
      freeShippingThreshold: 1000000,
      remainingForFreeShipping: Math.max(0, 1000000 - subtotal)
    };
  };

  const summary = calculateSummary();

  // Format price in UZS
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('uz-UZ', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price).replace('UZS', 'so\'m');
  };

  // Handle quantity change
  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      onRemoveItem?.(itemId);
    } else {
      onUpdateQuantity?.(itemId, newQuantity);
    }
  };

  // Handle promo code application
  const handleApplyPromo = async () => {
    setIsApplyingPromo(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock promo codes
    const promoCodes: Record<string, number> = {
      'SAVE10': 10,
      'WELCOME15': 15,
      'NEWUSER20': 20,
      'ULTRAMARKET': 25
    };
    
    const discount = promoCodes[promoCode.toUpperCase()] || 0;
    setPromoDiscount(discount);
    setIsApplyingPromo(false);
    
    if (discount > 0) {
      // Show success message
    } else {
      // Show error message
    }
  };

  // Handle clear cart
  const handleClearCart = () => {
    onClearCart?.();
    onClearModalClose();
  };

  // Quick add to wishlist
  const handleAddToWishlist = (item: CartItem) => {
    // Implementation for adding to wishlist
    console.log('Added to wishlist:', item);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50" 
          onClick={onClose}
        />
        
        {/* Cart Sidebar */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col"
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between z-10">
            <div className="flex items-center space-x-2">
              <ShoppingCart size={20} className="text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">
                Savatcha
              </h2>
              {summary.totalItems > 0 && (
                <Badge content={summary.totalItems} color="primary" size="sm" />
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {items.length > 0 && (
                <Button
                  isIconOnly
                  variant="light"
                  size="sm"
                  onPress={onClearModalOpen}
                  className="text-gray-500 hover:text-red-500"
                >
                  <Trash2 size={18} />
                </Button>
              )}
              <Button
                isIconOnly
                variant="light"
                size="sm"
                onPress={onClose}
              >
                <X size={20} />
              </Button>
            </div>
          </div>

          {items.length === 0 ? (
            /* Empty Cart State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Savatcha bo'sh
              </h3>
              <p className="text-gray-500 mb-6">
                Sevimli mahsulotlaringizni qo'shing va xarid qilishni boshlang
              </p>
              <Button 
                color="primary"
                onPress={onClose}
                endContent={<ArrowRight size={16} />}
              >
                Xarid qilishni boshlash
              </Button>
            </div>
          ) : (
            <>
              {/* Free Shipping Progress */}
              {summary.remainingForFreeShipping > 0 && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Truck size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Bepul yetkazib berish uchun
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, ((summary.subtotal) / 1000000) * 100)}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    Yana <span className="font-semibold text-green-600">
                      {formatPrice(summary.remainingForFreeShipping)}
                    </span> qo'shing
                  </p>
                </div>
              )}

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-4 border-b border-gray-200"
                    >
                      <div className="flex space-x-3">
                        {/* Product Image */}
                        <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                          {!item.isAvailable && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                              <AlertCircle size={16} className="text-white" />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
                              {item.name}
                            </h4>
                            <Button
                              isIconOnly
                              variant="light"
                              size="sm"
                              className="text-gray-400 hover:text-red-500 ml-2"
                              onPress={() => onRemoveItem?.(item.id)}
                            >
                              <X size={14} />
                            </Button>
                          </div>

                          {/* Store & Variant */}
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-xs text-gray-500">{item.store.name}</span>
                            {item.variantName && (
                              <>
                                <span className="text-xs text-gray-300">•</span>
                                <Chip size="sm" variant="flat" className="text-xs">
                                  {item.variantName}
                                </Chip>
                              </>
                            )}
                          </div>

                          {/* Price & Quantity */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-semibold text-gray-900">
                                {formatPrice(item.price)}
                              </span>
                              {item.originalPrice && item.originalPrice > item.price && (
                                <span className="text-xs text-gray-500 line-through">
                                  {formatPrice(item.originalPrice)}
                                </span>
                              )}
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center space-x-1">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                isDisabled={item.quantity <= 1}
                                onPress={() => handleQuantityChange(item.id, item.quantity - 1)}
                              >
                                <Minus size={12} />
                              </Button>
                              
                              <div className="w-12 text-center">
                                <span className="text-sm font-medium">{item.quantity}</span>
                              </div>
                              
                              <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                isDisabled={item.maxQuantity ? item.quantity >= item.maxQuantity : false}
                                onPress={() => handleQuantityChange(item.id, item.quantity + 1)}
                              >
                                <Plus size={12} />
                              </Button>
                            </div>
                          </div>

                          {/* Availability Status */}
                          {!item.isAvailable && (
                            <div className="flex items-center space-x-1 mt-2">
                              <AlertCircle size={12} className="text-red-500" />
                              <span className="text-xs text-red-500">Mavjud emas</span>
                            </div>
                          )}

                          {/* Quick Actions */}
                          <div className="flex items-center space-x-3 mt-2">
                            <Button
                              size="sm"
                              variant="light"
                              startContent={<Heart size={12} />}
                              className="text-xs p-0 h-auto"
                              onPress={() => handleAddToWishlist(item)}
                            >
                              Sevimlilar
                            </Button>
                            <Button
                              size="sm"
                              variant="light"
                              startContent={<RefreshCw size={12} />}
                              className="text-xs p-0 h-auto"
                            >
                              Keyinroq
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Promo Code Section */}
              <div className="border-t border-gray-200 p-4">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Promo kod kiriting"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    startContent={<Tag size={16} className="text-gray-400" />}
                    size="sm"
                    classNames={{
                      inputWrapper: "h-10"
                    }}
                  />
                  <Button
                    size="sm"
                    variant="flat"
                    isLoading={isApplyingPromo}
                    isDisabled={!promoCode.trim()}
                    onPress={handleApplyPromo}
                    className="px-4"
                  >
                    Qo'llash
                  </Button>
                </div>
                
                {promoDiscount > 0 && (
                  <div className="flex items-center space-x-2 mt-2 p-2 bg-green-50 rounded-lg">
                    <CheckCircle size={14} className="text-green-600" />
                    <span className="text-sm text-green-700">
                      {promoDiscount}% chegirma qo'llanildi
                    </span>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="border-t border-gray-200 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Mahsulotlar ({summary.totalItems})</span>
                  <span className="text-gray-900">{formatPrice(summary.subtotal)}</span>
                </div>

                {summary.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Chegirma</span>
                    <span className="text-green-600">-{formatPrice(summary.discount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Yetkazib berish</span>
                  <span className="text-gray-900">
                    {summary.shipping === 0 ? (
                      <span className="text-green-600">Bepul</span>
                    ) : (
                      formatPrice(summary.shipping)
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Soliq (12%)</span>
                  <span className="text-gray-900">{formatPrice(summary.tax)}</span>
                </div>

                <Divider />

                <div className="flex justify-between text-lg font-semibold">
                  <span>Jami:</span>
                  <span className="text-primary-600">{formatPrice(summary.total)}</span>
                </div>

                {/* Trust Badges */}
                <div className="flex items-center justify-center space-x-4 py-3 text-xs text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Shield size={12} />
                    <span>Xavfsiz to'lov</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Truck size={12} />
                    <span>Tez yetkazib berish</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RefreshCw size={12} />
                    <span>Qaytarish</span>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
                <Link href="/checkout">
                  <Button
                    color="primary"
                    size="lg"
                    className="w-full font-semibold"
                    startContent={<CreditCard size={20} />}
                    endContent={<ArrowRight size={20} />}
                    onPress={onClose}
                  >
                    Buyurtma berish
                  </Button>
                </Link>
                
                <p className="text-xs text-gray-500 text-center mt-2">
                  Buyurtma berish orqali siz{' '}
                  <Link href="/terms" className="text-primary-600 hover:underline">
                    foydalanish shartlari
                  </Link>
                  ga rozilik bildirasiz
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Clear Cart Confirmation Modal */}
      <Modal isOpen={isClearModalOpen} onClose={onClearModalClose} size="sm">
        <ModalContent>
          <ModalHeader>Savatchani tozalash</ModalHeader>
          <ModalBody>
            <p>Barcha mahsulotlarni savatchadan olib tashlashni xohlaysizmi?</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClearModalClose}>
              Bekor qilish
            </Button>
            <Button color="danger" onPress={handleClearCart}>
              Ha, tozalash
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default CartSidebar;