// 🧠 AI Models E2E Tests
// AI Multi-Model Management System - Comprehensive AI Model Testing

const { test, expect } = require('@playwright/test');

test.describe('🧠 AI Models Management', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to AI models page
    await page.goto('/dashboard/ai-models');
    await page.waitForLoadState('networkidle');
  });

  test('should display all available AI models @smoke', async ({ page }) => {
    // Check page title
    await expect(page.locator('h1')).toContainText('AI Models');
    
    // Verify models grid is visible
    await expect(page.locator('[data-testid="models-grid"]')).toBeVisible();
    
    // Check for expected AI models
    const expectedModels = [
      'GPT-4', 'Claude 3.5', 'Gemini Pro', 'Qwen', 'DeepSeek',
      'Grok', 'Meta AI', 'Perplexity', 'Cohere', 'AI21'
    ];
    
    for (const model of expectedModels) {
      await expect(page.locator(`[data-testid="model-card-${model.toLowerCase().replace(/\s/g, '-')}"]`)).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show model details when clicking on a model card', async ({ page }) => {
    // Click on GPT-4 model card
    await page.click('[data-testid="model-card-gpt-4"]');
    
    // Wait for details modal
    await expect(page.locator('[data-testid="model-details-modal"]')).toBeVisible();
    
    // Verify model information
    await expect(page.locator('[data-testid="model-name"]')).toContainText('GPT-4');
    await expect(page.locator('[data-testid="model-provider"]')).toContainText('OpenAI');
    await expect(page.locator('[data-testid="model-status"]')).toContainText('Active');
    await expect(page.locator('[data-testid="model-max-tokens"]')).toBeVisible();
    await expect(page.locator('[data-testid="model-cost-per-token"]')).toBeVisible();
  });

  test('should allow testing AI model with sample query', async ({ page }) => {
    // Click on Claude 3.5 model card
    await page.click('[data-testid="model-card-claude-3-5"]');
    await expect(page.locator('[data-testid="model-details-modal"]')).toBeVisible();
    
    // Click test model button
    await page.click('[data-testid="test-model-button"]');
    
    // Enter test query
    const testQuery = 'What is artificial intelligence?';
    await page.fill('[data-testid="test-query-input"]', testQuery);
    
    // Submit test
    await page.click('[data-testid="submit-test-button"]');
    
    // Wait for response
    await expect(page.locator('[data-testid="test-response"]')).toBeVisible({ timeout: 30000 });
    
    // Verify response contains relevant content
    const response = await page.locator('[data-testid="test-response"]').textContent();
    expect(response).toMatch(/artificial intelligence|AI|machine learning/i);
    expect(response.length).toBeGreaterThan(50);
  });

  test('should display model performance metrics', async ({ page }) => {
    // Navigate to metrics tab
    await page.click('[data-testid="metrics-tab"]');
    
    // Wait for metrics to load
    await page.waitForSelector('[data-testid="performance-chart"]');
    
    // Verify metrics components
    await expect(page.locator('[data-testid="response-time-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-rate-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="cost-analysis-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="usage-statistics"]')).toBeVisible();
    
    // Check that metrics have data
    const successRate = await page.locator('[data-testid="success-rate-value"]').textContent();
    expect(successRate).toMatch(/\d+(\.\d+)?%/);
  });

  test('should enable/disable AI models @admin', async ({ page }) => {
    // Use admin authentication
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@test.ai-multimodel.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard');
    
    await page.goto('/dashboard/ai-models');
    
    // Find a model that is currently enabled
    const modelCard = page.locator('[data-testid="model-card-gpt-4"]');
    await expect(modelCard).toBeVisible();
    
    // Click model settings
    await page.click('[data-testid="model-settings-gpt-4"]');
    
    // Toggle model status
    await page.click('[data-testid="toggle-model-status"]');
    
    // Confirm action
    await page.click('[data-testid="confirm-toggle"]');
    
    // Verify status change
    await expect(page.locator('[data-testid="model-status-gpt-4"]')).toContainText('Disabled');
    
    // Toggle back to enabled
    await page.click('[data-testid="toggle-model-status"]');
    await page.click('[data-testid="confirm-toggle"]');
    await expect(page.locator('[data-testid="model-status-gpt-4"]')).toContainText('Active');
  });

  test('should configure model parameters @admin', async ({ page }) => {
    // Navigate with admin privileges
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@test.ai-multimodel.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/dashboard');
    
    await page.goto('/dashboard/ai-models/configure');
    
    // Select a model to configure
    await page.click('[data-testid="configure-model-claude-3-5"]');
    
    // Update parameters
    await page.fill('[data-testid="max-tokens-input"]', '8192');
    await page.fill('[data-testid="temperature-input"]', '0.7');
    await page.fill('[data-testid="timeout-input"]', '30');
    
    // Save configuration
    await page.click('[data-testid="save-configuration"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Configuration saved successfully');
    
    // Verify parameters were saved
    await page.reload();
    await page.click('[data-testid="configure-model-claude-3-5"]');
    await expect(page.locator('[data-testid="max-tokens-input"]')).toHaveValue('8192');
    await expect(page.locator('[data-testid="temperature-input"]')).toHaveValue('0.7');
  });

  test('should handle model failover correctly', async ({ page }) => {
    // Navigate to load balancer settings
    await page.goto('/dashboard/ai-models/load-balancer');
    
    // Configure failover settings
    await page.selectOption('[data-testid="primary-model-select"]', 'gpt-4');
    await page.selectOption('[data-testid="fallback-model-select"]', 'claude-3-5');
    await page.selectOption('[data-testid="load-balancer-algorithm"]', 'intelligent');
    
    // Enable circuit breaker
    await page.check('[data-testid="enable-circuit-breaker"]');
    await page.fill('[data-testid="failure-threshold"]', '3');
    
    // Save configuration
    await page.click('[data-testid="save-load-balancer-config"]');
    
    // Test failover scenario
    await page.goto('/dashboard/query');
    
    // Submit a query that should trigger failover
    await page.fill('[data-testid="query-input"]', 'Test query for failover scenario');
    await page.click('[data-testid="submit-query"]');
    
    // Wait for response
    await expect(page.locator('[data-testid="query-response"]')).toBeVisible({ timeout: 45000 });
    
    // Verify response was generated (either from primary or fallback model)
    const response = await page.locator('[data-testid="query-response"]').textContent();
    expect(response.length).toBeGreaterThan(10);
    
    // Check model selection indicator
    await expect(page.locator('[data-testid="used-model-indicator"]')).toBeVisible();
  });

  test('should display real-time model statistics @performance', async ({ page }) => {
    // Navigate to real-time dashboard
    await page.goto('/dashboard/ai-models/realtime');
    
    // Wait for WebSocket connection
    await page.waitForTimeout(2000);
    
    // Verify real-time components
    await expect(page.locator('[data-testid="realtime-requests-counter"]')).toBeVisible();
    await expect(page.locator('[data-testid="realtime-response-times"]')).toBeVisible();
    await expect(page.locator('[data-testid="realtime-error-rates"]')).toBeVisible();
    await expect(page.locator('[data-testid="realtime-model-usage"]')).toBeVisible();
    
    // Trigger some activity to see real-time updates
    await page.goto('/dashboard/query');
    await page.fill('[data-testid="query-input"]', 'Real-time test query');
    await page.click('[data-testid="submit-query"]');
    
    // Return to real-time dashboard
    await page.goto('/dashboard/ai-models/realtime');
    
    // Verify counters have updated
    const requestCount = await page.locator('[data-testid="total-requests-count"]').textContent();
    expect(parseInt(requestCount)).toBeGreaterThan(0);
  });

  test('should export model usage analytics @analytics', async ({ page }) => {
    // Navigate to analytics page
    await page.goto('/dashboard/analytics');
    
    // Select date range
    await page.click('[data-testid="date-range-picker"]');
    await page.click('[data-testid="last-7-days"]');
    
    // Select models for analysis
    await page.check('[data-testid="model-checkbox-gpt-4"]');
    await page.check('[data-testid="model-checkbox-claude-3-5"]');
    
    // Generate report
    await page.click('[data-testid="generate-report"]');
    
    // Wait for report generation
    await expect(page.locator('[data-testid="report-preview"]')).toBeVisible({ timeout: 15000 });
    
    // Export report
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-csv"]');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/analytics.*\.csv$/);
    
    // Also test PDF export
    const pdfDownloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-pdf"]');
    const pdfDownload = await pdfDownloadPromise;
    expect(pdfDownload.suggestedFilename()).toMatch(/analytics.*\.pdf$/);
  });

  test('should handle concurrent queries across multiple models @load', async ({ page }) => {
    // Navigate to batch query interface
    await page.goto('/dashboard/batch-query');
    
    // Configure batch query
    await page.fill('[data-testid="batch-queries-textarea"]', `
      What is machine learning?
      Explain quantum computing
      How does blockchain work?
      What is artificial neural networks?
      Describe cloud computing benefits
    `);
    
    // Select multiple models
    await page.check('[data-testid="model-checkbox-gpt-4"]');
    await page.check('[data-testid="model-checkbox-claude-3-5"]');
    await page.check('[data-testid="model-checkbox-gemini-pro"]');
    
    // Set concurrent execution
    await page.check('[data-testid="enable-concurrent-execution"]');
    await page.fill('[data-testid="max-concurrent"]', '3');
    
    // Submit batch
    await page.click('[data-testid="submit-batch-query"]');
    
    // Monitor progress
    await expect(page.locator('[data-testid="batch-progress"]')).toBeVisible();
    
    // Wait for completion
    await expect(page.locator('[data-testid="batch-complete"]')).toBeVisible({ timeout: 120000 });
    
    // Verify results
    const results = await page.locator('[data-testid="batch-results"] .result-item');
    expect(await results.count()).toBe(5);
    
    // Check that multiple models were used
    const usedModels = await page.locator('[data-testid="used-models-summary"]').textContent();
    expect(usedModels).toMatch(/GPT-4|Claude|Gemini/);
  });
});