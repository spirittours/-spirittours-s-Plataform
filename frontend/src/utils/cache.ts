/**
 * Frontend Cache Utility
 * Provides in-memory and localStorage caching with TTL support
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private static instance: CacheManager;
  private memoryCache: Map<string, CacheEntry<any>>;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.memoryCache = new Map();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Set item in memory cache
   */
  public set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    this.memoryCache.set(key, entry);
  }

  /**
   * Get item from memory cache
   */
  public get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set item in localStorage with TTL
   */
  public setLocal<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to set localStorage cache:', error);
    }
  }

  /**
   * Get item from localStorage
   */
  public getLocal<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(`cache_${key}`);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);

      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.warn('Failed to get localStorage cache:', error);
      return null;
    }
  }

  /**
   * Remove item from memory cache
   */
  public remove(key: string): void {
    this.memoryCache.delete(key);
  }

  /**
   * Remove item from localStorage
   */
  public removeLocal(key: string): void {
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Failed to remove localStorage cache:', error);
    }
  }

  /**
   * Clear all memory cache
   */
  public clear(): void {
    this.memoryCache.clear();
  }

  /**
   * Clear all localStorage cache
   */
  public clearLocal(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error);
    }
  }

  /**
   * Clear all expired items from memory cache
   */
  public clearExpired(): void {
    const now = Date.now();
    this.memoryCache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
      }
    });
  }

  /**
   * Clear all expired items from localStorage
   */
  public clearExpiredLocal(): void {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();

      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const entry = JSON.parse(item);
              if (now - entry.timestamp > entry.ttl) {
                localStorage.removeItem(key);
              }
            }
          } catch {
            // Invalid entry, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.warn('Failed to clear expired localStorage cache:', error);
    }
  }

  /**
   * Get or set cache with callback
   */
  public async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Try memory cache first
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Try localStorage cache
    const localCached = this.getLocal<T>(key);
    if (localCached !== null) {
      // Restore to memory cache
      this.set(key, localCached, ttl);
      return localCached;
    }

    // Fetch new data
    const data = await callback();
    this.set(key, data, ttl);
    this.setLocal(key, data, ttl);
    return data;
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    memorySize: number;
    localStorageSize: number;
    memoryKeys: string[];
    localStorageKeys: string[];
  } {
    const localStorageKeys = Object.keys(localStorage).filter(key =>
      key.startsWith('cache_')
    );

    return {
      memorySize: this.memoryCache.size,
      localStorageSize: localStorageKeys.length,
      memoryKeys: Array.from(this.memoryCache.keys()),
      localStorageKeys,
    };
  }
}

// Export singleton instance
const cache = CacheManager.getInstance();
export default cache;

// Export convenience methods
export const setCache = <T>(key: string, data: T, ttl?: number) => cache.set(key, data, ttl);
export const getCache = <T>(key: string) => cache.get<T>(key);
export const removeCache = (key: string) => cache.remove(key);
export const clearCache = () => cache.clear();
export const getOrSetCache = <T>(key: string, callback: () => Promise<T>, ttl?: number) =>
  cache.getOrSet(key, callback, ttl);
