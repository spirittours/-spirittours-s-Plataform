/**
 * Analytics Service
 * Comprehensive usage tracking, cost analysis, and performance metrics
 */

const { EventEmitter } = require('events');

class AnalyticsService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      aggregationInterval: config.aggregationInterval || 3600000, // 1 hour
      retentionDays: config.retentionDays || 90,
      enableRealtime: config.enableRealtime !== false,
      ...config
    };

    // In-memory metrics (for real-time)
    this.metrics = {
      requests: new Map(), // By hour
      tokens: new Map(),
      costs: new Map(),
      latency: new Map(),
      errors: new Map(),
      byModel: new Map(),
      byUser: new Map(),
      byWorkspace: new Map()
    };

    // Cost tracking (tokens per $1000)
    this.costPerModel = {
      'gpt-4o': { input: 2.5, output: 10.0 },
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
      'gpt-4-turbo': { input: 10.0, output: 30.0 },
      'claude-3-opus': { input: 15.0, output: 75.0 },
      'claude-3-sonnet': { input: 3.0, output: 15.0 },
      'claude-3-haiku': { input: 0.25, output: 1.25 },
      'gemini-pro': { input: 0.5, output: 1.5 },
      'whisper-1': { input: 0.006 }, // per minute
      'tts-1': { input: 15.0 }, // per 1M chars
      'tts-1-hd': { input: 30.0 },
      'dall-e-3': { fixed: 0.04 }, // per image
      'local': { input: 0, output: 0 } // Free
    };

    this.aggregationTimer = null;
  }

  /**
   * Track API request
   */
  trackRequest(data) {
    const {
      endpoint,
      method,
      model,
      userId,
      workspaceId,
      tokens = {},
      latency,
      success = true,
      error = null
    } = data;

    const timestamp = Date.now();
    const hour = this.getHourKey(timestamp);

    // Track requests
    this.incrementMetric(this.metrics.requests, hour);

    // Track tokens
    if (tokens.total) {
      this.addMetric(this.metrics.tokens, hour, tokens.total);
    }

    // Calculate and track cost
    if (model && tokens.total) {
      const cost = this.calculateCost(model, tokens);
      this.addMetric(this.metrics.costs, hour, cost);
    }

    // Track latency
    if (latency) {
      this.addMetric(this.metrics.latency, hour, latency);
    }

    // Track errors
    if (!success && error) {
      this.incrementMetric(this.metrics.errors, hour);
    }

    // Track by model
    if (model) {
      this.incrementMetric(this.metrics.byModel, model);
    }

    // Track by user
    if (userId) {
      this.incrementMetric(this.metrics.byUser, userId);
    }

    // Track by workspace
    if (workspaceId) {
      this.incrementMetric(this.metrics.byWorkspace, workspaceId);
    }

    this.emit('request:tracked', data);
  }

  /**
   * Calculate cost for request
   */
  calculateCost(model, tokens) {
    const pricing = this.costPerModel[model] || this.costPerModel['local'];
    
    if (pricing.fixed) {
      return pricing.fixed;
    }

    const inputCost = (tokens.prompt || 0) * (pricing.input || 0) / 1000;
    const outputCost = (tokens.completion || 0) * (pricing.output || 0) / 1000;
    
    return inputCost + outputCost;
  }

  /**
   * Get real-time metrics
   */
  getRealTimeMetrics(timeRange = 'hour') {
    const now = Date.now();
    let startTime;

    switch (timeRange) {
      case 'hour':
        startTime = now - 3600000;
        break;
      case 'day':
        startTime = now - 86400000;
        break;
      case 'week':
        startTime = now - 604800000;
        break;
      default:
        startTime = now - 3600000;
    }

    return {
      requests: this.aggregateMetrics(this.metrics.requests, startTime),
      tokens: this.aggregateMetrics(this.metrics.tokens, startTime),
      costs: this.aggregateMetrics(this.metrics.costs, startTime),
      latency: this.aggregateMetrics(this.metrics.latency, startTime),
      errors: this.aggregateMetrics(this.metrics.errors, startTime),
      byModel: Array.from(this.metrics.byModel.entries()).map(([model, count]) => ({
        model,
        count
      })),
      byUser: Array.from(this.metrics.byUser.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId, count]) => ({ userId, count })),
      byWorkspace: Array.from(this.metrics.byWorkspace.entries())
        .map(([workspaceId, count]) => ({ workspaceId, count }))
    };
  }

  /**
   * Get cost breakdown
   */
  getCostBreakdown(startDate, endDate) {
    const breakdown = {
      total: 0,
      byModel: {},
      byService: {
        chat: 0,
        voice: 0,
        vision: 0,
        embedding: 0,
        other: 0
      },
      byDate: []
    };

    // Aggregate costs from metrics
    const now = Date.now();
    const start = startDate ? new Date(startDate).getTime() : now - 2592000000; // 30 days
    const end = endDate ? new Date(endDate).getTime() : now;

    for (const [hour, cost] of this.metrics.costs.entries()) {
      const timestamp = this.parseHourKey(hour);
      if (timestamp >= start && timestamp <= end) {
        breakdown.total += cost;
      }
    }

    // By model
    for (const [model, count] of this.metrics.byModel.entries()) {
      const avgTokens = 500; // Estimate
      const cost = this.calculateCost(model, { prompt: avgTokens / 2, completion: avgTokens / 2 });
      breakdown.byModel[model] = cost * count;
    }

    return breakdown;
  }

  /**
   * Get usage statistics
   */
  getUsageStatistics(period = 'day') {
    const now = Date.now();
    let startTime;

    switch (period) {
      case 'hour':
        startTime = now - 3600000;
        break;
      case 'day':
        startTime = now - 86400000;
        break;
      case 'week':
        startTime = now - 604800000;
        break;
      case 'month':
        startTime = now - 2592000000;
        break;
      default:
        startTime = now - 86400000;
    }

    const totalRequests = this.aggregateMetrics(this.metrics.requests, startTime);
    const totalTokens = this.aggregateMetrics(this.metrics.tokens, startTime);
    const totalCost = this.aggregateMetrics(this.metrics.costs, startTime);
    const avgLatency = this.calculateAverage(this.metrics.latency, startTime);
    const errorCount = this.aggregateMetrics(this.metrics.errors, startTime);

    return {
      period,
      totalRequests,
      totalTokens,
      totalCost: totalCost.toFixed(4),
      avgLatency: avgLatency.toFixed(2),
      errorCount,
      errorRate: totalRequests > 0 ? ((errorCount / totalRequests) * 100).toFixed(2) : 0,
      avgTokensPerRequest: totalRequests > 0 ? (totalTokens / totalRequests).toFixed(0) : 0,
      avgCostPerRequest: totalRequests > 0 ? (totalCost / totalRequests).toFixed(6) : 0
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const hour = Date.now() - 3600000;
    const day = Date.now() - 86400000;

    return {
      lastHour: {
        requests: this.aggregateMetrics(this.metrics.requests, hour),
        avgLatency: this.calculateAverage(this.metrics.latency, hour),
        errorRate: this.calculateErrorRate(hour)
      },
      last24Hours: {
        requests: this.aggregateMetrics(this.metrics.requests, day),
        avgLatency: this.calculateAverage(this.metrics.latency, day),
        errorRate: this.calculateErrorRate(day)
      },
      topModels: this.getTopModels(5),
      slowestEndpoints: this.getSlowestEndpoints(5)
    };
  }

  /**
   * Helper: Get hour key
   */
  getHourKey(timestamp) {
    return new Date(timestamp).toISOString().slice(0, 13);
  }

  /**
   * Helper: Parse hour key
   */
  parseHourKey(hourKey) {
    return new Date(hourKey + ':00:00.000Z').getTime();
  }

  /**
   * Helper: Increment metric
   */
  incrementMetric(map, key) {
    map.set(key, (map.get(key) || 0) + 1);
  }

  /**
   * Helper: Add to metric
   */
  addMetric(map, key, value) {
    map.set(key, (map.get(key) || 0) + value);
  }

  /**
   * Helper: Aggregate metrics
   */
  aggregateMetrics(map, startTime) {
    let total = 0;
    for (const [key, value] of map.entries()) {
      const timestamp = this.parseHourKey(key);
      if (timestamp >= startTime) {
        total += value;
      }
    }
    return total;
  }

  /**
   * Helper: Calculate average
   */
  calculateAverage(map, startTime) {
    let total = 0;
    let count = 0;
    for (const [key, value] of map.entries()) {
      const timestamp = this.parseHourKey(key);
      if (timestamp >= startTime) {
        total += value;
        count++;
      }
    }
    return count > 0 ? total / count : 0;
  }

  /**
   * Helper: Calculate error rate
   */
  calculateErrorRate(startTime) {
    const errors = this.aggregateMetrics(this.metrics.errors, startTime);
    const requests = this.aggregateMetrics(this.metrics.requests, startTime);
    return requests > 0 ? ((errors / requests) * 100).toFixed(2) : 0;
  }

  /**
   * Helper: Get top models
   */
  getTopModels(limit = 5) {
    return Array.from(this.metrics.byModel.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([model, count]) => ({ model, requests: count }));
  }

  /**
   * Helper: Get slowest endpoints (placeholder)
   */
  getSlowestEndpoints(limit = 5) {
    // Would need endpoint-level tracking
    return [];
  }

  /**
   * Clean old metrics
   */
  cleanOldMetrics() {
    const cutoff = Date.now() - (this.config.retentionDays * 86400000);
    
    for (const map of Object.values(this.metrics)) {
      if (!(map instanceof Map)) continue;
      
      for (const key of map.keys()) {
        if (typeof key === 'string' && key.length === 13) {
          const timestamp = this.parseHourKey(key);
          if (timestamp < cutoff) {
            map.delete(key);
          }
        }
      }
    }
  }

  /**
   * Start periodic aggregation
   */
  startAggregation() {
    if (this.aggregationTimer) return;

    this.aggregationTimer = setInterval(() => {
      this.cleanOldMetrics();
      this.emit('aggregation:completed');
    }, this.config.aggregationInterval);
  }

  /**
   * Stop aggregation
   */
  stopAggregation() {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }
  }

  /**
   * Export metrics
   */
  exportMetrics() {
    return {
      requests: Array.from(this.metrics.requests.entries()),
      tokens: Array.from(this.metrics.tokens.entries()),
      costs: Array.from(this.metrics.costs.entries()),
      latency: Array.from(this.metrics.latency.entries()),
      errors: Array.from(this.metrics.errors.entries()),
      byModel: Array.from(this.metrics.byModel.entries()),
      byUser: Array.from(this.metrics.byUser.entries()),
      byWorkspace: Array.from(this.metrics.byWorkspace.entries())
    };
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    for (const map of Object.values(this.metrics)) {
      if (map instanceof Map) {
        map.clear();
      }
    }
  }
}

// Singleton
let analyticsServiceInstance = null;

function getAnalyticsService(config = {}) {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new AnalyticsService(config);
    analyticsServiceInstance.startAggregation();
  }
  return analyticsServiceInstance;
}

module.exports = {
  AnalyticsService,
  getAnalyticsService
};
