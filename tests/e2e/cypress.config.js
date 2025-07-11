const { defineConfig } = require('cypress');

module.exports = defineConfig({
  viewportWidth: 1280,
  viewportHeight: 800,
  defaultCommandTimeout: 10000,
  requestTimeout: 15000,
  responseTimeout: 15000,
  video: false,
  screenshotOnRunFailure: true,
  chromeWebSecurity: false,
  watchForFileChanges: false,
  retries: {
    runMode: 2,
    openMode: 0,
  },
  env: {
    API_URL: 'http://localhost:4000/api',
    ADMIN_EMAIL: 'admin@ultramarket.com',
    ADMIN_PASSWORD: 'admin123!',
  },
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
  },
});
