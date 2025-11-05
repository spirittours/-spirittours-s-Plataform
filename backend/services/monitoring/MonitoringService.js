const EventEmitter = require('events');
const os = require('os');

/**
 * MonitoringService - Comprehensive system and application monitoring
 * 
 * Features:
 * - Real-time metrics collection (CPU, memory, response times)
 * - AI usage tracking and cost monitoring
 * - Performance dashboards
 * - Health check endpoints
 * - Resource utilization monitoring
 * - Alert threshold monitoring
 */
class MonitoringService extends EventEmitter {
  constructor() {
    super();
    
    this.metrics = {
      system: {
        cpu: [],
        memory: [],
        uptime: process.uptime(),
        startTime: Date.now()
      },
      http: {
        totalRequests: 0,
        requestsByEndpoint: new Map(),
        requestsByStatus: new Map(),
        responseTimes: [],
        activeRequests: 0
      },
      ai: {
        totalRequests: 0,
        requestsByProvider: new Map(),
        requestsByModel: new Map(),
        totalTokensUsed: 0,
        totalCost: 0,
        errors: 0,
        averageResponseTime: 0
      },
      database: {
        totalQueries: 0,
        queryTimes: [],
        connectionPool: {
          active: 0,
          idle: 0,
          total: 0
        }
      },
      cache: {
        hits: 0,
        misses: 0,
        totalRequests: 0,
        hitRate: 0
      },
      alerts: []
    };

    this.config = {
      metricsRetention: 3600000, // 1 hour
      sampleInterval: 10000, // 10 seconds
      maxSamplesPerMetric: 360, // 1 hour worth at 10s intervals
      alertThresholds: {
        cpuUsage: 80, // 80%
        memoryUsage: 85, // 85%
        responseTime: 5000, // 5 seconds
        errorRate: 5, // 5%
        costPerHour: 10 // $10/hour
      }
    };

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Start monitoring intervals
   */
  startMonitoring() {
    // System metrics collection
    this.systemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.sampleInterval);

    // Metrics cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60000); // Every minute

    // Alert evaluation
    this.alertInterval = setInterval(() => {
      this.evaluateAlerts();
    }, 30000); // Every 30 seconds

    console.log('MonitoringService started');
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    const timestamp = Date.now();

    // CPU usage
    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0) / cpus.length;

    this.metrics.system.cpu.push({
      timestamp,
      value: Math.round(cpuUsage * 100) / 100
    });

    // Memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;

    this.metrics.system.memory.push({
      timestamp,
      value: Math.round(memoryUsage * 100) / 100,
      used: usedMemory,
      total: totalMemory,
      free: freeMemory
    });

    // Update uptime
    this.metrics.system.uptime = process.uptime();

    // Trim old samples
    this.trimMetricSamples(this.metrics.system.cpu);
    this.trimMetricSamples(this.metrics.system.memory);

    // Emit metrics update
    this.emit('metrics:update', {
      type: 'system',
      cpu: cpuUsage,
      memory: memoryUsage
    });
  }

  /**
   * Track HTTP request
   */
  trackHTTPRequest(req, res, responseTime) {
    this.metrics.http.totalRequests++;
    this.metrics.http.activeRequests++;

    const endpoint = `${req.method} ${req.path}`;
    
    // Track by endpoint
    const endpointCount = this.metrics.http.requestsByEndpoint.get(endpoint) || 0;
    this.metrics.http.requestsByEndpoint.set(endpoint, endpointCount + 1);

    // Track by status
    res.on('finish', () => {
      this.metrics.http.activeRequests--;
      
      const status = res.statusCode;
      const statusCount = this.metrics.http.requestsByStatus.get(status) || 0;
      this.metrics.http.requestsByStatus.set(status, statusCount + 1);

      // Track response time
      this.metrics.http.responseTimes.push({
        timestamp: Date.now(),
        endpoint,
        duration: responseTime,
        status
      });

      this.trimMetricSamples(this.metrics.http.responseTimes);

      this.emit('http:request', {
        endpoint,
        status,
        responseTime
      });
    });
  }

  /**
   * Track AI request
   */
  trackAIRequest(provider, model, tokensUsed, cost, responseTime, error = null) {
    this.metrics.ai.totalRequests++;

    // Track by provider
    const providerStats = this.metrics.ai.requestsByProvider.get(provider) || {
      requests: 0,
      tokens: 0,
      cost: 0,
      errors: 0
    };
    providerStats.requests++;
    providerStats.tokens += tokensUsed;
    providerStats.cost += cost;
    if (error) providerStats.errors++;
    this.metrics.ai.requestsByProvider.set(provider, providerStats);

    // Track by model
    const modelStats = this.metrics.ai.requestsByModel.get(model) || {
      requests: 0,
      tokens: 0,
      cost: 0,
      errors: 0
    };
    modelStats.requests++;
    modelStats.tokens += tokensUsed;
    modelStats.cost += cost;
    if (error) modelStats.errors++;
    this.metrics.ai.requestsByModel.set(model, modelStats);

    // Update totals
    this.metrics.ai.totalTokensUsed += tokensUsed;
    this.metrics.ai.totalCost += cost;
    if (error) this.metrics.ai.errors++;

    // Update average response time
    const totalRequests = this.metrics.ai.totalRequests;
    this.metrics.ai.averageResponseTime = 
      (this.metrics.ai.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;

    this.emit('ai:request', {
      provider,
      model,
      tokensUsed,
      cost,
      responseTime,
      error
    });
  }

  /**
   * Track database query
   */
  trackDatabaseQuery(queryTime) {
    this.metrics.database.totalQueries++;
    this.metrics.database.queryTimes.push({
      timestamp: Date.now(),
      duration: queryTime
    });

    this.trimMetricSamples(this.metrics.database.queryTimes);

    this.emit('database:query', { queryTime });
  }

  /**
   * Update database connection pool stats
   */
  updateDatabasePoolStats(active, idle, total) {
    this.metrics.database.connectionPool = {
      active,
      idle,
      total
    };
  }

  /**
   * Track cache operation
   */
  trackCacheOperation(hit) {
    this.metrics.cache.totalRequests++;
    
    if (hit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }

    this.metrics.cache.hitRate = 
      (this.metrics.cache.hits / this.metrics.cache.totalRequests) * 100;

    this.emit('cache:operation', { hit, hitRate: this.metrics.cache.hitRate });
  }

  /**
   * Get current metrics snapshot
   */
  getMetrics() {
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    return {
      timestamp: now,
      system: {
        cpu: {
          current: this.getCurrentMetricValue(this.metrics.system.cpu),
          average: this.getAverageMetricValue(this.metrics.system.cpu, oneHourAgo),
          max: this.getMaxMetricValue(this.metrics.system.cpu, oneHourAgo),
          samples: this.metrics.system.cpu.slice(-60) // Last 10 minutes
        },
        memory: {
          current: this.getCurrentMetricValue(this.metrics.system.memory),
          average: this.getAverageMetricValue(this.metrics.system.memory, oneHourAgo),
          max: this.getMaxMetricValue(this.metrics.system.memory, oneHourAgo),
          samples: this.metrics.system.memory.slice(-60)
        },
        uptime: this.metrics.system.uptime,
        startTime: this.metrics.system.startTime
      },
      http: {
        totalRequests: this.metrics.http.totalRequests,
        activeRequests: this.metrics.http.activeRequests,
        topEndpoints: this.getTopEndpoints(10),
        statusDistribution: this.getStatusDistribution(),
        averageResponseTime: this.getAverageResponseTime(),
        recentRequests: this.metrics.http.responseTimes.slice(-20)
      },
      ai: {
        totalRequests: this.metrics.ai.totalRequests,
        totalTokensUsed: this.metrics.ai.totalTokensUsed,
        totalCost: Math.round(this.metrics.ai.totalCost * 100) / 100,
        errors: this.metrics.ai.errors,
        errorRate: (this.metrics.ai.errors / this.metrics.ai.totalRequests) * 100,
        averageResponseTime: Math.round(this.metrics.ai.averageResponseTime),
        byProvider: this.getProviderStats(),
        byModel: this.getModelStats(),
        costPerHour: this.getCostPerHour()
      },
      database: {
        totalQueries: this.metrics.database.totalQueries,
        averageQueryTime: this.getAverageQueryTime(),
        connectionPool: this.metrics.database.connectionPool
      },
      cache: {
        hits: this.metrics.cache.hits,
        misses: this.metrics.cache.misses,
        totalRequests: this.metrics.cache.totalRequests,
        hitRate: Math.round(this.metrics.cache.hitRate * 100) / 100
      }
    };
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const metrics = this.getMetrics();
    const alerts = this.getActiveAlerts();

    const health = {
      status: 'healthy',
      timestamp: Date.now(),
      uptime: metrics.system.uptime,
      checks: {
        system: {
          status: 'healthy',
          cpu: metrics.system.cpu.current < this.config.alertThresholds.cpuUsage,
          memory: metrics.system.memory.current < this.config.alertThresholds.memoryUsage
        },
        http: {
          status: 'healthy',
          activeRequests: metrics.http.activeRequests,
          averageResponseTime: metrics.http.averageResponseTime
        },
        ai: {
          status: 'healthy',
          errorRate: metrics.ai.errorRate,
          costPerHour: metrics.ai.costPerHour
        },
        database: {
          status: 'healthy',
          averageQueryTime: metrics.database.averageQueryTime
        },
        cache: {
          status: 'healthy',
          hitRate: metrics.cache.hitRate
        }
      },
      alerts: alerts.length
    };

    // Determine overall health
    if (alerts.some(a => a.severity === 'critical')) {
      health.status = 'unhealthy';
    } else if (alerts.some(a => a.severity === 'warning')) {
      health.status = 'degraded';
    }

    // Update check statuses
    Object.keys(health.checks).forEach(check => {
      const checkAlerts = alerts.filter(a => a.category === check);
      if (checkAlerts.some(a => a.severity === 'critical')) {
        health.checks[check].status = 'unhealthy';
      } else if (checkAlerts.some(a => a.severity === 'warning')) {
        health.checks[check].status = 'degraded';
      }
    });

    return health;
  }

  /**
   * Evaluate alert thresholds
   */
  evaluateAlerts() {
    const metrics = this.getMetrics();
    const newAlerts = [];

    // CPU usage alert
    if (metrics.system.cpu.current > this.config.alertThresholds.cpuUsage) {
      newAlerts.push({
        id: `cpu-${Date.now()}`,
        type: 'cpu_high',
        category: 'system',
        severity: metrics.system.cpu.current > 95 ? 'critical' : 'warning',
        message: `High CPU usage: ${metrics.system.cpu.current.toFixed(2)}%`,
        value: metrics.system.cpu.current,
        threshold: this.config.alertThresholds.cpuUsage,
        timestamp: Date.now()
      });
    }

    // Memory usage alert
    if (metrics.system.memory.current > this.config.alertThresholds.memoryUsage) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        type: 'memory_high',
        category: 'system',
        severity: metrics.system.memory.current > 95 ? 'critical' : 'warning',
        message: `High memory usage: ${metrics.system.memory.current.toFixed(2)}%`,
        value: metrics.system.memory.current,
        threshold: this.config.alertThresholds.memoryUsage,
        timestamp: Date.now()
      });
    }

    // Response time alert
    if (metrics.http.averageResponseTime > this.config.alertThresholds.responseTime) {
      newAlerts.push({
        id: `response-time-${Date.now()}`,
        type: 'response_time_high',
        category: 'http',
        severity: 'warning',
        message: `Slow average response time: ${metrics.http.averageResponseTime}ms`,
        value: metrics.http.averageResponseTime,
        threshold: this.config.alertThresholds.responseTime,
        timestamp: Date.now()
      });
    }

    // AI error rate alert
    if (metrics.ai.errorRate > this.config.alertThresholds.errorRate) {
      newAlerts.push({
        id: `ai-error-rate-${Date.now()}`,
        type: 'ai_error_rate_high',
        category: 'ai',
        severity: metrics.ai.errorRate > 10 ? 'critical' : 'warning',
        message: `High AI error rate: ${metrics.ai.errorRate.toFixed(2)}%`,
        value: metrics.ai.errorRate,
        threshold: this.config.alertThresholds.errorRate,
        timestamp: Date.now()
      });
    }

    // Cost per hour alert
    if (metrics.ai.costPerHour > this.config.alertThresholds.costPerHour) {
      newAlerts.push({
        id: `ai-cost-${Date.now()}`,
        type: 'ai_cost_high',
        category: 'ai',
        severity: 'warning',
        message: `High AI cost: $${metrics.ai.costPerHour.toFixed(2)}/hour`,
        value: metrics.ai.costPerHour,
        threshold: this.config.alertThresholds.costPerHour,
        timestamp: Date.now()
      });
    }

    // Add new alerts
    newAlerts.forEach(alert => {
      this.metrics.alerts.push(alert);
      this.emit('alert:triggered', alert);
    });

    // Cleanup old alerts (older than 1 hour)
    const oneHourAgo = Date.now() - 3600000;
    this.metrics.alerts = this.metrics.alerts.filter(a => a.timestamp > oneHourAgo);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    const thirtyMinutesAgo = Date.now() - 1800000;
    return this.metrics.alerts.filter(a => a.timestamp > thirtyMinutesAgo);
  }

  /**
   * Clear alerts
   */
  clearAlerts() {
    const clearedCount = this.metrics.alerts.length;
    this.metrics.alerts = [];
    return clearedCount;
  }

  // ===== HELPER METHODS =====

  getCurrentMetricValue(samples) {
    if (samples.length === 0) return 0;
    return samples[samples.length - 1].value;
  }

  getAverageMetricValue(samples, since) {
    const filtered = samples.filter(s => s.timestamp >= since);
    if (filtered.length === 0) return 0;
    
    const sum = filtered.reduce((acc, s) => acc + s.value, 0);
    return Math.round((sum / filtered.length) * 100) / 100;
  }

  getMaxMetricValue(samples, since) {
    const filtered = samples.filter(s => s.timestamp >= since);
    if (filtered.length === 0) return 0;
    
    return Math.max(...filtered.map(s => s.value));
  }

  getTopEndpoints(limit) {
    return Array.from(this.metrics.http.requestsByEndpoint.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([endpoint, count]) => ({ endpoint, count }));
  }

  getStatusDistribution() {
    const distribution = {};
    for (const [status, count] of this.metrics.http.requestsByStatus.entries()) {
      distribution[status] = count;
    }
    return distribution;
  }

  getAverageResponseTime() {
    if (this.metrics.http.responseTimes.length === 0) return 0;
    
    const sum = this.metrics.http.responseTimes.reduce((acc, rt) => acc + rt.duration, 0);
    return Math.round(sum / this.metrics.http.responseTimes.length);
  }

  getProviderStats() {
    const stats = [];
    for (const [provider, data] of this.metrics.ai.requestsByProvider.entries()) {
      stats.push({
        provider,
        requests: data.requests,
        tokens: data.tokens,
        cost: Math.round(data.cost * 100) / 100,
        errors: data.errors,
        errorRate: (data.errors / data.requests) * 100
      });
    }
    return stats.sort((a, b) => b.requests - a.requests);
  }

  getModelStats() {
    const stats = [];
    for (const [model, data] of this.metrics.ai.requestsByModel.entries()) {
      stats.push({
        model,
        requests: data.requests,
        tokens: data.tokens,
        cost: Math.round(data.cost * 100) / 100,
        errors: data.errors
      });
    }
    return stats.sort((a, b) => b.requests - a.requests);
  }

  getCostPerHour() {
    const oneHourAgo = Date.now() - 3600000;
    const recentCost = this.metrics.ai.totalCost; // Simplified - should track time-based costs
    return Math.round(recentCost * 100) / 100;
  }

  getAverageQueryTime() {
    if (this.metrics.database.queryTimes.length === 0) return 0;
    
    const sum = this.metrics.database.queryTimes.reduce((acc, qt) => acc + qt.duration, 0);
    return Math.round(sum / this.metrics.database.queryTimes.length);
  }

  trimMetricSamples(samples) {
    if (samples.length > this.config.maxSamplesPerMetric) {
      samples.splice(0, samples.length - this.config.maxSamplesPerMetric);
    }
  }

  cleanupOldMetrics() {
    const cutoff = Date.now() - this.config.metricsRetention;
    
    this.metrics.system.cpu = this.metrics.system.cpu.filter(m => m.timestamp > cutoff);
    this.metrics.system.memory = this.metrics.system.memory.filter(m => m.timestamp > cutoff);
    this.metrics.http.responseTimes = this.metrics.http.responseTimes.filter(m => m.timestamp > cutoff);
    this.metrics.database.queryTimes = this.metrics.database.queryTimes.filter(m => m.timestamp > cutoff);
  }

  /**
   * Reset all metrics
   */
  resetMetrics() {
    this.metrics = {
      system: {
        cpu: [],
        memory: [],
        uptime: process.uptime(),
        startTime: Date.now()
      },
      http: {
        totalRequests: 0,
        requestsByEndpoint: new Map(),
        requestsByStatus: new Map(),
        responseTimes: [],
        activeRequests: 0
      },
      ai: {
        totalRequests: 0,
        requestsByProvider: new Map(),
        requestsByModel: new Map(),
        totalTokensUsed: 0,
        totalCost: 0,
        errors: 0,
        averageResponseTime: 0
      },
      database: {
        totalQueries: 0,
        queryTimes: [],
        connectionPool: {
          active: 0,
          idle: 0,
          total: 0
        }
      },
      cache: {
        hits: 0,
        misses: 0,
        totalRequests: 0,
        hitRate: 0
      },
      alerts: []
    };
  }

  /**
   * Shutdown monitoring
   */
  shutdown() {
    console.log('Shutting down MonitoringService...');
    
    if (this.systemMetricsInterval) {
      clearInterval(this.systemMetricsInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.alertInterval) {
      clearInterval(this.alertInterval);
    }

    console.log('MonitoringService shutdown complete');
  }
}

module.exports = new MonitoringService();
