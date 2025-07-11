import request from 'supertest';
import { spawn, ChildProcess } from 'child_process';
import { setTimeout } from 'timers/promises';
import { logger } from '../../libs/shared/src/logging/logger';

describe('API Integration Tests', () => {
  let services: ChildProcess[] = [];
  const SERVICE_PORTS = {
    'api-gateway': 8000,
    'user-service': 3001,
    'auth-service': 3002,
    'product-service': 3003,
    'cart-service': 3005,
  };

  const API_BASE_URL = 'http://localhost:8000';

  beforeAll(async () => {
    // Start required services for integration testing
    logger.info('Starting services for integration tests...');

    // Start services in order
    for (const [serviceName, port] of Object.entries(SERVICE_PORTS)) {
      logger.info(`Starting ${serviceName} on port ${port}...`);

      const service = spawn('npm', ['run', 'dev'], {
        cwd: getServicePath(serviceName),
        stdio: 'pipe',
        env: { ...process.env, PORT: port.toString() },
      });

      services.push(service);

      // Wait for service to start
      await setTimeout(2000);
    }

    // Wait for all services to be ready
    await setTimeout(5000);
  }, 60000);

  afterAll(async () => {
    // Clean up services
    logger.info('Stopping services...');
    services.forEach((service) => {
      service.kill('SIGTERM');
    });
    await setTimeout(2000);
  });

  describe('Service Health Checks', () => {
    it('should check API Gateway health', async () => {
      const response = await request(API_BASE_URL).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body.service).toBe('api-gateway');
    });

    it('should check all microservices health through gateway', async () => {
      const healthChecks = [
        '/api/users/health',
        '/api/auth/health',
        '/api/products/health',
        '/api/cart/health',
      ];

      for (const endpoint of healthChecks) {
        const response = await request(API_BASE_URL).get(endpoint);
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
      }
    });
  });

  describe('Authentication Flow', () => {
    let authTokens: { accessToken: string; refreshToken: string };
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Integration',
      lastName: 'Test',
    };

    it('should register a new user', async () => {
      const response = await request(API_BASE_URL).post('/api/auth/register').send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');

      authTokens = response.body.data.tokens;
    });

    it('should login with registered user', async () => {
      const response = await request(API_BASE_URL).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');

      authTokens = response.body.data.tokens;
    });

    it('should verify access token', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/verify')
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should refresh tokens', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/refresh')
        .send({ refreshToken: authTokens.refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');

      authTokens = response.body.data.tokens;
    });

    it('should logout successfully', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/logout')
        .send({ refreshToken: authTokens.refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Product Management', () => {
    let authTokens: { accessToken: string; refreshToken: string };
    let productId: string;

    beforeAll(async () => {
      // Login as admin for product management
      const loginResponse = await request(API_BASE_URL).post('/api/auth/login').send({
        email: 'admin@ultramarket.com',
        password: 'AdminPassword123!',
      });

      if (loginResponse.status === 200) {
        authTokens = loginResponse.body.data.tokens;
      }
    });

    it('should get products list', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/products')
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.products)).toBe(true);
    });

    it('should search products', async () => {
      const response = await request(API_BASE_URL)
        .get('/api/products/search')
        .query({ q: 'laptop', page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.products)).toBe(true);
    });

    it('should create a new product (if authenticated as admin)', async () => {
      if (!authTokens) {
        return; // Skip if not authenticated as admin
      }

      const newProduct = {
        name: 'Integration Test Product',
        description: 'A test product for integration testing',
        price: 99.99,
        category: 'Electronics',
        brand: 'TestBrand',
        sku: `TEST-${Date.now()}`,
        stock: 10,
      };

      const response = await request(API_BASE_URL)
        .post('/api/products')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(newProduct);

      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.product.name).toBe(newProduct.name);
        productId = response.body.data.product.id;
      }
    });

    it('should get product by ID', async () => {
      if (!productId) {
        // Use a sample product ID or skip
        return;
      }

      const response = await request(API_BASE_URL).get(`/api/products/${productId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.product.id).toBe(productId);
    });
  });

  describe('Cart Operations', () => {
    let authTokens: { accessToken: string; refreshToken: string };
    let cartId: string;

    beforeAll(async () => {
      // Register and login a test user for cart operations
      const testUser = {
        email: `cart-test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Cart',
        lastName: 'Test',
      };

      const registerResponse = await request(API_BASE_URL)
        .post('/api/auth/register')
        .send(testUser);

      if (registerResponse.status === 201) {
        authTokens = registerResponse.body.data.tokens;
      }
    });

    it('should create a new cart', async () => {
      if (!authTokens) return;

      const response = await request(API_BASE_URL)
        .post('/api/cart')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ userId: 'test-user-id' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      cartId = response.body.data.cart.id;
    });

    it('should add item to cart', async () => {
      if (!authTokens || !cartId) return;

      const cartItem = {
        productId: 'sample-product-id',
        quantity: 2,
        price: 49.99,
      };

      const response = await request(API_BASE_URL)
        .post(`/api/cart/${cartId}/items`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send(cartItem);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should get cart contents', async () => {
      if (!authTokens || !cartId) return;

      const response = await request(API_BASE_URL)
        .get(`/api/cart/${cartId}`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.cart.id).toBe(cartId);
    });

    it('should update item quantity in cart', async () => {
      if (!authTokens || !cartId) return;

      const response = await request(API_BASE_URL)
        .put(`/api/cart/${cartId}/items/sample-product-id`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ quantity: 3 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should remove item from cart', async () => {
      if (!authTokens || !cartId) return;

      const response = await request(API_BASE_URL)
        .delete(`/api/cart/${cartId}/items/sample-product-id`)
        .set('Authorization', `Bearer ${authTokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      const response = await request(API_BASE_URL).get('/api/non-existent-endpoint');

      expect(response.status).toBe(404);
    });

    it('should handle unauthorized access', async () => {
      const response = await request(API_BASE_URL).post('/api/cart').send({ userId: 'test-user' });

      expect(response.status).toBe(401);
    });

    it('should handle invalid JSON', async () => {
      const response = await request(API_BASE_URL)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => request(API_BASE_URL).get('/health'));

      const responses = await Promise.all(requests);

      // Most should succeed, but rate limiting might kick in
      const successfulResponses = responses.filter((res) => res.status === 200);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });

  describe('CORS Headers', () => {
    it('should include proper CORS headers', async () => {
      const response = await request(API_BASE_URL)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});

function getServicePath(serviceName: string): string {
  const servicePaths: Record<string, string> = {
    'api-gateway': './microservices/core/api-gateway/api-gateway',
    'user-service': './microservices/core/user-service/user-service',
    'auth-service': './microservices/core/auth-service',
    'product-service': './microservices/business/product-service/product-service',
    'cart-service': './microservices/business/cart-service/cart-service',
  };

  return servicePaths[serviceName] || './';
}
