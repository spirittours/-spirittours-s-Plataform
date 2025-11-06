const EventEmitter = require('events');
const Page = require('../../models/cms/Page');
const MediaAsset = require('../../models/cms/MediaAsset');

/**
 * PageBuilderService - Servicio para gestión de páginas CMS
 * Maneja CRUD, publicación, versionado, duplicación
 */
class PageBuilderService extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('[PageBuilderService] Initializing...');
    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Crear nueva página
   */
  async createPage(pageData, userId) {
    try {
      const page = new Page({
        ...pageData,
        createdBy: userId,
        lastModifiedBy: userId,
        status: pageData.status || 'draft'
      });

      await page.save();
      this.emit('page:created', { page });
      
      return {
        success: true,
        page
      };
    } catch (error) {
      console.error('[PageBuilderService] Error creating page:', error);
      throw error;
    }
  }

  /**
   * Obtener página por ID
   */
  async getPage(pageId) {
    try {
      const page = await Page.findById(pageId)
        .populate('createdBy', 'name email')
        .populate('lastModifiedBy', 'name email');

      if (!page) {
        throw new Error('Page not found');
      }

      return { success: true, page };
    } catch (error) {
      console.error('[PageBuilderService] Error getting page:', error);
      throw error;
    }
  }

  /**
   * Obtener página por slug (publicada)
   */
  async getPageBySlug(slug, language = 'es') {
    try {
      const page = await Page.findBySlug(slug, language);

      if (!page) {
        throw new Error('Page not found');
      }

      // Incrementar vistas
      page.stats.views += 1;
      page.stats.lastViewed = new Date();
      await page.save();

      return { success: true, page };
    } catch (error) {
      console.error('[PageBuilderService] Error getting page by slug:', error);
      throw error;
    }
  }

  /**
   * Listar páginas con filtros
   */
  async listPages(options = {}) {
    try {
      const {
        status,
        type,
        search,
        createdBy,
        language = 'es',
        page = 1,
        limit = 20,
        sort = { createdAt: -1 }
      } = options;

      const query = { language };

      if (status) query.status = status;
      if (type) query.type = type;
      if (createdBy) query.createdBy = createdBy;
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { slug: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      const [pages, total] = await Promise.all([
        Page.find(query)
          .populate('createdBy', 'name email')
          .populate('lastModifiedBy', 'name email')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Page.countDocuments(query)
      ]);

      return {
        success: true,
        pages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('[PageBuilderService] Error listing pages:', error);
      throw error;
    }
  }

  /**
   * Actualizar página
   */
  async updatePage(pageId, updates, userId) {
    try {
      const page = await Page.findById(pageId);

      if (!page) {
        throw new Error('Page not found');
      }

      // Actualizar campos
      Object.keys(updates).forEach(key => {
        if (key !== '_id' && key !== 'createdBy') {
          page[key] = updates[key];
        }
      });

      page.lastModifiedBy = userId;
      await page.save();

      this.emit('page:updated', { page });

      return { success: true, page };
    } catch (error) {
      console.error('[PageBuilderService] Error updating page:', error);
      throw error;
    }
  }

  /**
   * Publicar página
   */
  async publishPage(pageId, userId) {
    try {
      const page = await Page.findById(pageId);

      if (!page) {
        throw new Error('Page not found');
      }

      page.lastModifiedBy = userId;
      await page.publish();

      this.emit('page:published', { page });

      return { success: true, page };
    } catch (error) {
      console.error('[PageBuilderService] Error publishing page:', error);
      throw error;
    }
  }

  /**
   * Despublicar página
   */
  async unpublishPage(pageId, userId) {
    try {
      const page = await Page.findById(pageId);

      if (!page) {
        throw new Error('Page not found');
      }

      page.lastModifiedBy = userId;
      await page.unpublish();

      this.emit('page:unpublished', { page });

      return { success: true, page };
    } catch (error) {
      console.error('[PageBuilderService] Error unpublishing page:', error);
      throw error;
    }
  }

  /**
   * Duplicar página
   */
  async duplicatePage(pageId, newSlug, userId) {
    try {
      const originalPage = await Page.findById(pageId);

      if (!originalPage) {
        throw new Error('Page not found');
      }

      const duplicatedPage = await originalPage.duplicate(newSlug, userId);

      this.emit('page:duplicated', { originalPage, duplicatedPage });

      return { success: true, page: duplicatedPage };
    } catch (error) {
      console.error('[PageBuilderService] Error duplicating page:', error);
      throw error;
    }
  }

  /**
   * Eliminar página
   */
  async deletePage(pageId) {
    try {
      const page = await Page.findByIdAndDelete(pageId);

      if (!page) {
        throw new Error('Page not found');
      }

      this.emit('page:deleted', { page });

      return { success: true, message: 'Page deleted successfully' };
    } catch (error) {
      console.error('[PageBuilderService] Error deleting page:', error);
      throw error;
    }
  }

  /**
   * Restaurar versión anterior
   */
  async restoreVersion(pageId, versionNumber, userId) {
    try {
      const page = await Page.findById(pageId);

      if (!page) {
        throw new Error('Page not found');
      }

      page.lastModifiedBy = userId;
      await page.restoreVersion(versionNumber);

      this.emit('page:version_restored', { page, versionNumber });

      return { success: true, page };
    } catch (error) {
      console.error('[PageBuilderService] Error restoring version:', error);
      throw error;
    }
  }

  /**
   * Obtener historial de versiones
   */
  async getVersionHistory(pageId) {
    try {
      const page = await Page.findById(pageId).select('history version title');

      if (!page) {
        throw new Error('Page not found');
      }

      return {
        success: true,
        currentVersion: page.version,
        history: page.history
      };
    } catch (error) {
      console.error('[PageBuilderService] Error getting version history:', error);
      throw error;
    }
  }

  /**
   * Validar slug único
   */
  async validateSlug(slug, excludePageId = null) {
    try {
      const query = { slug };
      if (excludePageId) {
        query._id = { $ne: excludePageId };
      }

      const existingPage = await Page.findOne(query);

      return {
        success: true,
        isAvailable: !existingPage,
        suggestion: existingPage ? `${slug}-${Date.now()}` : null
      };
    } catch (error) {
      console.error('[PageBuilderService] Error validating slug:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de páginas
   */
  async getStats() {
    try {
      const [total, published, draft, archived] = await Promise.all([
        Page.countDocuments(),
        Page.countDocuments({ status: 'published' }),
        Page.countDocuments({ status: 'draft' }),
        Page.countDocuments({ status: 'archived' })
      ]);

      const mostViewed = await Page.find({ status: 'published' })
        .sort({ 'stats.views': -1 })
        .limit(10)
        .select('title slug stats.views');

      return {
        success: true,
        stats: {
          total,
          published,
          draft,
          archived,
          mostViewed
        }
      };
    } catch (error) {
      console.error('[PageBuilderService] Error getting stats:', error);
      throw error;
    }
  }
}

// Singleton
let instance = null;

function getPageBuilderService() {
  if (!instance) {
    instance = new PageBuilderService();
  }
  return instance;
}

module.exports = { PageBuilderService, getPageBuilderService };
