/**
 * HTTP Test Script
 * Test all product service endpoints
 */

import http from 'http';
import { logger } from './shared/logger';

class HttpTester {
  private baseUrl = 'http://localhost:3003';

  private makeRequest(method: string, path: string, data?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Product-Service-Test'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const jsonBody = JSON.parse(body);
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: jsonBody
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async testHealthCheck() {
    logger.info('🏥 Testing health check endpoint...');
    try {
      const response = await this.makeRequest('GET', '/health');
      
      if (response.statusCode === 200) {
        logger.info('✅ Health check passed:', response.body);
        return true;
      } else {
        logger.error('❌ Health check failed:', response);
        return false;
      }
    } catch (error) {
      logger.error('❌ Health check error:', error);
      return false;
    }
  }

  async testProductEndpoints() {
    logger.info('📦 Testing product endpoints...');
    
    try {
      // Test GET /api/products
      logger.info('Testing GET /api/products...');
      const getProductsResponse = await this.makeRequest('GET', '/api/products');
      
      if (getProductsResponse.statusCode === 200) {
        logger.info('✅ GET /api/products passed');
        logger.info('Response:', getProductsResponse.body);
      } else {
        logger.error('❌ GET /api/products failed:', getProductsResponse);
      }

      // Test GET /api/products/:id
      logger.info('Testing GET /api/products/:id...');
      const getProductResponse = await this.makeRequest('GET', '/api/products/507f1f77bcf86cd799439011');
      
      if (getProductResponse.statusCode === 200) {
        logger.info('✅ GET /api/products/:id passed');
        logger.info('Response:', getProductResponse.body);
      } else {
        logger.error('❌ GET /api/products/:id failed:', getProductResponse);
      }

      // Test POST /api/products
      logger.info('Testing POST /api/products...');
      const newProduct = {
        name: 'Test Product New',
        description: 'A new test product',
        price: 49.99,
        sku: 'TEST-NEW-001',
        category: '507f1f77bcf86cd799439012',
        status: 'active'
      };
      
      const createProductResponse = await this.makeRequest('POST', '/api/products', newProduct);
      
      if (createProductResponse.statusCode === 201) {
        logger.info('✅ POST /api/products passed');
        logger.info('Response:', createProductResponse.body);
      } else {
        logger.error('❌ POST /api/products failed:', createProductResponse);
      }

      // Test PUT /api/products/:id
      logger.info('Testing PUT /api/products/:id...');
      const updateData = {
        name: 'Updated Test Product',
        price: 59.99
      };
      
      const updateProductResponse = await this.makeRequest('PUT', '/api/products/507f1f77bcf86cd799439011', updateData);
      
      if (updateProductResponse.statusCode === 200) {
        logger.info('✅ PUT /api/products/:id passed');
        logger.info('Response:', updateProductResponse.body);
      } else {
        logger.error('❌ PUT /api/products/:id failed:', updateProductResponse);
      }

      // Test DELETE /api/products/:id
      logger.info('Testing DELETE /api/products/:id...');
      const deleteProductResponse = await this.makeRequest('DELETE', '/api/products/507f1f77bcf86cd799439013');
      
      if (deleteProductResponse.statusCode === 200) {
        logger.info('✅ DELETE /api/products/:id passed');
        logger.info('Response:', deleteProductResponse.body);
      } else {
        logger.error('❌ DELETE /api/products/:id failed:', deleteProductResponse);
      }

      return true;
    } catch (error) {
      logger.error('❌ Product endpoints test error:', error);
      return false;
    }
  }

  async testCategoryEndpoints() {
    logger.info('📁 Testing category endpoints...');
    
    try {
      // Test GET /api/categories
      logger.info('Testing GET /api/categories...');
      const getCategoriesResponse = await this.makeRequest('GET', '/api/categories');
      
      if (getCategoriesResponse.statusCode === 200) {
        logger.info('✅ GET /api/categories passed');
        logger.info('Response:', getCategoriesResponse.body);
      } else {
        logger.error('❌ GET /api/categories failed:', getCategoriesResponse);
      }

      // Test GET /api/categories/:id
      logger.info('Testing GET /api/categories/:id...');
      const getCategoryResponse = await this.makeRequest('GET', '/api/categories/507f1f77bcf86cd799439012');
      
      if (getCategoryResponse.statusCode === 200) {
        logger.info('✅ GET /api/categories/:id passed');
        logger.info('Response:', getCategoryResponse.body);
      } else {
        logger.error('❌ GET /api/categories/:id failed:', getCategoryResponse);
      }

      // Test POST /api/categories
      logger.info('Testing POST /api/categories...');
      const newCategory = {
        name: 'New Category',
        description: 'A new test category',
        slug: 'new-category',
        isActive: true
      };
      
      const createCategoryResponse = await this.makeRequest('POST', '/api/categories', newCategory);
      
      if (createCategoryResponse.statusCode === 201) {
        logger.info('✅ POST /api/categories passed');
        logger.info('Response:', createCategoryResponse.body);
      } else {
        logger.error('❌ POST /api/categories failed:', createCategoryResponse);
      }

      // Test PUT /api/categories/:id
      logger.info('Testing PUT /api/categories/:id...');
      const updateCategoryData = {
        name: 'Updated Category',
        description: 'Updated description'
      };
      
      const updateCategoryResponse = await this.makeRequest('PUT', '/api/categories/507f1f77bcf86cd799439012', updateCategoryData);
      
      if (updateCategoryResponse.statusCode === 200) {
        logger.info('✅ PUT /api/categories/:id passed');
        logger.info('Response:', updateCategoryResponse.body);
      } else {
        logger.error('❌ PUT /api/categories/:id failed:', updateCategoryResponse);
      }

      return true;
    } catch (error) {
      logger.error('❌ Category endpoints test error:', error);
      return false;
    }
  }

  async testErrorHandling() {
    logger.info('🚨 Testing error handling...');
    
    try {
      // Test 404 for non-existent product
      logger.info('Testing 404 for non-existent product...');
      const notFoundResponse = await this.makeRequest('GET', '/api/products/nonexistent');
      
      if (notFoundResponse.statusCode === 404) {
        logger.info('✅ 404 error handling passed');
        logger.info('Response:', notFoundResponse.body);
      } else {
        logger.error('❌ 404 error handling failed:', notFoundResponse);
      }

      // Test 404 for non-existent category
      logger.info('Testing 404 for non-existent category...');
      const notFoundCategoryResponse = await this.makeRequest('GET', '/api/categories/nonexistent');
      
      if (notFoundCategoryResponse.statusCode === 404) {
        logger.info('✅ Category 404 error handling passed');
        logger.info('Response:', notFoundCategoryResponse.body);
      } else {
        logger.error('❌ Category 404 error handling failed:', notFoundCategoryResponse);
      }

      return true;
    } catch (error) {
      logger.error('❌ Error handling test error:', error);
      return false;
    }
  }

  async runAllTests() {
    logger.info('🚀 Starting comprehensive HTTP tests...');
    
    const results = {
      healthCheck: false,
      productEndpoints: false,
      categoryEndpoints: false,
      errorHandling: false
    };

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Run tests
    results.healthCheck = await this.testHealthCheck();
    results.productEndpoints = await this.testProductEndpoints();
    results.categoryEndpoints = await this.testCategoryEndpoints();
    results.errorHandling = await this.testErrorHandling();

    // Summary
    const passedTests = Object.values(results).filter(r => r).length;
    const totalTests = Object.keys(results).length;
    
    logger.info(`\n📊 Test Results Summary:`);
    logger.info(`✅ Passed: ${passedTests}/${totalTests}`);
    logger.info(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
      logger.info('🎉 All tests passed! Product service is working correctly.');
    } else {
      logger.error('❌ Some tests failed. Please check the logs above.');
    }

    return results;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new HttpTester();
  tester.runAllTests().then(() => {
    process.exit(0);
  }).catch((error) => {
    logger.error('Test runner error:', error);
    process.exit(1);
  });
}

export default HttpTester;