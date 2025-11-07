const EventEmitter = require('events');
const Catalog = require('../../models/catalog/Catalog');

/**
 * CatalogBuilderService - Gestión de catálogos
 * CRUD, generación, gestión de acceso
 */
class CatalogBuilderService extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('[CatalogBuilderService] Initializing...');
    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Crear catálogo
   */
  async createCatalog(catalogData, userId) {
    try {
      const catalog = new Catalog({
        ...catalogData,
        createdBy: userId,
        lastModifiedBy: userId
      });

      await catalog.save();
      this.emit('catalog:created', { catalog });

      return { success: true, catalog };
    } catch (error) {
      console.error('[CatalogBuilderService] Error creating catalog:', error);
      throw error;
    }
  }

  /**
   * Obtener catálogo por ID
   */
  async getCatalog(catalogId, userId = null, agencyId = null) {
    try {
      const catalog = await Catalog.findById(catalogId)
        .populate('createdBy', 'name email')
        .populate('content.selectedTours')
        .populate('access.allowedAgencies', 'name')
        .populate('access.allowedUsers', 'name email');

      if (!catalog) {
        throw new Error('Catalog not found');
      }

      // Verificar acceso
      if (userId && !catalog.hasAccess(userId, agencyId)) {
        throw new Error('Access denied');
      }

      return { success: true, catalog };
    } catch (error) {
      console.error('[CatalogBuilderService] Error getting catalog:', error);
      throw error;
    }
  }

  /**
   * Listar catálogos
   */
  async listCatalogs(options = {}) {
    try {
      const {
        status,
        createdBy,
        search,
        userId,
        agencyId,
        page = 1,
        limit = 20,
        sort = { createdAt: -1 }
      } = options;

      let query = {};

      // Si se proporciona userId, filtrar por acceso
      if (userId) {
        query.$or = [
          { 'access.isPublic': true },
          { createdBy: userId },
          { 'access.allowedUsers': userId }
        ];
        
        if (agencyId) {
          query.$or.push({ 'access.allowedAgencies': agencyId });
        }
      }

      if (status) query.status = status;
      if (createdBy) query.createdBy = createdBy;

      if (search) {
        query.$text = { $search: search };
      }

      const skip = (page - 1) * limit;

      const [catalogs, total] = await Promise.all([
        Catalog.find(query)
          .populate('createdBy', 'name email')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Catalog.countDocuments(query)
      ]);

      return {
        success: true,
        catalogs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('[CatalogBuilderService] Error listing catalogs:', error);
      throw error;
    }
  }

  /**
   * Actualizar catálogo
   */
  async updateCatalog(catalogId, updates, userId) {
    try {
      const catalog = await Catalog.findById(catalogId);

      if (!catalog) {
        throw new Error('Catalog not found');
      }

      Object.keys(updates).forEach(key => {
        if (key !== '_id' && key !== 'createdBy') {
          catalog[key] = updates[key];
        }
      });

      catalog.lastModifiedBy = userId;
      await catalog.save();

      this.emit('catalog:updated', { catalog });

      return { success: true, catalog };
    } catch (error) {
      console.error('[CatalogBuilderService] Error updating catalog:', error);
      throw error;
    }
  }

  /**
   * Eliminar catálogo
   */
  async deleteCatalog(catalogId) {
    try {
      const catalog = await Catalog.findByIdAndDelete(catalogId);

      if (!catalog) {
        throw new Error('Catalog not found');
      }

      this.emit('catalog:deleted', { catalog });

      return { success: true, message: 'Catalog deleted successfully' };
    } catch (error) {
      console.error('[CatalogBuilderService] Error deleting catalog:', error);
      throw error;
    }
  }

  /**
   * Incrementar vistas
   */
  async incrementViews(catalogId, isUnique = false) {
    try {
      const catalog = await Catalog.findById(catalogId);
      if (catalog) {
        await catalog.incrementViews(isUnique);
      }
      return { success: true };
    } catch (error) {
      console.error('[CatalogBuilderService] Error incrementing views:', error);
      throw error;
    }
  }

  /**
   * Registrar descarga
   */
  async registerDownload(catalogId) {
    try {
      const catalog = await Catalog.findById(catalogId);
      
      if (!catalog) {
        throw new Error('Catalog not found');
      }

      if (!catalog.canDownload()) {
        throw new Error('Download limit reached');
      }

      await catalog.incrementDownloads();

      this.emit('catalog:downloaded', { catalog });

      return { success: true };
    } catch (error) {
      console.error('[CatalogBuilderService] Error registering download:', error);
      throw error;
    }
  }

  /**
   * Obtener catálogos accesibles por usuario
   */
  async getAccessibleCatalogs(userId, agencyId = null, options = {}) {
    try {
      const catalogs = await Catalog.findAccessibleByUser(userId, agencyId, options);

      return {
        success: true,
        catalogs,
        count: catalogs.length
      };
    } catch (error) {
      console.error('[CatalogBuilderService] Error getting accessible catalogs:', error);
      throw error;
    }
  }

  /**
   * Duplicar catálogo
   */
  async duplicateCatalog(catalogId, userId) {
    try {
      const original = await Catalog.findById(catalogId);

      if (!original) {
        throw new Error('Catalog not found');
      }

      const duplicate = new Catalog({
        ...original.toObject(),
        _id: undefined,
        title: `${original.title} (Copy)`,
        status: 'draft',
        createdBy: userId,
        lastModifiedBy: userId,
        generatedFiles: {},
        stats: {
          views: 0,
          uniqueViews: 0,
          downloads: 0,
          shares: 0
        }
      });

      await duplicate.save();

      this.emit('catalog:duplicated', { original, duplicate });

      return { success: true, catalog: duplicate };
    } catch (error) {
      console.error('[CatalogBuilderService] Error duplicating catalog:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas
   */
  async getStats(userId = null) {
    try {
      const query = userId ? { createdBy: userId } : {};

      const [total, ready, draft, generating] = await Promise.all([
        Catalog.countDocuments(query),
        Catalog.countDocuments({ ...query, status: 'ready' }),
        Catalog.countDocuments({ ...query, status: 'draft' }),
        Catalog.countDocuments({ ...query, status: 'generating' })
      ]);

      const mostViewed = await Catalog.find({ ...query, status: 'ready' })
        .sort({ 'stats.views': -1 })
        .limit(10)
        .select('title stats.views stats.downloads');

      return {
        success: true,
        stats: {
          total,
          ready,
          draft,
          generating,
          mostViewed
        }
      };
    } catch (error) {
      console.error('[CatalogBuilderService] Error getting stats:', error);
      throw error;
    }
  }
}

// Singleton
let instance = null;

function getCatalogBuilderService() {
  if (!instance) {
    instance = new CatalogBuilderService();
  }
  return instance;
}

module.exports = { CatalogBuilderService, getCatalogBuilderService };
