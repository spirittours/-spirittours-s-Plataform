/**
 * Offline Service
 * 
 * Manages offline data storage and synchronization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { MMKV } from 'react-native-mmkv';

// Initialize MMKV storage (faster than AsyncStorage)
const storage = new MMKV();

// Storage keys
const KEYS = {
  DESTINATIONS: 'cached_destinations',
  BOOKINGS: 'cached_bookings',
  USER_PROFILE: 'cached_user_profile',
  PENDING_SYNC: 'pending_sync_queue',
  LAST_SYNC: 'last_sync_timestamp',
  OFFLINE_MODE: 'offline_mode_enabled',
};

export interface PendingSync {
  id: string;
  type: 'booking' | 'payment' | 'profile_update';
  data: any;
  timestamp: number;
  retryCount: number;
}

/**
 * Initialize offline storage
 */
export async function initializeOfflineStorage(): Promise<void> {
  try {
    console.log('[OfflineService] Initializing offline storage...');
    
    // Check if first time setup
    const isInitialized = storage.getBoolean('initialized');
    
    if (!isInitialized) {
      // Set default values
      storage.set(KEYS.PENDING_SYNC, JSON.stringify([]));
      storage.set(KEYS.LAST_SYNC, Date.now().toString());
      storage.set(KEYS.OFFLINE_MODE, 'false');
      storage.set('initialized', true);
      
      console.log('[OfflineService] First time initialization complete');
    }
    
    // Setup network listener
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log('[OfflineService] Network connected, triggering sync...');
        syncPendingData();
      } else {
        console.log('[OfflineService] Network disconnected, enabling offline mode');
      }
    });
    
  } catch (error) {
    console.error('[OfflineService] Initialization failed:', error);
  }
}

/**
 * Cache destinations for offline access
 */
export async function cacheDestinations(destinations: any[]): Promise<void> {
  try {
    storage.set(KEYS.DESTINATIONS, JSON.stringify(destinations));
    console.log(`[OfflineService] Cached ${destinations.length} destinations`);
  } catch (error) {
    console.error('[OfflineService] Failed to cache destinations:', error);
  }
}

/**
 * Get cached destinations
 */
export function getCachedDestinations(): any[] {
  try {
    const cached = storage.getString(KEYS.DESTINATIONS);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('[OfflineService] Failed to get cached destinations:', error);
    return [];
  }
}

/**
 * Cache user bookings
 */
export async function cacheBookings(bookings: any[]): Promise<void> {
  try {
    storage.set(KEYS.BOOKINGS, JSON.stringify(bookings));
    console.log(`[OfflineService] Cached ${bookings.length} bookings`);
  } catch (error) {
    console.error('[OfflineService] Failed to cache bookings:', error);
  }
}

/**
 * Get cached bookings
 */
export function getCachedBookings(): any[] {
  try {
    const cached = storage.getString(KEYS.BOOKINGS);
    return cached ? JSON.parse(cached) : [];
  } catch (error) {
    console.error('[OfflineService] Failed to get cached bookings:', error);
    return [];
  }
}

/**
 * Cache user profile
 */
export async function cacheUserProfile(profile: any): Promise<void> {
  try {
    storage.set(KEYS.USER_PROFILE, JSON.stringify(profile));
    console.log('[OfflineService] Cached user profile');
  } catch (error) {
    console.error('[OfflineService] Failed to cache user profile:', error);
  }
}

/**
 * Get cached user profile
 */
export function getCachedUserProfile(): any | null {
  try {
    const cached = storage.getString(KEYS.USER_PROFILE);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error('[OfflineService] Failed to get cached user profile:', error);
    return null;
  }
}

/**
 * Add item to sync queue
 */
export async function addToSyncQueue(item: Omit<PendingSync, 'id' | 'retryCount'>): Promise<void> {
  try {
    const queue = getPendingSyncQueue();
    
    const newItem: PendingSync = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      retryCount: 0,
    };
    
    queue.push(newItem);
    storage.set(KEYS.PENDING_SYNC, JSON.stringify(queue));
    
    console.log(`[OfflineService] Added to sync queue: ${newItem.id}`);
    
    // Try to sync immediately if online
    const netInfo = await NetInfo.fetch();
    if (netInfo.isConnected) {
      syncPendingData();
    }
  } catch (error) {
    console.error('[OfflineService] Failed to add to sync queue:', error);
  }
}

/**
 * Get pending sync queue
 */
export function getPendingSyncQueue(): PendingSync[] {
  try {
    const queue = storage.getString(KEYS.PENDING_SYNC);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error('[OfflineService] Failed to get sync queue:', error);
    return [];
  }
}

/**
 * Sync pending data with server
 */
export async function syncPendingData(): Promise<void> {
  try {
    const queue = getPendingSyncQueue();
    
    if (queue.length === 0) {
      console.log('[OfflineService] No pending items to sync');
      return;
    }
    
    console.log(`[OfflineService] Syncing ${queue.length} pending items...`);
    
    const results = await Promise.allSettled(
      queue.map(item => syncItem(item))
    );
    
    // Remove successfully synced items
    const remainingQueue = queue.filter((item, index) => {
      const result = results[index];
      if (result.status === 'fulfilled') {
        console.log(`[OfflineService] Successfully synced: ${item.id}`);
        return false; // Remove from queue
      } else {
        console.error(`[OfflineService] Failed to sync: ${item.id}`, result.reason);
        item.retryCount++;
        
        // Remove if max retries exceeded
        if (item.retryCount >= 5) {
          console.warn(`[OfflineService] Max retries exceeded for: ${item.id}`);
          return false;
        }
        return true; // Keep in queue
      }
    });
    
    // Update queue
    storage.set(KEYS.PENDING_SYNC, JSON.stringify(remainingQueue));
    storage.set(KEYS.LAST_SYNC, Date.now().toString());
    
    console.log(`[OfflineService] Sync complete. Remaining items: ${remainingQueue.length}`);
    
  } catch (error) {
    console.error('[OfflineService] Sync failed:', error);
  }
}

/**
 * Sync individual item
 */
async function syncItem(item: PendingSync): Promise<void> {
  // Import API service dynamically to avoid circular dependencies
  const { API } = await import('./ApiService');
  
  switch (item.type) {
    case 'booking':
      await API.post('/bookings', item.data);
      break;
      
    case 'payment':
      await API.post('/payments', item.data);
      break;
      
    case 'profile_update':
      await API.put('/profile', item.data);
      break;
      
    default:
      throw new Error(`Unknown sync type: ${item.type}`);
  }
}

/**
 * Check if app is in offline mode
 */
export async function isOffline(): Promise<boolean> {
  try {
    const netInfo = await NetInfo.fetch();
    return !netInfo.isConnected;
  } catch (error) {
    console.error('[OfflineService] Failed to check network status:', error);
    return false;
  }
}

/**
 * Get last sync timestamp
 */
export function getLastSyncTime(): number {
  try {
    const timestamp = storage.getString(KEYS.LAST_SYNC);
    return timestamp ? parseInt(timestamp, 10) : 0;
  } catch (error) {
    console.error('[OfflineService] Failed to get last sync time:', error);
    return 0;
  }
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  try {
    storage.delete(KEYS.DESTINATIONS);
    storage.delete(KEYS.BOOKINGS);
    storage.delete(KEYS.USER_PROFILE);
    console.log('[OfflineService] Cache cleared');
  } catch (error) {
    console.error('[OfflineService] Failed to clear cache:', error);
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  destinations: number;
  bookings: number;
  pendingSync: number;
  lastSync: string;
} {
  const destinations = getCachedDestinations();
  const bookings = getCachedBookings();
  const pendingSync = getPendingSyncQueue();
  const lastSync = new Date(getLastSyncTime()).toISOString();
  
  return {
    destinations: destinations.length,
    bookings: bookings.length,
    pendingSync: pendingSync.length,
    lastSync,
  };
}

export default {
  initializeOfflineStorage,
  cacheDestinations,
  getCachedDestinations,
  cacheBookings,
  getCachedBookings,
  cacheUserProfile,
  getCachedUserProfile,
  addToSyncQueue,
  getPendingSyncQueue,
  syncPendingData,
  isOffline,
  getLastSyncTime,
  clearCache,
  getCacheStats,
};
