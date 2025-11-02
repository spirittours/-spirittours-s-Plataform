describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  describe('Login', () => {
    it('should display login form', () => {
      cy.get('input[name="email"]').should('be.visible');
      cy.get('input[name="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('should show validation errors for empty fields', () => {
      cy.get('button[type="submit"]').click();
      cy.contains('Email is required').should('be.visible');
      cy.contains('Password is required').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.interceptAPI('POST', '/auth/login', {
        statusCode: 401,
        body: { message: 'Invalid credentials' },
      });

      cy.get('input[name="email"]').type('invalid@example.com');
      cy.get('input[name="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();

      cy.contains('Invalid credentials').should('be.visible');
    });

    it('should successfully login with valid credentials', () => {
      cy.interceptAPI('POST', '/auth/login', {
        statusCode: 200,
        body: {
          access_token: 'fake-token',
          refresh_token: 'fake-refresh-token',
          user: {
            id: '1',
            email: 'admin@spirittours.com',
            name: 'Admin User',
            role: 'admin',
          },
        },
      });

      cy.get('input[name="email"]').type('admin@spirittours.com');
      cy.get('input[name="password"]').type('password123');
      cy.get('button[type="submit"]').click();

      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
    });

    it('should persist login after page reload', () => {
      cy.login('admin@spirittours.com', 'password123');
      cy.visit('/dashboard');
      cy.waitForDashboard();
      
      // Reload page
      cy.reload();
      
      // Should still be logged in
      cy.waitForDashboard();
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      cy.login('admin@spirittours.com', 'password123');
      cy.visit('/dashboard');
    });

    it('should successfully logout', () => {
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      // Should redirect to login
      cy.url().should('include', '/login');
      
      // Should clear tokens
      cy.window().then((win) => {
        expect(win.localStorage.getItem('access_token')).to.be.null;
      });
    });
  });

  describe('Register', () => {
    beforeEach(() => {
      cy.visit('/register');
    });

    it('should display registration form', () => {
      cy.get('input[name="name"]').should('be.visible');
      cy.get('input[name="email"]').should('be.visible');
      cy.get('input[name="password"]').should('be.visible');
      cy.get('input[name="confirmPassword"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('should show validation errors', () => {
      cy.get('button[type="submit"]').click();
      cy.contains('Name is required').should('be.visible');
      cy.contains('Email is required').should('be.visible');
    });

    it('should validate password match', () => {
      cy.get('input[name="password"]').type('password123');
      cy.get('input[name="confirmPassword"]').type('differentpassword');
      cy.get('button[type="submit"]').click();
      cy.contains('Passwords do not match').should('be.visible');
    });

    it('should successfully register new user', () => {
      cy.interceptAPI('POST', '/auth/register', {
        statusCode: 201,
        body: {
          message: 'Registration successful',
          user: {
            id: '2',
            email: 'newuser@example.com',
            name: 'New User',
          },
        },
      });

      cy.get('input[name="name"]').type('New User');
      cy.get('input[name="email"]').type('newuser@example.com');
      cy.get('input[name="password"]').type('password123');
      cy.get('input[name="confirmPassword"]').type('password123');
      cy.get('button[type="submit"]').click();

      cy.contains('Registration successful').should('be.visible');
    });
  });

  describe('Password Reset', () => {
    beforeEach(() => {
      cy.visit('/password-reset');
    });

    it('should send password reset email', () => {
      cy.interceptAPI('POST', '/auth/password-reset', {
        statusCode: 200,
        body: { message: 'Password reset email sent' },
      });

      cy.get('input[name="email"]').type('user@example.com');
      cy.get('button[type="submit"]').click();

      cy.contains('Password reset email sent').should('be.visible');
    });
  });
});
