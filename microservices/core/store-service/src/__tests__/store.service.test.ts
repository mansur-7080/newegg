import { StoreService, CreateStoreData, UpdateStoreData } from '../services/store.service';
import { getPrismaClient } from '../config/database';

// Mock Prisma client
jest.mock('../config/database');

const mockPrisma = {
  store: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

(getPrismaClient as jest.Mock).mockReturnValue(mockPrisma);

describe('StoreService', () => {
  let storeService: StoreService;

  beforeEach(() => {
    storeService = new StoreService();
    jest.clearAllMocks();
  });

  describe('createStore', () => {
    const mockStoreData: CreateStoreData = {
      name: 'Test Store',
      slug: 'test-store',
      description: 'Test store description',
      ownerId: 'user-123',
      email: 'test@store.com',
      phone: '+998901234567',
    };

    it('should create a new store successfully', async () => {
      const mockCreatedStore = {
        id: 'store-123',
        ...mockStoreData,
        isActive: true,
        isVerified: false,
        commission: 5.0,
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        reviewCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.store.findUnique.mockResolvedValueOnce(null); // No existing store with slug
      mockPrisma.store.findFirst.mockResolvedValueOnce(null); // User doesn't have a store
      mockPrisma.store.create.mockResolvedValueOnce(mockCreatedStore);

      const result = await storeService.createStore(mockStoreData);

      expect(mockPrisma.store.findUnique).toHaveBeenCalledWith({
        where: { slug: mockStoreData.slug },
      });
      expect(mockPrisma.store.findFirst).toHaveBeenCalledWith({
        where: { ownerId: mockStoreData.ownerId },
      });
      expect(mockPrisma.store.create).toHaveBeenCalledWith({
        data: {
          ...mockStoreData,
          isActive: true,
          isVerified: false,
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });
      expect(result).toEqual(mockCreatedStore);
    });

    it('should throw error if slug already exists', async () => {
      const existingStore = { id: 'existing-store', slug: mockStoreData.slug };
      mockPrisma.store.findUnique.mockResolvedValueOnce(existingStore);

      await expect(storeService.createStore(mockStoreData)).rejects.toThrow(
        'Store slug already exists'
      );
    });

    it('should throw error if user already has a store', async () => {
      const existingStore = { id: 'existing-store', ownerId: mockStoreData.ownerId };
      mockPrisma.store.findUnique.mockResolvedValueOnce(null);
      mockPrisma.store.findFirst.mockResolvedValueOnce(existingStore);

      await expect(storeService.createStore(mockStoreData)).rejects.toThrow(
        'User already has a store'
      );
    });
  });

  describe('getStoreById', () => {
    it('should return store by ID', async () => {
      const mockStore = {
        id: 'store-123',
        name: 'Test Store',
        slug: 'test-store',
      };

      mockPrisma.store.findUnique.mockResolvedValueOnce(mockStore);

      const result = await storeService.getStoreById('store-123');

      expect(mockPrisma.store.findUnique).toHaveBeenCalledWith({
        where: { id: 'store-123' },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          _count: {
            select: {
              products: true,
              orders: true,
              reviews: true,
            },
          },
        },
      });
      expect(result).toEqual(mockStore);
    });

    it('should return null if store not found', async () => {
      mockPrisma.store.findUnique.mockResolvedValueOnce(null);

      const result = await storeService.getStoreById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateStore', () => {
    const updateData: UpdateStoreData = {
      name: 'Updated Store Name',
      description: 'Updated description',
    };

    it('should update store successfully', async () => {
      const existingStore = {
        id: 'store-123',
        name: 'Old Name',
        slug: 'test-store',
      };

      const updatedStore = {
        ...existingStore,
        ...updateData,
      };

      mockPrisma.store.findUnique.mockResolvedValueOnce(existingStore);
      mockPrisma.store.update.mockResolvedValueOnce(updatedStore);

      const result = await storeService.updateStore('store-123', updateData);

      expect(mockPrisma.store.findUnique).toHaveBeenCalledWith({
        where: { id: 'store-123' },
      });
      expect(mockPrisma.store.update).toHaveBeenCalledWith({
        where: { id: 'store-123' },
        data: updateData,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      });
      expect(result).toEqual(updatedStore);
    });

    it('should throw error if store not found', async () => {
      mockPrisma.store.findUnique.mockResolvedValueOnce(null);

      await expect(storeService.updateStore('non-existent', updateData)).rejects.toThrow(
        'Store not found'
      );
    });
  });

  describe('deleteStore', () => {
    it('should delete store successfully', async () => {
      const existingStore = {
        id: 'store-123',
        _count: {
          products: 0,
          orders: 0,
        },
      };

      mockPrisma.store.findUnique.mockResolvedValueOnce(existingStore);
      mockPrisma.store.delete.mockResolvedValueOnce(existingStore);

      await storeService.deleteStore('store-123');

      expect(mockPrisma.store.delete).toHaveBeenCalledWith({
        where: { id: 'store-123' },
      });
    });

    it('should throw error if store has products or orders', async () => {
      const existingStore = {
        id: 'store-123',
        _count: {
          products: 5,
          orders: 3,
        },
      };

      mockPrisma.store.findUnique.mockResolvedValueOnce(existingStore);

      await expect(storeService.deleteStore('store-123')).rejects.toThrow(
        'Cannot delete store with existing products or orders'
      );
    });
  });

  describe('getStoreStats', () => {
    it('should return store statistics', async () => {
      const mockStore = {
        id: 'store-123',
        _count: {
          products: 10,
          orders: 25,
          reviews: 15,
        },
        orders: [
          { total: 100 },
          { total: 200 },
          { total: 150 },
        ],
        reviews: [
          { rating: 5 },
          { rating: 4 },
          { rating: 5 },
        ],
      };

      mockPrisma.store.findUnique.mockResolvedValueOnce(mockStore);

      const result = await storeService.getStoreStats('store-123');

      expect(result).toEqual({
        totalProducts: 10,
        totalOrders: 25,
        totalRevenue: 450,
        totalReviews: 15,
        averageRating: 4.7,
      });
    });

    it('should throw error if store not found', async () => {
      mockPrisma.store.findUnique.mockResolvedValueOnce(null);

      await expect(storeService.getStoreStats('non-existent')).rejects.toThrow(
        'Store not found'
      );
    });
  });
});