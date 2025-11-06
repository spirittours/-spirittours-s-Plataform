const mongoose = require('mongoose');

/**
 * Page Model - CMS Dinámico
 * Modelo flexible para páginas web editables desde el dashboard
 * Soporta sistema de bloques drag-and-drop con versionado
 */
const pageSchema = new mongoose.Schema({
  // Identificación única de la página
  slug: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/
  },
  
  // Información básica
  title: { 
    type: String, 
    required: true,
    index: true 
  },
  
  subtitle: String,
  
  // Tipo de página (determina comportamiento especial)
  type: { 
    type: String, 
    enum: ['standard', 'home', 'contact', 'policy', 'terms', 'privacy', 'about', 'custom'],
    default: 'standard',
    index: true
  },
  
  // Estado de publicación
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'scheduled'],
    default: 'draft',
    index: true
  },
  
  // Secciones/bloques de contenido (drag-and-drop)
  sections: [{
    id: { 
      type: String, 
      required: true 
    },
    
    // Tipo de bloque (hero, text, image, video, gallery, form, etc.)
    type: { 
      type: String, 
      required: true,
      enum: [
        // Layout blocks
        'hero', 'columns', 'divider', 'spacer', 'container',
        // Content blocks
        'text', 'heading', 'richText', 'quote', 'list',
        // Media blocks
        'image', 'gallery', 'video', 'videoEmbed', 'audio',
        // Interactive blocks
        'button', 'form', 'contactForm', 'accordion', 'tabs', 'modal',
        // Tours blocks (específicos)
        'tourGrid', 'tourCarousel', 'tourSearch', 'featuredTours', 'tourFilters',
        // Social blocks
        'testimonials', 'socialMedia', 'instagramFeed', 'reviews',
        // Announcement blocks
        'banner', 'countdown', 'popup', 'alert',
        // Advanced blocks
        'map', 'embed', 'code', 'custom'
      ]
    },
    
    // Contenido específico del bloque (estructura flexible)
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    
    // Configuración visual del bloque
    settings: {
      // Estilos
      backgroundColor: String,
      backgroundImage: String,
      textColor: String,
      padding: { type: String, default: 'medium' }, // none, small, medium, large
      margin: { type: String, default: 'medium' },
      
      // Layout
      alignment: { type: String, enum: ['left', 'center', 'right', 'justify'], default: 'left' },
      width: { type: String, enum: ['full', 'wide', 'narrow'], default: 'full' },
      
      // Efectos
      animation: String, // fadeIn, slideIn, zoomIn, etc.
      animationDelay: Number,
      parallax: Boolean,
      
      // CSS personalizado
      customCSS: String,
      customClasses: [String]
    },
    
    // Orden de visualización (permite drag-and-drop)
    order: { 
      type: Number, 
      required: true,
      index: true 
    },
    
    // Visibilidad
    visible: { type: Boolean, default: true },
    
    // Condiciones de visualización (opcional)
    visibility: {
      devices: {
        desktop: { type: Boolean, default: true },
        tablet: { type: Boolean, default: true },
        mobile: { type: Boolean, default: true }
      },
      userRoles: [String], // Si está vacío, visible para todos
      dateRange: {
        from: Date,
        to: Date
      }
    }
  }],
  
  // SEO y metadata
  seo: {
    metaTitle: String,
    metaDescription: { type: String, maxlength: 160 },
    keywords: [String],
    ogTitle: String,
    ogDescription: String,
    ogImage: String,
    ogType: { type: String, default: 'website' },
    twitterCard: { type: String, default: 'summary_large_image' },
    twitterImage: String,
    canonical: String,
    noindex: { type: Boolean, default: false },
    nofollow: { type: Boolean, default: false }
  },
  
  // Schema.org structured data
  structuredData: mongoose.Schema.Types.Mixed,
  
  // Configuración de la página
  settings: {
    // Layout
    layout: { type: String, enum: ['full', 'boxed', 'centered'], default: 'full' },
    sidebar: { type: String, enum: ['none', 'left', 'right'], default: 'none' },
    
    // Header/Footer
    showHeader: { type: Boolean, default: true },
    showFooter: { type: Boolean, default: true },
    customHeader: String, // ID de un bloque custom
    customFooter: String,
    
    // Scripts personalizados
    headerScripts: String, // Google Analytics, Facebook Pixel, etc.
    footerScripts: String,
    
    // CSS personalizado
    customCSS: String,
    
    // Requiere autenticación
    requireAuth: { type: Boolean, default: false },
    allowedRoles: [String]
  },
  
  // Publicación
  publishedAt: Date,
  scheduledPublishAt: Date,
  lastPublishedAt: Date,
  
  // Versionado (historial de cambios)
  version: { type: Number, default: 1 },
  history: [{
    version: Number,
    title: String,
    sections: mongoose.Schema.Types.Mixed,
    seo: mongoose.Schema.Types.Mixed,
    settings: mongoose.Schema.Types.Mixed,
    modifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    modifiedAt: { type: Date, default: Date.now },
    changeNotes: String
  }],
  
  // Idiomas (multi-language support)
  language: { 
    type: String, 
    default: 'es',
    enum: ['es', 'en', 'pt', 'fr', 'it']
  },
  translations: [{
    language: String,
    title: String,
    slug: String,
    sections: mongoose.Schema.Types.Mixed,
    seo: mongoose.Schema.Types.Mixed
  }],
  
  // Autor y modificaciones
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  lastModifiedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  
  // Estadísticas
  stats: {
    views: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    lastViewed: Date,
    averageTimeOnPage: Number, // en segundos
    bounceRate: Number
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos para búsquedas optimizadas
pageSchema.index({ slug: 1, language: 1 });
pageSchema.index({ status: 1, publishedAt: -1 });
pageSchema.index({ type: 1, status: 1 });
pageSchema.index({ createdBy: 1, status: 1 });

// Virtual para URL completa
pageSchema.virtual('url').get(function() {
  return `/${this.slug}`;
});

// Virtual para verificar si está publicada
pageSchema.virtual('isPublished').get(function() {
  return this.status === 'published' && (!this.publishedAt || this.publishedAt <= new Date());
});

// Pre-save: Actualizar version y crear historia
pageSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    // Incrementar versión
    this.version += 1;
    
    // Guardar en historial (limitar a últimas 10 versiones)
    if (this.history.length >= 10) {
      this.history.shift(); // Eliminar la más antigua
    }
    
    this.history.push({
      version: this.version - 1,
      title: this.title,
      sections: this.sections,
      seo: this.seo,
      settings: this.settings,
      modifiedBy: this.lastModifiedBy,
      modifiedAt: new Date()
    });
  }
  next();
});

// Método para publicar página
pageSchema.methods.publish = function() {
  this.status = 'published';
  this.publishedAt = new Date();
  this.lastPublishedAt = new Date();
  return this.save();
};

// Método para despublicar
pageSchema.methods.unpublish = function() {
  this.status = 'draft';
  return this.save();
};

// Método para archivar
pageSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Método para duplicar página
pageSchema.methods.duplicate = async function(newSlug, userId) {
  const PageModel = this.constructor;
  
  const duplicated = new PageModel({
    ...this.toObject(),
    _id: undefined,
    slug: newSlug,
    title: `${this.title} (Copy)`,
    status: 'draft',
    publishedAt: undefined,
    scheduledPublishAt: undefined,
    createdBy: userId,
    lastModifiedBy: userId,
    version: 1,
    history: [],
    stats: {
      views: 0,
      uniqueViews: 0
    }
  });
  
  return await duplicated.save();
};

// Método para restaurar versión anterior
pageSchema.methods.restoreVersion = function(versionNumber) {
  const versionData = this.history.find(h => h.version === versionNumber);
  
  if (!versionData) {
    throw new Error(`Version ${versionNumber} not found`);
  }
  
  this.title = versionData.title;
  this.sections = versionData.sections;
  this.seo = versionData.seo;
  this.settings = versionData.settings;
  
  return this.save();
};

// Método estático para buscar páginas publicadas
pageSchema.statics.findPublished = function(query = {}) {
  return this.find({
    ...query,
    status: 'published',
    $or: [
      { publishedAt: { $exists: false } },
      { publishedAt: { $lte: new Date() } }
    ]
  }).sort({ publishedAt: -1 });
};

// Método estático para obtener página por slug (publicada)
pageSchema.statics.findBySlug = function(slug, language = 'es') {
  return this.findOne({
    slug,
    language,
    status: 'published',
    $or: [
      { publishedAt: { $exists: false } },
      { publishedAt: { $lte: new Date() } }
    ]
  });
};

const Page = mongoose.model('Page', pageSchema);

module.exports = Page;
