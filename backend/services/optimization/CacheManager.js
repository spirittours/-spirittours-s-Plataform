const RedisCacheService = require('../cache/RedisCacheService');
const EventEmitter = require('events');

/**
 * CacheManager - Advanced caching strategies and cache warming
 * 
 * Features:
 * - Multi-tier caching (L1 memory, L2 Redis, L3 database)
 * - Cache warming and preloading
 * - Cache invalidation strategies
 * - Cache-aside, write-through, write-behind patterns
 * - Cache analytics and hit rate optimization
 * - Automatic cache warming for popular data
 */
class CacheManager extends EventEmitter {
  constructor() {
    super();
    
    this.config = {
      enableCacheWarming: true,
      warmingInterval: 300000, // 5 minutes
      popularityThreshold: 10, // Access count for popular items
      preloadPatterns: [],
      compressionEnabled: true,
      compressionThreshold: 1024, // 1KB
      maxCacheSize: 500 * 1024 * 1024, // 500MB
    };

    // L1 Cache (In-memory)
    this.l1Cache = new Map();
    this.l1Stats = { hits: 0, misses: 0, size: 0 };

    // Access tracking for popularity
    this.accessLog = new Map();
    this.popularItems = new Set();

    // Cache warming queue
    this.warmingQueue = [];
    this.isWarming = false;

    // Statistics
    this.stats = {
      totalRequests: 0,
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
      misses: 0,
      evictions: 0,
      warmingOperations: 0,
      compressionSavings: 0
    };

    // Start cache warming if enabled
    if (this.config.enableCacheWarming) {
      this.startCacheWarming();
    }
  }

  /**
   * Get item with multi-tier caching
   */
  async get(key, options = {}) {
    this.stats.totalRequests++;
    const startTime = Date.now();

    // Try L1 cache (memory)
    if (this.l1Cache.has(key)) {
      const cached = this.l1Cache.get(key);
      if (!this.isExpired(cached)) {
        this.stats.l1Hits++;
        this.l1Stats.hits++;
        this.trackAccess(key);
        
        this.emit('cache:hit', { key, tier: 'L1', latency: Date.now() - startTime });
        return this.decompress(cached.value);
      } else {
        this.l1Cache.delete(key);
      }
    }

    // Try L2 cache (Redis)
    try {
      const l2Value = await RedisCacheService.get(key, options);
      if (l2Value !== null) {
        this.stats.l2Hits++;
        this.trackAccess(key);
        
        // Promote to L1
        this.setL1(key, l2Value, options.ttl || 300);
        
        this.emit('cache:hit', { key, tier: 'L2', latency: Date.now() - startTime });
        return l2Value;
      }
    } catch (error) {
      console.error('L2 cache error:', error);
    }

    // Cache miss
    this.stats.misses++;
    this.l1Stats.misses++;
    this.emit('cache:miss', { key, latency: Date.now() - startTime });
    
    return null;
  }

  /**
   * Set item in cache with multi-tier strategy
   */
  async set(key, value, ttl = 300, options = {}) {
    const strategy = options.strategy || 'cache-aside';

    try {
      // Compress if needed
      const compressed = this.compress(value);
      const sizeReduction = this.calculateSize(value) - this.calculateSize(compressed);
      if (sizeReduction > 0) {
        this.stats.compressionSavings += sizeReduction;
      }

      // Set in L1 cache
      this.setL1(key, compressed, ttl);

      // Set in L2 cache (Redis)
      await RedisCacheService.set(key, value, { ttl });

      // Track access for warming
      this.trackAccess(key);

      this.emit('cache:set', { key, size: this.calculateSize(value), ttl });
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  /**
   * Delete from all cache tiers
   */
  async delete(key) {
    // Delete from L1
    this.l1Cache.delete(key);
    
    // Delete from L2
    try {
      await RedisCacheService.delete(key);
    } catch (error) {
      console.error('L2 cache delete error:', error);
    }

    // Remove from access log
    this.accessLog.delete(key);
    this.popularItems.delete(key);

    this.emit('cache:delete', { key });
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern) {
    const regex = new RegExp(pattern);
    const keysToDelete = [];

    // Find matching keys in L1
    for (const key of this.l1Cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    // Delete matching keys
    for (const key of keysToDelete) {
      await this.delete(key);
    }

    this.emit('cache:invalidate', { pattern, count: keysToDelete.length });
    
    return keysToDelete.length;
  }

  /**
   * Cache-aside pattern implementation
   */
  async getOrLoad(key, loader, ttl = 300) {
    // Try cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Load from source
    try {
      const value = await loader();
      
      if (value !== null && value !== undefined) {
        await this.set(key, value, ttl);
      }

      this.stats.l3Hits++;
      return value;
    } catch (error) {
      console.error('Cache loader error:', error);
      throw error;
    }
  }

  /**
   * Write-through pattern implementation
   */
  async writeThrough(key, value, writer, ttl = 300) {
    try {
      // Write to database first
      await writer(value);

      // Then update cache
      await this.set(key, value, ttl);

      return true;
    } catch (error) {
      console.error('Write-through error:', error);
      throw error;
    }
  }

  /**
   * Write-behind pattern implementation
   */
  async writeBehind(key, value, writer, ttl = 300) {
    try {
      // Update cache immediately
      await this.set(key, value, ttl);

      // Write to database asynchronously
      setImmediate(async () => {
        try {
          await writer(value);
        } catch (error) {
          console.error('Write-behind async error:', error);
          // Could implement retry logic here
        }
      });

      return true;
    } catch (error) {
      console.error('Write-behind error:', error);
      throw error;
    }
  }

  /**
   * Warm cache with popular or predictable data
   */
  async warmCache(keys, loader) {
    if (!Array.isArray(keys) || keys.length === 0) {
      return { success: false, message: 'Invalid keys provided' };
    }

    const warmed = [];
    const failed = [];

    for (const key of keys) {
      try {
        // Check if already cached
        const exists = await this.get(key);
        if (exists !== null) {
          continue; // Already warm
        }

        // Load and cache
        const value = await loader(key);
        if (value !== null) {
          await this.set(key, value, 3600); // 1 hour TTL for warmed items
          warmed.push(key);
        }
      } catch (error) {
        console.error(`Cache warming failed for ${key}:`, error);
        failed.push(key);
      }
    }

    this.stats.warmingOperations++;

    this.emit('cache:warmed', { warmed: warmed.length, failed: failed.length });

    return {
      success: true,
      warmed: warmed.length,
      failed: failed.length,
      keys: { warmed, failed }
    };
  }

  /**
   * Automatically warm popular items
   */
  async autoWarmPopularItems(loader) {
    if (this.isWarming) {
      return { success: false, message: 'Warming already in progress' };
    }

    this.isWarming = true;

    try {
      // Get popular items that need warming
      const popularKeys = Array.from(this.popularItems);
      const keysToWarm = [];

      for (const key of popularKeys) {
        const cached = await this.get(key);
        if (cached === null) {
          keysToWarm.push(key);
        }
      }

      const result = await this.warmCache(keysToWarm, loader);
      
      this.isWarming = false;
      return result;
    } catch (error) {
      this.isWarming = false;
      console.error('Auto warming error:', error);
      throw error;
    }
  }

  /**
   * Start background cache warming
   */
  startCacheWarming() {
    this.warmingInterval = setInterval(() => {
      this.performBackgroundWarming();
    }, this.config.warmingInterval);

    console.log('Cache warming started');
  }

  /**
   * Stop background cache warming
   */
  stopCacheWarming() {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
    }
  }

  /**
   * Perform background cache warming
   */
  async performBackgroundWarming() {
    if (this.isWarming || this.warmingQueue.length === 0) {
      return;
    }

    console.log('Performing background cache warming...');

    const task = this.warmingQueue.shift();
    if (task) {
      try {
        await this.warmCache(task.keys, task.loader);
      } catch (error) {
        console.error('Background warming error:', error);
      }
    }
  }

  /**
   * Queue items for cache warming
   */
  queueForWarming(keys, loader) {
    this.warmingQueue.push({ keys, loader });
  }

  /**
   * Track access for popularity analysis
   */
  trackAccess(key) {
    const count = this.accessLog.get(key) || 0;
    this.accessLog.set(key, count + 1);

    // Mark as popular if threshold exceeded
    if (count + 1 >= this.config.popularityThreshold) {
      this.popularItems.add(key);
    }
  }

  /**
   * Get popular items
   */
  getPopularItems(limit = 50) {
    const sorted = Array.from(this.accessLog.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sorted.map(([key, count]) => ({ key, accessCount: count }));
  }

  /**
   * Set item in L1 cache
   */
  setL1(key, value, ttl) {
    // Check cache size limit
    if (this.l1Stats.size >= this.config.maxCacheSize) {
      this.evictL1();
    }

    const entry = {
      value,
      expiresAt: Date.now() + (ttl * 1000),
      size: this.calculateSize(value)
    };

    this.l1Cache.set(key, entry);
    this.l1Stats.size += entry.size;
  }

  /**
   * Evict items from L1 cache (LRU)
   */
  evictL1() {
    if (this.l1Cache.size === 0) return;

    // Simple eviction: remove oldest entry
    const firstKey = this.l1Cache.keys().next().value;
    const entry = this.l1Cache.get(firstKey);
    
    this.l1Cache.delete(firstKey);
    this.l1Stats.size -= entry.size;
    this.stats.evictions++;

    this.emit('cache:eviction', { key: firstKey, tier: 'L1' });
  }

  /**
   * Check if cache entry is expired
   */
  isExpired(entry) {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Compress value if beneficial
   */
  compress(value) {
    if (!this.config.compressionEnabled) {
      return value;
    }

    const size = this.calculateSize(value);
    if (size < this.config.compressionThreshold) {
      return value; // Too small to compress
    }

    // Simple compression placeholder
    // In production, use zlib or similar
    return value;
  }

  /**
   * Decompress value
   */
  decompress(value) {
    // Simple decompression placeholder
    return value;
  }

  /**
   * Calculate approximate size of value
   */
  calculateSize(value) {
    if (value === null || value === undefined) return 0;
    
    try {
      return JSON.stringify(value).length;
    } catch {
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalHits = this.stats.l1Hits + this.stats.l2Hits + this.stats.l3Hits;
    const hitRate = this.stats.totalRequests > 0 
      ? (totalHits / this.stats.totalRequests) * 100 
      : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      l1CacheSize: this.l1Cache.size,
      l1MemoryUsage: this.l1Stats.size,
      popularItemsCount: this.popularItems.size,
      warmingQueueSize: this.warmingQueue.length,
      compressionSavings: this.stats.compressionSavings
    };
  }

  /**
   * Get detailed analytics
   */
  getAnalytics() {
    const stats = this.getStats();
    const popularItems = this.getPopularItems(20);

    return {
      summary: stats,
      popularItems,
      recommendations: this.getRecommendations(),
      l1Cache: {
        size: this.l1Cache.size,
        memoryUsage: this.l1Stats.size,
        hitRate: this.l1Stats.hits > 0 
          ? (this.l1Stats.hits / (this.l1Stats.hits + this.l1Stats.misses)) * 100 
          : 0
      }
    };
  }

  /**
   * Get cache optimization recommendations
   */
  getRecommendations() {
    const recommendations = [];
    const stats = this.getStats();

    if (stats.hitRate < 50) {
      recommendations.push({
        severity: 'high',
        message: 'Cache hit rate is below 50%. Consider warming more data or increasing TTL.'
      });
    }

    if (this.popularItems.size > 100) {
      recommendations.push({
        severity: 'medium',
        message: `${this.popularItems.size} popular items detected. Consider implementing auto-warming.`
      });
    }

    if (stats.evictions > stats.totalRequests * 0.1) {
      recommendations.push({
        severity: 'medium',
        message: 'High eviction rate. Consider increasing cache size.'
      });
    }

    if (stats.compressionSavings > 1024 * 1024) {
      recommendations.push({
        severity: 'low',
        message: `Compression saved ${(stats.compressionSavings / 1024 / 1024).toFixed(2)}MB. Good optimization!`
      });
    }

    return recommendations;
  }

  /**
   * Clear all caches
   */
  async clearAll() {
    // Clear L1
    this.l1Cache.clear();
    this.l1Stats = { hits: 0, misses: 0, size: 0 };

    // Clear L2
    try {
      await RedisCacheService.clear();
    } catch (error) {
      console.error('L2 cache clear error:', error);
    }

    // Reset tracking
    this.accessLog.clear();
    this.popularItems.clear();

    this.emit('cache:cleared');
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
      misses: 0,
      evictions: 0,
      warmingOperations: 0,
      compressionSavings: 0
    };

    this.l1Stats = { hits: 0, misses: 0, size: this.l1Stats.size };
  }

  /**
   * Shutdown cache manager
   */
  shutdown() {
    this.stopCacheWarming();
    this.removeAllListeners();
    console.log('CacheManager shutdown complete');
  }
}

module.exports = new CacheManager();
