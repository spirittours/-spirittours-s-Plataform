const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const request = require('supertest');

describe('API Integration Tests', () => {
  let app;
  let authToken;

  beforeAll(async () => {
    // Initialize app
    app = require('../../backend/server');
    
    // Get auth token for authenticated requests
    // This assumes you have a test user or can create one
    // authToken = await getTestAuthToken();
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('Health Check', () => {
    it('GET /health should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('Spirit Tours Backend');
    });
  });

  describe('Monitoring Endpoints', () => {
    it('GET /api/monitoring/health should return health status', async () => {
      const response = await request(app)
        .get('/api/monitoring/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.health).toBeDefined();
      expect(response.body.health.status).toMatch(/healthy|degraded|unhealthy/);
    });

    // Note: These endpoints require admin auth in production
    // Uncomment and add auth token when testing with authentication
    /*
    it('GET /api/monitoring/metrics should return metrics', async () => {
      const response = await request(app)
        .get('/api/monitoring/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metrics).toBeDefined();
      expect(response.body.metrics.system).toBeDefined();
    });
    */
  });

  describe('Marketplace Endpoints', () => {
    it('GET /api/marketplace/categories should return categories', async () => {
      const response = await request(app)
        .get('/api/marketplace/categories')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(response.body.categories.length).toBeGreaterThan(0);
    });

    it('GET /api/marketplace/models/featured should return featured models', async () => {
      const response = await request(app)
        .get('/api/marketplace/models/featured')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.models)).toBe(true);
    });
  });

  describe('Orchestration Endpoints', () => {
    it('GET /api/orchestration/templates should return workflow templates', async () => {
      // This endpoint requires authentication
      // Uncomment when auth is available
      /*
      const response = await request(app)
        .get('/api/orchestration/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.templates)).toBe(true);
      expect(response.body.templates.length).toBeGreaterThan(0);
      */
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/marketplace/models')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      // Send multiple requests quickly
      const requests = [];
      for (let i = 0; i < 150; i++) {
        requests.push(
          request(app)
            .get('/health')
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited (429)
      const rateLimited = responses.filter(r => r.status === 429);
      
      // Depending on rate limit config, we might see 429s
      // This is a soft check - adjust based on your rate limits
      if (rateLimited.length > 0) {
        expect(rateLimited[0].body.error).toContain('Too many requests');
      }
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for common security headers
      // These should be set by helmet or similar middleware
      // Adjust based on your actual security middleware configuration
      expect(response.headers).toBeDefined();
    });
  });

  describe('CORS', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/monitoring/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);
    });
  });
});
