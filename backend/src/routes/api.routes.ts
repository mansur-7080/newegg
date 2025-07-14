import { Router } from 'express';
import axios from 'axios';
import { logger } from '../../libs/shared/src/logger';
import { catchAsync } from '../middleware/error.middleware';
import { requireRole, requirePermission } from '../middleware/auth.middleware';

const router = Router();

// Microservice URLs
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3003';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3004';
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';
const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:3006';
const FILE_SERVICE_URL = process.env.FILE_SERVICE_URL || 'http://localhost:3007';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';

// Helper function to forward requests to microservices
const forwardRequest = async (req: any, res: any, serviceUrl: string, endpoint: string) => {
  try {
    const config = {
      method: req.method.toLowerCase(),
      url: `${serviceUrl}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization,
        'X-User-Id': req.user?.id,
        'X-User-Role': req.user?.role,
        'X-Forwarded-For': req.ip,
      },
      timeout: 30000, // 30 second timeout
    };

    // Add request body for POST, PUT, PATCH
    if (['post', 'put', 'patch'].includes(req.method.toLowerCase())) {
      config.data = req.body;
    }

    // Add query parameters
    if (Object.keys(req.query).length > 0) {
      config.params = req.query;
    }

    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (error) {
    logger.error(`Request to ${serviceUrl}${endpoint} failed:`, {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable',
        },
      });
    }
  }
};

// ===================
// PRODUCT ROUTES
// ===================

// Get all products (public)
router.get('/products', catchAsync(async (req, res) => {
  await forwardRequest(req, res, PRODUCT_SERVICE_URL, '/api/products');
}));

// Get product by ID (public)
router.get('/products/:id', catchAsync(async (req, res) => {
  await forwardRequest(req, res, PRODUCT_SERVICE_URL, `/api/products/${req.params.id}`);
}));

// Create product (admin/vendor only)
router.post('/products', 
  requirePermission('product:write'),
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, PRODUCT_SERVICE_URL, '/api/products');
  })
);

// Update product (admin/vendor only)
router.put('/products/:id',
  requirePermission('product:write'),
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, PRODUCT_SERVICE_URL, `/api/products/${req.params.id}`);
  })
);

// Delete product (admin only)
router.delete('/products/:id',
  requirePermission('product:delete'),
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, PRODUCT_SERVICE_URL, `/api/products/${req.params.id}`);
  })
);

// Get product categories (public)
router.get('/categories', catchAsync(async (req, res) => {
  await forwardRequest(req, res, PRODUCT_SERVICE_URL, '/api/categories');
}));

// PC Builder compatibility check
router.post('/products/pc-builder/compatibility',
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, PRODUCT_SERVICE_URL, '/api/products/pc-builder/compatibility');
  })
);

// ===================
// ORDER ROUTES
// ===================

// Get user orders
router.get('/orders', catchAsync(async (req, res) => {
  await forwardRequest(req, res, ORDER_SERVICE_URL, '/api/orders');
}));

// Get order by ID
router.get('/orders/:id', catchAsync(async (req, res) => {
  await forwardRequest(req, res, ORDER_SERVICE_URL, `/api/orders/${req.params.id}`);
}));

// Create new order
router.post('/orders', catchAsync(async (req, res) => {
  await forwardRequest(req, res, ORDER_SERVICE_URL, '/api/orders');
}));

// Update order status (admin only)
router.patch('/orders/:id/status',
  requirePermission('order:write'),
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, ORDER_SERVICE_URL, `/api/orders/${req.params.id}/status`);
  })
);

// Cancel order
router.post('/orders/:id/cancel', catchAsync(async (req, res) => {
  await forwardRequest(req, res, ORDER_SERVICE_URL, `/api/orders/${req.params.id}/cancel`);
}));

// ===================
// PAYMENT ROUTES
// ===================

// Create payment
router.post('/payments', catchAsync(async (req, res) => {
  await forwardRequest(req, res, PAYMENT_SERVICE_URL, '/api/payments');
}));

// Get payment by ID
router.get('/payments/:id', catchAsync(async (req, res) => {
  await forwardRequest(req, res, PAYMENT_SERVICE_URL, `/api/payments/${req.params.id}`);
}));

// Get user payments
router.get('/payments', catchAsync(async (req, res) => {
  await forwardRequest(req, res, PAYMENT_SERVICE_URL, '/api/payments');
}));

// Payment webhooks (Click.uz)
router.post('/payments/click/prepare', catchAsync(async (req, res) => {
  await forwardRequest(req, res, PAYMENT_SERVICE_URL, '/api/payments/click/prepare');
}));

router.post('/payments/click/complete', catchAsync(async (req, res) => {
  await forwardRequest(req, res, PAYMENT_SERVICE_URL, '/api/payments/click/complete');
}));

// Payment webhooks (Payme.uz)
router.post('/payments/payme', catchAsync(async (req, res) => {
  await forwardRequest(req, res, PAYMENT_SERVICE_URL, '/api/payments/payme');
}));

// ===================
// SEARCH ROUTES
// ===================

// Global search
router.get('/search', catchAsync(async (req, res) => {
  await forwardRequest(req, res, SEARCH_SERVICE_URL, '/api/search');
}));

// Product search with filters
router.get('/search/products', catchAsync(async (req, res) => {
  await forwardRequest(req, res, SEARCH_SERVICE_URL, '/api/search/products');
}));

// Search suggestions
router.get('/search/suggestions', catchAsync(async (req, res) => {
  await forwardRequest(req, res, SEARCH_SERVICE_URL, '/api/search/suggestions');
}));

// ===================
// FILE UPLOAD ROUTES
// ===================

// Upload file
router.post('/files/upload', catchAsync(async (req, res) => {
  await forwardRequest(req, res, FILE_SERVICE_URL, '/api/files/upload');
}));

// Get file
router.get('/files/:id', catchAsync(async (req, res) => {
  await forwardRequest(req, res, FILE_SERVICE_URL, `/api/files/${req.params.id}`);
}));

// Delete file (admin/owner only)
router.delete('/files/:id',
  requirePermission('admin:access'),
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, FILE_SERVICE_URL, `/api/files/${req.params.id}`);
  })
);

// ===================
// USER MANAGEMENT ROUTES
// ===================

// Get user profile
router.get('/users/profile', catchAsync(async (req, res) => {
  await forwardRequest(req, res, USER_SERVICE_URL, '/api/users/profile');
}));

// Update user profile
router.put('/users/profile', catchAsync(async (req, res) => {
  await forwardRequest(req, res, USER_SERVICE_URL, '/api/users/profile');
}));

// Get user addresses
router.get('/users/addresses', catchAsync(async (req, res) => {
  await forwardRequest(req, res, USER_SERVICE_URL, '/api/users/addresses');
}));

// Add user address
router.post('/users/addresses', catchAsync(async (req, res) => {
  await forwardRequest(req, res, USER_SERVICE_URL, '/api/users/addresses');
}));

// Update user address
router.put('/users/addresses/:id', catchAsync(async (req, res) => {
  await forwardRequest(req, res, USER_SERVICE_URL, `/api/users/addresses/${req.params.id}`);
}));

// Delete user address
router.delete('/users/addresses/:id', catchAsync(async (req, res) => {
  await forwardRequest(req, res, USER_SERVICE_URL, `/api/users/addresses/${req.params.id}`);
}));

// ===================
// ADMIN ROUTES
// ===================

// Get all users (admin only)
router.get('/admin/users',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, USER_SERVICE_URL, '/api/admin/users');
  })
);

// Get user by ID (admin only)
router.get('/admin/users/:id',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, USER_SERVICE_URL, `/api/admin/users/${req.params.id}`);
  })
);

// Update user role (super admin only)
router.patch('/admin/users/:id/role',
  requireRole('SUPER_ADMIN'),
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, USER_SERVICE_URL, `/api/admin/users/${req.params.id}/role`);
  })
);

// Deactivate user (admin only)
router.patch('/admin/users/:id/deactivate',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, USER_SERVICE_URL, `/api/admin/users/${req.params.id}/deactivate`);
  })
);

// Get all orders (admin only)
router.get('/admin/orders',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, ORDER_SERVICE_URL, '/api/admin/orders');
  })
);

// Get payment statistics (admin only)
router.get('/admin/payments/stats',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, PAYMENT_SERVICE_URL, '/api/admin/payments/stats');
  })
);

// ===================
// NOTIFICATION ROUTES
// ===================

// Get user notifications
router.get('/notifications', catchAsync(async (req, res) => {
  await forwardRequest(req, res, NOTIFICATION_SERVICE_URL, '/api/notifications');
}));

// Mark notification as read
router.patch('/notifications/:id/read', catchAsync(async (req, res) => {
  await forwardRequest(req, res, NOTIFICATION_SERVICE_URL, `/api/notifications/${req.params.id}/read`);
}));

// Mark all notifications as read
router.patch('/notifications/read-all', catchAsync(async (req, res) => {
  await forwardRequest(req, res, NOTIFICATION_SERVICE_URL, '/api/notifications/read-all');
}));

// ===================
// ANALYTICS ROUTES
// ===================

// Get user analytics (admin only)
router.get('/analytics/users',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, USER_SERVICE_URL, '/api/analytics/users');
  })
);

// Get product analytics (admin only)
router.get('/analytics/products',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, PRODUCT_SERVICE_URL, '/api/analytics/products');
  })
);

// Get order analytics (admin only)
router.get('/analytics/orders',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, ORDER_SERVICE_URL, '/api/analytics/orders');
  })
);

// Get payment analytics (admin only)
router.get('/analytics/payments',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  catchAsync(async (req, res) => {
    await forwardRequest(req, res, PAYMENT_SERVICE_URL, '/api/analytics/payments');
  })
);

// ===================
// WISHLIST ROUTES
// ===================

// Get user wishlist
router.get('/wishlist', catchAsync(async (req, res) => {
  await forwardRequest(req, res, USER_SERVICE_URL, '/api/wishlist');
}));

// Add product to wishlist
router.post('/wishlist/:productId', catchAsync(async (req, res) => {
  await forwardRequest(req, res, USER_SERVICE_URL, `/api/wishlist/${req.params.productId}`);
}));

// Remove product from wishlist
router.delete('/wishlist/:productId', catchAsync(async (req, res) => {
  await forwardRequest(req, res, USER_SERVICE_URL, `/api/wishlist/${req.params.productId}`);
}));

// ===================
// CART ROUTES
// ===================

// Get user cart
router.get('/cart', catchAsync(async (req, res) => {
  await forwardRequest(req, res, ORDER_SERVICE_URL, '/api/cart');
}));

// Add item to cart
router.post('/cart/items', catchAsync(async (req, res) => {
  await forwardRequest(req, res, ORDER_SERVICE_URL, '/api/cart/items');
}));

// Update cart item
router.put('/cart/items/:id', catchAsync(async (req, res) => {
  await forwardRequest(req, res, ORDER_SERVICE_URL, `/api/cart/items/${req.params.id}`);
}));

// Remove cart item
router.delete('/cart/items/:id', catchAsync(async (req, res) => {
  await forwardRequest(req, res, ORDER_SERVICE_URL, `/api/cart/items/${req.params.id}`);
}));

// Clear cart
router.delete('/cart', catchAsync(async (req, res) => {
  await forwardRequest(req, res, ORDER_SERVICE_URL, '/api/cart');
}));

export default router;