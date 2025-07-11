describe('Shopping Cart', () => {
  beforeEach(() => {
    cy.fixture('data.json').as('testData');
    cy.visit('/');
  });

  it('should add products to cart', function() {
    const product = this.testData.products[0];
    
    // Add product to cart
    cy.get(`[data-product-id="${product.id}"]`).within(() => {
      cy.get('[data-testid="add-to-cart-button"]').click();
    });
    
    // Verify cart notification shows
    cy.get('[data-testid="cart-notification"]').should('be.visible');
    
    // Go to cart page
    cy.get('[data-testid="cart-icon"]').click();
    
    // Verify product is in cart
    cy.get('[data-testid="cart-items"]')
      .should('contain', product.name)
      .and('contain', `$${product.price}`);
  });

  it('should update product quantity in cart', function() {
    const product = this.testData.products[0];
    
    // Add product to cart
    cy.addToCart(product.id);
    
    // Go to cart page
    cy.get('[data-testid="cart-icon"]').click();
    
    // Update quantity
    cy.get(`[data-cart-item-id="${product.id}"]`).within(() => {
      cy.get('[data-testid="quantity-input"]').clear().type('3');
      cy.get('[data-testid="update-quantity"]').click();
    });
    
    // Verify quantity updated
    cy.get(`[data-cart-item-id="${product.id}"]`).within(() => {
      cy.get('[data-testid="quantity-input"]').should('have.value', '3');
    });
    
    // Verify total price updated
    const expectedPrice = (product.price * 3).toFixed(2);
    cy.get(`[data-cart-item-id="${product.id}"]`).within(() => {
      cy.get('[data-testid="item-total"]').should('contain', `$${expectedPrice}`);
    });
  });

  it('should remove product from cart', function() {
    const product = this.testData.products[0];
    
    // Add product to cart
    cy.addToCart(product.id);
    
    // Go to cart page
    cy.get('[data-testid="cart-icon"]').click();
    
    // Remove product
    cy.get(`[data-cart-item-id="${product.id}"]`).within(() => {
      cy.get('[data-testid="remove-item"]').click();
    });
    
    // Verify product removed
    cy.get(`[data-cart-item-id="${product.id}"]`).should('not.exist');
    cy.get('[data-testid="empty-cart-message"]').should('be.visible');
  });

  it('should proceed to checkout from cart', function() {
    const product = this.testData.products[0];
    const user = this.testData.users[0];
    
    // Login
    cy.login(user.email, user.password);
    
    // Add product to cart
    cy.addToCart(product.id);
    
    // Go to cart page
    cy.get('[data-testid="cart-icon"]').click();
    
    // Proceed to checkout
    cy.get('[data-testid="checkout-button"]').click();
    
    // Verify on checkout page
    cy.url().should('include', '/checkout');
    cy.get('[data-testid="shipping-form"]').should('be.visible');
  });
});
