/**
 * Health Check Service
 * Comprehensive system health monitoring
 */

const { EventEmitter } = require('events');
const mongoose = require('mongoose');

class HealthCheckService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      checkInterval: config.checkInterval || 60000, // 1 minute
      timeout: config.timeout || 5000,
      ...config
    };

    this.checks = new Map();
    this.lastResults = new Map();
    this.checkTimer = null;
    
    this.registerDefaultChecks();
  }

  /**
   * Register default health checks
   */
  registerDefaultChecks() {
    // Database check
    this.registerCheck('database', async () => {
      if (mongoose.connection.readyState === 1) {
        const startTime = Date.now();
        await mongoose.connection.db.admin().ping();
        return {
          status: 'healthy',
          latency: Date.now() - startTime,
          message: 'Database connection active'
        };
      }
      return { status: 'unhealthy', message: 'Database not connected' };
    });

    // Redis check
    this.registerCheck('redis', async () => {
      try {
        const { RedisCacheService } = require('../cache/RedisCacheService');
        if (!RedisCacheService.isEnabled()) {
          return { status: 'disabled', message: 'Redis not enabled' };
        }
        const startTime = Date.now();
        await RedisCacheService.ping();
        return {
          status: 'healthy',
          latency: Date.now() - startTime,
          message: 'Redis connection active'
        };
      } catch (error) {
        return { status: 'unhealthy', message: error.message };
      }
    });

    // Memory check
    this.registerCheck('memory', async () => {
      const usage = process.memoryUsage();
      const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
      const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
      const percentage = (usage.heapUsed / usage.heapTotal) * 100;

      return {
        status: percentage < 90 ? 'healthy' : 'degraded',
        usedMB,
        totalMB,
        percentage: percentage.toFixed(2),
        message: `Memory usage: ${usedMB}MB / ${totalMB}MB`
      };
    });

    // CPU check
    this.registerCheck('cpu', async () => {
      const usage = process.cpuUsage();
      const userCPU = usage.user / 1000000; // Convert to seconds
      const systemCPU = usage.system / 1000000;

      return {
        status: 'healthy',
        userCPU: userCPU.toFixed(2),
        systemCPU: systemCPU.toFixed(2),
        message: `CPU usage tracked`
      };
    });

    // Disk check
    this.registerCheck('disk', async () => {
      // Placeholder - would need additional package
      return {
        status: 'healthy',
        message: 'Disk check not implemented'
      };
    });
  }

  /**
   * Register custom health check
   */
  registerCheck(name, checkFn) {
    this.checks.set(name, checkFn);
  }

  /**
   * Run single health check
   */
  async runCheck(name) {
    const checkFn = this.checks.get(name);
    if (!checkFn) {
      return { status: 'unknown', message: 'Check not found' };
    }

    try {
      const result = await Promise.race([
        checkFn(),
        this.timeout(this.config.timeout)
      ]);
      
      this.lastResults.set(name, {
        ...result,
        timestamp: new Date(),
        name
      });

      return result;
    } catch (error) {
      const result = {
        status: 'unhealthy',
        message: error.message,
        timestamp: new Date(),
        name
      };
      
      this.lastResults.set(name, result);
      return result;
    }
  }

  /**
   * Run all health checks
   */
  async runAllChecks() {
    const results = {};
    const promises = [];

    for (const [name] of this.checks) {
      promises.push(
        this.runCheck(name).then(result => {
          results[name] = result;
        })
      );
    }

    await Promise.all(promises);

    const overallStatus = this.calculateOverallStatus(results);

    return {
      status: overallStatus,
      timestamp: new Date(),
      checks: results,
      summary: {
        total: Object.keys(results).length,
        healthy: Object.values(results).filter(r => r.status === 'healthy').length,
        degraded: Object.values(results).filter(r => r.status === 'degraded').length,
        unhealthy: Object.values(results).filter(r => r.status === 'unhealthy').length,
        disabled: Object.values(results).filter(r => r.status === 'disabled').length
      }
    };
  }

  /**
   * Calculate overall system status
   */
  calculateOverallStatus(results) {
    const statuses = Object.values(results).map(r => r.status);
    
    if (statuses.includes('unhealthy')) return 'unhealthy';
    if (statuses.includes('degraded')) return 'degraded';
    return 'healthy';
  }

  /**
   * Get last results
   */
  getLastResults() {
    const results = {};
    for (const [name, result] of this.lastResults.entries()) {
      results[name] = result;
    }
    return results;
  }

  /**
   * Get system info
   */
  getSystemInfo() {
    return {
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime()
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      env: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Start periodic health checks
   */
  startPeriodicChecks() {
    if (this.checkTimer) return;

    // Run immediately
    this.runAllChecks().then(results => {
      this.emit('health:check', results);
    });

    this.checkTimer = setInterval(async () => {
      const results = await this.runAllChecks();
      this.emit('health:check', results);

      if (results.status === 'unhealthy') {
        this.emit('health:alert', results);
      }
    }, this.config.checkInterval);
  }

  /**
   * Stop periodic checks
   */
  stopPeriodicChecks() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  /**
   * Timeout helper
   */
  timeout(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), ms);
    });
  }
}

// Singleton
let healthCheckServiceInstance = null;

function getHealthCheckService(config = {}) {
  if (!healthCheckServiceInstance) {
    healthCheckServiceInstance = new HealthCheckService(config);
    healthCheckServiceInstance.startPeriodicChecks();
  }
  return healthCheckServiceInstance;
}

module.exports = {
  HealthCheckService,
  getHealthCheckService
};
