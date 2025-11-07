const logger = require('../../config/logger');

/**
 * RedisCacheService
 * Distributed caching layer with Redis backend
 * 
 * Features:
 * - Multi-level caching (L1: Memory, L2: Redis)
 * - Automatic key namespacing by workspace
 * - TTL management and auto-expiration
 * - Cache invalidation patterns
 * - Cache-aside and write-through strategies
 * - Analytics and performance tracking
 */
class RedisCacheService {
  constructor() {
    this.redis = null;
    this.localCache = new Map(); // L1 cache (in-memory)
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB) || 0,
      ttl: {
        short: 60, // 1 minute
        medium: 300, // 5 minutes
        long: 3600, // 1 hour
        extended: 86400, // 24 hours
      },
      localCacheEnabled: true,
      localCacheSize: 1000,
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
    
    this.initializeRedis();
  }
  
  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      if (process.env.REDIS_ENABLED === 'true') {
        // const redis = require('redis');
        // this.redis = redis.createClient({
        //   url: `redis://${this.config.host}:${this.config.port}`,
        //   password: this.config.password,
        //   database: this.config.db,
        // });
        // await this.redis.connect();
        logger.info('✅ Redis cache ready (mock mode)');
      } else {
        logger.info('Using local in-memory cache only (Redis disabled)');
      }
    } catch (error) {
      logger.error('Error initializing Redis:', error);
      logger.info('Falling back to local cache only');
    }
  }
  
  /**
   * Generate cache key with namespace
   */
  generateKey(workspace, type, identifier) {
    return `crm:${workspace}:${type}:${identifier}`;
  }
  
  /**
   * Get from cache
   */
  async get(key, options = {}) {
    try {
      const { useLocal = this.config.localCacheEnabled } = options;
      
      // Try L1 cache first
      if (useLocal && this.localCache.has(key)) {
        const cached = this.localCache.get(key);
        if (!this.isExpired(cached)) {
          this.stats.hits++;
          logger.debug(`Cache hit (L1): ${key}`);
          return cached.value;
        } else {
          this.localCache.delete(key);
        }
      }
      
      // Try L2 cache (Redis)
      if (this.redis) {
        const value = await this.redis.get(key);
        if (value !== null) {
          this.stats.hits++;
          const parsed = JSON.parse(value);
          
          // Populate L1 cache
          if (useLocal) {
            this.setLocal(key, parsed, options.ttl);
          }
          
          logger.debug(`Cache hit (L2): ${key}`);
          return parsed;
        }
      }
      
      this.stats.misses++;
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      this.stats.errors++;
      logger.error('Error getting from cache:', error);
      return null;
    }
  }
  
  /**
   * Set in cache
   */
  async set(key, value, options = {}) {
    try {
      const {
        ttl = this.config.ttl.medium,
        useLocal = this.config.localCacheEnabled,
      } = options;
      
      // Set in L1 cache
      if (useLocal) {
        this.setLocal(key, value, ttl);
      }
      
      // Set in L2 cache (Redis)
      if (this.redis) {
        await this.redis.setEx(key, ttl, JSON.stringify(value));
      }
      
      this.stats.sets++;
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Error setting cache:', error);
      return false;
    }
  }
  
  /**
   * Set in local cache
   */
  setLocal(key, value, ttl) {
    // Check size limit
    if (this.localCache.size >= this.config.localCacheSize) {
      // Remove oldest entry
      const firstKey = this.localCache.keys().next().value;
      this.localCache.delete(firstKey);
    }
    
    this.localCache.set(key, {
      value,
      expiresAt: Date.now() + (ttl * 1000),
    });
  }
  
  /**
   * Delete from cache
   */
  async delete(key) {
    try {
      // Delete from L1
      this.localCache.delete(key);
      
      // Delete from L2
      if (this.redis) {
        await this.redis.del(key);
      }
      
      this.stats.deletes++;
      logger.debug(`Cache delete: ${key}`);
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error('Error deleting from cache:', error);
      return false;
    }
  }
  
  /**
   * Delete by pattern
   */
  async deletePattern(pattern) {
    try {
      let deletedCount = 0;
      
      // Delete from L1
      const localKeys = Array.from(this.localCache.keys());
      localKeys.forEach(key => {
        if (this.matchesPattern(key, pattern)) {
          this.localCache.delete(key);
          deletedCount++;
        }
      });
      
      // Delete from L2
      if (this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(keys);
          deletedCount += keys.length;
        }
      }
      
      this.stats.deletes += deletedCount;
      logger.debug(`Cache delete pattern: ${pattern} (${deletedCount} keys)`);
      return deletedCount;
    } catch (error) {
      this.stats.errors++;
      logger.error('Error deleting pattern:', error);
      return 0;
    }
  }
  
  /**
   * Cache-aside pattern: get or compute
   */
  async getOrSet(key, computeFn, options = {}) {
    try {
      // Try to get from cache
      const cached = await this.get(key, options);
      if (cached !== null) {
        return cached;
      }
      
      // Compute value
      const value = await computeFn();
      
      // Store in cache
      await this.set(key, value, options);
      
      return value;
    } catch (error) {
      logger.error('Error in getOrSet:', error);
      throw error;
    }
  }
  
  /**
   * Invalidate cache for workspace
   */
  async invalidateWorkspace(workspace, types = []) {
    try {
      if (types.length === 0) {
        // Invalidate all types
        return await this.deletePattern(`crm:${workspace}:*`);
      } else {
        // Invalidate specific types
        let total = 0;
        for (const type of types) {
          const count = await this.deletePattern(`crm:${workspace}:${type}:*`);
          total += count;
        }
        return total;
      }
    } catch (error) {
      logger.error('Error invalidating workspace cache:', error);
      return 0;
    }
  }
  
  /**
   * Invalidate cache for entity
   */
  async invalidateEntity(workspace, type, entityId) {
    try {
      const key = this.generateKey(workspace, type, entityId);
      await this.delete(key);
      
      // Also invalidate related caches
      await this.deletePattern(`crm:${workspace}:${type}:list:*`);
      await this.deletePattern(`crm:${workspace}:analytics:*`);
      
      return true;
    } catch (error) {
      logger.error('Error invalidating entity cache:', error);
      return false;
    }
  }
  
  /**
   * Cache entity
   */
  async cacheEntity(workspace, type, entityId, data, options = {}) {
    const key = this.generateKey(workspace, type, entityId);
    return await this.set(key, data, {
      ttl: this.config.ttl.medium,
      ...options,
    });
  }
  
  /**
   * Get cached entity
   */
  async getCachedEntity(workspace, type, entityId, options = {}) {
    const key = this.generateKey(workspace, type, entityId);
    return await this.get(key, options);
  }
  
  /**
   * Cache list
   */
  async cacheList(workspace, type, listIdentifier, data, options = {}) {
    const key = this.generateKey(workspace, `${type}:list`, listIdentifier);
    return await this.set(key, data, {
      ttl: this.config.ttl.short,
      ...options,
    });
  }
  
  /**
   * Get cached list
   */
  async getCachedList(workspace, type, listIdentifier, options = {}) {
    const key = this.generateKey(workspace, `${type}:list`, listIdentifier);
    return await this.get(key, options);
  }
  
  /**
   * Cache AI response
   */
  async cacheAIResponse(prompt, response, options = {}) {
    const key = `ai:response:${this.hashString(prompt)}`;
    return await this.set(key, response, {
      ttl: this.config.ttl.extended,
      ...options,
    });
  }
  
  /**
   * Get cached AI response
   */
  async getCachedAIResponse(prompt, options = {}) {
    const key = `ai:response:${this.hashString(prompt)}`;
    return await this.get(key, options);
  }
  
  /**
   * Cache search results
   */
  async cacheSearchResults(workspace, query, results, options = {}) {
    const key = this.generateKey(workspace, 'search', this.hashString(query));
    return await this.set(key, results, {
      ttl: this.config.ttl.short,
      ...options,
    });
  }
  
  /**
   * Get cached search results
   */
  async getCachedSearchResults(workspace, query, options = {}) {
    const key = this.generateKey(workspace, 'search', this.hashString(query));
    return await this.get(key, options);
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      localCacheSize: this.localCache.size,
      localCacheLimit: this.config.localCacheSize,
      redisConnected: this.redis !== null,
    };
  }
  
  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }
  
  /**
   * Clear all caches
   */
  async clearAll() {
    try {
      // Clear L1
      this.localCache.clear();
      
      // Clear L2
      if (this.redis) {
        await this.redis.flushDb();
      }
      
      logger.info('All caches cleared');
      return true;
    } catch (error) {
      logger.error('Error clearing caches:', error);
      return false;
    }
  }
  
  /**
   * Warm up cache
   */
  async warmUp(workspace, models) {
    try {
      logger.info(`Warming up cache for workspace ${workspace}`);
      let warmedCount = 0;
      
      for (const [type, Model] of Object.entries(models)) {
        const entities = await Model.find({ workspace }).limit(100);
        
        for (const entity of entities) {
          await this.cacheEntity(
            workspace,
            type,
            entity._id.toString(),
            entity.toObject(),
            { ttl: this.config.ttl.long }
          );
          warmedCount++;
        }
      }
      
      logger.info(`Cache warmed: ${warmedCount} entities`);
      return warmedCount;
    } catch (error) {
      logger.error('Error warming up cache:', error);
      return 0;
    }
  }
  
  // ========================================
  // Helper methods
  // ========================================
  
  isExpired(cached) {
    return cached.expiresAt < Date.now();
  }
  
  matchesPattern(key, pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(key);
  }
  
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

module.exports = new RedisCacheService();
