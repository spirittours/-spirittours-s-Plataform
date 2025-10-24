/**
 * Offline Data Manager - Spirit Tours AI Guide
 * 
 * Gestión de datos offline con IndexedDB
 * Sincronización bidireccional con el servidor
 */

import { openDB, IDBPDatabase } from 'idb';

export interface SyncQueueItem {
  id?: number;
  userId: string;
  entityType: string;
  entityId: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  version: number;
  timestamp: string;
  synced: boolean;
}

export interface OfflineEntity {
  id: string;
  type: string;
  version: number;
  data: any;
  checksum: string;
  updatedAt: string;
  downloaded At: string;
}

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  conflicts: number;
  items: any[];
}

class OfflineDataManager {
  private dbName = 'SpiritToursDB';
  private dbVersion = 1;
  private db: IDBPDatabase | null = null;
  private apiBaseUrl: string;
  private userId: string | null = null;
  
  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl;
  }
  
  /**
   * Inicializar base de datos IndexedDB
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    
    this.db = await openDB(this.dbName, this.dbVersion, {
      upgrade(db) {
        // Store para tours
        if (!db.objectStoreNames.contains('tours')) {
          const toursStore = db.createObjectStore('tours', { keyPath: 'id' });
          toursStore.createIndex('updatedAt', 'updatedAt');
          toursStore.createIndex('scheduledDate', 'data.scheduled_date');
        }
        
        // Store para rutas
        if (!db.objectStoreNames.contains('routes')) {
          const routesStore = db.createObjectStore('routes', { keyPath: 'id' });
          routesStore.createIndex('updatedAt', 'updatedAt');
        }
        
        // Store para POIs
        if (!db.objectStoreNames.contains('pois')) {
          const poisStore = db.createObjectStore('pois', { keyPath: 'id' });
          poisStore.createIndex('routeId', 'data.route_id');
          poisStore.createIndex('updatedAt', 'updatedAt');
        }
        
        // Store para reservas
        if (!db.objectStoreNames.contains('bookings')) {
          const bookingsStore = db.createObjectStore('bookings', { keyPath: 'id' });
          bookingsStore.createIndex('tourId', 'data.tour_id');
          bookingsStore.createIndex('updatedAt', 'updatedAt');
        }
        
        // Store para pasajeros
        if (!db.objectStoreNames.contains('passengers')) {
          const passengersStore = db.createObjectStore('passengers', { keyPath: 'id' });
          passengersStore.createIndex('bookingId', 'data.bookingId');
        }
        
        // Store para configuraciones
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        
        // Store para queue de sincronización
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          syncStore.createIndex('synced', 'synced');
          syncStore.createIndex('timestamp', 'timestamp');
        }
        
        // Store para metadatos de sincronización
        if (!db.objectStoreNames.contains('syncMetadata')) {
          db.createObjectStore('syncMetadata', { keyPath: 'key' });
        }
      }
    });
    
    console.log('✅ OfflineDataManager initialized');
  }
  
  /**
   * Descargar datos iniciales del servidor
   */
  async downloadInitialData(options: {
    entityTypes?: string[];
    dateRange?: { start: string; end: string };
  } = {}): Promise<{ success: boolean; totalEntities: number }> {
    try {
      if (!this.userId) {
        throw new Error('User ID not set');
      }
      
      // Generar manifiesto
      const response = await fetch(`${this.apiBaseUrl}/offline/manifest/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: this.userId,
          ...options
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate manifest');
      }
      
      const { manifest } = await response.json();
      
      // Guardar datos en IndexedDB
      let totalEntities = 0;
      
      for (const [entityType, entityData] of Object.entries(manifest.entities)) {
        const items = (entityData as any).items || [];
        
        for (const item of items) {
          await this.saveEntity(item);
          totalEntities++;
        }
      }
      
      // Guardar metadata de sincronización
      await this.saveMetadata('lastSync', {
        timestamp: new Date().toISOString(),
        manifestId: manifest.manifestId,
        entityCount: totalEntities
      });
      
      console.log(`✅ Downloaded ${totalEntities} entities`);
      
      return {
        success: true,
        totalEntities
      };
      
    } catch (error) {
      console.error('Error downloading initial data:', error);
      throw error;
    }
  }
  
  /**
   * Guardar entidad en IndexedDB
   */
  private async saveEntity(entity: OfflineEntity): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const storeName = this.getStoreName(entity.type);
    
    const entityWithMetadata = {
      ...entity,
      downloadedAt: new Date().toISOString()
    };
    
    await this.db.put(storeName, entityWithMetadata);
  }
  
  /**
   * Obtener nombre de store según tipo
   */
  private getStoreName(entityType: string): string {
    const typeMap: Record<string, string> = {
      'tour': 'tours',
      'route': 'routes',
      'poi': 'pois',
      'booking': 'bookings',
      'passenger': 'passengers',
      'settings': 'settings'
    };
    
    return typeMap[entityType] || entityType + 's';
  }
  
  /**
   * Obtener entidad por ID
   */
  async getEntity(entityType: string, entityId: string): Promise<OfflineEntity | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const storeName = this.getStoreName(entityType);
    const entity = await this.db.get(storeName, entityId);
    
    return entity || null;
  }
  
  /**
   * Obtener todas las entidades de un tipo
   */
  async getAllEntities(entityType: string): Promise<OfflineEntity[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const storeName = this.getStoreName(entityType);
    return await this.db.getAll(storeName);
  }
  
  /**
   * Crear o actualizar entidad offline
   */
  async saveEntityOffline(
    entityType: string,
    entityId: string,
    data: any,
    action: 'create' | 'update' | 'delete' = 'update'
  ): Promise<void> {
    if (!this.db || !this.userId) {
      throw new Error('Database not initialized');
    }
    
    // Guardar en store correspondiente
    if (action !== 'delete') {
      const entity: OfflineEntity = {
        id: entityId,
        type: entityType,
        version: 1,
        data,
        checksum: '',
        updatedAt: new Date().toISOString(),
        downloadedAt: new Date().toISOString()
      };
      
      await this.saveEntity(entity);
    } else {
      // Eliminar de store
      const storeName = this.getStoreName(entityType);
      await this.db.delete(storeName, entityId);
    }
    
    // Agregar a queue de sincronización
    const queueItem: SyncQueueItem = {
      userId: this.userId,
      entityType,
      entityId,
      action,
      data,
      version: 1,
      timestamp: new Date().toISOString(),
      synced: false
    };
    
    await this.db.add('syncQueue', queueItem);
    
    console.log(`✅ Saved ${entityType} ${entityId} offline (action: ${action})`);
    
    // Intentar sincronizar si hay conexión
    if (navigator.onLine) {
      this.syncNow();
    }
  }
  
  /**
   * Sincronizar cambios offline con servidor
   */
  async syncNow(): Promise<SyncResult> {
    try {
      if (!this.db || !this.userId) {
        throw new Error('Database not initialized');
      }
      
      // Obtener items pendientes
      const tx = this.db.transaction('syncQueue', 'readonly');
      const store = tx.objectStore('syncQueue');
      const index = store.index('synced');
      const pendingItems = await index.getAll(false);
      
      if (pendingItems.length === 0) {
        console.log('No items to sync');
        return {
          success: true,
          processed: 0,
          failed: 0,
          conflicts: 0,
          items: []
        };
      }
      
      console.log(`Syncing ${pendingItems.length} items...`);
      
      // Enviar al servidor
      const response = await fetch(`${this.apiBaseUrl}/offline/sync/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: this.userId,
          queueItems: pendingItems
        })
      });
      
      if (!response.ok) {
        throw new Error('Sync failed');
      }
      
      const result: SyncResult = await response.json();
      
      // Marcar items como sincronizados
      const writeTx = this.db.transaction('syncQueue', 'readwrite');
      const writeStore = writeTx.objectStore('syncQueue');
      
      for (const item of pendingItems) {
        if (item.id) {
          await writeStore.delete(item.id);
        }
      }
      
      await writeTx.done;
      
      // Actualizar metadata
      await this.saveMetadata('lastSync', {
        timestamp: new Date().toISOString(),
        itemsSynced: result.processed
      });
      
      console.log(`✅ Sync complete: ${result.processed} processed, ${result.conflicts} conflicts`);
      
      return result;
      
    } catch (error) {
      console.error('Sync error:', error);
      throw error;
    }
  }
  
  /**
   * Obtener cambios desde servidor
   */
  async pullChanges(): Promise<{ changes: any[]; count: number }> {
    try {
      if (!this.userId) {
        throw new Error('User ID not set');
      }
      
      const metadata = await this.getMetadata('lastSync');
      const lastSyncTimestamp = metadata?.timestamp || new Date(0).toISOString();
      
      const response = await fetch(
        `${this.apiBaseUrl}/offline/sync/changes?userId=${this.userId}&lastSyncTimestamp=${lastSyncTimestamp}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to pull changes');
      }
      
      const { changes, currentTimestamp } = await response.json();
      
      // Aplicar cambios localmente
      for (const change of changes) {
        if (!change.deleted) {
          await this.saveEntity({
            id: change.entity_id,
            type: change.entity_type,
            version: change.version,
            data: change.data,
            checksum: change.checksum,
            updatedAt: change.updated_at,
            downloadedAt: new Date().toISOString()
          });
        } else {
          const storeName = this.getStoreName(change.entity_type);
          await this.db?.delete(storeName, change.entity_id);
        }
      }
      
      // Actualizar timestamp
      await this.saveMetadata('lastSync', {
        timestamp: currentTimestamp,
        changesReceived: changes.length
      });
      
      console.log(`✅ Pulled ${changes.length} changes from server`);
      
      return {
        changes,
        count: changes.length
      };
      
    } catch (error) {
      console.error('Error pulling changes:', error);
      throw error;
    }
  }
  
  /**
   * Sincronización bidireccional completa
   */
  async fullSync(): Promise<{ upload: SyncResult; download: any }> {
    // 1. Subir cambios locales
    const uploadResult = await this.syncNow();
    
    // 2. Descargar cambios del servidor
    const downloadResult = await this.pullChanges();
    
    return {
      upload: uploadResult,
      download: downloadResult
    };
  }
  
  /**
   * Guardar metadata
   */
  private async saveMetadata(key: string, value: any): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    await this.db.put('syncMetadata', { key, value });
  }
  
  /**
   * Obtener metadata
   */
  private async getMetadata(key: string): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const record = await this.db.get('syncMetadata', key);
    return record?.value;
  }
  
  /**
   * Obtener estadísticas de sincronización
   */
  async getSyncStats(): Promise<{
    pendingItems: number;
    lastSync: string | null;
    totalEntities: number;
    storageUsed: number;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const tx = this.db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');
    const index = store.index('synced');
    const pendingItems = await index.count(false);
    
    const metadata = await this.getMetadata('lastSync');
    
    // Contar entidades totales
    let totalEntities = 0;
    const storeNames = ['tours', 'routes', 'pois', 'bookings', 'passengers'];
    
    for (const storeName of storeNames) {
      const count = await this.db.count(storeName);
      totalEntities += count;
    }
    
    // Estimar storage usado (aproximado)
    const estimate = await navigator.storage?.estimate();
    const storageUsed = estimate?.usage || 0;
    
    return {
      pendingItems,
      lastSync: metadata?.timestamp || null,
      totalEntities,
      storageUsed
    };
  }
  
  /**
   * Limpiar todos los datos offline
   */
  async clearAll(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const storeNames = ['tours', 'routes', 'pois', 'bookings', 'passengers', 'settings', 'syncQueue', 'syncMetadata'];
    
    for (const storeName of storeNames) {
      await this.db.clear(storeName);
    }
    
    console.log('✅ All offline data cleared');
  }
  
  /**
   * Verificar si hay conexión y sincronizar automáticamente
   */
  setupAutoSync(intervalMinutes: number = 5): void {
    setInterval(async () => {
      if (navigator.onLine) {
        try {
          await this.fullSync();
        } catch (error) {
          console.error('Auto-sync failed:', error);
        }
      }
    }, intervalMinutes * 60 * 1000);
    
    // También sincronizar cuando vuelva la conexión
    window.addEventListener('online', async () => {
      console.log('Connection restored, syncing...');
      try {
        await this.fullSync();
      } catch (error) {
        console.error('Sync on reconnect failed:', error);
      }
    });
  }
}

export default OfflineDataManager;
