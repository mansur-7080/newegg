import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Order Service API',
      version: '1.0.0',
      description: 'UltraMarket Order Management Service',
    },
    servers: [
      {
        url: 'http://localhost:3005',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            userId: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  name: { type: 'string' },
                  price: { type: 'number' },
                  quantity: { type: 'integer' },
                },
              },
            },
            totalAmount: { type: 'number' },
            status: { type: 'string' },
            createdAt: { type: 'string' },
            updatedAt: { type: 'string' },
          },
        },
        CreateOrderRequest: {
          type: 'object',
          required: ['userId', 'items'],
          properties: {
            userId: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['productId', 'name', 'price', 'quantity'],
                properties: {
                  productId: { type: 'string' },
                  name: { type: 'string' },
                  price: { type: 'number' },
                  quantity: { type: 'integer' },
                },
              },
            },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: {
            200: {
              description: 'Service is healthy',
            },
          },
        },
      },
      '/api/v1/orders': {
        post: {
          tags: ['Orders'],
          summary: 'Create a new order',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateOrderRequest' },
              },
            },
          },
          responses: {
            201: {
              description: 'Order created successfully',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Order' },
                },
              },
            },
            400: {
              description: 'Bad request',
            },
          },
        },
      },
      '/api/v1/orders/{id}': {
        get: {
          tags: ['Orders'],
          summary: 'Get order by ID',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'Order found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Order' },
                },
              },
            },
            404: {
              description: 'Order not found',
            },
          },
        },
      },
      '/api/v1/orders/{id}/status': {
        patch: {
          tags: ['Orders'],
          summary: 'Update order status',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    userId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Status updated successfully',
            },
            400: {
              description: 'Bad request',
            },
          },
        },
      },
      '/api/v1/orders/user/{userId}': {
        get: {
          tags: ['Orders'],
          summary: 'Get user orders',
          parameters: [
            {
              name: 'userId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer' },
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer' },
            },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string' },
            },
          ],
          responses: {
            200: {
              description: 'User orders',
            },
          },
        },
      },
      '/api/v1/orders/{id}/cancel': {
        post: {
          tags: ['Orders'],
          summary: 'Cancel order',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Order cancelled successfully',
            },
            400: {
              description: 'Bad request',
            },
          },
        },
      },
    },
  },
  apis: [],
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};