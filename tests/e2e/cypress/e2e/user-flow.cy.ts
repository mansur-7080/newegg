describe('UltraMarket E2E User Flow', () => {
  const testUser = {
    email: `test${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+998901234567',
  };

  beforeEach(() => {
    // Visit the homepage
    cy.visit('http://localhost:3000');
  });

  describe('User Registration and Authentication', () => {
    it('should complete user registration flow', () => {
      // Navigate to registration page
      cy.get('[data-testid="register-link"]').click();
      cy.url().should('include', '/register');

      // Fill registration form
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="firstName-input"]').type(testUser.firstName);
      cy.get('[data-testid="lastName-input"]').type(testUser.lastName);
      cy.get('[data-testid="phone-input"]').type(testUser.phone);

      // Submit registration
      cy.get('[data-testid="register-button"]').click();

      // Should redirect to login or show success message
      cy.url().should('include', '/login');
      cy.get('[data-testid="success-message"]').should('contain', 'registered successfully');
    });

    it('should complete user login flow', () => {
      // Navigate to login page
      cy.get('[data-testid="login-link"]').click();
      cy.url().should('include', '/login');

      // Fill login form
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);

      // Submit login
      cy.get('[data-testid="login-button"]').click();

      // Should redirect to homepage and show user menu
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      cy.get('[data-testid="user-menu"]').should('be.visible');
    });

    it('should handle login errors', () => {
      cy.get('[data-testid="login-link"]').click();
      cy.url().should('include', '/login');

      // Try to login with wrong password
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type('wrongpassword');

      cy.get('[data-testid="login-button"]').click();

      // Should show error message
      cy.get('[data-testid="error-message"]').should('contain', 'Invalid email or password');
    });
  });

  describe('Product Browsing and Search', () => {
    it('should browse products successfully', () => {
      // Visit products page
      cy.get('[data-testid="products-link"]').click();
      cy.url().should('include', '/products');

      // Should display products
      cy.get('[data-testid="product-card"]').should('have.length.greaterThan', 0);

      // Click on a product to view details
      cy.get('[data-testid="product-card"]').first().click();
      cy.url().should('include', '/product/');

      // Should show product details
      cy.get('[data-testid="product-title"]').should('be.visible');
      cy.get('[data-testid="product-price"]').should('be.visible');
      cy.get('[data-testid="add-to-cart-button"]').should('be.visible');
    });

    it('should search products successfully', () => {
      cy.get('[data-testid="search-input"]').type('laptop');
      cy.get('[data-testid="search-button"]').click();

      // Should show search results
      cy.get('[data-testid="search-results"]').should('be.visible');
      cy.get('[data-testid="product-card"]').should('have.length.greaterThan', 0);
    });

    it('should filter products by category', () => {
      cy.get('[data-testid="products-link"]').click();
      cy.url().should('include', '/products');

      // Select a category filter
      cy.get('[data-testid="category-filter"]').click();
      cy.get('[data-testid="category-option"]').first().click();

      // Should filter products
      cy.get('[data-testid="product-card"]').should('have.length.greaterThan', 0);
    });

    it('should filter products by price range', () => {
      cy.get('[data-testid="products-link"]').click();
      cy.url().should('include', '/products');

      // Set price range
      cy.get('[data-testid="min-price-input"]').type('100');
      cy.get('[data-testid="max-price-input"]').type('1000');
      cy.get('[data-testid="apply-filters-button"]').click();

      // Should filter products by price
      cy.get('[data-testid="product-card"]').should('have.length.greaterThan', 0);
    });
  });

  describe('Shopping Cart Operations', () => {
    beforeEach(() => {
      // Login before cart tests
      cy.get('[data-testid="login-link"]').click();
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-button"]').click();
    });

    it('should add product to cart', () => {
      // Navigate to products
      cy.get('[data-testid="products-link"]').click();
      cy.get('[data-testid="product-card"]').first().click();

      // Add to cart
      cy.get('[data-testid="add-to-cart-button"]').click();

      // Should show success message
      cy.get('[data-testid="success-message"]').should('contain', 'added to cart');

      // Cart count should increase
      cy.get('[data-testid="cart-count"]').should('contain', '1');
    });

    it('should view cart contents', () => {
      // Add item to cart first
      cy.get('[data-testid="products-link"]').click();
      cy.get('[data-testid="product-card"]').first().click();
      cy.get('[data-testid="add-to-cart-button"]').click();

      // Navigate to cart
      cy.get('[data-testid="cart-link"]').click();
      cy.url().should('include', '/cart');

      // Should show cart items
      cy.get('[data-testid="cart-item"]').should('have.length.greaterThan', 0);
      cy.get('[data-testid="cart-total"]').should('be.visible');
    });

    it('should update cart item quantity', () => {
      // Add item to cart
      cy.get('[data-testid="products-link"]').click();
      cy.get('[data-testid="product-card"]').first().click();
      cy.get('[data-testid="add-to-cart-button"]').click();

      // Go to cart
      cy.get('[data-testid="cart-link"]').click();

      // Update quantity
      cy.get('[data-testid="quantity-increase"]').first().click();
      cy.get('[data-testid="cart-item-quantity"]').should('contain', '2');

      // Total should update
      cy.get('[data-testid="cart-total"]').should('not.contain', '0');
    });

    it('should remove item from cart', () => {
      // Add item to cart
      cy.get('[data-testid="products-link"]').click();
      cy.get('[data-testid="product-card"]').first().click();
      cy.get('[data-testid="add-to-cart-button"]').click();

      // Go to cart
      cy.get('[data-testid="cart-link"]').click();

      // Remove item
      cy.get('[data-testid="remove-item-button"]').first().click();

      // Should show empty cart message
      cy.get('[data-testid="empty-cart-message"]').should('be.visible');
    });
  });

  describe('Checkout Process', () => {
    beforeEach(() => {
      // Login and add item to cart
      cy.get('[data-testid="login-link"]').click();
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-button"]').click();

      cy.get('[data-testid="products-link"]').click();
      cy.get('[data-testid="product-card"]').first().click();
      cy.get('[data-testid="add-to-cart-button"]').click();
    });

    it('should complete checkout process', () => {
      // Go to cart and proceed to checkout
      cy.get('[data-testid="cart-link"]').click();
      cy.get('[data-testid="proceed-to-checkout-button"]').click();
      cy.url().should('include', '/checkout');

      // Fill shipping address
      cy.get('[data-testid="shipping-address-form"]').within(() => {
        cy.get('[data-testid="firstName-input"]').type(testUser.firstName);
        cy.get('[data-testid="lastName-input"]').type(testUser.lastName);
        cy.get('[data-testid="phone-input"]').type(testUser.phone);
        cy.get('[data-testid="address-input"]').type('Test Address 123');
        cy.get('[data-testid="city-input"]').type('Tashkent');
        cy.get('[data-testid="postal-code-input"]').type('100000');
      });

      // Select payment method
      cy.get('[data-testid="payment-method-click"]').click();

      // Review order
      cy.get('[data-testid="order-summary"]').should('be.visible');
      cy.get('[data-testid="order-total"]').should('be.visible');

      // Place order
      cy.get('[data-testid="place-order-button"]').click();

      // Should redirect to order confirmation
      cy.url().should('include', '/order-confirmation');
      cy.get('[data-testid="order-success-message"]').should('be.visible');
    });

    it('should validate checkout form', () => {
      cy.get('[data-testid="cart-link"]').click();
      cy.get('[data-testid="proceed-to-checkout-button"]').click();

      // Try to place order without filling required fields
      cy.get('[data-testid="place-order-button"]').click();

      // Should show validation errors
      cy.get('[data-testid="validation-error"]').should('be.visible');
    });
  });

  describe('User Profile Management', () => {
    beforeEach(() => {
      // Login
      cy.get('[data-testid="login-link"]').click();
      cy.get('[data-testid="email-input"]').type(testUser.email);
      cy.get('[data-testid="password-input"]').type(testUser.password);
      cy.get('[data-testid="login-button"]').click();
    });

    it('should view and update user profile', () => {
      // Navigate to profile
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="profile-link"]').click();
      cy.url().should('include', '/profile');

      // Should show current profile data
      cy.get('[data-testid="profile-email"]').should('contain', testUser.email);
      cy.get('[data-testid="profile-firstName"]').should('contain', testUser.firstName);

      // Update profile
      cy.get('[data-testid="edit-profile-button"]').click();
      cy.get('[data-testid="firstName-input"]').clear().type('Jane');
      cy.get('[data-testid="save-profile-button"]').click();

      // Should show success message
      cy.get('[data-testid="success-message"]').should('contain', 'updated successfully');
    });

    it('should view order history', () => {
      // Navigate to orders
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="orders-link"]').click();
      cy.url().should('include', '/orders');

      // Should show order history
      cy.get('[data-testid="order-history"]').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile devices', () => {
      // Set mobile viewport
      cy.viewport('iphone-x');

      // Should show mobile menu
      cy.get('[data-testid="mobile-menu-button"]').should('be.visible');
      cy.get('[data-testid="mobile-menu-button"]').click();

      // Should show mobile navigation
      cy.get('[data-testid="mobile-nav"]').should('be.visible');
    });

    it('should work on tablet devices', () => {
      // Set tablet viewport
      cy.viewport('ipad-2');

      // Should show tablet layout
      cy.get('[data-testid="product-grid"]').should('be.visible');
    });
  });

  describe('Performance and Loading States', () => {
    it('should show loading states', () => {
      cy.get('[data-testid="products-link"]').click();

      // Should show loading spinner
      cy.get('[data-testid="loading-spinner"]').should('be.visible');

      // Should hide loading spinner when content loads
      cy.get('[data-testid="product-card"]').should('be.visible');
      cy.get('[data-testid="loading-spinner"]').should('not.exist');
    });

    it('should handle network errors gracefully', () => {
      // Intercept API calls and return error
      cy.intercept('GET', '/api/v1/products', { statusCode: 500 });

      cy.get('[data-testid="products-link"]').click();

      // Should show error message
      cy.get('[data-testid="error-message"]').should('contain', 'Failed to load products');
    });
  });
});