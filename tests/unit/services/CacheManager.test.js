const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');
const CacheManager = require('../../../backend/services/optimization/CacheManager');

describe('CacheManager Service', () => {
  beforeEach(() => {
    CacheManager.resetStats();
  });

  afterEach(() => {
    CacheManager.removeAllListeners();
  });

  describe('Basic Caching', () => {
    it('should store and retrieve values', async () => {
      const key = 'test-key';
      const value = { data: 'test data' };

      await CacheManager.set(key, value, 300);
      const retrieved = await CacheManager.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const retrieved = await CacheManager.get('non-existent-key');
      expect(retrieved).toBeNull();
    });

    it('should delete cached values', async () => {
      const key = 'test-key';
      const value = 'test value';

      await CacheManager.set(key, value);
      await CacheManager.delete(key);
      
      const retrieved = await CacheManager.get(key);
      expect(retrieved).toBeNull();
    });
  });

  describe('Multi-tier Caching', () => {
    it('should promote to L1 cache on L2 hit', async () => {
      const key = 'test-key';
      const value = 'test value';

      await CacheManager.set(key, value);
      
      // Get should promote to L1
      await CacheManager.get(key);
      
      const stats = CacheManager.getStats();
      expect(stats.l1Hits + stats.l2Hits).toBeGreaterThan(0);
    });
  });

  describe('Cache-aside Pattern', () => {
    it('should load from source on cache miss', async () => {
      const key = 'load-key';
      const loaderData = { loaded: true };
      const loader = jest.fn(() => Promise.resolve(loaderData));

      const result = await CacheManager.getOrLoad(key, loader);

      expect(result).toEqual(loaderData);
      expect(loader).toHaveBeenCalled();
    });

    it('should not call loader on cache hit', async () => {
      const key = 'cached-key';
      const cachedData = { cached: true };
      const loader = jest.fn(() => Promise.resolve({ loaded: true }));

      await CacheManager.set(key, cachedData);
      const result = await CacheManager.getOrLoad(key, loader);

      expect(result).toEqual(cachedData);
      expect(loader).not.toHaveBeenCalled();
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with provided keys', async () => {
      const keys = ['key1', 'key2', 'key3'];
      const loader = jest.fn((key) => Promise.resolve({ key, value: 'data' }));

      const result = await CacheManager.warmCache(keys, loader);

      expect(result.success).toBe(true);
      expect(result.warmed).toBe(keys.length);
      expect(loader).toHaveBeenCalledTimes(keys.length);
    });

    it('should skip already cached keys', async () => {
      const keys = ['key1', 'key2'];
      const loader = jest.fn((key) => Promise.resolve({ key, value: 'data' }));

      // Pre-cache key1
      await CacheManager.set('key1', { cached: true });

      const result = await CacheManager.warmCache(keys, loader);

      expect(result.warmed).toBe(1); // Only key2 should be warmed
    });
  });

  describe('Popular Items Tracking', () => {
    it('should track access count', async () => {
      const key = 'popular-key';
      const value = 'test';

      await CacheManager.set(key, value);

      // Access multiple times
      for (let i = 0; i < 15; i++) {
        await CacheManager.get(key);
      }

      const popularItems = CacheManager.getPopularItems(10);
      const item = popularItems.find(p => p.key === key);

      expect(item).toBeDefined();
      expect(item.accessCount).toBeGreaterThan(10);
    });
  });

  describe('Statistics', () => {
    it('should track cache statistics', async () => {
      await CacheManager.set('key1', 'value1');
      await CacheManager.get('key1');
      await CacheManager.get('non-existent');

      const stats = CacheManager.getStats();

      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.hitRate).toBeDefined();
    });

    it('should calculate hit rate correctly', async () => {
      const key = 'test-key';
      await CacheManager.set(key, 'value');

      // 1 hit
      await CacheManager.get(key);
      
      // 1 miss
      await CacheManager.get('missing');

      const stats = CacheManager.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.hitRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Pattern Invalidation', () => {
    it('should invalidate keys matching pattern', async () => {
      await CacheManager.set('user:1:profile', { id: 1 });
      await CacheManager.set('user:2:profile', { id: 2 });
      await CacheManager.set('post:1', { postId: 1 });

      const invalidated = await CacheManager.invalidatePattern('^user:');

      expect(invalidated).toBe(2);

      const user1 = await CacheManager.get('user:1:profile');
      const post1 = await CacheManager.get('post:1');

      expect(user1).toBeNull();
      expect(post1).not.toBeNull();
    });
  });

  describe('Analytics', () => {
    it('should provide detailed analytics', async () => {
      await CacheManager.set('key1', 'value1');
      await CacheManager.get('key1');

      const analytics = CacheManager.getAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.summary).toBeDefined();
      expect(analytics.popularItems).toBeDefined();
      expect(analytics.recommendations).toBeDefined();
    });
  });
});
