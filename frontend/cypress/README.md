# Cypress E2E Testing Suite

Complete end-to-end testing suite for Spirit Tours CRM platform.

## 📋 Overview

This directory contains all Cypress E2E tests for the application, covering critical user workflows and features.

## 🗂️ Test Structure

```
cypress/
├── e2e/                    # E2E test specs
│   ├── auth.cy.ts          # Authentication flows
│   ├── tours.cy.ts         # Tours management
│   ├── bookings.cy.ts      # Booking workflows
│   ├── dashboard.cy.ts     # Dashboard features
│   └── realtime.cy.ts      # WebSocket/real-time features
├── support/                # Support files
│   ├── commands.ts         # Custom Cypress commands
│   └── e2e.ts             # Global configuration
└── fixtures/              # Test data fixtures
```

## 🚀 Running Tests

### Interactive Mode (Development)

```bash
# Open Cypress Test Runner
npm run cypress:open

# Or with yarn
yarn cypress:open
```

### Headless Mode (CI/CD)

```bash
# Run all tests
npm run cypress:run

# Run specific spec
npm run cypress:run -- --spec "cypress/e2e/auth.cy.ts"

# Run with specific browser
npm run cypress:run -- --browser chrome
```

## 📊 Test Coverage

### Authentication (auth.cy.ts)
- ✅ Login with valid/invalid credentials
- ✅ Logout functionality
- ✅ User registration
- ✅ Password reset
- ✅ Session persistence
- ✅ OAuth flows
- ✅ Two-factor authentication

**Total Tests:** 15+

### Tours Management (tours.cy.ts)
- ✅ Display tours list with filters
- ✅ Create new tour
- ✅ Edit existing tour
- ✅ Delete tour with confirmation
- ✅ Upload tour images
- ✅ Manage availability calendar
- ✅ Set pricing and duration

**Total Tests:** 20+

### Bookings (bookings.cy.ts)
- ✅ Display bookings list
- ✅ Filter by status, date, customer
- ✅ Create booking wizard (4 steps)
- ✅ View booking details
- ✅ Update booking status
- ✅ Cancel booking with refund calculation
- ✅ Send confirmation emails
- ✅ Calendar view
- ✅ Payment processing

**Total Tests:** 25+

### Dashboard (dashboard.cy.ts)
- ✅ Display key metrics
- ✅ Revenue and bookings charts
- ✅ Recent activities
- ✅ Notifications panel
- ✅ Mark notifications as read
- ✅ Navigation to sub-pages

**Total Tests:** 12+

### Real-time Features (realtime.cy.ts)
- ✅ Chat interface
- ✅ Send/receive messages
- ✅ Typing indicators
- ✅ Online status
- ✅ File attachments
- ✅ GPS tracking map
- ✅ Real-time location updates
- ✅ ETA and speed display
- ✅ Share tracking link
- ✅ WebSocket connection/reconnection

**Total Tests:** 18+

**Grand Total:** 90+ E2E tests

## 🔧 Custom Commands

### Authentication
```typescript
cy.login('email@example.com', 'password')
cy.logout()
```

### API Interaction
```typescript
cy.createTour({ name: 'Tour Name', price: 150 })
cy.createBooking({ tourId: '1', date: '2025-12-25' })
cy.interceptAPI('GET', '/tours', { tours: [] })
```

### UI Helpers
```typescript
cy.waitForDashboard()
```

## 🌍 Environment Configuration

### Local Development
```env
# .env
CYPRESS_BASE_URL=http://localhost:3000
CYPRESS_API_URL=http://localhost:5001/api
CYPRESS_WS_URL=http://localhost:5001
```

### CI/CD
```env
# GitHub Actions / CI environment
CYPRESS_BASE_URL=https://staging.spirittours.com
CYPRESS_API_URL=https://api.staging.spirittours.com/api
CYPRESS_WS_URL=wss://api.staging.spirittours.com
```

## 📸 Screenshots & Videos

Cypress automatically captures:
- **Screenshots:** On test failure
- **Videos:** Full test execution (can be disabled)

Location:
```
cypress/
├── screenshots/    # Test failure screenshots
└── videos/        # Full test run videos
```

## 🐛 Debugging

### Interactive Debugging

```typescript
// Add .debug() to pause execution
cy.get('[data-testid="element"]').debug()

// Use cy.pause() to pause test
cy.pause()

// Log values
cy.get('[data-testid="element"]').then($el => {
  cy.log($el.text())
})
```

### Browser DevTools
- Open Cypress Test Runner
- Click on any command in the command log
- Inspect DOM state at that point

## 🔥 Best Practices

### 1. Use data-testid attributes
```tsx
// Good
<button data-testid="submit-button">Submit</button>
cy.get('[data-testid="submit-button"]')

// Avoid
cy.get('.btn-primary')  // Fragile, depends on CSS classes
```

### 2. Wait for elements properly
```typescript
// Good
cy.get('[data-testid="element"]', { timeout: 10000 }).should('be.visible')

// Avoid
cy.wait(3000)  // Arbitrary wait
```

### 3. Mock API responses
```typescript
// Mock for consistent tests
cy.interceptAPI('GET', '/tours', {
  statusCode: 200,
  body: { tours: mockTours }
})
```

### 4. Clean state between tests
```typescript
beforeEach(() => {
  cy.clearCookies()
  cy.clearLocalStorage()
})
```

### 5. Use custom commands for reusable actions
```typescript
// Define once, use everywhere
Cypress.Commands.add('login', (email, password) => {
  // Login implementation
})

// Usage
cy.login('admin@example.com', 'password')
```

## 🚦 CI/CD Integration

### GitHub Actions

```yaml
- name: Run Cypress tests
  uses: cypress-io/github-action@v5
  with:
    start: npm start
    wait-on: 'http://localhost:3000'
    browser: chrome
    record: true
    parallel: true
  env:
    CYPRESS_RECORD_KEY: ${{ secrets.CYPRESS_RECORD_KEY }}
```

### GitLab CI

```yaml
e2e-tests:
  stage: test
  script:
    - npm install
    - npm start &
    - npx wait-on http://localhost:3000
    - npm run cypress:run
  artifacts:
    when: always
    paths:
      - cypress/screenshots/
      - cypress/videos/
```

## 📈 Performance

### Parallel Execution

```bash
# Run tests in parallel (requires Cypress Dashboard)
npm run cypress:run -- --record --parallel
```

### Test Isolation

Each test runs in isolation with:
- Fresh browser context
- Clean localStorage/cookies
- Independent database state (via API mocks)

## 🔍 Test Reports

### Mochawesome Reporter

```bash
# Generate HTML report
npm run cypress:run -- --reporter mochawesome

# Report location
cypress/reports/mochawesome-report/index.html
```

### Cypress Dashboard

For advanced features:
- Test parallelization
- Flake detection
- Load balancing
- Historical trends

Visit: https://dashboard.cypress.io

## 🆘 Troubleshooting

### Tests failing locally

1. **Ensure backend is running**
   ```bash
   cd backend && npm start
   ```

2. **Ensure frontend is running**
   ```bash
   cd frontend && npm start
   ```

3. **Clear Cypress cache**
   ```bash
   npx cypress cache clear
   npm install
   ```

### WebSocket tests failing

1. **Check WebSocket server is running**
   ```bash
   curl http://localhost:5001/socket.io/
   ```

2. **Verify CORS configuration**
   - Backend should allow frontend origin

### Timeout errors

1. **Increase timeout**
   ```typescript
   cy.get('[data-testid="element"]', { timeout: 20000 })
   ```

2. **Check network performance**
   - Slow API responses may need longer timeouts

## 📚 Resources

- [Cypress Documentation](https://docs.cypress.io/)
- [Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [Cypress Dashboard](https://dashboard.cypress.io)
- [Cypress Discord](https://discord.com/invite/cypress)

## 🤝 Contributing

When adding new tests:

1. Follow existing test structure
2. Use meaningful test descriptions
3. Add appropriate comments for complex logic
4. Update this README with new test coverage
5. Ensure tests pass in both interactive and headless modes

---

**Total E2E Tests:** 90+  
**Coverage:** Critical user workflows  
**Execution Time:** ~10-15 minutes (full suite)  
**Last Updated:** 2025-11-01
