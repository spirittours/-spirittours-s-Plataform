// 🧪 Playwright E2E Testing Configuration
// AI Multi-Model Management System - Comprehensive Testing Suite

const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  
  /* 🎯 Test Execution Configuration */
  timeout: 60000,                    // 60 seconds per test
  expect: { timeout: 10000 },        // 10 seconds for assertions
  fullyParallel: true,              // Run tests in parallel
  forbidOnly: !!process.env.CI,     // Fail if test.only in CI
  retries: process.env.CI ? 2 : 0,  // Retry failed tests in CI
  workers: process.env.CI ? 1 : undefined, // Parallel workers
  
  /* 📊 Reporter Configuration */
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report',
      open: 'never' 
    }],
    ['json', { 
      outputFile: 'test-results.json' 
    }],
    ['junit', { 
      outputFile: 'test-results.xml' 
    }],
    ['github']  // GitHub Actions integration
  ],

  /* 🔧 Global Test Configuration */
  use: {
    /* Base URL for tests */
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    
    /* Browser configuration */
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    /* 📊 Tracing and debugging */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    /* 🎯 Timeouts */
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    /* 🔐 Authentication state */
    storageState: process.env.CI ? undefined : 'auth/user.json',
    
    /* 📱 Device simulation */
    userAgent: 'AI-MultiModel-E2E-Tests/1.0',
    
    /* 🌐 Network conditions */
    offline: false,
    httpCredentials: process.env.HTTP_AUTH ? {
      username: process.env.HTTP_AUTH_USERNAME,
      password: process.env.HTTP_AUTH_PASSWORD,
    } : undefined,
  },

  /* 🖥️ Browser Projects Configuration */
  projects: [
    
    // 🔐 Authentication setup
    {
      name: 'setup',
      testMatch: /.*\.setup\.js/,
      teardown: 'cleanup',
    },
    
    // 🧹 Cleanup teardown
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.js/,
    },

    /* 🌐 Desktop Browsers */
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup'],
      grepInvert: /@mobile/,
    },

    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup'],
      grepInvert: /@mobile/,
    },

    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
      dependencies: ['setup'],
      grepInvert: /@mobile/,
    },

    /* 📱 Mobile Devices */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
      grep: /@mobile/,
    },

    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
      grep: /@mobile/,
    },

    /* 📊 Performance Testing */
    {
      name: 'performance',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-precise-memory-info', '--enable-gpu-benchmarking']
        }
      },
      dependencies: ['setup'],
      grep: /@performance/,
    },

    /* 🔐 Security Testing */
    {
      name: 'security',
      use: { 
        ...devices['Desktop Chrome'],
        extraHTTPHeaders: {
          'X-Security-Test': 'true'
        }
      },
      dependencies: ['setup'],
      grep: /@security/,
    },

    /* 🎯 API Testing */
    {
      name: 'api',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3001',
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      },
      grep: /@api/,
    },
  ],

  /* 🖥️ Local Development Server */
  webServer: process.env.CI ? undefined : {
    command: 'npm run start:test',
    url: 'http://localhost:3000',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: 'test',
      PORT: '3000',
      API_PORT: '3001',
    },
  },

  /* 📁 Output Directories */
  outputDir: 'test-results/',
  testDir: './tests/',

  /* 🔧 Global Setup and Teardown */
  globalSetup: require.resolve('./global-setup.js'),
  globalTeardown: require.resolve('./global-teardown.js'),

  /* 🎯 Test Match Patterns */
  testMatch: [
    'tests/**/*.test.js',
    'tests/**/*.spec.js',
    'e2e/**/*.test.js',
    'integration/**/*.test.js',
  ],

  /* 🚫 Test Ignore Patterns */
  testIgnore: [
    'tests/fixtures/**',
    'tests/utils/**',
    '**/*.setup.js',
    '**/*.teardown.js',
  ],

  /* 🔧 Metadata */
  metadata: {
    'test-suite': 'AI Multi-Model Management System E2E Tests',
    'version': '2.0.0',
    'environment': process.env.NODE_ENV || 'test',
    'browser-versions': 'Latest Stable',
    'test-framework': 'Playwright',
    'ci-system': process.env.CI ? 'GitHub Actions' : 'Local',
  },
});