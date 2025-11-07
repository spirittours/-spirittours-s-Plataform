const EventEmitter = require('events');
const ContentTemplate = require('../../models/cms/ContentTemplate');

/**
 * ContentTemplateService - Gestión de templates de contenido
 * CRUD, aplicación de templates, validación de variables
 */
class ContentTemplateService extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('[ContentTemplateService] Initializing...');
    await this.createDefaultTemplates();
    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Crear templates por defecto
   */
  async createDefaultTemplates() {
    try {
      const count = await ContentTemplate.countDocuments();
      if (count > 0) return; // Ya existen templates

      const defaultTemplates = [
        {
          name: 'Hero Simple',
          description: 'Hero section simple con título, subtítulo y CTA',
          category: 'hero',
          sections: [{
            id: 'hero-1',
            type: 'hero',
            content: {
              title: '{{hero_title}}',
              subtitle: '{{hero_subtitle}}',
              backgroundImage: '{{background_image}}',
              ctaText: '{{cta_text}}',
              ctaLink: '{{cta_link}}'
            },
            settings: {
              backgroundColor: '#000000',
              textColor: '#ffffff',
              padding: 'large'
            },
            order: 1
          }],
          variables: [
            { key: 'hero_title', label: 'Título Principal', type: 'text', defaultValue: 'Bienvenidos', validation: { required: true } },
            { key: 'hero_subtitle', label: 'Subtítulo', type: 'textarea', defaultValue: '' },
            { key: 'background_image', label: 'Imagen de Fondo', type: 'image', defaultValue: '' },
            { key: 'cta_text', label: 'Texto del Botón', type: 'text', defaultValue: 'Ver más' },
            { key: 'cta_link', label: 'Link del Botón', type: 'url', defaultValue: '#' }
          ],
          isPublic: true,
          isFeatured: true,
          createdBy: null // System template
        },
        {
          name: 'Tours Grid 3 Columnas',
          description: 'Grid de tours destacados en 3 columnas',
          category: 'tour',
          sections: [{
            id: 'tour-grid-1',
            type: 'tourGrid',
            content: {
              title: '{{section_title}}',
              tours: [], // Se llenará dinámicamente
              columns: 3,
              showPrice: true,
              showDuration: true
            },
            settings: {
              padding: 'medium'
            },
            order: 1
          }],
          variables: [
            { key: 'section_title', label: 'Título de la Sección', type: 'text', defaultValue: 'Tours Destacados' }
          ],
          isPublic: true,
          createdBy: null
        }
      ];

      await ContentTemplate.insertMany(defaultTemplates);
      console.log('[ContentTemplateService] Default templates created');
    } catch (error) {
      console.error('[ContentTemplateService] Error creating default templates:', error);
    }
  }

  /**
   * Crear template
   */
  async createTemplate(templateData, userId) {
    try {
      const template = new ContentTemplate({
        ...templateData,
        createdBy: userId
      });

      await template.save();
      this.emit('template:created', { template });

      return { success: true, template };
    } catch (error) {
      console.error('[ContentTemplateService] Error creating template:', error);
      throw error;
    }
  }

  /**
   * Obtener template por ID
   */
  async getTemplate(templateId) {
    try {
      const template = await ContentTemplate.findById(templateId)
        .populate('createdBy', 'name email');

      if (!template) {
        throw new Error('Template not found');
      }

      return { success: true, template };
    } catch (error) {
      console.error('[ContentTemplateService] Error getting template:', error);
      throw error;
    }
  }

  /**
   * Listar templates
   */
  async listTemplates(options = {}) {
    try {
      const {
        category,
        isPublic,
        createdBy,
        search,
        page = 1,
        limit = 50,
        sort = { 'stats.uses': -1 }
      } = options;

      const query = { status: 'published' };

      if (category) query.category = category;
      if (isPublic !== undefined) query.isPublic = isPublic;
      if (createdBy) query.createdBy = createdBy;

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      const [templates, total] = await Promise.all([
        ContentTemplate.find(query)
          .populate('createdBy', 'name email')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        ContentTemplate.countDocuments(query)
      ]);

      return {
        success: true,
        templates,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('[ContentTemplateService] Error listing templates:', error);
      throw error;
    }
  }

  /**
   * Obtener templates por categoría
   */
  async getTemplatesByCategory(category, options = {}) {
    try {
      const templates = await ContentTemplate.findByCategory(category, options);
      return { success: true, templates };
    } catch (error) {
      console.error('[ContentTemplateService] Error getting templates by category:', error);
      throw error;
    }
  }

  /**
   * Obtener templates populares
   */
  async getPopularTemplates(limit = 10) {
    try {
      const templates = await ContentTemplate.findPopular(limit);
      return { success: true, templates };
    } catch (error) {
      console.error('[ContentTemplateService] Error getting popular templates:', error);
      throw error;
    }
  }

  /**
   * Obtener templates destacados
   */
  async getFeaturedTemplates() {
    try {
      const templates = await ContentTemplate.findFeatured();
      return { success: true, templates };
    } catch (error) {
      console.error('[ContentTemplateService] Error getting featured templates:', error);
      throw error;
    }
  }

  /**
   * Aplicar template a página
   */
  async applyTemplate(templateId, variableValues = {}) {
    try {
      const template = await ContentTemplate.findById(templateId);

      if (!template) {
        throw new Error('Template not found');
      }

      // Validar variables
      const validation = template.validateVariables(variableValues);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Aplicar template
      const sections = template.applyToPage(variableValues);

      // Incrementar uso
      await template.incrementUsage();

      this.emit('template:applied', { template });

      return {
        success: true,
        sections
      };
    } catch (error) {
      console.error('[ContentTemplateService] Error applying template:', error);
      throw error;
    }
  }

  /**
   * Actualizar template
   */
  async updateTemplate(templateId, updates) {
    try {
      const template = await ContentTemplate.findByIdAndUpdate(
        templateId,
        updates,
        { new: true, runValidators: true }
      );

      if (!template) {
        throw new Error('Template not found');
      }

      this.emit('template:updated', { template });

      return { success: true, template };
    } catch (error) {
      console.error('[ContentTemplateService] Error updating template:', error);
      throw error;
    }
  }

  /**
   * Eliminar template
   */
  async deleteTemplate(templateId) {
    try {
      const template = await ContentTemplate.findByIdAndDelete(templateId);

      if (!template) {
        throw new Error('Template not found');
      }

      this.emit('template:deleted', { template });

      return { success: true, message: 'Template deleted successfully' };
    } catch (error) {
      console.error('[ContentTemplateService] Error deleting template:', error);
      throw error;
    }
  }

  /**
   * Añadir rating
   */
  async rateTemplate(templateId, rating) {
    try {
      const template = await ContentTemplate.findById(templateId);

      if (!template) {
        throw new Error('Template not found');
      }

      await template.addRating(rating);

      return { success: true, template };
    } catch (error) {
      console.error('[ContentTemplateService] Error rating template:', error);
      throw error;
    }
  }

  /**
   * Buscar templates
   */
  async searchTemplates(searchTerm, options = {}) {
    try {
      const templates = await ContentTemplate.search(searchTerm, options);
      return { success: true, templates };
    } catch (error) {
      console.error('[ContentTemplateService] Error searching templates:', error);
      throw error;
    }
  }
}

// Singleton
let instance = null;

function getContentTemplateService() {
  if (!instance) {
    instance = new ContentTemplateService();
  }
  return instance;
}

module.exports = { ContentTemplateService, getContentTemplateService };
