import { PrismaClient, Product, Prisma } from '@prisma/client';
import db from '../lib/database';

export class ProductRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = db.prisma;
  }

  async findMany(params: Prisma.ProductFindManyArgs): Promise<Product[]> {
    return this.prisma.product.findMany(params);
  }

  async findUnique(params: Prisma.ProductFindUniqueArgs): Promise<Product | null> {
    return this.prisma.product.findUnique(params);
  }

  async findFirst(params: Prisma.ProductFindFirstArgs): Promise<Product | null> {
    return this.prisma.product.findFirst(params);
  }

  async create(params: Prisma.ProductCreateArgs): Promise<Product> {
    return this.prisma.product.create(params);
  }

  async update(params: Prisma.ProductUpdateArgs): Promise<Product> {
    return this.prisma.product.update(params);
  }

  async delete(params: Prisma.ProductDeleteArgs): Promise<Product> {
    return this.prisma.product.delete(params);
  }

  async count(params: Prisma.ProductCountArgs): Promise<number> {
    return this.prisma.product.count(params);
  }

  async aggregate(params: Prisma.ProductAggregateArgs): Promise<Prisma.GetProductAggregateType<typeof params>> {
    return this.prisma.product.aggregate(params);
  }

  async findManyWithCategory(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
  }) {
    return this.prisma.product.findMany({
      ...params,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async findUniqueWithCategory(params: {
    where: Prisma.ProductWhereUniqueInput;
  }) {
    return this.prisma.product.findUnique({
      ...params,
      include: {
        category: {
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
