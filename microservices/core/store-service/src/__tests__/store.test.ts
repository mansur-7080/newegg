import request from 'supertest';
import app from '../index';

describe('Store Service API', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'store-service');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api/stores', () => {
    it('should return list of stores', async () => {
      const response = await request(app)
        .get('/api/stores')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/stores/:id', () => {
    it('should return store by id', async () => {
      const response = await request(app)
        .get('/api/stores/1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });

    it('should return 404 for non-existent store', async () => {
      const response = await request(app)
        .get('/api/stores/999999')
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error', 'Store not found');
    });
  });

  describe('POST /api/stores', () => {
    it('should create a new store', async () => {
      const storeData = {
        name: 'Test Store',
        description: 'Test store description',
        ownerId: 1,
        address: 'Test Address',
        phone: '+998901234567',
        email: 'test@store.com'
      };

      const response = await request(app)
        .post('/api/stores')
        .send(storeData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name', storeData.name);
    });
  });

  describe('PUT /api/stores/:id', () => {
    it('should update store', async () => {
      const updateData = {
        name: 'Updated Store Name',
        description: 'Updated description'
      };

      const response = await request(app)
        .put('/api/stores/1')
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('DELETE /api/stores/:id', () => {
    it('should delete store', async () => {
      const response = await request(app)
        .delete('/api/stores/1')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Store deleted successfully');
    });
  });

  describe('GET /api/stores/:id/analytics', () => {
    it('should return store analytics', async () => {
      const response = await request(app)
        .get('/api/stores/1/analytics')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalProducts');
      expect(response.body.data).toHaveProperty('totalOrders');
      expect(response.body.data).toHaveProperty('totalRevenue');
      expect(response.body.data).toHaveProperty('monthlyGrowth');
      expect(response.body.data).toHaveProperty('topProducts');
    });
  });
});