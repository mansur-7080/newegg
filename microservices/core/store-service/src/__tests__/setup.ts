import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Jest global types
declare global {
  var beforeAll: (fn: () => void | Promise<void>) => void;
  var afterAll: (fn: () => void | Promise<void>) => void;
  var beforeEach: (fn: () => void | Promise<void>) => void;
  var afterEach: (fn: () => void | Promise<void>) => void;
}

beforeAll(async () => {
  // Setup test database
  await prisma.$connect();
});

afterAll(async () => {
  // Cleanup test database
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean up data before each test
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();
});

afterEach(async () => {
  // Clean up data after each test
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();
});