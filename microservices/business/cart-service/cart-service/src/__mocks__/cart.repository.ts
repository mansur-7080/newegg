import { jest } from '@jest/globals';
import { CartRepository, PrismaCart, PrismaCartItem } from '../repositories/cart.repository';

// Mock cart repository implementation for tests
const mockCartRepository: jest.Mocked<CartRepository> = {
  findByUserId: jest.fn(),
  create: jest.fn(),
  addItem: jest.fn(),
  updateItemQuantity: jest.fn(),
  removeItem: jest.fn(),
  clearCart: jest.fn(),
  getCartWithItems: jest.fn(),
};

// Default implementation of mock functions
mockCartRepository.findByUserId.mockImplementation(async (userId: string) => {
  return {
    id: 'mock-cart-id',
    userId,
    totalAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as PrismaCart;
});

mockCartRepository.create.mockImplementation(async (userId: string) => {
  return {
    id: 'mock-cart-id',
    userId,
    totalAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as PrismaCart;
});

mockCartRepository.addItem.mockImplementation(async (cartId, item) => {
  return {
    id: 'mock-item-id',
    cartId,
    ...item,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as PrismaCartItem;
});

mockCartRepository.updateItemQuantity.mockImplementation(async (cartItemId, quantity) => {
  return {
    id: cartItemId,
    cartId: 'mock-cart-id',
    productId: 'mock-product-id',
    quantity,
    price: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as PrismaCartItem;
});

mockCartRepository.getCartWithItems.mockImplementation(async (userId) => {
  return {
    id: 'mock-cart-id',
    userId,
    totalAmount: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [
      {
        id: 'mock-item-id',
        cartId: 'mock-cart-id',
        productId: 'mock-product-id',
        quantity: 1,
        price: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  } as PrismaCart & { items: PrismaCartItem[] };
});

export default mockCartRepository;
