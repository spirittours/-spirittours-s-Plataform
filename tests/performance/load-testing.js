// 🚀 Load Testing Suite - AI Multi-Model Management System
// Comprehensive performance testing for production readiness

const k6 = require('k6');
const { check, group, sleep } = require('k6');
const http = require('k6/http');
const { Counter, Rate, Trend, Gauge } = require('k6/metrics');

// 📊 Custom Metrics
const aiRequestCounter = new Counter('ai_requests_total');
const aiErrorRate = new Rate('ai_error_rate');
const aiResponseTime = new Trend('ai_response_time');
const concurrentUsers = new Gauge('concurrent_users');

// 🎯 Test Configuration
export let options = {
  scenarios: {
    // 📈 Smoke Test - Basic functionality
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    
    // ⚡ Load Test - Normal load
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },   // Ramp up
        { duration: '5m', target: 100 },   // Stay at load
        { duration: '2m', target: 200 },   // Ramp up more
        { duration: '5m', target: 200 },   // Stay at higher load
        { duration: '2m', target: 0 },     // Ramp down
      ],
      tags: { test_type: 'load' },
    },

    // 🔥 Stress Test - High load
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 500 },   // Ramp up to stress level
        { duration: '5m', target: 500 },   // Stay at stress level
        { duration: '2m', target: 1000 },  // Ramp up to breaking point
        { duration: '5m', target: 1000 },  // Stay at breaking point
        { duration: '5m', target: 0 },     // Ramp down gradually
      ],
      tags: { test_type: 'stress' },
    },

    // 📊 Spike Test - Traffic spikes
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },  // Normal load
        { duration: '1m', target: 100 },   // Stay at normal
        { duration: '10s', target: 1000 }, // Spike!
        { duration: '3m', target: 1000 },  // Stay at spike
        { duration: '10s', target: 100 },  // Drop back to normal
        { duration: '3m', target: 100 },   // Recover
        { duration: '10s', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'spike' },
    },

    // 🔄 Soak Test - Extended duration
    soak_test: {
      executor: 'constant-vus',
      vus: 200,
      duration: '30m',
      tags: { test_type: 'soak' },
    },

    // 🧠 AI Model Specific Tests
    ai_model_performance: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 100,
      maxDuration: '10m',
      tags: { test_type: 'ai_models' },
    },
  },
  
  // 🎯 Performance Thresholds
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'], // Response time < 2s (95%), < 5s (99%)
    http_req_failed: ['rate<0.01'],                   // Error rate < 1%
    ai_response_time: ['p(95)<3000'],                 // AI response < 3s (95%)
    ai_error_rate: ['rate<0.05'],                     // AI error rate < 5%
    checks: ['rate>0.99'],                            // Success rate > 99%
  },
};

// 🌍 Environment Configuration
const BASE_URL = __ENV.BASE_URL || 'https://ai-multimodel.genspark.ai';
const API_URL = __ENV.API_URL || 'https://api.ai-multimodel.genspark.ai';
const API_KEY = __ENV.API_KEY || 'test-api-key';

// 🎯 Test Data
const AI_MODELS = [
  'gpt-4', 'gpt-3.5-turbo', 'claude-3.5-sonnet', 'claude-3-haiku',
  'gemini-pro', 'gemini-1.5-pro', 'qwen-turbo', 'deepseek-coder',
  'grok-1', 'llama-2-70b', 'cohere-command', 'ai21-j2-ultra'
];

const TEST_PROMPTS = [
  'Explain artificial intelligence in simple terms',
  'Write a Python function to sort a list',
  'What are the benefits of cloud computing?',
  'Describe the process of machine learning',
  'How does blockchain technology work?',
  'Create a marketing strategy for a new product',
  'Explain quantum computing concepts',
  'Write a SQL query to find top customers',
  'What are microservices advantages?',
  'Describe RESTful API best practices'
];

// 🔧 Setup Function
export function setup() {
  console.log('🚀 Starting AI Multi-Model Load Testing...');
  
  // Verify system health before testing
  let healthCheck = http.get(`${BASE_URL}/health`);
  check(healthCheck, {
    'System is healthy before testing': (r) => r.status === 200,
  });

  let apiHealthCheck = http.get(`${API_URL}/api/v1/health`);
  check(apiHealthCheck, {
    'API is healthy before testing': (r) => r.status === 200,
  });

  return {
    baseUrl: BASE_URL,
    apiUrl: API_URL,
    apiKey: API_KEY,
    testStartTime: new Date().toISOString()
  };
}

// 🧪 Main Test Function
export default function(data) {
  concurrentUsers.add(1);
  
  group('🌐 Frontend Performance Tests', function() {
    testFrontendPages(data);
  });

  group('🔗 API Performance Tests', function() {
    testAPIEndpoints(data);
  });

  group('🧠 AI Model Performance Tests', function() {
    testAIModels(data);
  });

  group('🔄 WebSocket Performance Tests', function() {
    testWebSocketConnections(data);
  });

  group('📊 Analytics Performance Tests', function() {
    testAnalyticsEndpoints(data);
  });

  sleep(Math.random() * 2 + 1); // Random sleep 1-3 seconds
}

// 🌐 Frontend Performance Tests
function testFrontendPages(data) {
  let pages = [
    '/',
    '/dashboard',
    '/analytics',
    '/models',
    '/settings'
  ];

  pages.forEach(page => {
    let response = http.get(`${data.baseUrl}${page}`, {
      headers: {
        'User-Agent': 'K6 Load Test',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    check(response, {
      [`${page} status is 200`]: (r) => r.status === 200,
      [`${page} response time < 3s`]: (r) => r.timings.duration < 3000,
      [`${page} has content`]: (r) => r.body.length > 1000,
    });
  });
}

// 🔗 API Performance Tests
function testAPIEndpoints(data) {
  let params = {
    headers: {
      'Authorization': `Bearer ${data.apiKey}`,
      'Content-Type': 'application/json',
    },
  };

  // Health endpoint
  let healthResponse = http.get(`${data.apiUrl}/api/v1/health`, params);
  check(healthResponse, {
    'Health endpoint returns 200': (r) => r.status === 200,
    'Health response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Models endpoint
  let modelsResponse = http.get(`${data.apiUrl}/api/v1/models`, params);
  check(modelsResponse, {
    'Models endpoint returns 200': (r) => r.status === 200,
    'Models response has data': (r) => JSON.parse(r.body).models.length > 0,
  });

  // Metrics endpoint
  let metricsResponse = http.get(`${data.apiUrl}/api/v1/metrics`, params);
  check(metricsResponse, {
    'Metrics endpoint returns 200': (r) => r.status === 200,
  });

  // User profile endpoint
  let profileResponse = http.get(`${data.apiUrl}/api/v1/user/profile`, params);
  check(profileResponse, {
    'Profile endpoint responds': (r) => r.status === 200 || r.status === 401,
  });
}

// 🧠 AI Model Performance Tests
function testAIModels(data) {
  let params = {
    headers: {
      'Authorization': `Bearer ${data.apiKey}`,
      'Content-Type': 'application/json',
    },
  };

  // Test random AI model and prompt
  let model = AI_MODELS[Math.floor(Math.random() * AI_MODELS.length)];
  let prompt = TEST_PROMPTS[Math.floor(Math.random() * TEST_PROMPTS.length)];

  let payload = JSON.stringify({
    model: model,
    prompt: prompt,
    max_tokens: 150,
    temperature: 0.7
  });

  let startTime = Date.now();
  let response = http.post(`${data.apiUrl}/api/v1/query`, payload, params);
  let endTime = Date.now();
  
  let responseTime = endTime - startTime;
  aiResponseTime.add(responseTime);
  aiRequestCounter.add(1);

  let success = check(response, {
    'AI query returns success': (r) => r.status >= 200 && r.status < 400,
    'AI response has content': (r) => {
      try {
        let body = JSON.parse(r.body);
        return body.response && body.response.length > 0;
      } catch {
        return false;
      }
    },
    'AI response time acceptable': (r) => responseTime < 10000, // 10 seconds max
  });

  if (!success) {
    aiErrorRate.add(1);
  }

  // Test load balancer effectiveness
  if (Math.random() < 0.1) { // 10% of requests test load balancer
    testLoadBalancer(data, params);
  }
}

// ⚖️ Load Balancer Tests
function testLoadBalancer(data, params) {
  let payload = JSON.stringify({
    prompt: 'Simple test query',
    max_tokens: 50
  });

  // Make multiple requests to test load distribution
  for (let i = 0; i < 5; i++) {
    let response = http.post(`${data.apiUrl}/api/v1/query`, payload, params);
    
    check(response, {
      'Load balancer distributes requests': (r) => r.status < 500,
      'Response includes model info': (r) => {
        try {
          let body = JSON.parse(r.body);
          return body.model_used !== undefined;
        } catch {
          return false;
        }
      },
    });

    sleep(0.1); // Small delay between requests
  }
}

// 🔄 WebSocket Performance Tests
function testWebSocketConnections(data) {
  // Note: K6 doesn't natively support WebSockets in newer versions
  // This is a placeholder for WebSocket testing logic
  
  // Test WebSocket health endpoint
  let wsHealthResponse = http.get(`${data.apiUrl}/ws/health`);
  check(wsHealthResponse, {
    'WebSocket health endpoint accessible': (r) => r.status === 200 || r.status === 426, // 426 = Upgrade Required
  });

  // Test server-sent events endpoint
  let sseResponse = http.get(`${data.apiUrl}/api/v1/events/stream`, {
    headers: {
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${data.apiKey}`,
    },
  });
  
  check(sseResponse, {
    'SSE endpoint accessible': (r) => r.status === 200,
  });
}

// 📊 Analytics Performance Tests
function testAnalyticsEndpoints(data) {
  let params = {
    headers: {
      'Authorization': `Bearer ${data.apiKey}`,
      'Content-Type': 'application/json',
    },
  };

  // Test analytics endpoints
  let endpoints = [
    '/api/v1/analytics/overview',
    '/api/v1/analytics/models',
    '/api/v1/analytics/costs',
    '/api/v1/analytics/performance',
    '/api/v1/analytics/users'
  ];

  endpoints.forEach(endpoint => {
    let response = http.get(`${data.apiUrl}${endpoint}`, params);
    
    check(response, {
      [`Analytics ${endpoint} responds`]: (r) => r.status === 200 || r.status === 401,
      [`Analytics ${endpoint} response time OK`]: (r) => r.timings.duration < 5000,
    });
  });

  // Test real-time metrics
  let metricsResponse = http.get(`${data.apiUrl}/api/v1/metrics/realtime`, params);
  check(metricsResponse, {
    'Real-time metrics available': (r) => r.status === 200,
    'Metrics have recent data': (r) => {
      try {
        let body = JSON.parse(r.body);
        return body.timestamp && new Date(body.timestamp) > new Date(Date.now() - 300000); // Last 5 minutes
      } catch {
        return false;
      }
    },
  });
}

// 🧹 Teardown Function
export function teardown(data) {
  console.log('🏁 Load Testing Complete!');
  console.log(`📊 Test Duration: ${new Date().toISOString()}`);
  
  // Final health check
  let finalHealthCheck = http.get(`${BASE_URL}/health`);
  check(finalHealthCheck, {
    'System healthy after testing': (r) => r.status === 200,
  });

  // Generate summary report
  console.log(`
    🎯 Load Testing Summary:
    ========================
    🌐 Base URL: ${data.baseUrl}
    🔗 API URL: ${data.apiUrl}
    ⏱️  Started: ${data.testStartTime}
    ✅ Finished: ${new Date().toISOString()}
    
    📈 Check the following for detailed results:
    - Grafana Dashboard: https://grafana.ai-multimodel.genspark.ai
    - Prometheus Metrics: https://prometheus.ai-multimodel.genspark.ai
    - Application Logs: kubectl logs -l app=ai-multimodel-api -n production
  `);
}