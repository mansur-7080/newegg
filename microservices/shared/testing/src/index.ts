import { Request, Response } from 'express';
import { z } from 'zod';

// Test environment configuration
export interface TestConfig {
  database: {
    url: string;
    name: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    secret: string;
  };
  api: {
    baseUrl: string;
    timeout: number;
  };
}

// Mock request/response utilities
export const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  method: 'GET',
  url: '/test',
  path: '/test',
  params: {},
  query: {},
  body: {},
  headers: {},
  ip: '127.0.0.1',
  get: jest.fn(),
  header: jest.fn(),
  ...overrides,
});

export const createMockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    getHeader: jest.fn(),
  };
  return res;
};

// Test database utilities
export class TestDatabase {
  private static instance: TestDatabase;
  private connections: Map<string, any> = new Map();

  static getInstance(): TestDatabase {
    if (!TestDatabase.instance) {
      TestDatabase.instance = new TestDatabase();
    }
    return TestDatabase.instance;
  }

  async connect(name: string, config: any): Promise<any> {
    // Mock database connection
    const connection = {
      name,
      config,
      isConnected: true,
      close: jest.fn(),
      query: jest.fn(),
    };
    this.connections.set(name, connection);
    return connection;
  }

  async disconnect(name: string): Promise<void> {
    const connection = this.connections.get(name);
    if (connection) {
      await connection.close();
      this.connections.delete(name);
    }
  }

  async cleanup(): Promise<void> {
    for (const [name] of this.connections) {
      await this.disconnect(name);
    }
  }
}

// Test data generators
export class TestDataGenerator {
  static generateUser(overrides: any = {}): any {
    return {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static generateProduct(overrides: any = {}): any {
    return {
      id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `Test Product ${Date.now()}`,
      description: 'Test product description',
      price: 99.99,
      category: 'electronics',
      brand: 'TestBrand',
      stock: 100,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static generateOrder(overrides: any = {}): any {
    return {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: `user_${Date.now()}`,
      items: [
        {
          productId: `product_${Date.now()}`,
          quantity: 2,
          price: 99.99,
        },
      ],
      total: 199.98,
      status: 'pending',
      paymentStatus: 'pending',
      shippingAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  static generatePayment(overrides: any = {}): any {
    return {
      id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: `order_${Date.now()}`,
      amount: 199.98,
      currency: 'USD',
      method: 'credit_card',
      status: 'pending',
      gateway: 'stripe',
      transactionId: `txn_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }
}

// API test utilities
export class ApiTestClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, headers: Record<string, string> = {}) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
      ...headers,
    };
  }

  async request(method: string, path: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const options: any = {
      method,
      headers: this.headers,
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    // Mock fetch for testing
    const response = {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data }),
      text: async () => JSON.stringify({ success: true, data }),
    };

    return response;
  }

  async get(path: string): Promise<any> {
    return this.request('GET', path);
  }

  async post(path: string, data?: any): Promise<any> {
    return this.request('POST', path, data);
  }

  async put(path: string, data?: any): Promise<any> {
    return this.request('PUT', path, data);
  }

  async delete(path: string): Promise<any> {
    return this.request('DELETE', path);
  }

  setAuthToken(token: string): void {
    this.headers.Authorization = `Bearer ${token}`;
  }
}

// Validation test utilities
export class ValidationTester {
  static testSchema(schema: z.ZodSchema, validData: any[], invalidData: any[]): void {
    describe('Schema validation', () => {
      describe('Valid data', () => {
        validData.forEach((data, index) => {
          it(`should validate valid data ${index + 1}`, () => {
            expect(() => schema.parse(data)).not.toThrow();
          });
        });
      });

      describe('Invalid data', () => {
        invalidData.forEach((data, index) => {
          it(`should reject invalid data ${index + 1}`, () => {
            expect(() => schema.parse(data)).toThrow();
          });
        });
      });
    });
  }

  static testRequiredFields(schema: z.ZodSchema, requiredFields: string[]): void {
    describe('Required fields', () => {
      requiredFields.forEach(field => {
        it(`should require ${field}`, () => {
          const data = {};
          expect(() => schema.parse(data)).toThrow();
        });
      });
    });
  }
}

// Performance test utilities
export class PerformanceTester {
  static async measureExecutionTime(fn: () => Promise<any>): Promise<number> {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start;
  }

  static async benchmark(fn: () => Promise<any>, iterations: number = 100): Promise<{
    min: number;
    max: number;
    avg: number;
    median: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const time = await this.measureExecutionTime(fn);
      times.push(time);
    }

    times.sort((a, b) => a - b);
    const min = times[0];
    const max = times[times.length - 1];
    const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
    const median = times[Math.floor(times.length / 2)];

    return { min, max, avg, median };
  }
}

// Mock service utilities
export class MockService {
  static createMockLogger(): any {
    return {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };
  }

  static createMockDatabase(): any {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      query: jest.fn(),
      transaction: jest.fn(),
    };
  }

  static createMockCache(): any {
    return {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      flush: jest.fn(),
    };
  }

  static createMockEmailService(): any {
    return {
      sendEmail: jest.fn(),
      sendBulkEmail: jest.fn(),
      verifyEmail: jest.fn(),
    };
  }

  static createMockPaymentGateway(): any {
    return {
      processPayment: jest.fn(),
      refundPayment: jest.fn(),
      getTransactionStatus: jest.fn(),
    };
  }
}

// Test helpers
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await wait(delay * attempt);
      }
    }
  }

  throw lastError!;
};

// Test assertions
export const assertResponse = (response: any, expectedStatus: number, expectedData?: any): void => {
  expect(response.status).toHaveBeenCalledWith(expectedStatus);
  
  if (expectedData) {
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expectedData,
      })
    );
  }
};

export const assertErrorResponse = (response: any, expectedStatus: number, expectedError?: any): void => {
  expect(response.status).toHaveBeenCalledWith(expectedStatus);
  
  if (expectedError) {
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expectedError,
      })
    );
  }
};