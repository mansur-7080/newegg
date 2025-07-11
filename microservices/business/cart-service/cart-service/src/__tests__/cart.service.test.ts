/**
 * Cart Service Tests
 * Comprehensive test suite for cart service functionality
 */

import { CartService } from '../services/cart.service';
import { CartRepository } from '../repositories/cart.repository';
import { ProductService } from '../services/product.service';
import { UserService } from '../services/user.service';
import { PrismaClient } from '@prisma/client';
import { logger } from '@ultramarket/shared/logging/logger';

// Mock dependencies
jest.mock('../repositories/cart.repository');
jest.mock('../services/product.service');
jest.mock('../services/user.service');
jest.mock('@prisma/client');
jest.mock('@ultramarket/shared/logging/logger');

describe('CartService', () => {
  let cartService: CartService;
  let mockCartRepository: jest.Mocked<CartRepository>;
  let mockProductService: jest.Mocked<ProductService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockPrismaClient: jest.Mocked<PrismaClient>;

  // Test data
  const mockUserId = 'user-123';
  const mockProductId = 'product-456';
  const mockCartId = 'cart-789';

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: 'CUSTOMER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProduct = {
    id: mockProductId,
    name: 'Test Product',
    slug: 'test-product',
    description: 'Test product description',
    price: 99.99,
    currency: 'USD',
    status: 'ACTIVE',
    isActive: true,
    stock: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCartItem = {
    id: 'item-123',
    cartId: mockCartId,
    productId: mockProductId,
    quantity: 2,
    price: 99.99,
    total: 199.98,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: mockProduct,
  };

  const mockCart = {
    id: mockCartId,
    userId: mockUserId,
    status: 'ACTIVE',
    totalAmount: 199.98,
    totalItems: 2,
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [mockCartItem],
    user: mockUser,
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockCartRepository = new CartRepository(mockPrismaClient) as jest.Mocked<CartRepository>;
    mockProductService = new ProductService() as jest.Mocked<ProductService>;
    mockUserService = new UserService() as jest.Mocked<UserService>;
    mockPrismaClient = new PrismaClient() as jest.Mocked<PrismaClient>;

    // Initialize service
    cartService = new CartService(mockCartRepository, mockProductService, mockUserService);
  });

  describe('getCart', () => {
    it('should return existing cart for user', async () => {
      // Arrange
      mockCartRepository.findByUserId.mockResolvedValue(mockCart);

      // Act
      const result = await cartService.getCart(mockUserId);

      // Assert
      expect(result).toEqual(mockCart);
      expect(mockCartRepository.findByUserId).toHaveBeenCalledWith(mockUserId);
    });

    it('should create new cart if none exists', async () => {
      // Arrange
      mockCartRepository.findByUserId.mockResolvedValue(null);
      mockCartRepository.create.mockResolvedValue({
        ...mockCart,
        items: [],
        totalAmount: 0,
        totalItems: 0,
      });

      // Act
      const result = await cartService.getCart(mockUserId);

      // Assert
      expect(result.totalAmount).toBe(0);
      expect(result.totalItems).toBe(0);
      expect(result.items).toEqual([]);
      expect(mockCartRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        status: 'ACTIVE',
        totalAmount: 0,
        totalItems: 0,
        currency: 'USD',
      });
    });

    it('should throw error if user does not exist', async () => {
      // Arrange
      mockUserService.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(cartService.getCart('invalid-user')).rejects.toThrow('User not found');
    });
  });

  describe('addItem', () => {
    it('should add new item to cart', async () => {
      // Arrange
      mockCartRepository.findByUserId.mockResolvedValue(mockCart);
      mockProductService.findById.mockResolvedValue(mockProduct);
      mockCartRepository.addItem.mockResolvedValue(mockCartItem);
      mockCartRepository.updateTotals.mockResolvedValue({
        ...mockCart,
        totalAmount: 299.97,
        totalItems: 3,
      });

      // Act
      const result = await cartService.addItem(mockUserId, mockProductId, 1);

      // Assert
      expect(result).toBeDefined();
      expect(mockCartRepository.addItem).toHaveBeenCalledWith(
        mockCartId,
        mockProductId,
        1,
        mockProduct.price
      );
      expect(mockCartRepository.updateTotals).toHaveBeenCalledWith(mockCartId);
    });

    it('should update existing item quantity', async () => {
      // Arrange
      const existingCart = {
        ...mockCart,
        items: [mockCartItem],
      };
      mockCartRepository.findByUserId.mockResolvedValue(existingCart);
      mockProductService.findById.mockResolvedValue(mockProduct);
      mockCartRepository.updateItemQuantity.mockResolvedValue({
        ...mockCartItem,
        quantity: 3,
        total: 299.97,
      });

      // Act
      const result = await cartService.addItem(mockUserId, mockProductId, 1);

      // Assert
      expect(mockCartRepository.updateItemQuantity).toHaveBeenCalledWith(mockCartItem.id, 3);
    });

    it('should throw error if product not found', async () => {
      // Arrange
      mockCartRepository.findByUserId.mockResolvedValue(mockCart);
      mockProductService.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(cartService.addItem(mockUserId, 'invalid-product', 1)).rejects.toThrow(
        'Product not found'
      );
    });

    it('should throw error if insufficient stock', async () => {
      // Arrange
      const lowStockProduct = { ...mockProduct, stock: 1 };
      mockCartRepository.findByUserId.mockResolvedValue(mockCart);
      mockProductService.findById.mockResolvedValue(lowStockProduct);

      // Act & Assert
      await expect(cartService.addItem(mockUserId, mockProductId, 5)).rejects.toThrow(
        'Insufficient stock'
      );
    });

    it('should throw error if invalid quantity', async () => {
      // Arrange
      mockCartRepository.findByUserId.mockResolvedValue(mockCart);

      // Act & Assert
      await expect(cartService.addItem(mockUserId, mockProductId, 0)).rejects.toThrow(
        'Quantity must be greater than 0'
      );

      await expect(cartService.addItem(mockUserId, mockProductId, -1)).rejects.toThrow(
        'Quantity must be greater than 0'
      );
    });
  });

  describe('updateItemQuantity', () => {
    it('should update item quantity successfully', async () => {
      // Arrange
      const itemId = 'item-123';
      const newQuantity = 5;
      mockCartRepository.findItemById.mockResolvedValue(mockCartItem);
      mockProductService.findById.mockResolvedValue(mockProduct);
      mockCartRepository.updateItemQuantity.mockResolvedValue({
        ...mockCartItem,
        quantity: newQuantity,
        total: newQuantity * mockProduct.price,
      });

      // Act
      const result = await cartService.updateItemQuantity(mockUserId, itemId, newQuantity);

      // Assert
      expect(result.quantity).toBe(newQuantity);
      expect(result.total).toBe(newQuantity * mockProduct.price);
      expect(mockCartRepository.updateItemQuantity).toHaveBeenCalledWith(itemId, newQuantity);
    });

    it('should remove item if quantity is 0', async () => {
      // Arrange
      const itemId = 'item-123';
      mockCartRepository.findItemById.mockResolvedValue(mockCartItem);
      mockCartRepository.removeItem.mockResolvedValue(true);

      // Act
      await cartService.updateItemQuantity(mockUserId, itemId, 0);

      // Assert
      expect(mockCartRepository.removeItem).toHaveBeenCalledWith(itemId);
    });

    it('should throw error if item not found', async () => {
      // Arrange
      mockCartRepository.findItemById.mockResolvedValue(null);

      // Act & Assert
      await expect(cartService.updateItemQuantity(mockUserId, 'invalid-item', 1)).rejects.toThrow(
        'Cart item not found'
      );
    });

    it('should throw error if item does not belong to user', async () => {
      // Arrange
      const otherUserItem = {
        ...mockCartItem,
        cart: { ...mockCart, userId: 'other-user' },
      };
      mockCartRepository.findItemById.mockResolvedValue(otherUserItem);

      // Act & Assert
      await expect(cartService.updateItemQuantity(mockUserId, 'item-123', 1)).rejects.toThrow(
        'Unauthorized access to cart item'
      );
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      // Arrange
      const itemId = 'item-123';
      mockCartRepository.findItemById.mockResolvedValue(mockCartItem);
      mockCartRepository.removeItem.mockResolvedValue(true);

      // Act
      const result = await cartService.removeItem(mockUserId, itemId);

      // Assert
      expect(result).toBe(true);
      expect(mockCartRepository.removeItem).toHaveBeenCalledWith(itemId);
    });

    it('should throw error if item not found', async () => {
      // Arrange
      mockCartRepository.findItemById.mockResolvedValue(null);

      // Act & Assert
      await expect(cartService.removeItem(mockUserId, 'invalid-item')).rejects.toThrow(
        'Cart item not found'
      );
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', async () => {
      // Arrange
      mockCartRepository.findByUserId.mockResolvedValue(mockCart);
      mockCartRepository.clearCart.mockResolvedValue(true);

      // Act
      const result = await cartService.clearCart(mockUserId);

      // Assert
      expect(result).toBe(true);
      expect(mockCartRepository.clearCart).toHaveBeenCalledWith(mockCartId);
    });

    it('should throw error if cart not found', async () => {
      // Arrange
      mockCartRepository.findByUserId.mockResolvedValue(null);

      // Act & Assert
      await expect(cartService.clearCart(mockUserId)).rejects.toThrow('Cart not found');
    });
  });

  describe('calculateTotals', () => {
    it('should calculate cart totals correctly', async () => {
      // Arrange
      const cartItems = [
        { ...mockCartItem, quantity: 2, price: 99.99 },
        { ...mockCartItem, id: 'item-456', quantity: 1, price: 49.99 },
      ];
      const cartWithItems = { ...mockCart, items: cartItems };
      mockCartRepository.findByUserId.mockResolvedValue(cartWithItems);

      // Act
      const result = await cartService.calculateTotals(mockUserId);

      // Assert
      expect(result.totalAmount).toBe(249.97); // (2 * 99.99) + (1 * 49.99)
      expect(result.totalItems).toBe(3); // 2 + 1
      expect(result.itemCount).toBe(2); // 2 different items
    });

    it('should return zero totals for empty cart', async () => {
      // Arrange
      const emptyCart = { ...mockCart, items: [] };
      mockCartRepository.findByUserId.mockResolvedValue(emptyCart);

      // Act
      const result = await cartService.calculateTotals(mockUserId);

      // Assert
      expect(result.totalAmount).toBe(0);
      expect(result.totalItems).toBe(0);
      expect(result.itemCount).toBe(0);
    });
  });

  describe('validateCartForCheckout', () => {
    it('should validate cart successfully', async () => {
      // Arrange
      mockCartRepository.findByUserId.mockResolvedValue(mockCart);
      mockProductService.findById.mockResolvedValue(mockProduct);

      // Act
      const result = await cartService.validateCartForCheckout(mockUserId);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return validation errors for empty cart', async () => {
      // Arrange
      const emptyCart = { ...mockCart, items: [] };
      mockCartRepository.findByUserId.mockResolvedValue(emptyCart);

      // Act
      const result = await cartService.validateCartForCheckout(mockUserId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cart is empty');
    });

    it('should return validation errors for out of stock items', async () => {
      // Arrange
      const outOfStockProduct = { ...mockProduct, stock: 0 };
      mockCartRepository.findByUserId.mockResolvedValue(mockCart);
      mockProductService.findById.mockResolvedValue(outOfStockProduct);

      // Act
      const result = await cartService.validateCartForCheckout(mockUserId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Product "${mockProduct.name}" is out of stock`);
    });

    it('should return validation errors for insufficient stock', async () => {
      // Arrange
      const lowStockProduct = { ...mockProduct, stock: 1 };
      const highQuantityItem = { ...mockCartItem, quantity: 5 };
      const cartWithHighQuantity = {
        ...mockCart,
        items: [highQuantityItem],
      };
      mockCartRepository.findByUserId.mockResolvedValue(cartWithHighQuantity);
      mockProductService.findById.mockResolvedValue(lowStockProduct);

      // Act
      const result = await cartService.validateCartForCheckout(mockUserId);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Insufficient stock for "${mockProduct.name}". Available: 1, Requested: 5`
      );
    });
  });

  describe('mergeCarts', () => {
    it('should merge guest cart with user cart', async () => {
      // Arrange
      const guestCartId = 'guest-cart-123';
      const guestCart = {
        ...mockCart,
        id: guestCartId,
        userId: null,
        items: [{ ...mockCartItem, id: 'guest-item-1' }],
      };
      const userCart = {
        ...mockCart,
        items: [{ ...mockCartItem, id: 'user-item-1' }],
      };

      mockCartRepository.findById.mockResolvedValue(guestCart);
      mockCartRepository.findByUserId.mockResolvedValue(userCart);
      mockCartRepository.mergeItems.mockResolvedValue(true);
      mockCartRepository.delete.mockResolvedValue(true);

      // Act
      const result = await cartService.mergeCarts(mockUserId, guestCartId);

      // Assert
      expect(result).toBe(true);
      expect(mockCartRepository.mergeItems).toHaveBeenCalledWith(userCart.id, guestCart.items);
      expect(mockCartRepository.delete).toHaveBeenCalledWith(guestCartId);
    });

    it('should handle merge when user has no existing cart', async () => {
      // Arrange
      const guestCartId = 'guest-cart-123';
      const guestCart = {
        ...mockCart,
        id: guestCartId,
        userId: null,
      };

      mockCartRepository.findById.mockResolvedValue(guestCart);
      mockCartRepository.findByUserId.mockResolvedValue(null);
      mockCartRepository.updateUserId.mockResolvedValue(true);

      // Act
      const result = await cartService.mergeCarts(mockUserId, guestCartId);

      // Assert
      expect(result).toBe(true);
      expect(mockCartRepository.updateUserId).toHaveBeenCalledWith(guestCartId, mockUserId);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      mockCartRepository.findByUserId.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(cartService.getCart(mockUserId)).rejects.toThrow('Database connection failed');
    });

    it('should log errors appropriately', async () => {
      // Arrange
      const error = new Error('Test error');
      mockCartRepository.findByUserId.mockRejectedValue(error);

      // Act
      try {
        await cartService.getCart(mockUserId);
      } catch (e) {
        // Expected to throw
      }

      // Assert
      expect(logger.error).toHaveBeenCalledWith('Error in CartService.getCart', {
        userId: mockUserId,
        error: error.message,
      });
    });
  });

  describe('performance tests', () => {
    it('should handle large cart operations efficiently', async () => {
      // Arrange
      const largeCartItems = Array.from({ length: 100 }, (_, i) => ({
        ...mockCartItem,
        id: `item-${i}`,
        productId: `product-${i}`,
      }));
      const largeCart = { ...mockCart, items: largeCartItems };
      mockCartRepository.findByUserId.mockResolvedValue(largeCart);

      // Act
      const startTime = Date.now();
      await cartService.calculateTotals(mockUserId);
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
