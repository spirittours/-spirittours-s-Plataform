/**
 * Spirit Tours AI Guide - Load Testing Script
 * Uses k6 for performance testing
 * 
 * Install k6: https://k6.io/docs/getting-started/installation/
 * Run: k6 run tests/load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');

// Test configuration
export const options = {
  stages: [
    // Ramp-up: 0 to 50 users over 2 minutes
    { duration: '2m', target: 50 },
    // Stay at 50 users for 5 minutes
    { duration: '5m', target: 50 },
    // Peak load: ramp to 100 users over 2 minutes
    { duration: '2m', target: 100 },
    // Stay at peak for 3 minutes
    { duration: '3m', target: 100 },
    // Ramp-down: 100 to 0 users over 2 minutes
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    // 95% of requests should be below 500ms
    http_req_duration: ['p(95)<500'],
    // Error rate should be below 1%
    errors: ['rate<0.01'],
    // 95% of API calls should be below 300ms
    api_response_time: ['p(95)<300'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';

// Test scenarios
export default function() {
  // Scenario 1: Health check (10% of requests)
  if (Math.random() < 0.1) {
    testHealthEndpoint();
  }
  
  // Scenario 2: Get perspectives (20% of requests)
  else if (Math.random() < 0.3) {
    testGetPerspectives();
  }
  
  // Scenario 3: Get routes (20% of requests)
  else if (Math.random() < 0.5) {
    testGetRoutes();
  }
  
  // Scenario 4: Submit rating (15% of requests)
  else if (Math.random() < 0.65) {
    testSubmitRating();
  }
  
  // Scenario 5: Gamification (15% of requests)
  else if (Math.random() < 0.8) {
    testGamification();
  }
  
  // Scenario 6: ML Recommendations (10% of requests)
  else if (Math.random() < 0.9) {
    testMLRecommendations();
  }
  
  // Scenario 7: Booking (10% of requests)
  else {
    testBooking();
  }
  
  // Think time between requests
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

function testHealthEndpoint() {
  const startTime = Date.now();
  const res = http.get(`${BASE_URL}/health`);
  const duration = Date.now() - startTime;
  
  const passed = check(res, {
    'health status is 200': (r) => r.status === 200,
    'health response has status': (r) => JSON.parse(r.body).status === 'healthy',
  });
  
  errorRate.add(!passed);
  apiResponseTime.add(duration);
}

function testGetPerspectives() {
  const startTime = Date.now();
  const res = http.get(`${BASE_URL}/api/perspectives`);
  const duration = Date.now() - startTime;
  
  const passed = check(res, {
    'perspectives status is 200': (r) => r.status === 200,
    'perspectives returned': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && Array.isArray(body.perspectives);
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!passed);
  apiResponseTime.add(duration);
}

function testGetRoutes() {
  const startTime = Date.now();
  const res = http.get(`${BASE_URL}/api/routes`);
  const duration = Date.now() - startTime;
  
  const passed = check(res, {
    'routes status is 200': (r) => r.status === 200,
    'routes returned': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && Array.isArray(body.routes);
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!passed);
  apiResponseTime.add(duration);
}

function testSubmitRating() {
  const startTime = Date.now();
  const payload = JSON.stringify({
    tourId: `test-tour-${Math.floor(Math.random() * 1000)}`,
    guideId: `test-guide-${Math.floor(Math.random() * 100)}`,
    userId: `test-user-${Math.floor(Math.random() * 10000)}`,
    overallRating: Math.floor(Math.random() * 5) + 1,
    ratings: {
      knowledge: Math.floor(Math.random() * 5) + 1,
      communication: Math.floor(Math.random() * 5) + 1,
      punctuality: Math.floor(Math.random() * 5) + 1,
      professionalism: Math.floor(Math.random() * 5) + 1,
    },
    feedback: 'Load test feedback',
  });
  
  const res = http.post(`${BASE_URL}/api/ratings/submit`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  const duration = Date.now() - startTime;
  
  const passed = check(res, {
    'rating submit status is 200': (r) => r.status === 200,
    'rating created': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.ratingId;
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!passed);
  apiResponseTime.add(duration);
}

function testGamification() {
  const userId = `test-user-${Math.floor(Math.random() * 10000)}`;
  const startTime = Date.now();
  const res = http.get(`${BASE_URL}/api/gamification/profile/${userId}`);
  const duration = Date.now() - startTime;
  
  const passed = check(res, {
    'gamification status is 200': (r) => r.status === 200,
    'profile returned': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.profile;
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!passed);
  apiResponseTime.add(duration);
}

function testMLRecommendations() {
  const userId = `test-user-${Math.floor(Math.random() * 10000)}`;
  const startTime = Date.now();
  const res = http.get(`${BASE_URL}/api/recommendations/user/${userId}`);
  const duration = Date.now() - startTime;
  
  const passed = check(res, {
    'recommendations status is 200': (r) => r.status === 200,
    'recommendations returned': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && Array.isArray(body.recommendations);
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!passed);
  apiResponseTime.add(duration);
}

function testBooking() {
  const payload = JSON.stringify({
    userId: `test-user-${Math.floor(Math.random() * 10000)}`,
    tourId: `test-tour-${Math.floor(Math.random() * 1000)}`,
    tourDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    participants: Math.floor(Math.random() * 5) + 1,
    contactInfo: {
      name: 'Load Test User',
      email: 'loadtest@example.com',
      phone: '+1234567890',
    },
  });
  
  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/bookings/create`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  const duration = Date.now() - startTime;
  
  const passed = check(res, {
    'booking status is 200': (r) => r.status === 200,
    'booking created': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success && body.booking;
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!passed);
  apiResponseTime.add(duration);
}

// Teardown function (runs once at the end)
export function teardown(data) {
  console.log('Load test completed');
}
