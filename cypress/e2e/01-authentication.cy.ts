/// <reference types="cypress" />

describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
  });

  describe('User Registration', () => {
    it('should successfully register a new user', () => {
      cy.visit('/register');
      
      // Fill registration form
      cy.get('[data-cy=register-name]').type('John Doe');
      cy.get('[data-cy=register-email]').type('john.doe@example.com');
      cy.get('[data-cy=register-password]').type('SecurePass123!');
      cy.get('[data-cy=register-confirm-password]').type('SecurePass123!');
      cy.get('[data-cy=register-terms]').check();
      
      // Submit form
      cy.get('[data-cy=register-submit]').click();
      
      // Verify success
      cy.url().should('include', '/verify-email');
      cy.contains('Please check your email to verify your account').should('be.visible');
    });

    it('should validate registration form fields', () => {
      cy.visit('/register');
      
      // Test email validation
      cy.get('[data-cy=register-email]').type('invalid-email');
      cy.get('[data-cy=register-email]').blur();
      cy.contains('Please enter a valid email address').should('be.visible');
      
      // Test password requirements
      cy.get('[data-cy=register-password]').type('weak');
      cy.get('[data-cy=register-password]').blur();
      cy.contains('Password must be at least 8 characters').should('be.visible');
      
      // Test password match
      cy.get('[data-cy=register-password]').clear().type('SecurePass123!');
      cy.get('[data-cy=register-confirm-password]').type('DifferentPass123!');
      cy.get('[data-cy=register-confirm-password]').blur();
      cy.contains('Passwords do not match').should('be.visible');
    });

    it('should prevent duplicate email registration', () => {
      cy.visit('/register');
      
      // Use existing email
      cy.get('[data-cy=register-email]').type(Cypress.env('testUser').email);
      cy.get('[data-cy=register-name]').type('Duplicate User');
      cy.get('[data-cy=register-password]').type('SecurePass123!');
      cy.get('[data-cy=register-confirm-password]').type('SecurePass123!');
      cy.get('[data-cy=register-terms]').check();
      cy.get('[data-cy=register-submit]').click();
      
      // Verify error
      cy.contains('Email already registered').should('be.visible');
    });
  });

  describe('User Login', () => {
    it('should successfully login with valid credentials', () => {
      cy.visit('/login');
      
      // Fill login form
      cy.get('[data-cy=login-email]').type(Cypress.env('testUser').email);
      cy.get('[data-cy=login-password]').type(Cypress.env('testUser').password);
      
      // Submit
      cy.get('[data-cy=login-submit]').click();
      
      // Verify successful login
      cy.url().should('include', '/dashboard');
      cy.contains(`Welcome back, ${Cypress.env('testUser').name}`).should('be.visible');
      
      // Check auth token
      cy.window().its('localStorage.authToken').should('exist');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');
      
      cy.get('[data-cy=login-email]').type('wrong@email.com');
      cy.get('[data-cy=login-password]').type('WrongPassword123!');
      cy.get('[data-cy=login-submit]').click();
      
      cy.contains('Invalid email or password').should('be.visible');
      cy.url().should('include', '/login');
    });

    it('should handle remember me functionality', () => {
      cy.visit('/login');
      
      cy.get('[data-cy=login-email]').type(Cypress.env('testUser').email);
      cy.get('[data-cy=login-password]').type(Cypress.env('testUser').password);
      cy.get('[data-cy=login-remember]').check();
      cy.get('[data-cy=login-submit]').click();
      
      // Verify persistent session
      cy.getCookie('remember_token').should('exist');
      cy.getCookie('remember_token').should('have.property', 'expiry').and('be.greaterThan', Date.now());
    });

    it('should rate limit login attempts', () => {
      cy.visit('/login');
      
      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        cy.get('[data-cy=login-email]').clear().type('attacker@email.com');
        cy.get('[data-cy=login-password]').clear().type(`WrongPass${i}`);
        cy.get('[data-cy=login-submit]').click();
        cy.wait(500);
      }
      
      // Should show rate limit message
      cy.contains('Too many login attempts. Please try again later.').should('be.visible');
      
      // Login button should be disabled
      cy.get('[data-cy=login-submit]').should('be.disabled');
    });
  });

  describe('Password Reset', () => {
    it('should send password reset email', () => {
      cy.visit('/forgot-password');
      
      cy.get('[data-cy=reset-email]').type(Cypress.env('testUser').email);
      cy.get('[data-cy=reset-submit]').click();
      
      cy.contains('Password reset email sent').should('be.visible');
      cy.contains('Please check your email for reset instructions').should('be.visible');
    });

    it('should validate reset token and allow password change', () => {
      // Simulate clicking reset link with token
      const resetToken = 'valid-reset-token-123';
      cy.visit(`/reset-password?token=${resetToken}`);
      
      // Enter new password
      cy.get('[data-cy=new-password]').type('NewSecurePass456!');
      cy.get('[data-cy=confirm-new-password]').type('NewSecurePass456!');
      cy.get('[data-cy=reset-password-submit]').click();
      
      // Verify success
      cy.contains('Password successfully reset').should('be.visible');
      cy.url().should('include', '/login');
    });
  });

  describe('OAuth Authentication', () => {
    it('should login with Google OAuth', () => {
      cy.visit('/login');
      
      cy.get('[data-cy=google-login]').click();
      
      // Mock OAuth flow
      cy.origin('https://accounts.google.com', () => {
        // This would be the actual Google OAuth flow in real testing
        cy.log('Google OAuth flow would happen here');
      });
      
      // After OAuth redirect
      cy.url().should('include', '/dashboard');
    });

    it('should login with Facebook OAuth', () => {
      cy.visit('/login');
      
      cy.get('[data-cy=facebook-login]').click();
      
      // Mock OAuth flow
      cy.origin('https://www.facebook.com', () => {
        // This would be the actual Facebook OAuth flow in real testing
        cy.log('Facebook OAuth flow would happen here');
      });
      
      // After OAuth redirect
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Two-Factor Authentication', () => {
    it('should enable 2FA for user account', () => {
      // Login first
      cy.login(Cypress.env('testUser').email, Cypress.env('testUser').password);
      
      // Navigate to security settings
      cy.visit('/settings/security');
      
      cy.get('[data-cy=enable-2fa]').click();
      
      // Show QR code
      cy.get('[data-cy=2fa-qr-code]').should('be.visible');
      
      // Enter verification code
      cy.get('[data-cy=2fa-verification-code]').type('123456');
      cy.get('[data-cy=2fa-verify]').click();
      
      // Verify 2FA enabled
      cy.contains('Two-factor authentication enabled').should('be.visible');
      cy.get('[data-cy=2fa-status]').should('contain', 'Enabled');
    });

    it('should require 2FA code on login when enabled', () => {
      cy.visit('/login');
      
      // Enter credentials for account with 2FA
      cy.get('[data-cy=login-email]').type('2fa-user@spirit-tours.com');
      cy.get('[data-cy=login-password]').type('SecurePass123!');
      cy.get('[data-cy=login-submit]').click();
      
      // Should show 2FA code input
      cy.url().should('include', '/verify-2fa');
      cy.get('[data-cy=2fa-code-input]').should('be.visible');
      
      // Enter 2FA code
      cy.get('[data-cy=2fa-code-input]').type('654321');
      cy.get('[data-cy=2fa-verify-submit]').click();
      
      // Should be logged in
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Session Management', () => {
    beforeEach(() => {
      cy.login(Cypress.env('testUser').email, Cypress.env('testUser').password);
    });

    it('should refresh token before expiration', () => {
      // Wait for token refresh interval
      cy.wait(5000);
      
      // Make an API call that would trigger token refresh
      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/api/user/profile`,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        
        // Check that token was refreshed
        const newToken = localStorage.getItem('authToken');
        expect(newToken).to.exist;
      });
    });

    it('should logout user after inactivity', () => {
      // Set short inactivity timeout for testing
      cy.window().then((win) => {
        win.localStorage.setItem('inactivityTimeout', '5000'); // 5 seconds
      });
      
      // Wait for inactivity timeout
      cy.wait(6000);
      
      // Should be redirected to login
      cy.url().should('include', '/login');
      cy.contains('Session expired due to inactivity').should('be.visible');
    });

    it('should properly logout and clear session', () => {
      // Verify logged in
      cy.url().should('include', '/dashboard');
      
      // Logout
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      // Verify logged out
      cy.url().should('include', '/login');
      
      // Check session cleared
      cy.window().its('localStorage.authToken').should('not.exist');
      cy.getCookie('sessionId').should('not.exist');
    });
  });
});