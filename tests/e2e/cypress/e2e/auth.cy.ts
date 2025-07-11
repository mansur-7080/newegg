describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.fixture('data.json').as('testData');
  });

  it('should allow a user to login', function() {
    const { email, password } = this.testData.users[0];
    
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="login-button"]').click();
    
    // Verify successful login
    cy.url().should('not.include', '/login');
    cy.get('[data-testid="user-account-menu"]').should('be.visible');
  });

  it('should show validation errors for incorrect credentials', () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type('wrong@email.com');
    cy.get('[data-testid="password-input"]').type('wrongPassword');
    cy.get('[data-testid="login-button"]').click();
    
    // Verify error message appears
    cy.get('[data-testid="login-error"]').should('be.visible');
    cy.url().should('include', '/login');
  });

  it('should allow a user to register', () => {
    const uniqueEmail = `test-${Date.now()}@ultramarket.com`;
    
    cy.visit('/register');
    cy.get('[data-testid="name-input"]').type('New Test User');
    cy.get('[data-testid="email-input"]').type(uniqueEmail);
    cy.get('[data-testid="password-input"]').type('TestPassword123!');
    cy.get('[data-testid="confirm-password-input"]').type('TestPassword123!');
    cy.get('[data-testid="register-button"]').click();
    
    // Verify successful registration
    cy.url().should('not.include', '/register');
    cy.get('[data-testid="user-account-menu"]').should('be.visible');
  });

  it('should allow a user to logout', function() {
    const { email, password } = this.testData.users[0];
    
    // Login first
    cy.login(email, password);
    
    // Logout process
    cy.get('[data-testid="user-account-menu"]').click();
    cy.get('[data-testid="logout-button"]').click();
    
    // Verify successful logout
    cy.get('[data-testid="login-button"]').should('be.visible');
    cy.url().should('include', '/login');
  });
});
