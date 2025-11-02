describe('Tours Management Flow', () => {
  beforeEach(() => {
    cy.login('admin@spirittours.com', 'password123');
  });

  describe('Tour List', () => {
    beforeEach(() => {
      cy.visit('/tours');
    });

    it('should display tours list', () => {
      cy.interceptAPI('GET', '/tours*', {
        statusCode: 200,
        body: {
          tours: [
            {
              id: '1',
              name: 'Jerusalem Holy Sites Tour',
              price: 150,
              duration: '8 hours',
              status: 'active',
            },
            {
              id: '2',
              name: 'Dead Sea Experience',
              price: 200,
              duration: '10 hours',
              status: 'active',
            },
          ],
          total: 2,
        },
      });

      cy.get('[data-testid="tour-list"]').should('be.visible');
      cy.contains('Jerusalem Holy Sites Tour').should('be.visible');
      cy.contains('Dead Sea Experience').should('be.visible');
    });

    it('should filter tours by search', () => {
      cy.get('[data-testid="search-input"]').type('Jerusalem');
      cy.get('[data-testid="tour-list"]').should('contain', 'Jerusalem');
      cy.get('[data-testid="tour-list"]').should('not.contain', 'Dead Sea');
    });

    it('should filter tours by status', () => {
      cy.get('[data-testid="status-filter"]').click();
      cy.contains('Active').click();
      
      cy.wait('@apiCall');
      cy.get('[data-testid="tour-list"]').should('be.visible');
    });

    it('should navigate to tour details', () => {
      cy.contains('Jerusalem Holy Sites Tour').click();
      cy.url().should('include', '/tours/1');
    });
  });

  describe('Create Tour', () => {
    beforeEach(() => {
      cy.visit('/tours/new');
    });

    it('should display tour creation form', () => {
      cy.get('input[name="name"]').should('be.visible');
      cy.get('textarea[name="description"]').should('be.visible');
      cy.get('input[name="price"]').should('be.visible');
      cy.get('input[name="duration"]').should('be.visible');
    });

    it('should validate required fields', () => {
      cy.get('button[type="submit"]').click();
      cy.contains('Name is required').should('be.visible');
      cy.contains('Price is required').should('be.visible');
    });

    it('should successfully create a tour', () => {
      cy.interceptAPI('POST', '/tours', {
        statusCode: 201,
        body: {
          id: '3',
          name: 'New Tour',
          price: 180,
          duration: '6 hours',
          status: 'draft',
        },
      });

      cy.get('input[name="name"]').type('New Tour');
      cy.get('textarea[name="description"]').type('Amazing new tour experience');
      cy.get('input[name="price"]').type('180');
      cy.get('input[name="duration"]').type('6');
      cy.get('select[name="difficulty"]').select('moderate');
      
      cy.get('button[type="submit"]').click();

      cy.contains('Tour created successfully').should('be.visible');
      cy.url().should('match', /\/tours\/\d+$/);
    });

    it('should upload tour images', () => {
      const fileName = 'tour-image.jpg';
      cy.get('input[type="file"]').attachFile(fileName);
      
      cy.get('[data-testid="image-preview"]').should('be.visible');
      cy.contains(fileName).should('be.visible');
    });
  });

  describe('Edit Tour', () => {
    beforeEach(() => {
      cy.interceptAPI('GET', '/tours/1', {
        statusCode: 200,
        body: {
          id: '1',
          name: 'Jerusalem Holy Sites Tour',
          description: 'Visit all major holy sites',
          price: 150,
          duration: '8 hours',
          status: 'active',
        },
      });

      cy.visit('/tours/1/edit');
    });

    it('should load tour data into form', () => {
      cy.get('input[name="name"]').should('have.value', 'Jerusalem Holy Sites Tour');
      cy.get('textarea[name="description"]').should('have.value', 'Visit all major holy sites');
      cy.get('input[name="price"]').should('have.value', '150');
    });

    it('should successfully update tour', () => {
      cy.interceptAPI('PUT', '/tours/1', {
        statusCode: 200,
        body: {
          id: '1',
          name: 'Jerusalem Holy Sites Tour - Updated',
          price: 160,
        },
      });

      cy.get('input[name="name"]').clear().type('Jerusalem Holy Sites Tour - Updated');
      cy.get('input[name="price"]').clear().type('160');
      cy.get('button[type="submit"]').click();

      cy.contains('Tour updated successfully').should('be.visible');
    });
  });

  describe('Delete Tour', () => {
    beforeEach(() => {
      cy.visit('/tours');
    });

    it('should show confirmation dialog before deleting', () => {
      cy.get('[data-testid="tour-1"]').within(() => {
        cy.get('[data-testid="delete-button"]').click();
      });

      cy.get('[data-testid="confirm-dialog"]').should('be.visible');
      cy.contains('Are you sure').should('be.visible');
    });

    it('should successfully delete tour', () => {
      cy.interceptAPI('DELETE', '/tours/1', {
        statusCode: 200,
        body: { message: 'Tour deleted successfully' },
      });

      cy.get('[data-testid="tour-1"]').within(() => {
        cy.get('[data-testid="delete-button"]').click();
      });

      cy.get('[data-testid="confirm-button"]').click();
      cy.contains('Tour deleted successfully').should('be.visible');
      cy.get('[data-testid="tour-1"]').should('not.exist');
    });
  });

  describe('Tour Availability', () => {
    beforeEach(() => {
      cy.visit('/tours/1/availability');
    });

    it('should display availability calendar', () => {
      cy.get('[data-testid="availability-calendar"]').should('be.visible');
    });

    it('should add availability slot', () => {
      cy.get('[data-testid="add-slot-button"]').click();
      cy.get('input[name="date"]').type('2025-12-25');
      cy.get('input[name="availableSpots"]').type('20');
      cy.get('button[type="submit"]').click();

      cy.contains('Availability added').should('be.visible');
    });
  });
});
