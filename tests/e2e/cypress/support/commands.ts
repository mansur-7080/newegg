// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Declare Cypress namespace to avoid TypeScript errors
declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to login user
     * @example cy.login('email@example.com', 'password123')
     */
    login(email: string, password: string): Chainable<void>;

    /**
     * Custom command to navigate to a product
     * @example cy.goToProduct('iphone-15-pro')
     */
    goToProduct(slug: string): Chainable<void>;

    /**
     * Custom command to add product to cart
     * @example cy.addToCart('product-id-123', 2)
     */
    addToCart(productId: string, quantity?: number): Chainable<void>;
  }
}

// Login command
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('[data-testid="email-input"]').type(email);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="login-button"]').click();
  cy.url().should('not.include', '/login');
});

// Navigate to product command
Cypress.Commands.add('goToProduct', (slug) => {
  cy.visit(`/product/${slug}`);
  cy.url().should('include', `/product/${slug}`);
});

// Add to cart command
Cypress.Commands.add('addToCart', (productId, quantity = 1) => {
  cy.get(`[data-product-id="${productId}"]`).within(() => {
    if (quantity > 1) {
      cy.get('[data-testid="quantity-input"]').clear().type(quantity.toString());
    }
    cy.get('[data-testid="add-to-cart-button"]').click();
  });
  cy.get('[data-testid="cart-notification"]').should('be.visible');
});
