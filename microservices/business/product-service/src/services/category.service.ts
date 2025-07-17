import { PrismaClient, Category } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '@ultramarket/shared/logging/logger';
import { NotFoundError, ValidationError } from '@ultramarket/shared/errors';
import slugify from 'slugify';

export interface CategoryFilters {
  page?: number;
  limit?: number;
  search?: string;
  parentId?: string;
  isActive?: boolean;
  includeChildren?: boolean;
}

export interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  children?: CategoryResponse[];
  parent?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface PaginatedCategoryResponse {
  categories: CategoryResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class CategoryService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async getCategories(filters: CategoryFilters): Promise<PaginatedCategoryResponse> {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        parentId,
        isActive = true,
        includeChildren = false
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = { isActive };

      if (search) {
        where.name = { contains: search, mode: 'insensitive' };
      }

      if (parentId !== undefined) {
        where.parentId = parentId;
      }

      // Build include clause
      const include: any = {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      };

      if (includeChildren) {
        include.children = {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        };
      }

      // Execute queries
      const [categories, total] = await Promise.all([
        this.prisma.category.findMany({
          where,
          include,
          skip,
          take: limit,
          orderBy: { sortOrder: 'asc' },
        }),
        this.prisma.category.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        categories: categories.map(this.formatCategory),
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (error) {
      logger.error('Error fetching categories', { error, filters });
      throw error;
    }
  }

  async getCategoryTree(): Promise<CategoryResponse[]> {
    try {
      const rootCategories = await this.prisma.category.findMany({
        where: {
          parentId: null,
          isActive: true,
        },
        include: {
          children: {
            where: { isActive: true },
            include: {
              children: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      });

      return rootCategories.map(this.formatCategory);
    } catch (error) {
      logger.error('Error fetching category tree', { error });
      throw error;
    }
  }

  async getCategoryById(id: string, includeChildren: boolean = false): Promise<CategoryResponse> {
    try {
      const include: any = {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      };

      if (includeChildren) {
        include.children = {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        };
      }

      const category = await this.prisma.category.findUnique({
        where: { id },
        include,
      });

      if (!category) {
        throw new NotFoundError('Category not found');
      }

      return this.formatCategory(category);
    } catch (error) {
      logger.error('Error fetching category by ID', { error, id });
      throw error;
    }
  }

  async getCategoryBySlug(slug: string, includeChildren: boolean = false): Promise<CategoryResponse> {
    try {
      const include: any = {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      };

      if (includeChildren) {
        include.children = {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        };
      }

      const category = await this.prisma.category.findUnique({
        where: { slug },
        include,
      });

      if (!category) {
        throw new NotFoundError('Category not found');
      }

      return this.formatCategory(category);
    } catch (error) {
      logger.error('Error fetching category by slug', { error, slug });
      throw error;
    }
  }

  async createCategory(data: any): Promise<CategoryResponse> {
    try {
      // Generate slug
      const slug = slugify(data.name, { lower: true, strict: true });

      // Check if slug already exists
      const existingCategory = await this.prisma.category.findUnique({
        where: { slug },
      });

      const finalSlug = existingCategory ? `${slug}-${Date.now()}` : slug;

      // If parent is specified, verify it exists
      if (data.parentId) {
        const parent = await this.prisma.category.findUnique({
          where: { id: data.parentId },
        });

        if (!parent) {
          throw new ValidationError('Parent category not found');
        }
      }

      const category = await this.prisma.category.create({
        data: {
          ...data,
          slug: finalSlug,
        },
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      logger.info('Category created successfully', { categoryId: category.id });
      return this.formatCategory(category);
    } catch (error) {
      logger.error('Error creating category', { error, data });
      throw error;
    }
  }

  async updateCategory(id: string, data: any): Promise<CategoryResponse> {
    try {
      const existingCategory = await this.prisma.category.findUnique({
        where: { id },
      });

      if (!existingCategory) {
        throw new NotFoundError('Category not found');
      }

      // If name is being updated, update slug as well
      if (data.name && data.name !== existingCategory.name) {
        const slug = slugify(data.name, { lower: true, strict: true });
        const existingSlug = await this.prisma.category.findUnique({
          where: { slug },
        });

        if (existingSlug && existingSlug.id !== id) {
          data.slug = `${slug}-${Date.now()}`;
        } else {
          data.slug = slug;
        }
      }

      // If parent is being updated, verify it exists and prevent circular reference
      if (data.parentId && data.parentId !== existingCategory.parentId) {
        if (data.parentId === id) {
          throw new ValidationError('Category cannot be its own parent');
        }

        const parent = await this.prisma.category.findUnique({
          where: { id: data.parentId },
        });

        if (!parent) {
          throw new ValidationError('Parent category not found');
        }

        // Check for circular reference
        const isDescendant = await this.isDescendant(id, data.parentId);
        if (isDescendant) {
          throw new ValidationError('Cannot create circular reference');
        }
      }

      const category = await this.prisma.category.update({
        where: { id },
        data,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      logger.info('Category updated successfully', { categoryId: id });
      return this.formatCategory(category);
    } catch (error) {
      logger.error('Error updating category', { error, id, data });
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    try {
      const category = await this.prisma.category.findUnique({
        where: { id },
        include: {
          children: true,
          products: true,
        },
      });

      if (!category) {
        throw new NotFoundError('Category not found');
      }

      // Check if category has children
      if (category.children.length > 0) {
        throw new ValidationError('Cannot delete category with subcategories');
      }

      // Check if category has products
      if (category.products.length > 0) {
        throw new ValidationError('Cannot delete category with products');
      }

      // Soft delete - mark as inactive
      await this.prisma.category.update({
        where: { id },
        data: {
          isActive: false,
        },
      });

      logger.info('Category deleted successfully', { categoryId: id });
    } catch (error) {
      logger.error('Error deleting category', { error, id });
      throw error;
    }
  }

  private async isDescendant(categoryId: string, potentialParentId: string): Promise<boolean> {
    const category = await this.prisma.category.findUnique({
      where: { id: potentialParentId },
      select: { parentId: true },
    });

    if (!category) {
      return false;
    }

    if (category.parentId === categoryId) {
      return true;
    }

    if (category.parentId) {
      return this.isDescendant(categoryId, category.parentId);
    }

    return false;
  }

  private formatCategory(category: any): CategoryResponse {
    return {
      ...category,
      children: category.children?.map(this.formatCategory),
    };
  }
}

export const categoryService = new CategoryService();