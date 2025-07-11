import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween, randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const requestCount = new Counter('request_count');

// Test configuration
export const options = {
  stages: [
    // Warm up
    { duration: '2m', target: 10 },
    // Ramp up
    { duration: '5m', target: 50 },
    // Stay at 50 users
    { duration: '10m', target: 50 },
    // Ramp up to 100 users
    { duration: '5m', target: 100 },
    // Stay at 100 users
    { duration: '10m', target: 100 },
    // Ramp up to 200 users (stress test)
    { duration: '5m', target: 200 },
    // Stay at 200 users
    { duration: '10m', target: 200 },
    // Ramp down
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    // Error rate should be less than 1%
    error_rate: ['rate<0.01'],
    // 95% of requests should be below 2000ms
    http_req_duration: ['p(95)<2000'],
    // 99% of requests should be below 5000ms
    http_req_duration: ['p(99)<5000'],
    // Average response time should be below 1000ms
    http_req_duration: ['avg<1000'],
    // At least 95% of requests should be successful
    http_req_failed: ['rate<0.05'],
  },
};

// Test data
const baseUrl = __ENV.BASE_URL || 'https://api.ultramarket.com';
const apiVersion = __ENV.API_VERSION || 'v1';

// Test users pool
const testUsers = [
  { email: 'test1@example.com', password: 'TestPass123!' },
  { email: 'test2@example.com', password: 'TestPass123!' },
  { email: 'test3@example.com', password: 'TestPass123!' },
  { email: 'test4@example.com', password: 'TestPass123!' },
  { email: 'test5@example.com', password: 'TestPass123!' },
];

// Product categories for testing
const categories = [
  'electronics',
  'clothing',
  'books',
  'home-garden',
  'sports',
  'automotive',
  'health-beauty',
  'toys-games',
];

// Search terms for testing
const searchTerms = [
  'laptop',
  'smartphone',
  'headphones',
  'camera',
  'keyboard',
  'monitor',
  'tablet',
  'speaker',
  'watch',
  'phone',
];

// Global variables
let authToken = null;
let userId = null;
let cartId = null;

// Setup function - runs once per VU
export function setup() {
  console.log('🚀 Starting UltraMarket Load Test');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`API Version: ${apiVersion}`);

  // Health check
  const healthResponse = http.get(`${baseUrl}/health`);
  if (healthResponse.status !== 200) {
    throw new Error(`Health check failed: ${healthResponse.status}`);
  }

  console.log('✅ Health check passed');
  return { baseUrl, apiVersion };
}

// Main test function
export default function (data) {
  const user = testUsers[randomIntBetween(0, testUsers.length - 1)];

  // Test scenarios with different weights
  const scenario = randomIntBetween(1, 100);

  if (scenario <= 30) {
    // 30% - Browse products (anonymous user)
    browseProducts();
  } else if (scenario <= 50) {
    // 20% - Search products
    searchProducts();
  } else if (scenario <= 70) {
    // 20% - User registration and login
    userAuthFlow();
  } else if (scenario <= 85) {
    // 15% - Shopping cart operations
    shoppingCartFlow();
  } else if (scenario <= 95) {
    // 10% - Complete purchase flow
    completePurchaseFlow();
  } else {
    // 5% - Admin operations
    adminOperations();
  }

  // Random sleep between 1-3 seconds
  sleep(randomIntBetween(1, 3));
}

// Test scenarios
function browseProducts() {
  const group = 'Browse Products';

  // Get product categories
  let response = http.get(`${baseUrl}/api/${apiVersion}/categories`, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    [`${group} - Categories loaded`]: (r) => r.status === 200,
    [`${group} - Categories response time OK`]: (r) => r.timings.duration < 1000,
  });

  recordMetrics(response, group);

  if (response.status === 200) {
    // Get products from random category
    const category = categories[randomIntBetween(0, categories.length - 1)];

    response = http.get(
      `${baseUrl}/api/${apiVersion}/products?category=${category}&page=1&limit=20`,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    check(response, {
      [`${group} - Products loaded`]: (r) => r.status === 200,
      [`${group} - Products response time OK`]: (r) => r.timings.duration < 2000,
    });

    recordMetrics(response, group);

    if (response.status === 200) {
      const products = JSON.parse(response.body).data.products;

      if (products && products.length > 0) {
        // Get random product details
        const randomProduct = products[randomIntBetween(0, products.length - 1)];

        response = http.get(`${baseUrl}/api/${apiVersion}/products/${randomProduct.id}`, {
          headers: { 'Content-Type': 'application/json' },
        });

        check(response, {
          [`${group} - Product details loaded`]: (r) => r.status === 200,
          [`${group} - Product details response time OK`]: (r) => r.timings.duration < 1500,
        });

        recordMetrics(response, group);
      }
    }
  }
}

function searchProducts() {
  const group = 'Search Products';
  const searchTerm = searchTerms[randomIntBetween(0, searchTerms.length - 1)];

  const response = http.get(`${baseUrl}/api/${apiVersion}/search?q=${searchTerm}&page=1&limit=20`, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    [`${group} - Search completed`]: (r) => r.status === 200,
    [`${group} - Search response time OK`]: (r) => r.timings.duration < 2000,
    [`${group} - Search has results`]: (r) => {
      if (r.status === 200) {
        const data = JSON.parse(r.body);
        return data.data && data.data.results && data.data.results.length > 0;
      }
      return false;
    },
  });

  recordMetrics(response, group);
}

function userAuthFlow() {
  const group = 'User Authentication';

  // Register new user
  const newUser = {
    email: `test_${randomString(8)}@example.com`,
    username: `user_${randomString(8)}`,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: `+1${randomIntBetween(1000000000, 9999999999)}`,
  };

  let response = http.post(`${baseUrl}/api/${apiVersion}/auth/register`, JSON.stringify(newUser), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    [`${group} - Registration successful`]: (r) => r.status === 201,
    [`${group} - Registration response time OK`]: (r) => r.timings.duration < 2000,
  });

  recordMetrics(response, group);

  if (response.status === 201) {
    const registrationData = JSON.parse(response.body);
    authToken = registrationData.data.tokens.accessToken;
    userId = registrationData.data.user.id;

    // Get user profile
    response = http.get(`${baseUrl}/api/${apiVersion}/users/profile`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });

    check(response, {
      [`${group} - Profile loaded`]: (r) => r.status === 200,
      [`${group} - Profile response time OK`]: (r) => r.timings.duration < 1000,
    });

    recordMetrics(response, group);
  }
}

function shoppingCartFlow() {
  const group = 'Shopping Cart';

  // First, authenticate user
  const user = testUsers[randomIntBetween(0, testUsers.length - 1)];
  let response = http.post(`${baseUrl}/api/${apiVersion}/auth/login`, JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.status === 200) {
    const loginData = JSON.parse(response.body);
    authToken = loginData.data.tokens.accessToken;

    // Get cart
    response = http.get(`${baseUrl}/api/${apiVersion}/cart`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });

    check(response, {
      [`${group} - Cart loaded`]: (r) => r.status === 200,
      [`${group} - Cart response time OK`]: (r) => r.timings.duration < 1000,
    });

    recordMetrics(response, group);

    if (response.status === 200) {
      // Add random product to cart
      const productId = `product-${randomIntBetween(1, 100)}`;
      const cartItem = {
        productId: productId,
        quantity: randomIntBetween(1, 3),
      };

      response = http.post(`${baseUrl}/api/${apiVersion}/cart/items`, JSON.stringify(cartItem), {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      check(response, {
        [`${group} - Item added to cart`]: (r) => r.status === 201,
        [`${group} - Add item response time OK`]: (r) => r.timings.duration < 1500,
      });

      recordMetrics(response, group);

      if (response.status === 201) {
        // Update cart item quantity
        const itemId = JSON.parse(response.body).data.item.id;
        const updateData = { quantity: randomIntBetween(1, 5) };

        response = http.put(
          `${baseUrl}/api/${apiVersion}/cart/items/${itemId}`,
          JSON.stringify(updateData),
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        check(response, {
          [`${group} - Cart item updated`]: (r) => r.status === 200,
          [`${group} - Update item response time OK`]: (r) => r.timings.duration < 1000,
        });

        recordMetrics(response, group);
      }
    }
  }
}

function completePurchaseFlow() {
  const group = 'Complete Purchase';

  // Authenticate user
  const user = testUsers[randomIntBetween(0, testUsers.length - 1)];
  let response = http.post(`${baseUrl}/api/${apiVersion}/auth/login`, JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.status === 200) {
    const loginData = JSON.parse(response.body);
    authToken = loginData.data.tokens.accessToken;

    // Create order
    const orderData = {
      shippingAddressId: `address-${randomIntBetween(1, 10)}`,
      billingAddressId: `address-${randomIntBetween(1, 10)}`,
      paymentMethodId: `payment-${randomIntBetween(1, 5)}`,
      notes: 'Load test order',
    };

    response = http.post(`${baseUrl}/api/${apiVersion}/orders`, JSON.stringify(orderData), {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
    });

    check(response, {
      [`${group} - Order created`]: (r) => r.status === 201,
      [`${group} - Order creation response time OK`]: (r) => r.timings.duration < 3000,
    });

    recordMetrics(response, group);

    if (response.status === 201) {
      const orderData = JSON.parse(response.body);
      const orderId = orderData.data.id;

      // Get order details
      response = http.get(`${baseUrl}/api/${apiVersion}/orders/${orderId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });

      check(response, {
        [`${group} - Order details loaded`]: (r) => r.status === 200,
        [`${group} - Order details response time OK`]: (r) => r.timings.duration < 1500,
      });

      recordMetrics(response, group);

      // Create payment intent
      const paymentData = {
        orderId: orderId,
        amount: randomIntBetween(50, 500),
        currency: 'USD',
        paymentMethod: 'STRIPE',
      };

      response = http.post(
        `${baseUrl}/api/${apiVersion}/payments/intent`,
        JSON.stringify(paymentData),
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      check(response, {
        [`${group} - Payment intent created`]: (r) => r.status === 201,
        [`${group} - Payment intent response time OK`]: (r) => r.timings.duration < 2000,
      });

      recordMetrics(response, group);
    }
  }
}

function adminOperations() {
  const group = 'Admin Operations';

  // This would require admin authentication
  // For now, we'll just test some read-only admin endpoints

  const response = http.get(`${baseUrl}/api/${apiVersion}/admin/stats`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': __ENV.ADMIN_KEY || 'test-admin-key',
    },
  });

  check(response, {
    [`${group} - Admin stats loaded`]: (r) => r.status === 200 || r.status === 401,
    [`${group} - Admin stats response time OK`]: (r) => r.timings.duration < 2000,
  });

  recordMetrics(response, group);
}

// Helper function to record metrics
function recordMetrics(response, group) {
  requestCount.add(1);
  responseTime.add(response.timings.duration);

  const isError = response.status >= 400;
  errorRate.add(isError);

  if (isError) {
    console.log(`❌ Error in ${group}: ${response.status} - ${response.body}`);
  }
}

// Teardown function
export function teardown(data) {
  console.log('🏁 Load test completed');
  console.log('📊 Check the results for performance metrics');
}

// Stress test configuration
export const stressTestOptions = {
  stages: [
    // Ramp up aggressively
    { duration: '2m', target: 100 },
    { duration: '5m', target: 300 },
    { duration: '10m', target: 500 },
    { duration: '5m', target: 800 },
    { duration: '10m', target: 1000 },
    // Ramp down
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    // More relaxed thresholds for stress testing
    http_req_duration: ['p(95)<5000'],
    http_req_duration: ['p(99)<10000'],
    http_req_failed: ['rate<0.1'], // 10% error rate acceptable for stress test
  },
};

// Spike test configuration
export const spikeTestOptions = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '30s', target: 500 }, // Spike
    { duration: '1m', target: 10 },
    { duration: '30s', target: 500 }, // Another spike
    { duration: '1m', target: 10 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.05'],
  },
};

// Volume test configuration
export const volumeTestOptions = {
  stages: [
    { duration: '10m', target: 200 },
    { duration: '1h', target: 200 }, // Sustained load
    { duration: '10m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.02'],
  },
};

// Export different test configurations
export { stressTestOptions, spikeTestOptions, volumeTestOptions };
