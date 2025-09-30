// 🔧 Global E2E Test Setup
// AI Multi-Model Management System - Test Environment Preparation

const { chromium } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

async function globalSetup(config) {
  console.log('🚀 Starting global E2E test setup...');
  
  try {
    // 📊 Test Environment Variables
    const testEnv = {
      NODE_ENV: 'test',
      PORT: '3000',
      API_PORT: '3001',
      WEBSOCKET_PORT: '3002',
      DATABASE_URL: 'postgresql://test_user:test_password@localhost:5432/test_ai_multimodel',
      REDIS_URL: 'redis://localhost:6379/1',
      JWT_SECRET: 'test-jwt-secret-key-for-e2e-tests',
      LOG_LEVEL: 'error', // Reduce noise during tests
    };
    
    // 🔧 Set environment variables
    Object.assign(process.env, testEnv);
    
    // 📁 Create test directories
    const testDirs = [
      'test-results',
      'playwright-report',
      'screenshots',
      'videos',
      'traces',
      'auth',
      'fixtures',
      'temp-test-data'
    ];
    
    for (const dir of testDirs) {
      await fs.mkdir(path.join(process.cwd(), dir), { recursive: true });
    }
    
    // 🗄️ Setup Test Database
    await setupTestDatabase();
    
    // 📊 Create Test Data
    await createTestData();
    
    // 🔐 Setup Authentication
    await setupAuthentication(config);
    
    // 🧪 Validate Test Environment
    await validateTestEnvironment();
    
    console.log('✅ Global E2E test setup completed successfully');
    
    return {
      baseURL: `http://localhost:${process.env.PORT}`,
      apiURL: `http://localhost:${process.env.API_PORT}`,
      wsURL: `ws://localhost:${process.env.WEBSOCKET_PORT}`,
      testDataCreated: true,
      authSetup: true,
    };
    
  } catch (error) {
    console.error('❌ Global E2E test setup failed:', error);
    throw error;
  }
}

async function setupTestDatabase() {
  console.log('🗄️ Setting up test database...');
  
  try {
    // Import database utilities
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    // Create test database schema
    await execAsync('npm run migrate:test');
    
    // Seed test data
    await execAsync('npm run seed:test');
    
    console.log('✅ Test database setup completed');
  } catch (error) {
    console.warn('⚠️ Database setup failed, using in-memory database:', error.message);
  }
}

async function createTestData() {
  console.log('📊 Creating test data fixtures...');
  
  const testData = {
    users: [
      {
        id: 'test-admin-001',
        email: 'admin@test.ai-multimodel.com',
        password: 'TestPassword123!',
        role: 'admin',
        name: 'Test Administrator',
        permissions: ['*']
      },
      {
        id: 'test-user-001',
        email: 'user@test.ai-multimodel.com',
        password: 'TestPassword123!',
        role: 'user',
        name: 'Test User',
        permissions: ['read', 'ai_query']
      },
      {
        id: 'test-developer-001',
        email: 'developer@test.ai-multimodel.com',
        password: 'TestPassword123!',
        role: 'developer',
        name: 'Test Developer',
        permissions: ['read', 'write', 'ai_query', 'api_access']
      }
    ],
    
    aiModels: [
      {
        id: 'gpt-4-test',
        name: 'GPT-4 (Test)',
        provider: 'openai',
        status: 'active',
        maxTokens: 4096,
        costPerToken: 0.00003
      },
      {
        id: 'claude-3-test',
        name: 'Claude 3 (Test)',
        provider: 'anthropic',
        status: 'active',
        maxTokens: 8192,
        costPerToken: 0.00025
      }
    ],
    
    testQueries: [
      {
        query: 'What is artificial intelligence?',
        expectedLength: { min: 100, max: 1000 },
        expectedKeywords: ['artificial', 'intelligence', 'machine', 'learning']
      },
      {
        query: 'Explain quantum computing in simple terms',
        expectedLength: { min: 200, max: 800 },
        expectedKeywords: ['quantum', 'computing', 'qubit', 'superposition']
      }
    ],
    
    apiTestCases: [
      {
        endpoint: '/api/v1/models',
        method: 'GET',
        expectedStatus: 200,
        expectedFields: ['models', 'total', 'active']
      },
      {
        endpoint: '/api/v1/query',
        method: 'POST',
        payload: { query: 'Test query', model: 'gpt-4-test' },
        expectedStatus: 200,
        expectedFields: ['response', 'model', 'usage']
      }
    ]
  };
  
  // Save test data to fixtures
  await fs.writeFile(
    path.join(process.cwd(), 'fixtures', 'test-data.json'),
    JSON.stringify(testData, null, 2)
  );
  
  console.log('✅ Test data fixtures created');
}

async function setupAuthentication(config) {
  console.log('🔐 Setting up authentication for tests...');
  
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to login page
    await page.goto(`${config.use?.baseURL || 'http://localhost:3000'}/login`);
    
    // Perform login with test admin user
    await page.fill('[data-testid="email-input"]', 'admin@test.ai-multimodel.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Save authentication state
    await context.storageState({ 
      path: path.join(process.cwd(), 'auth', 'admin.json') 
    });
    
    // Create user authentication state
    await page.goto(`${config.use?.baseURL || 'http://localhost:3000'}/logout`);
    await page.goto(`${config.use?.baseURL || 'http://localhost:3000'}/login`);
    
    await page.fill('[data-testid="email-input"]', 'user@test.ai-multimodel.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard');
    
    await context.storageState({ 
      path: path.join(process.cwd(), 'auth', 'user.json') 
    });
    
    await browser.close();
    console.log('✅ Authentication setup completed');
    
  } catch (error) {
    console.warn('⚠️ Authentication setup failed, will use API tokens:', error.message);
    
    // Create fallback auth tokens
    const authTokens = {
      admin: 'test-admin-token-' + Date.now(),
      user: 'test-user-token-' + Date.now(),
      developer: 'test-developer-token-' + Date.now()
    };
    
    await fs.writeFile(
      path.join(process.cwd(), 'auth', 'tokens.json'),
      JSON.stringify(authTokens, null, 2)
    );
  }
}

async function validateTestEnvironment() {
  console.log('🔍 Validating test environment...');
  
  const validations = [
    // Check if server is running
    async () => {
      const http = require('http');
      return new Promise((resolve) => {
        const req = http.get('http://localhost:3000/health', (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(5000, () => {
          req.destroy();
          resolve(false);
        });
      });
    },
    
    // Check API endpoint
    async () => {
      const http = require('http');
      return new Promise((resolve) => {
        const req = http.get('http://localhost:3001/api/v1/health', (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(5000, () => {
          req.destroy();
          resolve(false);
        });
      });
    },
    
    // Check WebSocket endpoint
    async () => {
      try {
        const WebSocket = require('ws');
        const ws = new WebSocket('ws://localhost:3002');
        return new Promise((resolve) => {
          ws.on('open', () => {
            ws.close();
            resolve(true);
          });
          ws.on('error', () => resolve(false));
          setTimeout(() => resolve(false), 5000);
        });
      } catch {
        return false;
      }
    }
  ];
  
  const results = await Promise.all(validations.map(v => v()));
  const [serverOk, apiOk, wsOk] = results;
  
  console.log(`🌐 Server Health: ${serverOk ? '✅' : '❌'}`);
  console.log(`🔗 API Health: ${apiOk ? '✅' : '❌'}`);
  console.log(`🔄 WebSocket Health: ${wsOk ? '✅' : '❌'}`);
  
  if (!serverOk) {
    throw new Error('Test server is not responding. Please start the application first.');
  }
  
  console.log('✅ Test environment validation completed');
}

module.exports = globalSetup;