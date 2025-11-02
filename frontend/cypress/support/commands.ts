// ***********************************************
// Custom commands for Cypress
// ***********************************************

/// <reference types="cypress" />

/**
 * Login command - logs in a user via API
 */
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: {
      email,
      password,
    },
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body).to.have.property('access_token');
    
    // Store token in localStorage
    window.localStorage.setItem('access_token', response.body.access_token);
    window.localStorage.setItem('refresh_token', response.body.refresh_token);
    window.localStorage.setItem('user', JSON.stringify(response.body.user));
  });
});

/**
 * Logout command - logs out a user
 */
Cypress.Commands.add('logout', () => {
  window.localStorage.removeItem('access_token');
  window.localStorage.removeItem('refresh_token');
  window.localStorage.removeItem('user');
  cy.visit('/login');
});

/**
 * Create tour command - creates a tour via API
 */
Cypress.Commands.add('createTour', (tourData: any) => {
  const token = window.localStorage.getItem('access_token');
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/tours`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: tourData,
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body;
  });
});

/**
 * Create booking command - creates a booking via API
 */
Cypress.Commands.add('createBooking', (bookingData: any) => {
  const token = window.localStorage.getItem('access_token');
  
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/bookings`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: bookingData,
  }).then((response) => {
    expect(response.status).to.eq(201);
    return response.body;
  });
});

/**
 * Intercept API command - intercepts and mocks API responses
 */
Cypress.Commands.add('interceptAPI', (method: string, url: string, response: any) => {
  cy.intercept(method, `${Cypress.env('apiUrl')}${url}`, response).as('apiCall');
});

/**
 * Wait for dashboard to load
 */
Cypress.Commands.add('waitForDashboard', () => {
  cy.get('[data-testid="dashboard"]', { timeout: 10000 }).should('be.visible');
  cy.get('[data-testid="loading"]').should('not.exist');
});
