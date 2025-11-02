describe('Dashboard', () => {
  beforeEach(() => {
    cy.login('admin@spirittours.com', 'password123');
  });

  describe('Main Dashboard', () => {
    beforeEach(() => {
      cy.interceptAPI('GET', '/analytics/dashboard*', {
        statusCode: 200,
        body: {
          totalBookings: 150,
          totalRevenue: 45000,
          activeCustomers: 320,
          averageRating: 4.7,
          recentBookings: [],
          upcomingTours: [],
        },
      });

      cy.visit('/dashboard');
    });

    it('should display dashboard metrics', () => {
      cy.waitForDashboard();
      cy.contains('Total Bookings').should('be.visible');
      cy.contains('150').should('be.visible');
      cy.contains('$45,000').should('be.visible');
    });

    it('should display charts', () => {
      cy.get('[data-testid="revenue-chart"]').should('be.visible');
      cy.get('[data-testid="bookings-chart"]').should('be.visible');
    });

    it('should display recent bookings', () => {
      cy.get('[data-testid="recent-bookings"]').should('be.visible');
    });

    it('should navigate to bookings from dashboard', () => {
      cy.contains('View All Bookings').click();
      cy.url().should('include', '/bookings');
    });
  });

  describe('Analytics Dashboard', () => {
    beforeEach(() => {
      cy.visit('/analytics');
    });

    it('should display analytics charts', () => {
      cy.get('[data-testid="revenue-trend"]').should('be.visible');
      cy.get('[data-testid="booking-status"]').should('be.visible');
    });

    it('should filter by date range', () => {
      cy.get('[data-testid="date-range-picker"]').click();
      cy.contains('Last 30 days').click();
      cy.wait('@apiCall');
    });

    it('should export data', () => {
      cy.get('[data-testid="export-button"]').click();
      cy.contains('CSV').click();
      // Verify download initiated
    });
  });

  describe('Notifications', () => {
    beforeEach(() => {
      cy.visit('/dashboard');
    });

    it('should display notification bell', () => {
      cy.get('[data-testid="notifications-bell"]').should('be.visible');
    });

    it('should show unread count', () => {
      cy.interceptAPI('GET', '/notifications*', {
        statusCode: 200,
        body: {
          unreadCount: 5,
          notifications: [],
        },
      });

      cy.get('[data-testid="unread-count"]').should('contain', '5');
    });

    it('should open notifications panel', () => {
      cy.get('[data-testid="notifications-bell"]').click();
      cy.get('[data-testid="notifications-panel"]').should('be.visible');
    });

    it('should mark notification as read', () => {
      cy.interceptAPI('PATCH', '/notifications/1/read', {
        statusCode: 200,
        body: { success: true },
      });

      cy.get('[data-testid="notifications-bell"]').click();
      cy.get('[data-testid="notification-1"]').within(() => {
        cy.get('[data-testid="mark-read"]').click();
      });

      cy.get('[data-testid="notification-1"]').should('not.have.class', 'unread');
    });
  });
});
