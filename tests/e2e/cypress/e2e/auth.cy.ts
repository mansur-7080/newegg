/**
 * Authentication E2E Tests
 * Tests user registration, login, logout, and token management
 */

describe('Authentication Flow', () => {
  const baseUrl = Cypress.env('API_BASE_URL') || 'http://localhost:8000';
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  };

  let authTokens: { accessToken: string; refreshToken: string };

  beforeEach(() => {
    // Clear cookies and local storage before each test
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/register`,
        body: testUser,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(201);
        expect(response.body.success).to.be.true;
        expect(response.body.data.user.email).to.equal(testUser.email);
        expect(response.body.data.tokens).to.have.property('accessToken');
        expect(response.body.data.tokens).to.have.property('refreshToken');
        
        authTokens = response.body.data.tokens;
      });
    });

    it('should reject registration with invalid email', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/register`,
        body: {
          ...testUser,
          email: 'invalid-email',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
        expect(response.body.error.code).to.equal('VALIDATION_ERROR');
      });
    });

    it('should reject registration with weak password', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/register`,
        body: {
          ...testUser,
          password: 'weak',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
        expect(response.body.error.code).to.equal('VALIDATION_ERROR');
      });
    });

    it('should reject registration with existing email', () => {
      // First registration
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/register`,
        body: testUser,
        failOnStatusCode: false,
      });

      // Second registration with same email
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/register`,
        body: testUser,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(409);
        expect(response.body.success).to.be.false;
        expect(response.body.error.code).to.equal('CONFLICT');
      });
    });
  });

  describe('User Login', () => {
    beforeEach(() => {
      // Register a user for login tests
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/register`,
        body: testUser,
        failOnStatusCode: false,
      }).then((response) => {
        if (response.status === 201) {
          authTokens = response.body.data.tokens;
        }
      });
    });

    it('should login with valid credentials', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/login`,
        body: {
          email: testUser.email,
          password: testUser.password,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data.user.email).to.equal(testUser.email);
        expect(response.body.data.tokens).to.have.property('accessToken');
        expect(response.body.data.tokens).to.have.property('refreshToken');
        
        authTokens = response.body.data.tokens;
      });
    });

    it('should reject login with invalid email', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/login`,
        body: {
          email: 'nonexistent@example.com',
          password: testUser.password,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(401);
        expect(response.body.success).to.be.false;
        expect(response.body.error.code).to.equal('INVALID_CREDENTIALS');
      });
    });

    it('should reject login with invalid password', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/login`,
        body: {
          email: testUser.email,
          password: 'wrongpassword',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(401);
        expect(response.body.success).to.be.false;
        expect(response.body.error.code).to.equal('INVALID_CREDENTIALS');
      });
    });

    it('should reject login with missing credentials', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/login`,
        body: {
          email: testUser.email,
          // Missing password
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(400);
        expect(response.body.success).to.be.false;
        expect(response.body.error.code).to.equal('VALIDATION_ERROR');
      });
    });
  });

  describe('Token Management', () => {
    beforeEach(() => {
      // Login to get tokens
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/login`,
        body: {
          email: testUser.email,
          password: testUser.password,
        },
        failOnStatusCode: false,
      }).then((response) => {
        if (response.status === 200) {
          authTokens = response.body.data.tokens;
        }
      });
    });

    it('should verify valid access token', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/verify`,
        headers: {
          Authorization: `Bearer ${authTokens.accessToken}`,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data.user.email).to.equal(testUser.email);
      });
    });

    it('should reject invalid access token', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/verify`,
        headers: {
          Authorization: 'Bearer invalid-token',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(401);
        expect(response.body.success).to.be.false;
        expect(response.body.error.code).to.equal('INVALID_TOKEN');
      });
    });

    it('should refresh tokens successfully', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/refresh`,
        body: {
          refreshToken: authTokens.refreshToken,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
        expect(response.body.data.tokens).to.have.property('accessToken');
        expect(response.body.data.tokens).to.have.property('refreshToken');
        
        // Verify new access token works
        cy.request({
          method: 'POST',
          url: `${baseUrl}/api/auth/verify`,
          headers: {
            Authorization: `Bearer ${response.body.data.tokens.accessToken}`,
          },
          failOnStatusCode: false,
        }).then((verifyResponse) => {
          expect(verifyResponse.status).to.equal(200);
          expect(verifyResponse.body.success).to.be.true;
        });
      });
    });

    it('should reject invalid refresh token', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/refresh`,
        body: {
          refreshToken: 'invalid-refresh-token',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(401);
        expect(response.body.success).to.be.false;
        expect(response.body.error.code).to.equal('INVALID_TOKEN');
      });
    });
  });

  describe('User Logout', () => {
    beforeEach(() => {
      // Login to get tokens
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/login`,
        body: {
          email: testUser.email,
          password: testUser.password,
        },
        failOnStatusCode: false,
      }).then((response) => {
        if (response.status === 200) {
          authTokens = response.body.data.tokens;
        }
      });
    });

    it('should logout successfully', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/logout`,
        body: {
          refreshToken: authTokens.refreshToken,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
      });
    });

    it('should reject logout with invalid refresh token', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/logout`,
        body: {
          refreshToken: 'invalid-refresh-token',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(401);
        expect(response.body.success).to.be.false;
        expect(response.body.error.code).to.equal('INVALID_TOKEN');
      });
    });

    it('should invalidate tokens after logout', () => {
      // First logout
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/logout`,
        body: {
          refreshToken: authTokens.refreshToken,
        },
        failOnStatusCode: false,
      });

      // Try to refresh with invalidated token
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/refresh`,
        body: {
          refreshToken: authTokens.refreshToken,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(401);
        expect(response.body.success).to.be.false;
        expect(response.body.error.code).to.equal('INVALID_TOKEN');
      });
    });
  });

  describe('Password Management', () => {
    it('should request password reset', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/forgot-password`,
        body: {
          email: testUser.email,
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(200);
        expect(response.body.success).to.be.true;
      });
    });

    it('should reject password reset for non-existent email', () => {
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/forgot-password`,
        body: {
          email: 'nonexistent@example.com',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(404);
        expect(response.body.success).to.be.false;
        expect(response.body.error.code).to.equal('NOT_FOUND');
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on login attempts', () => {
      const loginAttempts = Array.from({ length: 6 }, () => ({
        method: 'POST',
        url: `${baseUrl}/api/auth/login`,
        body: {
          email: testUser.email,
          password: 'wrongpassword',
        },
        failOnStatusCode: false,
      }));

      // Make multiple failed login attempts
      cy.wrap(loginAttempts).each((attempt: any) => {
        cy.request(attempt);
      });

      // The 6th attempt should be rate limited
      cy.request({
        method: 'POST',
        url: `${baseUrl}/api/auth/login`,
        body: {
          email: testUser.email,
          password: 'wrongpassword',
        },
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.status).to.equal(429);
        expect(response.body.success).to.be.false;
        expect(response.body.error.code).to.equal('RATE_LIMIT_EXCEEDED');
      });
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', () => {
      cy.request({
        method: 'GET',
        url: `${baseUrl}/api/auth/health`,
        failOnStatusCode: false,
      }).then((response) => {
        expect(response.headers).to.have.property('x-frame-options');
        expect(response.headers).to.have.property('x-content-type-options');
        expect(response.headers).to.have.property('x-xss-protection');
        expect(response.headers['x-frame-options']).to.equal('DENY');
        expect(response.headers['x-content-type-options']).to.equal('nosniff');
        expect(response.headers['x-xss-protection']).to.equal('1; mode=block');
      });
    });
  });
});
