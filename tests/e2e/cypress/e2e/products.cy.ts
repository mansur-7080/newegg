describe('Product Browsing', () => {
  beforeEach(() => {
    cy.fixture('data.json').as('testData');
  });

  it('should display products on the homepage', () => {
    cy.visit('/');
    cy.get('[data-testid="product-card"]').should('have.length.at.least', 3);
  });

  it('should allow filtering products by category', function() {
    cy.visit('/');
    
    // Select a category
    cy.get('[data-testid="category-filter"]').select('smartphones');
    
    // Verify only smartphones are shown
    cy.get('[data-testid="product-card"]').each(($card) => {
      cy.wrap($card).find('[data-testid="product-category"]').should('contain', 'Smartphones');
    });
  });

  it('should allow sorting products by price', () => {
    cy.visit('/');
    
    // Sort by price (low to high)
    cy.get('[data-testid="sort-select"]').select('price-asc');
    
    // Verify products are sorted
    let previousPrice = 0;
    cy.get('[data-testid="product-price"]').each(($price) => {
      const currentPrice = parseFloat($price.text().replace('$', '').replace(',', ''));
      expect(currentPrice).to.be.at.least(previousPrice);
      previousPrice = currentPrice;
    });
  });

  it('should display product details correctly', function() {
    const product = this.testData.products[0];
    
    cy.visit(`/product/${product.slug}`);
    
    // Verify product information
    cy.get('[data-testid="product-name"]').should('contain', product.name);
    cy.get('[data-testid="product-price"]').should('contain', product.price.toString());
    cy.get('[data-testid="product-description"]').should('contain', product.description);
  });

  it('should show related products', function() {
    const product = this.testData.products[0];
    
    cy.visit(`/product/${product.slug}`);
    
    // Verify related products section exists
    cy.get('[data-testid="related-products"]').should('exist');
    cy.get('[data-testid="related-product-card"]').should('have.length.at.least', 1);
  });
});
