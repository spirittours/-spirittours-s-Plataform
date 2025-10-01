/// <reference types="cypress" />

describe('Tour Booking Flow', () => {
  beforeEach(() => {
    cy.login(Cypress.env('testUser').email, Cypress.env('testUser').password);
    cy.visit('/');
  });

  describe('Tour Search and Discovery', () => {
    it('should search for tours by destination', () => {
      cy.get('[data-cy=search-destination]').type('Bali');
      cy.get('[data-cy=search-dates]').click();
      
      // Select dates
      cy.get('[data-cy=date-picker-start]').click();
      cy.get('[data-cy=calendar-day-15]').click();
      cy.get('[data-cy=date-picker-end]').click();
      cy.get('[data-cy=calendar-day-20]').click();
      
      // Select number of travelers
      cy.get('[data-cy=travelers-input]').click();
      cy.get('[data-cy=adults-increment]').click().click(); // 2 adults
      cy.get('[data-cy=children-increment]').click(); // 1 child
      
      // Search
      cy.get('[data-cy=search-submit]').click();
      
      // Verify results
      cy.url().should('include', '/tours/search');
      cy.get('[data-cy=search-results]').should('exist');
      cy.get('[data-cy=tour-card]').should('have.length.greaterThan', 0);
      
      // Verify filters applied
      cy.contains('Bali').should('be.visible');
      cy.contains('2 Adults, 1 Child').should('be.visible');
    });

    it('should filter search results', () => {
      cy.visit('/tours/search?destination=Bali');
      
      // Apply price filter
      cy.get('[data-cy=filter-price-min]').type('100');
      cy.get('[data-cy=filter-price-max]').type('500');
      
      // Apply duration filter
      cy.get('[data-cy=filter-duration]').select('3-5 days');
      
      // Apply tour type filter
      cy.get('[data-cy=filter-adventure]').check();
      cy.get('[data-cy=filter-cultural]').check();
      
      // Apply sustainability filter
      cy.get('[data-cy=filter-eco-certified]').check();
      
      // Apply filters
      cy.get('[data-cy=apply-filters]').click();
      
      // Verify filtered results
      cy.get('[data-cy=tour-card]').each(($card) => {
        cy.wrap($card).find('[data-cy=tour-price]').invoke('text').then((price) => {
          const numPrice = parseFloat(price.replace('$', ''));
          expect(numPrice).to.be.within(100, 500);
        });
        
        cy.wrap($card).find('[data-cy=eco-badge]').should('exist');
      });
    });

    it('should sort search results', () => {
      cy.visit('/tours/search?destination=Bali');
      
      // Sort by price low to high
      cy.get('[data-cy=sort-dropdown]').select('price-asc');
      cy.wait(1000);
      
      // Verify sorting
      let previousPrice = 0;
      cy.get('[data-cy=tour-price]').each(($price) => {
        const currentPrice = parseFloat($price.text().replace('$', ''));
        expect(currentPrice).to.be.at.least(previousPrice);
        previousPrice = currentPrice;
      });
      
      // Sort by rating
      cy.get('[data-cy=sort-dropdown]').select('rating-desc');
      cy.wait(1000);
      
      // Verify sorting
      let previousRating = 5;
      cy.get('[data-cy=tour-rating]').each(($rating) => {
        const currentRating = parseFloat($rating.text());
        expect(currentRating).to.be.at.most(previousRating);
        previousRating = currentRating;
      });
    });
  });

  describe('Tour Details and Selection', () => {
    beforeEach(() => {
      cy.visit('/tours/search?destination=Bali');
      cy.get('[data-cy=tour-card]').first().click();
    });

    it('should display comprehensive tour details', () => {
      // Verify tour information
      cy.get('[data-cy=tour-title]').should('be.visible');
      cy.get('[data-cy=tour-description]').should('be.visible');
      cy.get('[data-cy=tour-itinerary]').should('be.visible');
      cy.get('[data-cy=tour-inclusions]').should('be.visible');
      cy.get('[data-cy=tour-exclusions]').should('be.visible');
      
      // Verify sustainability info
      cy.get('[data-cy=carbon-footprint]').should('be.visible');
      cy.get('[data-cy=local-impact-score]').should('be.visible');
      cy.get('[data-cy=eco-certifications]').should('be.visible');
      
      // Verify accessibility info
      cy.get('[data-cy=accessibility-features]').should('be.visible');
      
      // Verify reviews
      cy.get('[data-cy=tour-reviews]').should('be.visible');
      cy.get('[data-cy=review-item]').should('have.length.greaterThan', 0);
    });

    it('should show availability calendar', () => {
      cy.get('[data-cy=check-availability]').click();
      
      cy.get('[data-cy=availability-calendar]').should('be.visible');
      
      // Check for available dates
      cy.get('[data-cy=available-date]').should('have.length.greaterThan', 0);
      
      // Select a date
      cy.get('[data-cy=available-date]').first().click();
      
      // Verify selection
      cy.get('[data-cy=selected-date]').should('be.visible');
      cy.get('[data-cy=available-slots]').should('be.visible');
    });

    it('should calculate pricing dynamically', () => {
      // Select date
      cy.get('[data-cy=check-availability]').click();
      cy.get('[data-cy=available-date]').first().click();
      
      // Modify travelers
      cy.get('[data-cy=booking-adults]').clear().type('2');
      cy.get('[data-cy=booking-children]').clear().type('1');
      
      // Verify price calculation
      cy.get('[data-cy=price-breakdown]').should('be.visible');
      cy.get('[data-cy=adults-price]').should('contain', '2 x');
      cy.get('[data-cy=children-price]').should('contain', '1 x');
      cy.get('[data-cy=total-price]').should('be.visible');
      
      // Add extras
      cy.get('[data-cy=extra-insurance]').check();
      cy.get('[data-cy=extra-meals]').check();
      
      // Verify updated price
      cy.get('[data-cy=extras-price]').should('be.visible');
      cy.get('[data-cy=final-price]').should('be.visible');
    });
  });

  describe('Booking Process', () => {
    beforeEach(() => {
      cy.visit('/tours/bali-adventure-tour');
      cy.get('[data-cy=check-availability]').click();
      cy.get('[data-cy=available-date]').first().click();
      cy.get('[data-cy=book-now]').click();
    });

    it('should complete booking with traveler details', () => {
      // Primary traveler details (auto-filled from profile)
      cy.get('[data-cy=primary-firstname]').should('have.value', 'Test');
      cy.get('[data-cy=primary-lastname]').should('have.value', 'User');
      cy.get('[data-cy=primary-email]').should('have.value', Cypress.env('testUser').email);
      
      // Add second traveler
      cy.get('[data-cy=add-traveler]').click();
      cy.get('[data-cy=traveler-2-firstname]').type('Jane');
      cy.get('[data-cy=traveler-2-lastname]').type('Doe');
      cy.get('[data-cy=traveler-2-email]').type('jane.doe@example.com');
      cy.get('[data-cy=traveler-2-dob]').type('1990-05-15');
      
      // Special requirements
      cy.get('[data-cy=dietary-requirements]').select('Vegetarian');
      cy.get('[data-cy=accessibility-needs]').type('Wheelchair accessible transportation needed');
      
      // Emergency contact
      cy.get('[data-cy=emergency-name]').type('John Smith');
      cy.get('[data-cy=emergency-phone]').type('+1234567890');
      cy.get('[data-cy=emergency-relationship]').select('Spouse');
      
      // Continue to payment
      cy.get('[data-cy=continue-to-payment]').click();
      
      // Verify booking summary
      cy.url().should('include', '/checkout/payment');
      cy.get('[data-cy=booking-summary]').should('be.visible');
    });

    it('should process payment securely', () => {
      // Fill traveler details quickly
      cy.get('[data-cy=continue-to-payment]').click();
      
      // Payment method selection
      cy.get('[data-cy=payment-credit-card]').click();
      
      // Card details (using Stripe test card)
      cy.get('[data-cy=card-number]').type('4242424242424242');
      cy.get('[data-cy=card-expiry]').type('12/25');
      cy.get('[data-cy=card-cvc]').type('123');
      cy.get('[data-cy=card-name]').type('Test User');
      
      // Billing address
      cy.get('[data-cy=billing-address]').type('123 Test Street');
      cy.get('[data-cy=billing-city]').type('Test City');
      cy.get('[data-cy=billing-zip]').type('12345');
      cy.get('[data-cy=billing-country]').select('United States');
      
      // Apply promo code
      cy.get('[data-cy=promo-code]').type('SAVE10');
      cy.get('[data-cy=apply-promo]').click();
      cy.get('[data-cy=discount-applied]').should('be.visible');
      
      // Review final amount
      cy.get('[data-cy=final-amount]').should('be.visible');
      
      // Agree to terms
      cy.get('[data-cy=agree-terms]').check();
      cy.get('[data-cy=agree-cancellation]').check();
      
      // Process payment
      cy.get('[data-cy=process-payment]').click();
      
      // Wait for processing
      cy.get('[data-cy=payment-processing]').should('be.visible');
      
      // Verify success
      cy.url().should('include', '/booking/confirmation');
      cy.get('[data-cy=booking-reference]').should('be.visible');
      cy.get('[data-cy=confirmation-email-sent]').should('be.visible');
    });

    it('should handle payment errors gracefully', () => {
      cy.get('[data-cy=continue-to-payment]').click();
      
      // Use card that triggers decline
      cy.get('[data-cy=payment-credit-card]').click();
      cy.get('[data-cy=card-number]').type('4000000000000002'); // Stripe decline card
      cy.get('[data-cy=card-expiry]').type('12/25');
      cy.get('[data-cy=card-cvc]').type('123');
      cy.get('[data-cy=card-name]').type('Test User');
      
      cy.get('[data-cy=agree-terms]').check();
      cy.get('[data-cy=agree-cancellation]').check();
      cy.get('[data-cy=process-payment]').click();
      
      // Verify error handling
      cy.get('[data-cy=payment-error]').should('be.visible');
      cy.contains('Your card was declined').should('be.visible');
      cy.get('[data-cy=try-different-payment]').should('be.visible');
    });

    it('should save booking to user profile', () => {
      // Complete a booking
      cy.get('[data-cy=continue-to-payment]').click();
      cy.fillPaymentDetails();
      cy.get('[data-cy=process-payment]').click();
      
      // Go to user bookings
      cy.visit('/profile/bookings');
      
      // Verify booking appears
      cy.get('[data-cy=booking-list]').should('be.visible');
      cy.get('[data-cy=booking-item]').first().should('contain', 'Bali Adventure Tour');
      cy.get('[data-cy=booking-status]').first().should('contain', 'Confirmed');
    });
  });

  describe('Booking Management', () => {
    beforeEach(() => {
      cy.visit('/profile/bookings');
    });

    it('should allow viewing booking details', () => {
      cy.get('[data-cy=booking-item]').first().click();
      
      // Verify booking details page
      cy.url().should('match', /\/bookings\/[A-Z0-9]+/);
      cy.get('[data-cy=booking-details]').should('be.visible');
      cy.get('[data-cy=tour-information]').should('be.visible');
      cy.get('[data-cy=traveler-information]').should('be.visible');
      cy.get('[data-cy=payment-information]').should('be.visible');
      
      // Download options
      cy.get('[data-cy=download-invoice]').should('be.visible');
      cy.get('[data-cy=download-voucher]').should('be.visible');
    });

    it('should allow modifying booking', () => {
      cy.get('[data-cy=booking-item]').first().click();
      cy.get('[data-cy=modify-booking]').click();
      
      // Change dates
      cy.get('[data-cy=change-dates]').click();
      cy.get('[data-cy=new-date]').click();
      cy.get('[data-cy=confirm-date-change]').click();
      
      // Verify modification fee if applicable
      cy.get('[data-cy=modification-fee]').then(($fee) => {
        if ($fee.length > 0) {
          cy.get('[data-cy=accept-fee]').click();
        }
      });
      
      // Confirm changes
      cy.get('[data-cy=confirm-modifications]').click();
      
      // Verify success
      cy.contains('Booking successfully modified').should('be.visible');
    });

    it('should handle booking cancellation', () => {
      cy.get('[data-cy=booking-item]').first().click();
      cy.get('[data-cy=cancel-booking]').click();
      
      // Cancellation flow
      cy.get('[data-cy=cancellation-reason]').select('Change of plans');
      cy.get('[data-cy=cancellation-details]').type('Unable to travel on selected dates');
      
      // Review cancellation policy
      cy.get('[data-cy=cancellation-policy]').should('be.visible');
      cy.get('[data-cy=refund-amount]').should('be.visible');
      
      // Confirm cancellation
      cy.get('[data-cy=confirm-cancellation]').click();
      
      // Double confirmation
      cy.get('[data-cy=final-cancel-confirm]').click();
      
      // Verify cancellation
      cy.contains('Booking cancelled successfully').should('be.visible');
      cy.get('[data-cy=booking-status]').should('contain', 'Cancelled');
      cy.get('[data-cy=refund-status]').should('be.visible');
    });
  });

  describe('Review and Rating', () => {
    it('should allow submitting tour review after completion', () => {
      // Navigate to completed booking
      cy.visit('/profile/bookings?status=completed');
      cy.get('[data-cy=booking-item]').first().click();
      
      // Click review button
      cy.get('[data-cy=write-review]').click();
      
      // Fill review form
      cy.get('[data-cy=rating-overall]').click(); // 5 stars
      cy.get('[data-cy=rating-guide]').click(); // 5 stars
      cy.get('[data-cy=rating-itinerary]').click(); // 4 stars
      cy.get('[data-cy=rating-value]').click(); // 4 stars
      
      cy.get('[data-cy=review-title]').type('Amazing Bali Adventure!');
      cy.get('[data-cy=review-text]').type('Had an incredible time exploring Bali. The guide was knowledgeable and friendly, and the itinerary was well-planned. Would definitely recommend!');
      
      // Add photos
      cy.get('[data-cy=upload-photos]').selectFile(['cypress/fixtures/review-photo-1.jpg', 'cypress/fixtures/review-photo-2.jpg']);
      
      // Sustainability feedback
      cy.get('[data-cy=sustainability-rating]').click(); // 5 stars
      cy.get('[data-cy=sustainability-feedback]').type('Great eco-conscious practices throughout the tour');
      
      // Submit review
      cy.get('[data-cy=submit-review]').click();
      
      // Verify success
      cy.contains('Thank you for your review!').should('be.visible');
      cy.get('[data-cy=review-published]').should('be.visible');
    });
  });
});