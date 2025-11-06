const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const MediaAsset = require('../../models/cms/MediaAsset');

/**
 * MediaManagerService - Gestión completa de archivos multimedia
 * Upload, organización, optimización, thumbnails, CDN
 */
class MediaManagerService extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
    this.uploadDir = path.join(process.cwd(), 'uploads');
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('[MediaManagerService] Initializing...');
    
    // Crear directorio de uploads si no existe
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'thumbnails'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'optimized'), { recursive: true });
    } catch (error) {
      console.error('[MediaManagerService] Error creating directories:', error);
    }
    
    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Guardar archivo subido
   */
  async saveUpload(file, userId, options = {}) {
    try {
      const {
        folder = '/',
        category = 'other',
        tags = [],
        alt = '',
        title = '',
        description = ''
      } = options;

      // Generar nombre único
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const filename = `${timestamp}_${path.basename(file.originalname, ext)}${ext}`;
      
      // Ruta completa
      const uploadPath = path.join(this.uploadDir, filename);
      
      // Guardar archivo (si viene de multer, mover de temp a uploads)
      if (file.path) {
        await fs.rename(file.path, uploadPath);
      } else if (file.buffer) {
        await fs.writeFile(uploadPath, file.buffer);
      }

      // URL relativa
      const url = `/uploads/${filename}`;

      // Crear registro en BD
      const mediaAsset = new MediaAsset({
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        url,
        folder,
        category,
        tags,
        metadata: {
          alt,
          title: title || file.originalname,
          description
        },
        uploadedBy: userId,
        storage: {
          provider: 'local',
          key: filename
        }
      });

      // Extraer metadata adicional según tipo
      if (mediaAsset.type === 'image') {
        await this.extractImageMetadata(mediaAsset, uploadPath);
      }

      await mediaAsset.save();

      this.emit('media:uploaded', { mediaAsset });

      return {
        success: true,
        asset: mediaAsset
      };
    } catch (error) {
      console.error('[MediaManagerService] Error saving upload:', error);
      throw error;
    }
  }

  /**
   * Extraer metadata de imagen (width, height, etc.)
   */
  async extractImageMetadata(mediaAsset, filePath) {
    try {
      // Aquí se usaría sharp para obtener dimensiones reales
      // Por ahora, valores placeholder
      mediaAsset.metadata.width = 1920;
      mediaAsset.metadata.height = 1080;
      mediaAsset.metadata.aspectRatio = '16:9';
      mediaAsset.metadata.format = path.extname(filePath).substring(1);
    } catch (error) {
      console.error('[MediaManagerService] Error extracting image metadata:', error);
    }
  }

  /**
   * Obtener asset por ID
   */
  async getAsset(assetId) {
    try {
      const asset = await MediaAsset.findById(assetId)
        .populate('uploadedBy', 'name email');

      if (!asset) {
        throw new Error('Asset not found');
      }

      return { success: true, asset };
    } catch (error) {
      console.error('[MediaManagerService] Error getting asset:', error);
      throw error;
    }
  }

  /**
   * Listar assets con filtros
   */
  async listAssets(options = {}) {
    try {
      const {
        type,
        category,
        folder,
        tags,
        search,
        uploadedBy,
        page = 1,
        limit = 50,
        sort = { createdAt: -1 }
      } = options;

      const query = { status: 'active' };

      if (type) query.type = type;
      if (category) query.category = category;
      if (folder) query.folder = folder;
      if (uploadedBy) query.uploadedBy = uploadedBy;
      if (tags && tags.length > 0) query.tags = { $in: tags };

      if (search) {
        query.$or = [
          { originalName: { $regex: search, $options: 'i' } },
          { 'metadata.alt': { $regex: search, $options: 'i' } },
          { 'metadata.title': { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      const [assets, total] = await Promise.all([
        MediaAsset.find(query)
          .populate('uploadedBy', 'name email')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        MediaAsset.countDocuments(query)
      ]);

      return {
        success: true,
        assets,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('[MediaManagerService] Error listing assets:', error);
      throw error;
    }
  }

  /**
   * Actualizar asset
   */
  async updateAsset(assetId, updates) {
    try {
      const asset = await MediaAsset.findById(assetId);

      if (!asset) {
        throw new Error('Asset not found');
      }

      // Actualizar campos permitidos
      const allowedUpdates = ['folder', 'category', 'tags', 'metadata'];
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          if (key === 'metadata' && typeof updates[key] === 'object') {
            asset.metadata = { ...asset.metadata, ...updates[key] };
          } else {
            asset[key] = updates[key];
          }
        }
      });

      await asset.save();

      this.emit('media:updated', { asset });

      return { success: true, asset };
    } catch (error) {
      console.error('[MediaManagerService] Error updating asset:', error);
      throw error;
    }
  }

  /**
   * Eliminar asset (soft delete)
   */
  async deleteAsset(assetId) {
    try {
      const asset = await MediaAsset.findById(assetId);

      if (!asset) {
        throw new Error('Asset not found');
      }

      await asset.softDelete();

      this.emit('media:deleted', { asset });

      return { success: true, message: 'Asset deleted successfully' };
    } catch (error) {
      console.error('[MediaManagerService] Error deleting asset:', error);
      throw error;
    }
  }

  /**
   * Eliminar permanentemente asset y archivo físico
   */
  async permanentlyDeleteAsset(assetId) {
    try {
      const asset = await MediaAsset.findById(assetId);

      if (!asset) {
        throw new Error('Asset not found');
      }

      // Eliminar archivo físico
      const filePath = path.join(this.uploadDir, asset.filename);
      try {
        await fs.unlink(filePath);
      } catch (error) {
        console.warn('[MediaManagerService] Could not delete physical file:', error);
      }

      // Eliminar variantes
      for (const variant of asset.variants) {
        try {
          const variantPath = path.join(this.uploadDir, path.basename(variant.url));
          await fs.unlink(variantPath);
        } catch (error) {
          console.warn('[MediaManagerService] Could not delete variant file:', error);
        }
      }

      // Eliminar de BD
      await MediaAsset.findByIdAndDelete(assetId);

      this.emit('media:permanently_deleted', { asset });

      return { success: true, message: 'Asset permanently deleted' };
    } catch (error) {
      console.error('[MediaManagerService] Error permanently deleting asset:', error);
      throw error;
    }
  }

  /**
   * Buscar assets
   */
  async searchAssets(searchTerm, options = {}) {
    try {
      const assets = await MediaAsset.search(searchTerm, {
        limit: options.limit || 50
      });

      return { success: true, assets };
    } catch (error) {
      console.error('[MediaManagerService] Error searching assets:', error);
      throw error;
    }
  }

  /**
   * Obtener assets sin usar
   */
  async getUnusedAssets(daysOld = 30) {
    try {
      const assets = await MediaAsset.findUnused(daysOld);

      return {
        success: true,
        assets,
        count: assets.length
      };
    } catch (error) {
      console.error('[MediaManagerService] Error getting unused assets:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de almacenamiento
   */
  async getStorageStats() {
    try {
      const stats = await MediaAsset.getStorageStats();

      return {
        success: true,
        ...stats
      };
    } catch (error) {
      console.error('[MediaManagerService] Error getting storage stats:', error);
      throw error;
    }
  }

  /**
   * Obtener carpetas únicas
   */
  async getFolders() {
    try {
      const folders = await MediaAsset.distinct('folder', { status: 'active' });

      return {
        success: true,
        folders: folders.sort()
      };
    } catch (error) {
      console.error('[MediaManagerService] Error getting folders:', error);
      throw error;
    }
  }

  /**
   * Obtener tags únicos
   */
  async getTags() {
    try {
      const tags = await MediaAsset.distinct('tags', { status: 'active' });

      return {
        success: true,
        tags: tags.sort()
      };
    } catch (error) {
      console.error('[MediaManagerService] Error getting tags:', error);
      throw error;
    }
  }

  /**
   * Incrementar contador de uso
   */
  async incrementUsage(assetId) {
    try {
      const asset = await MediaAsset.findById(assetId);
      if (asset) {
        await asset.incrementUsage();
      }
      return { success: true };
    } catch (error) {
      console.error('[MediaManagerService] Error incrementing usage:', error);
      throw error;
    }
  }

  /**
   * Decrementar contador de uso
   */
  async decrementUsage(assetId) {
    try {
      const asset = await MediaAsset.findById(assetId);
      if (asset) {
        await asset.decrementUsage();
      }
      return { success: true };
    } catch (error) {
      console.error('[MediaManagerService] Error decrementing usage:', error);
      throw error;
    }
  }
}

// Singleton
let instance = null;

function getMediaManagerService() {
  if (!instance) {
    instance = new MediaManagerService();
  }
  return instance;
}

module.exports = { MediaManagerService, getMediaManagerService };
