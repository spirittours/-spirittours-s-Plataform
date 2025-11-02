describe('Bookings Flow', () => {
  beforeEach(() => {
    cy.login('admin@spirittours.com', 'password123');
  });

  describe('Booking List', () => {
    beforeEach(() => {
      cy.interceptAPI('GET', '/bookings*', {
        statusCode: 200,
        body: {
          bookings: [
            {
              id: 'B001',
              tourName: 'Jerusalem Holy Sites Tour',
              customerName: 'John Doe',
              date: '2025-12-25',
              status: 'confirmed',
              totalAmount: 300,
            },
            {
              id: 'B002',
              tourName: 'Dead Sea Experience',
              customerName: 'Jane Smith',
              date: '2025-12-26',
              status: 'pending',
              totalAmount: 400,
            },
          ],
          total: 2,
        },
      });

      cy.visit('/bookings');
    });

    it('should display bookings list', () => {
      cy.get('[data-testid="booking-list"]').should('be.visible');
      cy.contains('B001').should('be.visible');
      cy.contains('John Doe').should('be.visible');
      cy.contains('B002').should('be.visible');
    });

    it('should filter by status', () => {
      cy.get('[data-testid="status-filter"]').click();
      cy.contains('Confirmed').click();

      cy.wait('@apiCall');
      cy.get('[data-testid="booking-list"]').should('contain', 'B001');
    });

    it('should filter by date range', () => {
      cy.get('input[name="startDate"]').type('2025-12-25');
      cy.get('input[name="endDate"]').type('2025-12-25');
      cy.get('[data-testid="apply-filter"]').click();

      cy.wait('@apiCall');
      cy.get('[data-testid="booking-list"]').should('contain', 'B001');
    });

    it('should search by booking ID or customer name', () => {
      cy.get('[data-testid="search-input"]').type('John');
      cy.get('[data-testid="booking-list"]').should('contain', 'John Doe');
      cy.get('[data-testid="booking-list"]').should('not.contain', 'Jane Smith');
    });
  });

  describe('Create Booking', () => {
    beforeEach(() => {
      cy.visit('/bookings/new');
    });

    it('should display booking wizard', () => {
      cy.contains('Step 1').should('be.visible');
      cy.get('[data-testid="tour-selection"]').should('be.visible');
    });

    it('should progress through wizard steps', () => {
      // Step 1: Select Tour
      cy.get('[data-testid="tour-1"]').click();
      cy.get('[data-testid="next-button"]').click();

      // Step 2: Select Date
      cy.contains('Step 2').should('be.visible');
      cy.get('[data-testid="date-picker"]').click();
      cy.contains('25').click();
      cy.get('[data-testid="next-button"]').click();

      // Step 3: Customer Info
      cy.contains('Step 3').should('be.visible');
      cy.get('input[name="customerName"]').type('John Doe');
      cy.get('input[name="email"]').type('john@example.com');
      cy.get('input[name="phone"]').type('+972501234567');
      cy.get('[data-testid="next-button"]').click();

      // Step 4: Payment
      cy.contains('Step 4').should('be.visible');
    });

    it('should calculate total price correctly', () => {
      cy.get('[data-testid="tour-1"]').click();
      cy.get('[data-testid="adults"]').clear().type('2');
      cy.get('[data-testid="children"]').clear().type('1');

      // Assuming adult price $150, child price $75
      cy.get('[data-testid="total-price"]').should('contain', '$375');
    });

    it('should successfully create booking', () => {
      cy.interceptAPI('POST', '/bookings', {
        statusCode: 201,
        body: {
          id: 'B003',
          status: 'confirmed',
          confirmationCode: 'CONF123',
        },
      });

      // Complete wizard
      cy.get('[data-testid="tour-1"]').click();
      cy.get('[data-testid="next-button"]').click();
      
      cy.get('[data-testid="date-picker"]').click();
      cy.contains('25').click();
      cy.get('[data-testid="next-button"]').click();
      
      cy.get('input[name="customerName"]').type('John Doe');
      cy.get('input[name="email"]').type('john@example.com');
      cy.get('input[name="phone"]').type('+972501234567');
      cy.get('[data-testid="next-button"]').click();
      
      cy.get('[data-testid="payment-method"]').select('credit_card');
      cy.get('button[type="submit"]').click();

      cy.contains('Booking confirmed').should('be.visible');
      cy.contains('CONF123').should('be.visible');
    });
  });

  describe('Booking Details', () => {
    beforeEach(() => {
      cy.interceptAPI('GET', '/bookings/B001', {
        statusCode: 200,
        body: {
          id: 'B001',
          tourName: 'Jerusalem Holy Sites Tour',
          customerName: 'John Doe',
          email: 'john@example.com',
          phone: '+972501234567',
          date: '2025-12-25',
          status: 'confirmed',
          totalAmount: 300,
          adults: 2,
          children: 0,
          paymentStatus: 'paid',
        },
      });

      cy.visit('/bookings/B001');
    });

    it('should display booking details', () => {
      cy.contains('B001').should('be.visible');
      cy.contains('John Doe').should('be.visible');
      cy.contains('Jerusalem Holy Sites Tour').should('be.visible');
      cy.contains('$300').should('be.visible');
    });

    it('should allow status update', () => {
      cy.interceptAPI('PATCH', '/bookings/B001/status', {
        statusCode: 200,
        body: { status: 'completed' },
      });

      cy.get('[data-testid="status-update"]').click();
      cy.contains('Completed').click();
      cy.get('[data-testid="confirm-button"]').click();

      cy.contains('Status updated').should('be.visible');
    });

    it('should allow cancellation', () => {
      cy.interceptAPI('POST', '/bookings/B001/cancel', {
        statusCode: 200,
        body: { status: 'cancelled', refundAmount: 270 },
      });

      cy.get('[data-testid="cancel-booking"]').click();
      cy.get('[data-testid="confirm-dialog"]').should('be.visible');
      cy.get('[data-testid="confirm-button"]').click();

      cy.contains('Booking cancelled').should('be.visible');
      cy.contains('Refund: $270').should('be.visible');
    });

    it('should send confirmation email', () => {
      cy.interceptAPI('POST', '/bookings/B001/send-confirmation', {
        statusCode: 200,
        body: { message: 'Email sent successfully' },
      });

      cy.get('[data-testid="send-confirmation"]').click();
      cy.contains('Email sent successfully').should('be.visible');
    });
  });

  describe('Booking Calendar', () => {
    beforeEach(() => {
      cy.visit('/bookings/calendar');
    });

    it('should display calendar view', () => {
      cy.get('[data-testid="calendar"]').should('be.visible');
    });

    it('should show bookings on calendar', () => {
      cy.interceptAPI('GET', '/bookings/calendar*', {
        statusCode: 200,
        body: {
          '2025-12-25': [
            { id: 'B001', tourName: 'Jerusalem Tour', time: '09:00' },
          ],
        },
      });

      cy.get('[data-testid="calendar-day-25"]').should('contain', 'Jerusalem Tour');
    });

    it('should navigate between months', () => {
      cy.get('[data-testid="next-month"]').click();
      cy.contains('January 2026').should('be.visible');

      cy.get('[data-testid="prev-month"]').click();
      cy.contains('December 2025').should('be.visible');
    });

    it('should open booking details from calendar', () => {
      cy.get('[data-testid="booking-B001"]').click();
      cy.url().should('include', '/bookings/B001');
    });
  });

  describe('Payment Processing', () => {
    beforeEach(() => {
      cy.visit('/bookings/B002/payment');
    });

    it('should display payment form', () => {
      cy.get('[data-testid="payment-form"]').should('be.visible');
      cy.get('input[name="cardNumber"]').should('be.visible');
      cy.get('input[name="expiryDate"]').should('be.visible');
      cy.get('input[name="cvv"]').should('be.visible');
    });

    it('should validate card number', () => {
      cy.get('input[name="cardNumber"]').type('1234');
      cy.get('button[type="submit"]').click();
      cy.contains('Invalid card number').should('be.visible');
    });

    it('should process payment successfully', () => {
      cy.interceptAPI('POST', '/payments/process', {
        statusCode: 200,
        body: {
          transactionId: 'TXN123',
          status: 'success',
        },
      });

      cy.get('input[name="cardNumber"]').type('4111111111111111');
      cy.get('input[name="expiryDate"]').type('12/25');
      cy.get('input[name="cvv"]').type('123');
      cy.get('input[name="cardholderName"]').type('John Doe');
      cy.get('button[type="submit"]').click();

      cy.contains('Payment successful').should('be.visible');
      cy.contains('TXN123').should('be.visible');
    });
  });
});
