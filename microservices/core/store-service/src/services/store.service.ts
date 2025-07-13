import { PrismaClient, Store, Prisma } from '@prisma/client';
import { createError } from '../middleware/error.middleware';

const prisma = new PrismaClient();

export interface CreateStoreData {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  banner?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  telegram?: string;
  businessLicense?: string;
  taxNumber?: string;
  ownerId: string;
}

export interface UpdateStoreData {
  name?: string;
  slug?: string;
  description?: string;
  logo?: string;
  banner?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  telegram?: string;
  businessLicense?: string;
  taxNumber?: string;
  isActive?: boolean;
  isVerified?: boolean;
  commission?: number;
}

export interface StoreFilters {
  isActive?: boolean;
  isVerified?: boolean;
  ownerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class StoreService {
  async createStore(data: CreateStoreData): Promise<Store> {
    try {
      // Check if slug is unique
      const existingStore = await prisma.store.findUnique({
        where: { slug: data.slug }
      });

      if (existingStore) {
        throw createError('Store slug already exists', 400);
      }

      // Check if user already has a store
      const userStore = await prisma.store.findFirst({
        where: { ownerId: data.ownerId }
      });

      if (userStore) {
        throw createError('User already has a store', 400);
      }

      const store = await prisma.store.create({
        data: {
          ...data,
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
            }
          }
        }
      });

      return store;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw createError('Store with this slug already exists', 400);
        }
      }
      throw error;
    }
  }

  async getStoreById(id: string): Promise<Store | null> {
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        _count: {
          select: {
            products: true,
            orders: true,
            reviews: true,
          }
        }
      }
    });

    return store;
  }

  async getStoreBySlug(slug: string): Promise<Store | null> {
    const store = await prisma.store.findUnique({
      where: { slug },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        _count: {
          select: {
            products: true,
            orders: true,
            reviews: true,
          }
        }
      }
    });

    return store;
  }

  async getStores(filters: StoreFilters = {}): Promise<{
    stores: Store[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    const where: Prisma.StoreWhereInput = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.isVerified !== undefined) {
      where.isVerified = filters.isVerified;
    }

    if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          },
          _count: {
            select: {
              products: true,
              orders: true,
              reviews: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit,
      }),
      prisma.store.count({ where })
    ]);

    return {
      stores,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateStore(id: string, data: UpdateStoreData): Promise<Store> {
    try {
      // Check if store exists
      const existingStore = await prisma.store.findUnique({
        where: { id }
      });

      if (!existingStore) {
        throw createError('Store not found', 404);
      }

      // Check slug uniqueness if slug is being updated
      if (data.slug && data.slug !== existingStore.slug) {
        const slugExists = await prisma.store.findUnique({
          where: { slug: data.slug }
        });

        if (slugExists) {
          throw createError('Store slug already exists', 400);
        }
      }

      const store = await prisma.store.update({
        where: { id },
        data,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          }
        }
      });

      return store;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw createError('Store with this slug already exists', 400);
        }
        if (error.code === 'P2025') {
          throw createError('Store not found', 404);
        }
      }
      throw error;
    }
  }

  async deleteStore(id: string): Promise<void> {
    try {
      // Check if store exists
      const store = await prisma.store.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              products: true,
              orders: true,
            }
          }
        }
      });

      if (!store) {
        throw createError('Store not found', 404);
      }

      // Check if store has products or orders
      if (store._count.products > 0 || store._count.orders > 0) {
        throw createError('Cannot delete store with existing products or orders', 400);
      }

      await prisma.store.delete({
        where: { id }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw createError('Store not found', 404);
        }
      }
      throw error;
    }
  }

  async verifyStore(id: string): Promise<Store> {
    try {
      const store = await prisma.store.update({
        where: { id },
        data: { isVerified: true },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          }
        }
      });

      return store;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw createError('Store not found', 404);
        }
      }
      throw error;
    }
  }

  async getStoreStats(id: string): Promise<{
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalReviews: number;
    averageRating: number;
  }> {
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
            orders: true,
            reviews: true,
          }
        },
        orders: {
          select: {
            total: true,
          }
        },
        reviews: {
          select: {
            rating: true,
          }
        }
      }
    });

    if (!store) {
      throw createError('Store not found', 404);
    }

    const totalRevenue = store.orders.reduce((sum, order) => {
      return sum + Number(order.total);
    }, 0);

    const averageRating = store.reviews.length > 0
      ? store.reviews.reduce((sum, review) => sum + review.rating, 0) / store.reviews.length
      : 0;

    return {
      totalProducts: store._count.products,
      totalOrders: store._count.orders,
      totalRevenue,
      totalReviews: store._count.reviews,
      averageRating: Math.round(averageRating * 10) / 10,
    };
  }
}