// ***********************************************************
// This file is processed and loaded automatically before your test files.
// ***********************************************************

import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Prevent TypeScript errors
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      createTour(tourData: any): Chainable<void>;
      createBooking(bookingData: any): Chainable<void>;
      interceptAPI(method: string, url: string, response: any): Chainable<void>;
      waitForDashboard(): Chainable<void>;
    }
  }
}

// Global error handlers
Cypress.on('uncaught:exception', (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  return true;
});

// Global before hook
beforeEach(() => {
  // Clear cookies and local storage before each test
  cy.clearCookies();
  cy.clearLocalStorage();
  
  // Set viewport size
  cy.viewport(1280, 720);
});
