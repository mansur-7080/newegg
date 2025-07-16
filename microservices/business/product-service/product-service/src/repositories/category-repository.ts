import { PrismaClient, Category, Prisma } from '@prisma/client';
import db from '../lib/database';

export class CategoryRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = db.prisma;
  }

  async findMany(params: Prisma.CategoryFindManyArgs): Promise<Category[]> {
    return this.prisma.category.findMany(params);
  }

  async findUnique(params: Prisma.CategoryFindUniqueArgs): Promise<Category | null> {
    return this.prisma.category.findUnique(params);
  }

  async findFirst(params: Prisma.CategoryFindFirstArgs): Promise<Category | null> {
    return this.prisma.category.findFirst(params);
  }

  async create(params: Prisma.CategoryCreateArgs): Promise<Category> {
    return this.prisma.category.create(params);
  }

  async update(params: Prisma.CategoryUpdateArgs): Promise<Category> {
    return this.prisma.category.update(params);
  }

  async delete(params: Prisma.CategoryDeleteArgs): Promise<Category> {
    return this.prisma.category.delete(params);
  }

  async count(params: Prisma.CategoryCountArgs): Promise<number> {
    return this.prisma.category.count(params);
  }

  async findManyWithChildren(params: {
    skip?: number;
    take?: number;
    where?: Prisma.CategoryWhereInput;
    orderBy?: Prisma.CategoryOrderByWithRelationInput;
  }) {
    return this.prisma.category.findMany({
      ...params,
      include: {
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async findUniqueWithChildren(params: {
    where: Prisma.CategoryWhereUniqueInput;
  }) {
    return this.prisma.category.findUnique({
      ...params,
      include: {
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }
}
