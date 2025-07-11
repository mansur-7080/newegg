/**
 * UltraMarket Load Testing Suite
 * Comprehensive performance testing with K6
 */

/* eslint-disable no-undef, no-console, no-unused-vars */

import http from 'k6/http';
import { group, check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// Custom metrics
const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');
const requestCounter = new Counter('request_count');

// Test data
const testUsers = new SharedArray('test_users', function () {
  return [
    { email: 'user1@test.com', password: 'Test123!@#' },
    { email: 'user2@test.com', password: 'Test123!@#' },
    { email: 'user3@test.com', password: 'Test123!@#' },
    { email: 'user4@test.com', password: 'Test123!@#' },
    { email: 'user5@test.com', password: 'Test123!@#' },
  ];
});

const testProducts = new SharedArray('test_products', function () {
  return [
    { id: '1', name: 'Laptop', price: 999.99 },
    { id: '2', name: 'Smartphone', price: 699.99 },
    { id: '3', name: 'Tablet', price: 399.99 },
    { id: '4', name: 'Headphones', price: 199.99 },
    { id: '5', name: 'Smart Watch', price: 299.99 },
  ];
});

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '5m', target: 100 }, // Ramp up to 100 users
    { duration: '10m', target: 100 }, // Stay at 100 users
    { duration: '5m', target: 200 }, // Ramp up to 200 users
    { duration: '10m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    // Performance thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    error_rate: ['rate<0.01'], // Custom error rate < 1%
    response_time: ['p(95)<500'], // 95% response time < 500ms
    http_reqs: ['rate>10'], // Request rate > 10 RPS
  },
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'https://api.ultramarket.com/v2';
const WEB_URL = __ENV.WEB_URL || 'https://ultramarket.com';

// Request headers
const headers = {
  'Content-Type': 'application/json',
  'User-Agent': 'K6-LoadTest/1.0',
  Accept: 'application/json',
};

// Authentication token storage
let authToken = '';

export function setup() {
  console.log('🚀 Starting UltraMarket Load Test');
  console.log(`📊 Target URL: ${BASE_URL}`);
  console.log(`🌐 Web URL: ${WEB_URL}`);

  // Pre-test health check
  const healthCheck = http.get(`${BASE_URL}/health`);
  check(healthCheck, {
    'Health check passed': (r) => r.status === 200,
  });

  return { baseUrl: BASE_URL, webUrl: WEB_URL };
}

export default function (data) {
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];

  // Test scenarios with weights
  const scenarios = [
    { name: 'browse_products', weight: 40 },
    { name: 'user_authentication', weight: 15 },
    { name: 'shopping_cart', weight: 25 },
    { name: 'search_products', weight: 20 },
  ];

  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

  switch (scenario.name) {
    case 'browse_products':
      browseProducts();
      break;
    case 'user_authentication':
      userAuthentication(user);
      break;
    case 'shopping_cart':
      shoppingCartFlow(user);
      break;
    case 'search_products':
      searchProducts();
      break;
  }

  sleep(Math.random() * 3 + 1); // Random sleep 1-4 seconds
}

/**
 * Product browsing scenario
 */
function browseProducts() {
  group('Product Browsing', function () {
    // Get product list
    const productsResponse = http.get(`${BASE_URL}/products?limit=20&page=1`, {
      headers,
    });

    requestCounter.add(1);
    responseTime.add(productsResponse.timings.duration);

    const productListCheck = check(productsResponse, {
      'Products list loaded': (r) => r.status === 200,
      'Products response time < 500ms': (r) => r.timings.duration < 500,
      'Products contains data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && Array.isArray(body.data) && body.data.length > 0;
        } catch (e) {
          return false;
        }
      },
    });

    if (!productListCheck) {
      errorRate.add(1);
      return;
    }

    // Get random product details
    const randomProduct = testProducts[Math.floor(Math.random() * testProducts.length)];
    const productResponse = http.get(`${BASE_URL}/products/${randomProduct.id}`, {
      headers,
    });

    requestCounter.add(1);
    responseTime.add(productResponse.timings.duration);

    const productDetailCheck = check(productResponse, {
      'Product detail loaded': (r) => r.status === 200,
      'Product detail response time < 300ms': (r) => r.timings.duration < 300,
      'Product has required fields': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.data.id && body.data.name && body.data.price;
        } catch (e) {
          return false;
        }
      },
    });

    if (!productDetailCheck) {
      errorRate.add(1);
    }

    // Get product categories
    const categoriesResponse = http.get(`${BASE_URL}/categories`, { headers });

    requestCounter.add(1);
    responseTime.add(categoriesResponse.timings.duration);

    check(categoriesResponse, {
      'Categories loaded': (r) => r.status === 200,
      'Categories response time < 200ms': (r) => r.timings.duration < 200,
    });
  });
}

/**
 * User authentication scenario
 */
function userAuthentication(user) {
  group('User Authentication', function () {
    // Login
    const loginPayload = {
      email: user.email,
      password: user.password,
    };

    const loginResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify(loginPayload), {
      headers,
    });

    requestCounter.add(1);
    responseTime.add(loginResponse.timings.duration);

    const loginCheck = check(loginResponse, {
      'Login successful': (r) => r.status === 200,
      'Login response time < 400ms': (r) => r.timings.duration < 400,
      'Login returns token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.data.token;
        } catch (e) {
          return false;
        }
      },
    });

    if (!loginCheck) {
      errorRate.add(1);
      return;
    }

    // Extract token
    try {
      const loginBody = JSON.parse(loginResponse.body);
      authToken = loginBody.data.token;
    } catch (e) {
      errorRate.add(1);
      return;
    }

    // Get user profile
    const profileResponse = http.get(`${BASE_URL}/auth/profile`, {
      headers: {
        ...headers,
        Authorization: `Bearer ${authToken}`,
      },
    });

    requestCounter.add(1);
    responseTime.add(profileResponse.timings.duration);

    const profileCheck = check(profileResponse, {
      'Profile loaded': (r) => r.status === 200,
      'Profile response time < 200ms': (r) => r.timings.duration < 200,
      'Profile has user data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.data.email === user.email;
        } catch (e) {
          return false;
        }
      },
    });

    if (!profileCheck) {
      errorRate.add(1);
    }
  });
}

/**
 * Shopping cart flow scenario
 */
function shoppingCartFlow(user) {
  group('Shopping Cart Flow', function () {
    // First authenticate
    const loginResponse = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({
        email: user.email,
        password: user.password,
      }),
      { headers }
    );

    if (loginResponse.status !== 200) {
      errorRate.add(1);
      return;
    }

    let token;
    try {
      const loginBody = JSON.parse(loginResponse.body);
      token = loginBody.data.token;
    } catch (e) {
      errorRate.add(1);
      return;
    }

    const authHeaders = {
      ...headers,
      Authorization: `Bearer ${token}`,
    };

    // Get cart
    const cartResponse = http.get(`${BASE_URL}/cart`, { headers: authHeaders });

    requestCounter.add(1);
    responseTime.add(cartResponse.timings.duration);

    check(cartResponse, {
      'Cart loaded': (r) => r.status === 200,
      'Cart response time < 300ms': (r) => r.timings.duration < 300,
    });

    // Add item to cart
    const randomProduct = testProducts[Math.floor(Math.random() * testProducts.length)];
    const addToCartPayload = {
      productId: randomProduct.id,
      quantity: Math.floor(Math.random() * 3) + 1,
    };

    const addToCartResponse = http.post(
      `${BASE_URL}/cart/items`,
      JSON.stringify(addToCartPayload),
      {
        headers: authHeaders,
      }
    );

    requestCounter.add(1);
    responseTime.add(addToCartResponse.timings.duration);

    const addToCartCheck = check(addToCartResponse, {
      'Item added to cart': (r) => r.status === 200 || r.status === 201,
      'Add to cart response time < 400ms': (r) => r.timings.duration < 400,
    });

    if (!addToCartCheck) {
      errorRate.add(1);
      return;
    }

    // Update cart item
    const updateCartPayload = {
      quantity: 2,
    };

    const updateCartResponse = http.put(
      `${BASE_URL}/cart/items/${randomProduct.id}`,
      JSON.stringify(updateCartPayload),
      {
        headers: authHeaders,
      }
    );

    requestCounter.add(1);
    responseTime.add(updateCartResponse.timings.duration);

    check(updateCartResponse, {
      'Cart item updated': (r) => r.status === 200,
      'Update cart response time < 300ms': (r) => r.timings.duration < 300,
    });

    // Get updated cart
    const updatedCartResponse = http.get(`${BASE_URL}/cart`, { headers: authHeaders });

    requestCounter.add(1);
    responseTime.add(updatedCartResponse.timings.duration);

    check(updatedCartResponse, {
      'Updated cart loaded': (r) => r.status === 200,
      'Updated cart has items': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.data.items && body.data.items.length > 0;
        } catch (e) {
          return false;
        }
      },
    });
  });
}

/**
 * Product search scenario
 */
function searchProducts() {
  group('Product Search', function () {
    const searchTerms = ['laptop', 'phone', 'tablet', 'headphones', 'watch'];
    const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    // Search products
    const searchResponse = http.get(`${BASE_URL}/search?q=${searchTerm}&limit=10`, {
      headers,
    });

    requestCounter.add(1);
    responseTime.add(searchResponse.timings.duration);

    const searchCheck = check(searchResponse, {
      'Search completed': (r) => r.status === 200,
      'Search response time < 600ms': (r) => r.timings.duration < 600,
      'Search returns results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && Array.isArray(body.data);
        } catch (e) {
          return false;
        }
      },
    });

    if (!searchCheck) {
      errorRate.add(1);
      return;
    }

    // Search with filters
    const filteredSearchResponse = http.get(
      `${BASE_URL}/search?q=${searchTerm}&minPrice=100&maxPrice=1000&limit=20`,
      {
        headers,
      }
    );

    requestCounter.add(1);
    responseTime.add(filteredSearchResponse.timings.duration);

    check(filteredSearchResponse, {
      'Filtered search completed': (r) => r.status === 200,
      'Filtered search response time < 800ms': (r) => r.timings.duration < 800,
    });

    // Auto-complete search
    const autocompleteResponse = http.get(
      `${BASE_URL}/search/autocomplete?q=${searchTerm.substring(0, 3)}`,
      {
        headers,
      }
    );

    requestCounter.add(1);
    responseTime.add(autocompleteResponse.timings.duration);

    check(autocompleteResponse, {
      'Autocomplete completed': (r) => r.status === 200,
      'Autocomplete response time < 200ms': (r) => r.timings.duration < 200,
    });
  });
}

export function teardown(data) {
  console.log('🏁 Load test completed');

  // Final health check
  const finalHealthCheck = http.get(`${data.baseUrl}/health`);
  check(finalHealthCheck, {
    'Final health check passed': (r) => r.status === 200,
  });

  console.log('📊 Performance test results:');
  console.log(`   - Total requests: ${requestCounter.count}`);
  console.log(`   - Error rate: ${(errorRate.rate * 100).toFixed(2)}%`);
  console.log(`   - Average response time: ${responseTime.avg.toFixed(2)}ms`);
}

/**
 * Stress Test Configuration
 * Uncomment to run stress test instead of load test
 */
/*
export const stressOptions = {
  stages: [
    { duration: '1m', target: 100 },   // Ramp up
    { duration: '5m', target: 500 },   // Stress level
    { duration: '10m', target: 1000 }, // High stress
    { duration: '5m', target: 1500 },  // Peak stress
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'], // Allow higher error rate in stress test
    error_rate: ['rate<0.05'],
  },
};
*/
