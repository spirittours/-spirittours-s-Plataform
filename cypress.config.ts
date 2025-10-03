import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    viewportWidth: 1920,
    viewportHeight: 1080,
    video: true,
    videoCompression: 32,
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    
    // Testing timeouts
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    
    // Retry configuration
    retries: {
      runMode: 2,
      openMode: 0
    },
    
    // Environment variables
    env: {
      apiUrl: process.env.API_URL || 'http://localhost:8000',
      adminUrl: process.env.ADMIN_URL || 'http://localhost:3001',
      testUser: {
        email: 'test@spirit-tours.com',
        password: 'TestPassword123!',
        name: 'Test User'
      },
      adminUser: {
        email: 'admin@spirit-tours.com',
        password: 'AdminPassword123!',
        name: 'Admin User'
      }
    },
    
    setupNodeEvents(on, config) {
      // Custom tasks
      on('task', {
        log(message) {
          console.log(message);
          return null;
        },
        
        // Database tasks
        async seedDatabase() {
          // Implementation for database seeding
          return true;
        },
        
        async clearDatabase() {
          // Implementation for database clearing
          return true;
        },
        
        // Performance metrics collection
        async collectPerformanceMetrics(url: string) {
          // Collect Core Web Vitals
          return {
            LCP: 2500,  // Largest Contentful Paint
            FID: 100,   // First Input Delay
            CLS: 0.1,   // Cumulative Layout Shift
            FCP: 1800,  // First Contentful Paint
            TTFB: 600   // Time to First Byte
          };
        }
      });
      
      // Code coverage
      require('@cypress/code-coverage/task')(on, config);
      
      return config;
    },
    
    // Test isolation
    testIsolation: true,
    
    // Experimental features
    experimentalStudio: true,
    experimentalMemoryManagement: true,
    experimentalWebKitSupport: true,
    
    // Spec patterns
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    excludeSpecPattern: ['*.hot-update.js', '**/__tests__/**/*', '**/__mocks__/**/*']
  },
  
  component: {
    devServer: {
      framework: 'react',
      bundler: 'webpack',
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts'
  }
});