/**
 * Offline Sync Router - Spirit Tours AI Guide
 * 
 * API endpoints para gestión de sincronización offline
 */

const express = require('express');
const router = express.Router();

/**
 * Inicializar router con el sistema de sincronización
 */
function initOfflineRouter(offlineSystem) {
  
  /**
   * POST /api/offline/manifest/generate
   * Generar manifiesto de descarga para sincronización inicial
   */
  router.post('/manifest/generate', async (req, res) => {
    try {
      const {
        userId,
        entityTypes,
        filters,
        includeMedia,
        dateRange
      } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          error: 'userId is required'
        });
      }
      
      const manifest = await offlineSystem.generateDownloadManifest(userId, {
        entityTypes,
        filters,
        includeMedia,
        dateRange
      });
      
      res.json({
        success: true,
        manifest
      });
      
    } catch (error) {
      console.error('Error generating manifest:', error);
      res.status(500).json({
        error: 'Failed to generate manifest',
        message: error.message
      });
    }
  });
  
  /**
   * GET /api/offline/manifest/:manifestId
   * Obtener manifiesto existente
   */
  router.get('/manifest/:manifestId', async (req, res) => {
    try {
      const { manifestId } = req.params;
      
      const result = await offlineSystem.db.query(`
        SELECT * FROM offline_sync_manifests
        WHERE manifest_id = $1
      `, [manifestId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Manifest not found'
        });
      }
      
      res.json({
        success: true,
        manifest: result.rows[0]
      });
      
    } catch (error) {
      console.error('Error getting manifest:', error);
      res.status(500).json({
        error: 'Failed to get manifest',
        message: error.message
      });
    }
  });
  
  /**
   * POST /api/offline/sync/upload
   * Subir cambios realizados offline (queue de sincronización)
   */
  router.post('/sync/upload', async (req, res) => {
    try {
      const { userId, queueItems } = req.body;
      
      if (!userId || !queueItems || !Array.isArray(queueItems)) {
        return res.status(400).json({
          error: 'userId and queueItems (array) are required'
        });
      }
      
      const results = await offlineSystem.processSyncQueue(userId, queueItems);
      
      res.json({
        success: true,
        sync: results
      });
      
    } catch (error) {
      console.error('Error processing sync upload:', error);
      res.status(500).json({
        error: 'Failed to process sync upload',
        message: error.message
      });
    }
  });
  
  /**
   * GET /api/offline/sync/changes
   * Obtener cambios desde última sincronización
   */
  router.get('/sync/changes', async (req, res) => {
    try {
      const { userId, lastSyncTimestamp } = req.query;
      
      if (!userId || !lastSyncTimestamp) {
        return res.status(400).json({
          error: 'userId and lastSyncTimestamp are required'
        });
      }
      
      const changes = await offlineSystem.getChangesSince(
        userId,
        lastSyncTimestamp
      );
      
      res.json({
        success: true,
        ...changes
      });
      
    } catch (error) {
      console.error('Error getting changes:', error);
      res.status(500).json({
        error: 'Failed to get changes',
        message: error.message
      });
    }
  });
  
  /**
   * GET /api/offline/conflicts
   * Obtener conflictos pendientes de resolución
   */
  router.get('/conflicts', async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({
          error: 'userId is required'
        });
      }
      
      const conflicts = await offlineSystem.getPendingConflicts(userId);
      
      res.json({
        success: true,
        conflicts,
        count: conflicts.length
      });
      
    } catch (error) {
      console.error('Error getting conflicts:', error);
      res.status(500).json({
        error: 'Failed to get conflicts',
        message: error.message
      });
    }
  });
  
  /**
   * POST /api/offline/conflicts/:conflictId/resolve
   * Resolver conflicto específico
   */
  router.post('/conflicts/:conflictId/resolve', async (req, res) => {
    try {
      const { conflictId } = req.params;
      const { strategy, mergedData, clientTimestamp, resolvedBy } = req.body;
      
      if (!resolvedBy) {
        return res.status(400).json({
          error: 'resolvedBy is required'
        });
      }
      
      const result = await offlineSystem.resolveConflict(
        conflictId,
        { strategy, mergedData, clientTimestamp },
        resolvedBy
      );
      
      res.json({
        success: true,
        ...result
      });
      
    } catch (error) {
      console.error('Error resolving conflict:', error);
      res.status(500).json({
        error: 'Failed to resolve conflict',
        message: error.message
      });
    }
  });
  
  /**
   * GET /api/offline/stats
   * Obtener estadísticas de sincronización
   */
  router.get('/stats', async (req, res) => {
    try {
      const { userId, timeRange = '7 days' } = req.query;
      
      if (!userId) {
        return res.status(400).json({
          error: 'userId is required'
        });
      }
      
      const stats = await offlineSystem.getSyncStatistics(userId, timeRange);
      
      res.json({
        success: true,
        stats
      });
      
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({
        error: 'Failed to get stats',
        message: error.message
      });
    }
  });
  
  /**
   * GET /api/offline/ping
   * Health check endpoint
   */
  router.get('/ping', (req, res) => {
    res.json({
      success: true,
      online: true,
      timestamp: new Date().toISOString(),
      message: 'Offline Sync System is operational'
    });
  });
  
  /**
   * POST /api/offline/data/download
   * Descargar datos específicos para uso offline
   */
  router.post('/data/download', async (req, res) => {
    try {
      const { userId, entityType, entityIds } = req.body;
      
      if (!userId || !entityType) {
        return res.status(400).json({
          error: 'userId and entityType are required'
        });
      }
      
      const data = await offlineSystem.collectEntityData(
        entityType,
        userId,
        entityIds ? { ids: entityIds } : {}
      );
      
      res.json({
        success: true,
        entityType,
        count: data.items.length,
        data: data.items
      });
      
    } catch (error) {
      console.error('Error downloading data:', error);
      res.status(500).json({
        error: 'Failed to download data',
        message: error.message
      });
    }
  });
  
  /**
   * POST /api/offline/data/validate
   * Validar integridad de datos offline
   */
  router.post('/data/validate', async (req, res) => {
    try {
      const { userId, checksums } = req.body;
      
      if (!userId || !checksums) {
        return res.status(400).json({
          error: 'userId and checksums are required'
        });
      }
      
      const validationResults = [];
      
      for (const [entityId, clientChecksum] of Object.entries(checksums)) {
        const serverVersion = await offlineSystem.getEntityVersion(
          'tours', // Tipo genérico, debería parametrizarse
          entityId
        );
        
        validationResults.push({
          entityId,
          valid: serverVersion && serverVersion.checksum === clientChecksum,
          serverChecksum: serverVersion?.checksum,
          clientChecksum
        });
      }
      
      res.json({
        success: true,
        validations: validationResults,
        allValid: validationResults.every(v => v.valid)
      });
      
    } catch (error) {
      console.error('Error validating data:', error);
      res.status(500).json({
        error: 'Failed to validate data',
        message: error.message
      });
    }
  });
  
  /**
   * DELETE /api/offline/data/cleanup
   * Limpiar datos antiguos (admin only)
   */
  router.delete('/data/cleanup', async (req, res) => {
    try {
      const { daysToKeep = 30, adminKey } = req.body;
      
      // Verificación simple de admin (debería ser más robusta en producción)
      if (adminKey !== process.env.ADMIN_SECRET_KEY) {
        return res.status(403).json({
          error: 'Unauthorized'
        });
      }
      
      await offlineSystem.cleanupOldData(daysToKeep);
      
      res.json({
        success: true,
        message: `Cleaned up data older than ${daysToKeep} days`
      });
      
    } catch (error) {
      console.error('Error cleaning up data:', error);
      res.status(500).json({
        error: 'Failed to cleanup data',
        message: error.message
      });
    }
  });
  
  return router;
}

module.exports = initOfflineRouter;
