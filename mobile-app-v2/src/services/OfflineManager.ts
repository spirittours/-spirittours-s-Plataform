/**
 * Offline Manager
 * Handles offline data storage and synchronization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { MMKV } from 'react-native-mmkv';

// Fast storage for offline data
const storage = new MMKV({
  id: 'offline-storage',
  encryptionKey: 'spirit-tours-offline-key',
});

export interface OfflineAction {
  id: string;
  type: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data: any;
  timestamp: number;
  retries: number;
}

class OfflineManagerClass {
  private syncQueue: OfflineAction[] = [];
  private isOnline = true;
  private isSyncing = false;

  async initialize() {
    // Load sync queue from storage
    const queueData = storage.getString('sync_queue');
    if (queueData) {
      this.syncQueue = JSON.parse(queueData);
    }

    // Listen to network changes
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      if (this.isOnline && this.syncQueue.length > 0) {
        this.synchronize();
      }
    });
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  // Cache data for offline use
  async cacheData(key: string, data: any): Promise<void> {
    try {
      storage.set(key, JSON.stringify(data));
    } catch (error) {
      console.error('Cache error:', error);
    }
  }

  // Get cached data
  async getCachedData(key: string): Promise<any> {
    try {
      const data = storage.getString(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Get cache error:', error);
      return null;
    }
  }

  // Add action to sync queue
  async addToSyncQueue(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>): Promise<void> {
    const offlineAction: OfflineAction = {
      ...action,
      id: Date.now().toString(),
      timestamp: Date.now(),
      retries: 0,
    };

    this.syncQueue.push(offlineAction);
    await this.saveSyncQueue();

    // Try to sync if online
    if (this.isOnline) {
      this.synchronize();
    }
  }

  // Save sync queue to storage
  private async saveSyncQueue(): Promise<void> {
    storage.set('sync_queue', JSON.stringify(this.syncQueue));
  }

  // Synchronize offline actions
  async synchronize(): Promise<void> {
    if (this.isSyncing || !this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;

    try {
      const actionsToSync = [...this.syncQueue];
      const successfulActions: string[] = [];

      for (const action of actionsToSync) {
        try {
          // Execute the action
          await this.executeAction(action);
          successfulActions.push(action.id);
        } catch (error) {
          console.error(`Sync failed for action ${action.id}:`, error);
          
          // Increment retry count
          action.retries += 1;
          
          // Remove if max retries reached
          if (action.retries >= 3) {
            successfulActions.push(action.id);
            console.log(`Max retries reached for action ${action.id}, removing`);
          }
        }
      }

      // Remove successful actions from queue
      this.syncQueue = this.syncQueue.filter(
        action => !successfulActions.includes(action.id)
      );
      
      await this.saveSyncQueue();
    } finally {
      this.isSyncing = false;
    }
  }

  // Execute a single action
  private async executeAction(action: OfflineAction): Promise<void> {
    // Import apiClient dynamically to avoid circular dependency
    const { default: apiClient } = await import('./api/apiClient');
    
    const response = await apiClient.request({
      method: action.method,
      url: action.endpoint,
      data: action.data,
    });

    return response.data;
  }

  // Clear all offline data
  async clearOfflineData(): Promise<void> {
    storage.clearAll();
    this.syncQueue = [];
  }

  // Get sync queue status
  getSyncStatus(): {
    queueLength: number;
    isOnline: boolean;
    isSyncing: boolean;
  } {
    return {
      queueLength: this.syncQueue.length,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
    };
  }
}

export const OfflineManager = new OfflineManagerClass();
