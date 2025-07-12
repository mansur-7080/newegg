/**
 * Cart service type definitions
 */

export interface CartItemRedisData {
  id: string;
  productId: string;
  productName: string;
  price: string; // Redis stores everything as string
  originalPrice?: string;
  quantity: string;
  maxQuantity?: string;
  image?: string;
  sku?: string;
  variant?: string;
  addedAt: string;
  updatedAt: string;
}

export interface CartRedisData {
  userId: string;
  sessionId?: string;
  subtotal: string;
  tax: string;
  shipping: string;
  discount: string;
  total: string;
  currency: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}
