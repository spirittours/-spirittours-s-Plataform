describe('Real-time Features', () => {
  beforeEach(() => {
    cy.login('admin@spirittours.com', 'password123');
  });

  describe('Chat Interface', () => {
    beforeEach(() => {
      cy.visit('/trips/TRIP001/chat');
    });

    it('should display chat interface', () => {
      cy.get('[data-testid="chat-interface"]').should('be.visible');
      cy.get('[data-testid="message-input"]').should('be.visible');
    });

    it('should send a message', () => {
      const message = 'Hello, this is a test message';
      
      cy.get('[data-testid="message-input"]').type(message);
      cy.get('[data-testid="send-button"]').click();

      cy.get('[data-testid="message-list"]').should('contain', message);
    });

    it('should display typing indicator', () => {
      cy.get('[data-testid="message-input"]').type('Test');
      
      // Simulate another user typing
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('user-typing', {
          detail: { userId: 'user2', userName: 'John' },
        }));
      });

      cy.get('[data-testid="typing-indicator"]').should('contain', 'John is typing');
    });

    it('should show online status', () => {
      cy.get('[data-testid="online-users"]').should('be.visible');
    });

    it('should load message history', () => {
      cy.interceptAPI('GET', '/chat/TRIP001/messages*', {
        statusCode: 200,
        body: {
          messages: [
            {
              id: '1',
              text: 'Previous message',
              sender: 'Admin',
              timestamp: '2025-10-31T10:00:00Z',
            },
          ],
        },
      });

      cy.get('[data-testid="message-list"]').should('contain', 'Previous message');
    });

    it('should send file attachment', () => {
      const fileName = 'document.pdf';
      cy.get('[data-testid="file-upload"]').attachFile(fileName);
      cy.get('[data-testid="send-button"]').click();

      cy.get('[data-testid="message-list"]').should('contain', fileName);
    });
  });

  describe('GPS Tracking', () => {
    beforeEach(() => {
      cy.visit('/trips/TRIP001/tracking');
    });

    it('should display GPS map', () => {
      cy.get('[data-testid="gps-map"]').should('be.visible');
    });

    it('should show current location marker', () => {
      cy.interceptAPI('GET', '/trips/TRIP001/location', {
        statusCode: 200,
        body: {
          latitude: 31.7683,
          longitude: 35.2137,
          timestamp: new Date().toISOString(),
        },
      });

      cy.get('[data-testid="location-marker"]').should('be.visible');
    });

    it('should update location in real-time', () => {
      // Initial location
      cy.get('[data-testid="latitude"]').should('contain', '31.768');
      
      // Simulate location update
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('location-update', {
          detail: {
            latitude: 31.770,
            longitude: 35.215,
          },
        }));
      });

      cy.get('[data-testid="latitude"]').should('contain', '31.770');
    });

    it('should show ETA', () => {
      cy.get('[data-testid="eta"]').should('be.visible');
      cy.get('[data-testid="eta"]').should('contain', 'min');
    });

    it('should display speed', () => {
      cy.get('[data-testid="speed"]').should('be.visible');
      cy.get('[data-testid="speed"]').should('contain', 'km/h');
    });

    it('should share tracking link', () => {
      cy.get('[data-testid="share-tracking"]').click();
      cy.get('[data-testid="tracking-link"]').should('be.visible');
      
      cy.get('[data-testid="copy-link"]').click();
      cy.contains('Link copied').should('be.visible');
    });
  });

  describe('WebSocket Connection', () => {
    it('should establish WebSocket connection', () => {
      cy.visit('/dashboard');
      
      cy.window().then((win) => {
        // Check if WebSocket is connected
        cy.wrap(win).its('wsConnected').should('be.true');
      });
    });

    it('should reconnect on disconnect', () => {
      cy.visit('/dashboard');
      
      // Simulate disconnect
      cy.window().then((win) => {
        win.dispatchEvent(new Event('ws-disconnect'));
      });

      cy.contains('Reconnecting').should('be.visible');
      
      // Should reconnect
      cy.contains('Connected', { timeout: 10000 }).should('be.visible');
    });

    it('should receive real-time notifications', () => {
      cy.visit('/dashboard');
      
      // Simulate incoming notification
      cy.window().then((win) => {
        win.dispatchEvent(new CustomEvent('notification', {
          detail: {
            title: 'New Booking',
            message: 'You have a new booking',
          },
        }));
      });

      cy.contains('New Booking').should('be.visible');
    });
  });
});
