describe('Checkout Process', () => {
  beforeEach(() => {
    cy.fixture('data.json').as('testData');
  });

  it('should complete the entire checkout process', function() {
    const product = this.testData.products[0];
    const user = this.testData.users[0];
    
    // Login
    cy.login(user.email, user.password);
    
    // Add product to cart
    cy.visit(`/product/${product.slug}`);
    cy.get('[data-testid="add-to-cart-button"]').click();
    
    // Go to cart
    cy.get('[data-testid="cart-icon"]').click();
    cy.get('[data-testid="checkout-button"]').click();
    
    // Fill shipping address
    cy.get('[data-testid="shipping-address-form"]').within(() => {
      cy.get('[name="firstName"]').type('Test');
      cy.get('[name="lastName"]').type('User');
      cy.get('[name="addressLine1"]').type('123 Test St');
      cy.get('[name="city"]').type('Test City');
      cy.get('[name="state"]').type('Test State');
      cy.get('[name="postalCode"]').type('12345');
      cy.get('[name="country"]').select('Uzbekistan');
      cy.get('[name="phone"]').type('1234567890');
      cy.get('[data-testid="continue-to-payment"]').click();
    });
    
    // Fill payment details
    cy.get('[data-testid="payment-form"]').within(() => {
      cy.get('[name="cardNumber"]').type('4242424242424242');
      cy.get('[name="cardName"]').type('Test User');
      cy.get('[name="expiryDate"]').type('12/25');
      cy.get('[name="cvv"]').type('123');
      cy.get('[data-testid="place-order"]').click();
    });
    
    // Verify order confirmation
    cy.url().should('include', '/order-confirmation');
    cy.get('[data-testid="order-confirmation"]').should('be.visible');
    cy.get('[data-testid="order-number"]').should('exist');
  });

  it('should validate required fields in checkout forms', function() {
    const product = this.testData.products[0];
    const user = this.testData.users[0];
    
    // Login and add product to cart
    cy.login(user.email, user.password);
    cy.addToCart(product.id);
    
    // Go to checkout
    cy.get('[data-testid="cart-icon"]').click();
    cy.get('[data-testid="checkout-button"]').click();
    
    // Try to submit empty shipping form
    cy.get('[data-testid="continue-to-payment"]').click();
    
    // Verify validation errors appear
    cy.get('[data-testid="form-error"]').should('be.visible');
    cy.get('[data-testid="field-error"]').should('have.length.at.least', 1);
  });

  it('should display order history after purchase', function() {
    const user = this.testData.users[0];
    
    // Login
    cy.login(user.email, user.password);
    
    // Go to order history
    cy.get('[data-testid="user-account-menu"]').click();
    cy.get('[data-testid="order-history"]').click();
    
    // Verify order history page
    cy.url().should('include', '/orders');
    cy.get('[data-testid="order-list"]').should('exist');
  });
});
