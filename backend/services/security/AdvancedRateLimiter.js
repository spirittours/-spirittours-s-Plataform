const RedisCacheService = require('../cache/RedisCacheService');

/**
 * AdvancedRateLimiter - Sophisticated rate limiting with IP tracking and throttling
 * 
 * Features:
 * - IP-based rate limiting
 * - User-based rate limiting
 * - Endpoint-specific limits
 * - Sliding window algorithm
 * - Dynamic throttling
 * - Whitelist/Blacklist support
 * - DDoS protection
 * - Rate limit headers
 */
class AdvancedRateLimiter {
  constructor() {
    this.config = {
      defaultWindow: 60 * 1000, // 1 minute
      defaultMaxRequests: 100,
      enableIpTracking: true,
      enableDynamicThrottling: true,
      suspiciousActivityThreshold: 500, // requests per minute
      blacklistDuration: 3600 * 1000, // 1 hour
      whitelistedIPs: new Set(process.env.WHITELISTED_IPS?.split(',') || []),
      whitelistedUsers: new Set()
    };

    // In-memory storage for quick lookups
    this.requestCounts = new Map();
    this.blacklistedIPs = new Map();
    this.suspiciousIPs = new Map();
    this.userLimits = new Map();

    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      throttledRequests: 0,
      blacklistedIPs: 0,
      suspiciousActivities: 0
    };

    // Endpoint-specific limits
    this.endpointLimits = new Map([
      ['/api/ai/providers/complete', { window: 60000, max: 20 }],
      ['/api/streaming/completion', { window: 60000, max: 10 }],
      ['/api/marketplace/models', { window: 60000, max: 50 }],
      ['/api/auth/login', { window: 900000, max: 5 }], // 5 per 15 min
      ['/api/auth/register', { window: 3600000, max: 3 }], // 3 per hour
    ]);

    // Cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Check rate limit for request
   */
  async checkLimit(req) {
    this.stats.totalRequests++;

    const ip = this.getClientIP(req);
    const userId = req.user?._id?.toString();
    const endpoint = this.normalizeEndpoint(req.path);

    // Check whitelist
    if (this.isWhitelisted(ip, userId)) {
      return { allowed: true, remaining: Infinity };
    }

    // Check blacklist
    if (this.isBlacklisted(ip)) {
      this.stats.blockedRequests++;
      return {
        allowed: false,
        reason: 'IP blacklisted',
        retryAfter: this.getBlacklistExpiry(ip)
      };
    }

    // Get limits for endpoint
    const limits = this.getLimits(endpoint);
    const key = this.generateKey(ip, userId, endpoint);

    // Check rate limit
    const count = await this.incrementCounter(key, limits.window);

    // Check if limit exceeded
    if (count > limits.max) {
      this.stats.blockedRequests++;

      // Track suspicious activity
      if (count > this.config.suspiciousActivityThreshold) {
        this.markSuspicious(ip);
      }

      return {
        allowed: false,
        reason: 'Rate limit exceeded',
        limit: limits.max,
        window: limits.window,
        current: count,
        retryAfter: Math.ceil(limits.window / 1000)
      };
    }

    // Apply dynamic throttling if needed
    const throttled = this.applyThrottling(ip, count, limits.max);
    if (throttled) {
      this.stats.throttledRequests++;
    }

    return {
      allowed: true,
      remaining: limits.max - count,
      limit: limits.max,
      window: limits.window,
      current: count,
      throttled
    };
  }

  /**
   * Middleware for rate limiting
   */
  middleware(options = {}) {
    return async (req, res, next) => {
      try {
        const result = await this.checkLimit(req);

        // Set rate limit headers
        this.setRateLimitHeaders(res, result);

        if (!result.allowed) {
          return res.status(429).json({
            success: false,
            error: 'Too many requests',
            message: result.reason,
            retryAfter: result.retryAfter,
            limit: result.limit
          });
        }

        // Add throttling delay if needed
        if (result.throttled) {
          await this.sleep(result.throttled);
        }

        next();
      } catch (error) {
        console.error('Rate limiter error:', error);
        next(); // Allow request to proceed on error
      }
    };
  }

  /**
   * Increment request counter
   */
  async incrementCounter(key, window) {
    try {
      // Try Redis first
      const redisKey = `ratelimit:${key}`;
      let count = await RedisCacheService.get(redisKey);

      if (count === null) {
        count = 0;
      }

      count++;

      await RedisCacheService.set(redisKey, count, {
        ttl: Math.ceil(window / 1000)
      });

      return count;
    } catch (error) {
      // Fallback to in-memory
      const now = Date.now();
      let record = this.requestCounts.get(key);

      if (!record || now - record.timestamp > window) {
        record = { count: 0, timestamp: now };
      }

      record.count++;
      this.requestCounts.set(key, record);

      return record.count;
    }
  }

  /**
   * Get limits for endpoint
   */
  getLimits(endpoint) {
    // Check endpoint-specific limits
    if (this.endpointLimits.has(endpoint)) {
      return this.endpointLimits.get(endpoint);
    }

    // Check pattern-based limits
    for (const [pattern, limits] of this.endpointLimits.entries()) {
      if (endpoint.startsWith(pattern)) {
        return limits;
      }
    }

    // Return default limits
    return {
      window: this.config.defaultWindow,
      max: this.config.defaultMaxRequests
    };
  }

  /**
   * Set endpoint-specific limit
   */
  setEndpointLimit(endpoint, window, max) {
    this.endpointLimits.set(endpoint, { window, max });
  }

  /**
   * Apply dynamic throttling
   */
  applyThrottling(ip, currentCount, maxCount) {
    if (!this.config.enableDynamicThrottling) {
      return 0;
    }

    // Calculate usage percentage
    const usagePercent = (currentCount / maxCount) * 100;

    // Apply progressive throttling
    if (usagePercent >= 90) {
      return 1000; // 1 second delay
    } else if (usagePercent >= 80) {
      return 500; // 500ms delay
    } else if (usagePercent >= 70) {
      return 200; // 200ms delay
    }

    return 0; // No throttling
  }

  /**
   * Blacklist IP address
   */
  blacklistIP(ip, duration = this.config.blacklistDuration) {
    const expiresAt = Date.now() + duration;
    this.blacklistedIPs.set(ip, expiresAt);
    this.stats.blacklistedIPs++;

    console.warn(`IP blacklisted: ${ip} until ${new Date(expiresAt).toISOString()}`);
  }

  /**
   * Remove IP from blacklist
   */
  unblacklistIP(ip) {
    this.blacklistedIPs.delete(ip);
  }

  /**
   * Check if IP is blacklisted
   */
  isBlacklisted(ip) {
    if (!this.blacklistedIPs.has(ip)) {
      return false;
    }

    const expiresAt = this.blacklistedIPs.get(ip);
    if (Date.now() > expiresAt) {
      this.blacklistedIPs.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Get blacklist expiry time
   */
  getBlacklistExpiry(ip) {
    const expiresAt = this.blacklistedIPs.get(ip);
    if (!expiresAt) return 0;

    const remaining = expiresAt - Date.now();
    return Math.ceil(remaining / 1000); // seconds
  }

  /**
   * Mark IP as suspicious
   */
  markSuspicious(ip) {
    const count = this.suspiciousIPs.get(ip) || 0;
    this.suspiciousIPs.set(ip, count + 1);
    this.stats.suspiciousActivities++;

    // Auto-blacklist after 3 suspicious activities
    if (count + 1 >= 3) {
      this.blacklistIP(ip);
      console.warn(`IP auto-blacklisted due to suspicious activity: ${ip}`);
    }
  }

  /**
   * Whitelist IP address
   */
  whitelistIP(ip) {
    this.config.whitelistedIPs.add(ip);
  }

  /**
   * Whitelist user
   */
  whitelistUser(userId) {
    this.config.whitelistedUsers.add(userId);
  }

  /**
   * Remove IP from whitelist
   */
  unwhitelistIP(ip) {
    this.config.whitelistedIPs.delete(ip);
  }

  /**
   * Check if IP or user is whitelisted
   */
  isWhitelisted(ip, userId) {
    return this.config.whitelistedIPs.has(ip) ||
           (userId && this.config.whitelistedUsers.has(userId));
  }

  /**
   * Set rate limit headers
   */
  setRateLimitHeaders(res, result) {
    if (result.limit) {
      res.setHeader('X-RateLimit-Limit', result.limit);
    }
    if (result.remaining !== undefined) {
      res.setHeader('X-RateLimit-Remaining', result.remaining);
    }
    if (result.window) {
      res.setHeader('X-RateLimit-Reset', Date.now() + result.window);
    }
    if (result.retryAfter) {
      res.setHeader('Retry-After', result.retryAfter);
    }
  }

  /**
   * Get client IP address
   */
  getClientIP(req) {
    // Try various headers for proxy scenarios
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return req.headers['x-real-ip'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.ip;
  }

  /**
   * Normalize endpoint path
   */
  normalizeEndpoint(path) {
    // Remove query parameters
    const normalized = path.split('?')[0];

    // Remove trailing slashes
    return normalized.replace(/\/+$/, '') || '/';
  }

  /**
   * Generate cache key
   */
  generateKey(ip, userId, endpoint) {
    if (userId) {
      return `user:${userId}:${endpoint}`;
    }
    return `ip:${ip}:${endpoint}`;
  }

  /**
   * Get rate limit status for IP or user
   */
  async getStatus(ip, userId, endpoint) {
    const key = this.generateKey(ip, userId, endpoint);
    const limits = this.getLimits(endpoint);

    try {
      const redisKey = `ratelimit:${key}`;
      const count = await RedisCacheService.get(redisKey) || 0;

      return {
        current: count,
        limit: limits.max,
        remaining: Math.max(0, limits.max - count),
        window: limits.window,
        blacklisted: this.isBlacklisted(ip),
        whitelisted: this.isWhitelisted(ip, userId)
      };
    } catch (error) {
      const record = this.requestCounts.get(key);
      return {
        current: record?.count || 0,
        limit: limits.max,
        remaining: Math.max(0, limits.max - (record?.count || 0)),
        window: limits.window,
        blacklisted: this.isBlacklisted(ip),
        whitelisted: this.isWhitelisted(ip, userId)
      };
    }
  }

  /**
   * Reset rate limit for IP or user
   */
  async resetLimit(ip, userId, endpoint) {
    const key = this.generateKey(ip, userId, endpoint);
    
    try {
      const redisKey = `ratelimit:${key}`;
      await RedisCacheService.delete(redisKey);
    } catch (error) {
      this.requestCounts.delete(key);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    const blockRate = this.stats.totalRequests > 0
      ? (this.stats.blockedRequests / this.stats.totalRequests) * 100
      : 0;

    return {
      ...this.stats,
      blockRate: Math.round(blockRate * 100) / 100,
      activeBlacklist: this.blacklistedIPs.size,
      whitelistedIPs: this.config.whitelistedIPs.size,
      whitelistedUsers: this.config.whitelistedUsers.size,
      suspiciousIPs: this.suspiciousIPs.size,
      configuredEndpoints: this.endpointLimits.size
    };
  }

  /**
   * Get blacklisted IPs
   */
  getBlacklistedIPs() {
    const list = [];
    const now = Date.now();

    for (const [ip, expiresAt] of this.blacklistedIPs.entries()) {
      if (expiresAt > now) {
        list.push({
          ip,
          expiresAt,
          expiresIn: Math.ceil((expiresAt - now) / 1000)
        });
      }
    }

    return list;
  }

  /**
   * Get suspicious IPs
   */
  getSuspiciousIPs() {
    return Array.from(this.suspiciousIPs.entries())
      .map(([ip, count]) => ({ ip, suspiciousCount: count }))
      .sort((a, b) => b.suspiciousCount - a.suspiciousCount);
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();

    // Clean blacklist
    for (const [ip, expiresAt] of this.blacklistedIPs.entries()) {
      if (now > expiresAt) {
        this.blacklistedIPs.delete(ip);
      }
    }

    // Clean request counts (in-memory)
    for (const [key, record] of this.requestCounts.entries()) {
      if (now - record.timestamp > 3600000) { // 1 hour old
        this.requestCounts.delete(key);
      }
    }

    // Clean suspicious IPs after 24 hours
    for (const [ip, count] of this.suspiciousIPs.entries()) {
      // In production, track timestamp and clean accordingly
      if (count < 2) {
        this.suspiciousIPs.delete(ip);
      }
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset all statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      blockedRequests: 0,
      throttledRequests: 0,
      blacklistedIPs: 0,
      suspiciousActivities: 0
    };
  }

  /**
   * Shutdown rate limiter
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    console.log('AdvancedRateLimiter shutdown complete');
  }
}

module.exports = new AdvancedRateLimiter();
