/**
 * API Integration Tests
 * Spirit Tours AI Guide System
 * 
 * Tests all critical API endpoints
 */

const axios = require('axios');
const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

describe('Spirit Tours API Integration Tests', function() {
  this.timeout(10000); // 10 second timeout for API calls

  describe('Health & Status Endpoints', () => {
    it('should return healthy status from /health', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('status', 'healthy');
      expect(response.data).to.have.property('timestamp');
      expect(response.data).to.have.property('uptime');
    });

    it('should return system statistics from /api/stats', async () => {
      const response = await axios.get(`${BASE_URL}/api/stats`);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.stats).to.have.property('ai');
      expect(response.data.stats).to.have.property('server');
    });
  });

  describe('Perspectives API', () => {
    it('should get all available perspectives', async () => {
      const response = await axios.get(`${BASE_URL}/api/perspectives`);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.perspectives).to.be.an('array');
      expect(response.data.perspectives.length).to.be.greaterThan(0);
    });

    it('should return 400 for missing coordinates in nearby POI', async () => {
      try {
        await axios.get(`${BASE_URL}/api/poi/nearby`);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).to.equal(400);
        expect(error.response.data.success).to.be.false;
      }
    });

    it('should get nearby POIs with valid coordinates', async () => {
      const response = await axios.get(`${BASE_URL}/api/poi/nearby`, {
        params: {
          lat: 31.7767,
          lng: 35.2345,
          radius: 5
        }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.points).to.be.an('array');
    });
  });

  describe('Routes API', () => {
    it('should get all routes', async () => {
      const response = await axios.get(`${BASE_URL}/api/routes`);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.routes).to.be.an('array');
    });

    it('should return 404 for non-existent route', async () => {
      try {
        await axios.get(`${BASE_URL}/api/routes/non-existent-route-id`);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).to.equal(404);
        expect(error.response.data.success).to.be.false;
      }
    });
  });

  describe('Rating & Feedback API', () => {
    it('should submit a rating successfully', async () => {
      const ratingData = {
        tourId: 'test-tour-123',
        guideId: 'test-guide-456',
        userId: 'test-user-789',
        overallRating: 5,
        ratings: {
          knowledge: 5,
          communication: 5,
          punctuality: 5,
          professionalism: 5
        },
        feedback: 'Excellent tour experience!'
      };

      const response = await axios.post(`${BASE_URL}/api/ratings/submit`, ratingData);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data).to.have.property('ratingId');
    });
  });

  describe('Gamification API', () => {
    const testUserId = 'test-user-gamification-123';

    it('should get user gamification profile', async () => {
      const response = await axios.get(`${BASE_URL}/api/gamification/profile/${testUserId}`);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.profile).to.have.property('userId', testUserId);
      expect(response.data.profile).to.have.property('points');
      expect(response.data.profile).to.have.property('level');
    });

    it('should award points for action', async () => {
      const pointsData = {
        userId: testUserId,
        actionType: 'tour_completed',
        metadata: { tourId: 'test-tour-123' }
      };

      const response = await axios.post(`${BASE_URL}/api/gamification/points/award`, pointsData);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data).to.have.property('pointsAwarded');
    });

    it('should get leaderboard', async () => {
      const response = await axios.get(`${BASE_URL}/api/gamification/leaderboard`);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.leaderboard).to.be.an('array');
    });
  });

  describe('Booking API', () => {
    let testBookingId;

    it('should create a new booking', async () => {
      const bookingData = {
        userId: 'test-user-booking-123',
        tourId: 'test-tour-456',
        tourDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        participants: 2,
        contactInfo: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '+1234567890'
        }
      };

      const response = await axios.post(`${BASE_URL}/api/bookings/create`, bookingData);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.booking).to.have.property('bookingId');
      
      testBookingId = response.data.booking.bookingId;
    });

    it('should get user bookings', async () => {
      const response = await axios.get(`${BASE_URL}/api/bookings/user/test-user-booking-123`);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.bookings).to.be.an('array');
    });
  });

  describe('ML Recommendations API', () => {
    const testUserId = 'test-user-ml-123';

    it('should get personalized recommendations', async () => {
      const response = await axios.get(`${BASE_URL}/api/recommendations/user/${testUserId}`);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.recommendations).to.be.an('array');
    });

    it('should track user interaction', async () => {
      const interactionData = {
        userId: testUserId,
        tourId: 'test-tour-789',
        interactionType: 'view'
      };

      const response = await axios.post(`${BASE_URL}/api/recommendations/track-interaction`, interactionData);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
    });

    it('should get similar tours', async () => {
      const response = await axios.get(`${BASE_URL}/api/recommendations/similar-tours/test-tour-789`);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.similarTours).to.be.an('array');
    });
  });

  describe('Offline Sync API', () => {
    const testUserId = 'test-user-offline-123';

    it('should generate offline manifest', async () => {
      const response = await axios.get(`${BASE_URL}/api/offline/manifest/${testUserId}`);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.manifest).to.have.property('userId', testUserId);
      expect(response.data.manifest).to.have.property('tours');
    });

    it('should sync offline changes', async () => {
      const syncData = {
        userId: testUserId,
        changes: [
          {
            entityType: 'rating',
            operation: 'create',
            data: {
              tourId: 'test-tour-offline-123',
              rating: 5,
              timestamp: Date.now()
            }
          }
        ]
      };

      const response = await axios.post(`${BASE_URL}/api/offline/sync`, syncData);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.result).to.have.property('processed');
    });
  });

  describe('Unified Messaging API', () => {
    it('should get conversations', async () => {
      const response = await axios.get(`${BASE_URL}/api/messages/conversations`);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data.conversations).to.be.an('array');
    });

    it('should send a message', async () => {
      const messageData = {
        conversationId: 'test-conversation-123',
        channel: 'whatsapp',
        content: {
          type: 'text',
          text: 'Test message'
        },
        from: 'agent-123'
      };

      const response = await axios.post(`${BASE_URL}/api/messages/send`, messageData);
      
      expect(response.status).to.equal(200);
      expect(response.data.success).to.be.true;
      expect(response.data).to.have.property('messageId');
    });
  });
});

console.log('\n✅ API Integration Tests Complete\n');
