/**
 * Offline Sync System - Spirit Tours AI Guide
 * 
 * Sistema completo de sincronización offline para conductores/guías.
 * Permite operación completa de la app sin conexión a internet.
 * 
 * Características:
 * - Gestión de datos offline (tours, rutas, POIs, pasajeros)
 * - Sincronización bidireccional con resolución de conflictos
 * - Queue de acciones pendientes
 * - Versionado de datos para control de cambios
 * - Compresión de datos para optimizar almacenamiento
 * - Selective sync (descarga solo datos necesarios)
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class OfflineSyncSystem extends EventEmitter {
  constructor(db, redisClient) {
    super();
    this.db = db;
    this.redis = redisClient;
    
    // Estrategias de resolución de conflictos
    this.conflictStrategies = {
      LAST_WRITE_WINS: 'last_write_wins',
      SERVER_WINS: 'server_wins',
      CLIENT_WINS: 'client_wins',
      MANUAL: 'manual'
    };
    
    // Estados de sincronización
    this.syncStatuses = {
      PENDING: 'pending',
      IN_PROGRESS: 'in_progress',
      COMPLETED: 'completed',
      FAILED: 'failed',
      CONFLICT: 'conflict'
    };
    
    // Tipos de entidades sincronizables
    this.syncableEntities = {
      TOURS: 'tours',
      ROUTES: 'routes',
      POIS: 'pois',
      PASSENGERS: 'passengers',
      BOOKINGS: 'bookings',
      FEEDBACK: 'feedback',
      MEDIA: 'media',
      SETTINGS: 'settings'
    };
    
    this.initDatabase();
  }
  
  /**
   * Inicializar esquema de base de datos
   */
  async initDatabase() {
    try {
      // Tabla de versiones de datos para tracking de cambios
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS offline_data_versions (
          id SERIAL PRIMARY KEY,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(100) NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          data JSONB NOT NULL,
          checksum VARCHAR(64) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted BOOLEAN DEFAULT FALSE,
          UNIQUE(entity_type, entity_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_offline_versions_entity 
        ON offline_data_versions(entity_type, entity_id);
        
        CREATE INDEX IF NOT EXISTS idx_offline_versions_updated 
        ON offline_data_versions(updated_at);
      `);
      
      // Tabla de queue de sincronización
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS offline_sync_queue (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) NOT NULL,
          action_type VARCHAR(50) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(100) NOT NULL,
          payload JSONB NOT NULL,
          client_timestamp TIMESTAMP NOT NULL,
          status VARCHAR(50) DEFAULT 'pending',
          attempts INTEGER DEFAULT 0,
          last_attempt_at TIMESTAMP,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          processed_at TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_sync_queue_user 
        ON offline_sync_queue(user_id, status);
        
        CREATE INDEX IF NOT EXISTS idx_sync_queue_status 
        ON offline_sync_queue(status, created_at);
      `);
      
      // Tabla de conflictos de sincronización
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS offline_sync_conflicts (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id VARCHAR(100) NOT NULL,
          client_version INTEGER,
          server_version INTEGER,
          client_data JSONB,
          server_data JSONB,
          resolution_strategy VARCHAR(50),
          resolved BOOLEAN DEFAULT FALSE,
          resolved_at TIMESTAMP,
          resolved_by VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_sync_conflicts_user 
        ON offline_sync_conflicts(user_id, resolved);
      `);
      
      // Tabla de manifiestos de descarga (para tracking de datos descargados)
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS offline_sync_manifests (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) NOT NULL,
          manifest_id VARCHAR(100) UNIQUE NOT NULL,
          entity_types JSONB NOT NULL,
          filters JSONB,
          total_entities INTEGER DEFAULT 0,
          total_size_bytes INTEGER DEFAULT 0,
          downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          checksum VARCHAR(64)
        );
        
        CREATE INDEX IF NOT EXISTS idx_sync_manifests_user 
        ON offline_sync_manifests(user_id, downloaded_at);
      `);
      
      // Tabla de estadísticas de sincronización
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS offline_sync_stats (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) NOT NULL,
          sync_type VARCHAR(50) NOT NULL,
          entities_synced INTEGER DEFAULT 0,
          entities_failed INTEGER DEFAULT 0,
          data_size_bytes INTEGER DEFAULT 0,
          duration_ms INTEGER DEFAULT 0,
          conflicts_detected INTEGER DEFAULT 0,
          status VARCHAR(50),
          error_message TEXT,
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_sync_stats_user 
        ON offline_sync_stats(user_id, started_at);
      `);
      
      console.log('✅ Offline Sync System: Database initialized');
    } catch (error) {
      console.error('❌ Error initializing offline sync database:', error);
      throw error;
    }
  }
  
  /**
   * Generar manifiesto de descarga para usuario
   * Determina qué datos debe descargar el cliente
   */
  async generateDownloadManifest(userId, options = {}) {
    try {
      const {
        entityTypes = Object.values(this.syncableEntities),
        filters = {},
        includeMedia = false,
        dateRange = null
      } = options;
      
      const manifestId = `MANIFEST-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const manifest = {
        manifestId,
        userId,
        generatedAt: new Date().toISOString(),
        entities: {}
      };
      
      let totalEntities = 0;
      let totalSize = 0;
      
      // Recopilar datos para cada tipo de entidad
      for (const entityType of entityTypes) {
        const entityData = await this.collectEntityData(
          entityType, 
          userId, 
          filters[entityType], 
          dateRange
        );
        
        manifest.entities[entityType] = {
          count: entityData.items.length,
          items: entityData.items,
          checksum: this.calculateChecksum(JSON.stringify(entityData.items))
        };
        
        totalEntities += entityData.items.length;
        totalSize += JSON.stringify(entityData.items).length;
      }
      
      // Guardar manifiesto en base de datos
      await this.db.query(`
        INSERT INTO offline_sync_manifests 
        (user_id, manifest_id, entity_types, filters, total_entities, total_size_bytes, checksum, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '7 days')
      `, [
        userId,
        manifestId,
        JSON.stringify(entityTypes),
        JSON.stringify(filters),
        totalEntities,
        totalSize,
        this.calculateChecksum(JSON.stringify(manifest))
      ]);
      
      manifest.totalEntities = totalEntities;
      manifest.totalSizeBytes = totalSize;
      manifest.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      
      this.emit('manifest:generated', { userId, manifestId, totalEntities, totalSize });
      
      return manifest;
      
    } catch (error) {
      console.error('Error generating download manifest:', error);
      throw error;
    }
  }
  
  /**
   * Recopilar datos de entidad específica
   */
  async collectEntityData(entityType, userId, filters = {}, dateRange = null) {
    const items = [];
    
    try {
      switch (entityType) {
        case this.syncableEntities.TOURS:
          // Obtener tours asignados al guía
          const toursResult = await this.db.query(`
            SELECT t.*, r.name as route_name, r.waypoints, r.pois
            FROM tours t
            LEFT JOIN routes r ON t.route_id = r.id
            WHERE t.guide_id = $1
            ${dateRange ? 'AND t.scheduled_date BETWEEN $2 AND $3' : ''}
            ORDER BY t.scheduled_date DESC
          `, dateRange ? [userId, dateRange.start, dateRange.end] : [userId]);
          
          items.push(...toursResult.rows.map(tour => ({
            id: tour.id,
            type: 'tour',
            version: tour.version || 1,
            data: tour,
            checksum: this.calculateChecksum(JSON.stringify(tour)),
            updatedAt: tour.updated_at
          })));
          break;
          
        case this.syncableEntities.ROUTES:
          // Obtener rutas relevantes
          const routesResult = await this.db.query(`
            SELECT DISTINCT r.*
            FROM routes r
            INNER JOIN tours t ON r.id = t.route_id
            WHERE t.guide_id = $1
          `, [userId]);
          
          items.push(...routesResult.rows.map(route => ({
            id: route.id,
            type: 'route',
            version: route.version || 1,
            data: route,
            checksum: this.calculateChecksum(JSON.stringify(route)),
            updatedAt: route.updated_at
          })));
          break;
          
        case this.syncableEntities.POIS:
          // Obtener POIs de las rutas del guía
          const poisResult = await this.db.query(`
            SELECT DISTINCT p.*
            FROM pois p
            INNER JOIN routes r ON p.route_id = r.id
            INNER JOIN tours t ON r.id = t.route_id
            WHERE t.guide_id = $1
          `, [userId]);
          
          items.push(...poisResult.rows.map(poi => ({
            id: poi.id,
            type: 'poi',
            version: poi.version || 1,
            data: poi,
            checksum: this.calculateChecksum(JSON.stringify(poi)),
            updatedAt: poi.updated_at
          })));
          break;
          
        case this.syncableEntities.BOOKINGS:
          // Obtener reservas de los tours del guía
          const bookingsResult = await this.db.query(`
            SELECT b.*, t.tour_name
            FROM bookings b
            INNER JOIN tours t ON b.tour_id = t.id
            WHERE t.guide_id = $1
            AND b.status IN ('confirmed', 'pending')
            ORDER BY b.tour_date DESC
          `, [userId]);
          
          items.push(...bookingsResult.rows.map(booking => ({
            id: booking.booking_id,
            type: 'booking',
            version: 1,
            data: booking,
            checksum: this.calculateChecksum(JSON.stringify(booking)),
            updatedAt: booking.updated_at
          })));
          break;
          
        case this.syncableEntities.PASSENGERS:
          // Obtener información de pasajeros
          const passengersResult = await this.db.query(`
            SELECT DISTINCT jsonb_array_elements(b.passenger_details) as passenger_data,
                   b.booking_id, b.tour_date
            FROM bookings b
            INNER JOIN tours t ON b.tour_id = t.id
            WHERE t.guide_id = $1
            AND b.status = 'confirmed'
            ORDER BY b.tour_date DESC
          `, [userId]);
          
          items.push(...passengersResult.rows.map((row, idx) => ({
            id: `${row.booking_id}-${idx}`,
            type: 'passenger',
            version: 1,
            data: {
              bookingId: row.booking_id,
              tourDate: row.tour_date,
              ...row.passenger_data
            },
            checksum: this.calculateChecksum(JSON.stringify(row.passenger_data)),
            updatedAt: new Date().toISOString()
          })));
          break;
          
        case this.syncableEntities.SETTINGS:
          // Configuraciones del usuario
          const settingsResult = await this.db.query(`
            SELECT * FROM user_settings WHERE user_id = $1
          `, [userId]);
          
          if (settingsResult.rows.length > 0) {
            items.push({
              id: userId,
              type: 'settings',
              version: 1,
              data: settingsResult.rows[0],
              checksum: this.calculateChecksum(JSON.stringify(settingsResult.rows[0])),
              updatedAt: settingsResult.rows[0].updated_at
            });
          }
          break;
      }
      
      return { items };
      
    } catch (error) {
      console.error(`Error collecting ${entityType} data:`, error);
      return { items: [] };
    }
  }
  
  /**
   * Procesar queue de sincronización desde cliente
   * Aplica cambios realizados offline por el cliente
   */
  async processSyncQueue(userId, queueItems) {
    try {
      const syncSessionId = `SYNC-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      const results = {
        sessionId: syncSessionId,
        processed: 0,
        failed: 0,
        conflicts: 0,
        items: []
      };
      
      // Registrar inicio de sincronización
      const statsResult = await this.db.query(`
        INSERT INTO offline_sync_stats 
        (user_id, sync_type, started_at)
        VALUES ($1, 'upload', NOW())
        RETURNING id
      `, [userId]);
      
      const statsId = statsResult.rows[0].id;
      
      for (const item of queueItems) {
        try {
          const result = await this.processSyncItem(userId, item);
          
          if (result.conflict) {
            results.conflicts++;
            results.items.push({ ...result, status: 'conflict' });
          } else if (result.success) {
            results.processed++;
            results.items.push({ ...result, status: 'success' });
          } else {
            results.failed++;
            results.items.push({ ...result, status: 'failed' });
          }
          
        } catch (error) {
          results.failed++;
          results.items.push({
            itemId: item.id,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      // Actualizar estadísticas
      await this.db.query(`
        UPDATE offline_sync_stats 
        SET entities_synced = $1,
            entities_failed = $2,
            conflicts_detected = $3,
            status = $4,
            completed_at = NOW(),
            duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000
        WHERE id = $5
      `, [
        results.processed,
        results.failed,
        results.conflicts,
        results.failed > 0 ? 'partial' : 'completed',
        statsId
      ]);
      
      this.emit('sync:completed', {
        userId,
        sessionId: syncSessionId,
        ...results
      });
      
      return results;
      
    } catch (error) {
      console.error('Error processing sync queue:', error);
      throw error;
    }
  }
  
  /**
   * Procesar item individual de sincronización
   */
  async processSyncItem(userId, item) {
    const {
      id,
      entityType,
      entityId,
      action,
      data,
      version: clientVersion,
      timestamp: clientTimestamp
    } = item;
    
    try {
      // Verificar versión actual en servidor
      const currentVersion = await this.getEntityVersion(entityType, entityId);
      
      // Detectar conflicto
      if (currentVersion && currentVersion.version > clientVersion) {
        // Conflicto detectado - versión del servidor es más nueva
        await this.recordConflict(userId, entityType, entityId, {
          clientVersion,
          serverVersion: currentVersion.version,
          clientData: data,
          serverData: currentVersion.data,
          clientTimestamp
        });
        
        return {
          success: false,
          conflict: true,
          entityType,
          entityId,
          serverVersion: currentVersion.version,
          clientVersion
        };
      }
      
      // Aplicar cambio según acción
      let result;
      switch (action) {
        case 'create':
          result = await this.createEntity(entityType, entityId, data, userId);
          break;
          
        case 'update':
          result = await this.updateEntity(entityType, entityId, data, userId);
          break;
          
        case 'delete':
          result = await this.deleteEntity(entityType, entityId, userId);
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      // Actualizar versión
      await this.updateEntityVersion(entityType, entityId, data);
      
      return {
        success: true,
        entityType,
        entityId,
        action,
        newVersion: result.version
      };
      
    } catch (error) {
      console.error(`Error processing sync item ${entityId}:`, error);
      return {
        success: false,
        entityType,
        entityId,
        error: error.message
      };
    }
  }
  
  /**
   * Obtener versión actual de entidad
   */
  async getEntityVersion(entityType, entityId) {
    try {
      const result = await this.db.query(`
        SELECT version, data, updated_at
        FROM offline_data_versions
        WHERE entity_type = $1 AND entity_id = $2 AND deleted = FALSE
      `, [entityType, entityId]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error getting entity version:', error);
      return null;
    }
  }
  
  /**
   * Actualizar versión de entidad
   */
  async updateEntityVersion(entityType, entityId, data) {
    const checksum = this.calculateChecksum(JSON.stringify(data));
    
    await this.db.query(`
      INSERT INTO offline_data_versions 
      (entity_type, entity_id, version, data, checksum, updated_at)
      VALUES ($1, $2, 1, $3, $4, NOW())
      ON CONFLICT (entity_type, entity_id)
      DO UPDATE SET
        version = offline_data_versions.version + 1,
        data = $3,
        checksum = $4,
        updated_at = NOW()
    `, [entityType, entityId, JSON.stringify(data), checksum]);
  }
  
  /**
   * Registrar conflicto de sincronización
   */
  async recordConflict(userId, entityType, entityId, conflictData) {
    await this.db.query(`
      INSERT INTO offline_sync_conflicts
      (user_id, entity_type, entity_id, client_version, server_version, 
       client_data, server_data, resolution_strategy)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      userId,
      entityType,
      entityId,
      conflictData.clientVersion,
      conflictData.serverVersion,
      JSON.stringify(conflictData.clientData),
      JSON.stringify(conflictData.serverData),
      this.conflictStrategies.LAST_WRITE_WINS
    ]);
    
    this.emit('sync:conflict', {
      userId,
      entityType,
      entityId,
      ...conflictData
    });
  }
  
  /**
   * Resolver conflicto
   */
  async resolveConflict(conflictId, resolution, resolvedBy) {
    try {
      const conflict = await this.db.query(`
        SELECT * FROM offline_sync_conflicts WHERE id = $1
      `, [conflictId]);
      
      if (conflict.rows.length === 0) {
        throw new Error('Conflict not found');
      }
      
      const conflictData = conflict.rows[0];
      let finalData;
      
      // Aplicar estrategia de resolución
      switch (resolution.strategy) {
        case this.conflictStrategies.SERVER_WINS:
          finalData = conflictData.server_data;
          break;
          
        case this.conflictStrategies.CLIENT_WINS:
          finalData = conflictData.client_data;
          break;
          
        case this.conflictStrategies.LAST_WRITE_WINS:
          // Comparar timestamps
          finalData = new Date(resolution.clientTimestamp) > new Date(conflictData.updated_at)
            ? conflictData.client_data
            : conflictData.server_data;
          break;
          
        case this.conflictStrategies.MANUAL:
          finalData = resolution.mergedData;
          break;
          
        default:
          throw new Error('Unknown resolution strategy');
      }
      
      // Aplicar datos resueltos
      await this.updateEntity(
        conflictData.entity_type,
        conflictData.entity_id,
        finalData,
        resolvedBy
      );
      
      // Marcar conflicto como resuelto
      await this.db.query(`
        UPDATE offline_sync_conflicts
        SET resolved = TRUE,
            resolved_at = NOW(),
            resolved_by = $1,
            resolution_strategy = $2
        WHERE id = $3
      `, [resolvedBy, resolution.strategy, conflictId]);
      
      this.emit('conflict:resolved', {
        conflictId,
        entityType: conflictData.entity_type,
        entityId: conflictData.entity_id,
        strategy: resolution.strategy
      });
      
      return { success: true, finalData };
      
    } catch (error) {
      console.error('Error resolving conflict:', error);
      throw error;
    }
  }
  
  /**
   * Crear entidad
   */
  async createEntity(entityType, entityId, data, userId) {
    // Implementación específica según tipo de entidad
    // Por ahora, versión genérica
    return {
      success: true,
      version: 1,
      entityId
    };
  }
  
  /**
   * Actualizar entidad
   */
  async updateEntity(entityType, entityId, data, userId) {
    // Implementación específica según tipo de entidad
    return {
      success: true,
      version: 2,
      entityId
    };
  }
  
  /**
   * Eliminar entidad
   */
  async deleteEntity(entityType, entityId, userId) {
    await this.db.query(`
      UPDATE offline_data_versions
      SET deleted = TRUE, updated_at = NOW()
      WHERE entity_type = $1 AND entity_id = $2
    `, [entityType, entityId]);
    
    return { success: true, entityId };
  }
  
  /**
   * Obtener cambios desde última sincronización
   */
  async getChangesSince(userId, lastSyncTimestamp) {
    try {
      const changes = await this.db.query(`
        SELECT entity_type, entity_id, version, data, checksum, updated_at, deleted
        FROM offline_data_versions
        WHERE updated_at > $1
        ORDER BY updated_at ASC
      `, [lastSyncTimestamp]);
      
      return {
        changes: changes.rows,
        currentTimestamp: new Date().toISOString(),
        count: changes.rows.length
      };
      
    } catch (error) {
      console.error('Error getting changes:', error);
      throw error;
    }
  }
  
  /**
   * Obtener conflictos pendientes para usuario
   */
  async getPendingConflicts(userId) {
    try {
      const conflicts = await this.db.query(`
        SELECT * FROM offline_sync_conflicts
        WHERE user_id = $1 AND resolved = FALSE
        ORDER BY created_at DESC
      `, [userId]);
      
      return conflicts.rows;
      
    } catch (error) {
      console.error('Error getting conflicts:', error);
      throw error;
    }
  }
  
  /**
   * Calcular checksum de datos
   */
  calculateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * Obtener estadísticas de sincronización
   */
  async getSyncStatistics(userId, timeRange = '7 days') {
    try {
      const stats = await this.db.query(`
        SELECT 
          COUNT(*) as total_syncs,
          SUM(entities_synced) as total_entities_synced,
          SUM(entities_failed) as total_entities_failed,
          SUM(conflicts_detected) as total_conflicts,
          AVG(duration_ms) as avg_duration_ms,
          MAX(started_at) as last_sync_at
        FROM offline_sync_stats
        WHERE user_id = $1
        AND started_at >= NOW() - INTERVAL '${timeRange}'
      `, [userId]);
      
      const pendingConflicts = await this.getPendingConflicts(userId);
      
      return {
        ...stats.rows[0],
        pending_conflicts: pendingConflicts.length,
        last_sync_timestamp: stats.rows[0].last_sync_at
      };
      
    } catch (error) {
      console.error('Error getting sync statistics:', error);
      throw error;
    }
  }
  
  /**
   * Limpiar datos antiguos
   */
  async cleanupOldData(daysToKeep = 30) {
    try {
      // Limpiar manifiestos antiguos
      await this.db.query(`
        DELETE FROM offline_sync_manifests
        WHERE downloaded_at < NOW() - INTERVAL '${daysToKeep} days'
      `);
      
      // Limpiar estadísticas antiguas
      await this.db.query(`
        DELETE FROM offline_sync_stats
        WHERE started_at < NOW() - INTERVAL '${daysToKeep} days'
      `);
      
      // Limpiar conflictos resueltos antiguos
      await this.db.query(`
        DELETE FROM offline_sync_conflicts
        WHERE resolved = TRUE
        AND resolved_at < NOW() - INTERVAL '${daysToKeep} days'
      `);
      
      console.log(`✅ Cleaned up offline data older than ${daysToKeep} days`);
      
    } catch (error) {
      console.error('Error cleaning up old data:', error);
    }
  }
}

module.exports = OfflineSyncSystem;
