/**
 * Tests for Cache Manager
 */

import { CacheManager } from '../cache';

jest.useFakeTimers();

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager();
    localStorage.clear();
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('set and get', () => {
    it('should store and retrieve data from memory cache', () => {
      cacheManager.set('testKey', 'testValue');

      const result = cacheManager.get<string>('testKey');

      expect(result).toBe('testValue');
    });

    it('should store and retrieve complex objects', () => {
      const complexData = {
        id: 1,
        name: 'Test',
        nested: { value: 42 },
        array: [1, 2, 3],
      };

      cacheManager.set('complexKey', complexData);

      const result = cacheManager.get<typeof complexData>('complexKey');

      expect(result).toEqual(complexData);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheManager.get('nonExistent');

      expect(result).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should respect custom TTL', () => {
      const shortTTL = 1000; // 1 second
      cacheManager.set('shortKey', 'value', shortTTL);

      // Data should be available immediately
      expect(cacheManager.get('shortKey')).toBe('value');

      // Fast forward time beyond TTL
      jest.advanceTimersByTime(shortTTL + 100);

      // Data should be expired
      expect(cacheManager.get('shortKey')).toBeNull();
    });

    it('should use default TTL when not specified', () => {
      cacheManager.set('defaultKey', 'value'); // Default is 5 minutes

      // Data should be available
      expect(cacheManager.get('defaultKey')).toBe('value');

      // Fast forward 4 minutes (within TTL)
      jest.advanceTimersByTime(4 * 60 * 1000);
      expect(cacheManager.get('defaultKey')).toBe('value');

      // Fast forward another 2 minutes (beyond TTL)
      jest.advanceTimersByTime(2 * 60 * 1000);
      expect(cacheManager.get('defaultKey')).toBeNull();
    });
  });

  describe('localStorage integration', () => {
    it('should persist to localStorage', () => {
      cacheManager.set('persistKey', 'persistValue');

      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should retrieve from localStorage when not in memory', () => {
      // Simulate data in localStorage
      const cacheData = {
        data: 'storedValue',
        expiry: Date.now() + 10000,
      };
      localStorage.getItem = jest.fn(() => JSON.stringify(cacheData));

      // Create new cache manager (empty memory cache)
      const newManager = new CacheManager();

      const result = newManager.get<string>('storedKey');

      expect(result).toBe('storedValue');
    });

    it('should not return expired data from localStorage', () => {
      // Simulate expired data in localStorage
      const expiredData = {
        data: 'expiredValue',
        expiry: Date.now() - 1000, // Expired 1 second ago
      };
      localStorage.getItem = jest.fn(() => JSON.stringify(expiredData));

      const newManager = new CacheManager();

      const result = newManager.get<string>('expiredKey');

      expect(result).toBeNull();
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      cacheManager.set('existingKey', 'value');

      expect(cacheManager.has('existingKey')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(cacheManager.has('nonExistent')).toBe(false);
    });

    it('should return false for expired keys', () => {
      cacheManager.set('expiring', 'value', 1000);

      expect(cacheManager.has('expiring')).toBe(true);

      jest.advanceTimersByTime(1100);

      expect(cacheManager.has('expiring')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove data from memory cache', () => {
      cacheManager.set('deleteKey', 'value');

      expect(cacheManager.has('deleteKey')).toBe(true);

      cacheManager.delete('deleteKey');

      expect(cacheManager.has('deleteKey')).toBe(false);
    });

    it('should remove data from localStorage', () => {
      cacheManager.set('deleteKey', 'value');

      cacheManager.delete('deleteKey');

      expect(localStorage.removeItem).toHaveBeenCalledWith('cache_deleteKey');
    });
  });

  describe('clear', () => {
    it('should clear all cached data', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.set('key3', 'value3');

      expect(cacheManager.has('key1')).toBe(true);
      expect(cacheManager.has('key2')).toBe(true);
      expect(cacheManager.has('key3')).toBe(true);

      cacheManager.clear();

      expect(cacheManager.has('key1')).toBe(false);
      expect(cacheManager.has('key2')).toBe(false);
      expect(cacheManager.has('key3')).toBe(false);
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const mockCallback = jest.fn(() => Promise.resolve('newValue'));

      cacheManager.set('cachedKey', 'cachedValue');

      const result = await cacheManager.getOrSet('cachedKey', mockCallback);

      expect(result).toBe('cachedValue');
      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should call callback and cache result if not exists', async () => {
      const mockCallback = jest.fn(() => Promise.resolve('newValue'));

      const result = await cacheManager.getOrSet('newKey', mockCallback);

      expect(result).toBe('newValue');
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(cacheManager.get('newKey')).toBe('newValue');
    });

    it('should use custom TTL when provided', async () => {
      const mockCallback = jest.fn(() => Promise.resolve('value'));
      const customTTL = 2000;

      await cacheManager.getOrSet('customTTL', mockCallback, customTTL);

      // Should be available within TTL
      jest.advanceTimersByTime(1500);
      expect(cacheManager.get('customTTL')).toBe('value');

      // Should expire after TTL
      jest.advanceTimersByTime(600);
      expect(cacheManager.get('customTTL')).toBeNull();
    });

    it('should handle async errors gracefully', async () => {
      const mockError = new Error('Async error');
      const mockCallback = jest.fn(() => Promise.reject(mockError));

      await expect(
        cacheManager.getOrSet('errorKey', mockCallback)
      ).rejects.toThrow('Async error');

      // Should not cache error result
      expect(cacheManager.has('errorKey')).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      cacheManager.set('key1', 'value1', 1000);
      cacheManager.set('key2', 'value2', 5000);
      cacheManager.set('key3', 'value3', 10000);

      // Fast forward to expire key1
      jest.advanceTimersByTime(1100);

      // Manually trigger cleanup
      (cacheManager as any).cleanup();

      expect(cacheManager.has('key1')).toBe(false);
      expect(cacheManager.has('key2')).toBe(true);
      expect(cacheManager.has('key3')).toBe(true);
    });

    it('should run automatic cleanup periodically', () => {
      cacheManager.set('expiring', 'value', 1000);

      // Fast forward past expiry
      jest.advanceTimersByTime(1100);

      // Fast forward cleanup interval (default 60 seconds)
      jest.advanceTimersByTime(60 * 1000);

      expect(cacheManager.has('expiring')).toBe(false);
    });
  });

  describe('size', () => {
    it('should return correct cache size', () => {
      expect(cacheManager.size()).toBe(0);

      cacheManager.set('key1', 'value1');
      expect(cacheManager.size()).toBe(1);

      cacheManager.set('key2', 'value2');
      cacheManager.set('key3', 'value3');
      expect(cacheManager.size()).toBe(3);

      cacheManager.delete('key1');
      expect(cacheManager.size()).toBe(2);
    });
  });
});
