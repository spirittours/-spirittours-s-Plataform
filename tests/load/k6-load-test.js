import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const requestCount = new Counter('requests');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp-up to 10 users
    { duration: '3m', target: 50 },   // Ramp-up to 50 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Peak at 200 users
    { duration: '2m', target: 50 },   // Ramp-down to 50
    { duration: '1m', target: 0 },    // Ramp-down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // 95% under 2s, 99% under 5s
    http_req_failed: ['rate<0.01'],  // Error rate below 1%
    errors: ['rate<0.05'],            // Error rate below 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5001';

// Helper function to make requests
function makeRequest(url, method = 'GET', body = null) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  requestCount.add(1);
  const start = Date.now();
  
  let response;
  if (method === 'GET') {
    response = http.get(`${BASE_URL}${url}`, params);
  } else if (method === 'POST') {
    response = http.post(`${BASE_URL}${url}`, body ? JSON.stringify(body) : null, params);
  }

  const duration = Date.now() - start;
  apiResponseTime.add(duration);
  
  const success = check(response, {
    'status is 200-299': (r) => r.status >= 200 && r.status < 300,
    'response has body': (r) => r.body.length > 0,
    'response time < 5000ms': (r) => r.timings.duration < 5000,
  });

  if (!success) {
    errorRate.add(1);
  }

  return response;
}

// Main test function
export default function () {
  // Test 1: Health Check
  group('Health Check', () => {
    const response = makeRequest('/health');
    
    check(response, {
      'health status is healthy': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.status === 'healthy';
        } catch {
          return false;
        }
      },
    });
  });

  sleep(1);

  // Test 2: Monitoring Health
  group('Monitoring Health', () => {
    const response = makeRequest('/api/monitoring/health');
    
    check(response, {
      'monitoring health returns success': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success === true;
        } catch {
          return false;
        }
      },
    });
  });

  sleep(1);

  // Test 3: Marketplace Endpoints
  group('Marketplace Operations', () => {
    // Get categories
    const categoriesResponse = makeRequest('/api/marketplace/categories');
    check(categoriesResponse, {
      'categories returned': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.categories);
        } catch {
          return false;
        }
      },
    });

    sleep(0.5);

    // Get featured models
    const featuredResponse = makeRequest('/api/marketplace/models/featured?limit=10');
    check(featuredResponse, {
      'featured models returned': (r) => r.status === 200,
    });

    sleep(0.5);

    // Get top rated models
    const topRatedResponse = makeRequest('/api/marketplace/models/top-rated?limit=10');
    check(topRatedResponse, {
      'top rated models returned': (r) => r.status === 200,
    });

    sleep(0.5);

    // Search models
    const searchResponse = makeRequest('/api/marketplace/models/search?q=llama&limit=20');
    check(searchResponse, {
      'search results returned': (r) => r.status === 200,
    });
  });

  sleep(2);

  // Test 4: Orchestration Endpoints
  group('Orchestration Operations', () => {
    // Note: These endpoints require authentication
    // This will return 401 without auth, which is expected
    const templatesResponse = makeRequest('/api/orchestration/templates');
    
    check(templatesResponse, {
      'templates endpoint responds': (r) => r.status === 200 || r.status === 401,
    });
  });

  sleep(1);

  // Test 5: Streaming Endpoint
  group('Streaming Operations', () => {
    const streamResponse = makeRequest('/api/streaming/test');
    
    check(streamResponse, {
      'streaming test responds': (r) => r.status === 200,
    });
  });

  sleep(2);

  // Test 6: Error Handling
  group('Error Handling', () => {
    // Test 404
    const notFoundResponse = makeRequest('/api/non-existent-endpoint');
    check(notFoundResponse, {
      'returns 404 for non-existent endpoint': (r) => r.status === 404,
    });
  });

  sleep(1);
}

// Setup function (runs once at the beginning)
export function setup() {
  console.log('Starting load test...');
  console.log(`Target: ${BASE_URL}`);
  return { startTime: Date.now() };
}

// Teardown function (runs once at the end)
export function teardown(data) {
  const duration = Date.now() - data.startTime;
  console.log(`Load test completed in ${duration}ms`);
}

// Handles HTTP errors
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = `${indent}Load Test Summary\n`;
  summary += `${indent}${'='.repeat(50)}\n\n`;

  // HTTP metrics
  if (data.metrics.http_reqs) {
    summary += `${indent}Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  }

  if (data.metrics.http_req_duration) {
    const duration = data.metrics.http_req_duration.values;
    summary += `${indent}Response Time:\n`;
    summary += `${indent}  Avg: ${duration.avg.toFixed(2)}ms\n`;
    summary += `${indent}  Min: ${duration.min.toFixed(2)}ms\n`;
    summary += `${indent}  Max: ${duration.max.toFixed(2)}ms\n`;
    summary += `${indent}  p95: ${duration['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}  p99: ${duration['p(99)'].toFixed(2)}ms\n`;
  }

  if (data.metrics.http_req_failed) {
    const failed = data.metrics.http_req_failed.values;
    summary += `${indent}Failed Requests: ${(failed.rate * 100).toFixed(2)}%\n`;
  }

  return summary;
}
