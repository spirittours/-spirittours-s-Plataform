const mongoose = require('mongoose');

/**
 * Catalog Model - Sistema de generación de catálogos digitales
 * Crea libros completos de itinerarios con precios, diseño personalizado
 * Exporta a PDF, Word y Flip-book
 */
const catalogSchema = new mongoose.Schema({
  // Información básica
  title: { 
    type: String, 
    required: true,
    index: true
  },
  
  subtitle: String,
  
  description: String,
  
  // Imágenes
  coverImage: String,
  
  // Configuración de contenido
  content: {
    // Incluir todos los tours o selección específica
    includeAllTours: { type: Boolean, default: false },
    
    // Tours seleccionados manualmente
    selectedTours: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Itinerary' 
    }],
    
    // Filtros para selección automática
    filterBy: {
      countries: [String],
      continents: [String],
      categories: [String],
      minDuration: Number,
      maxDuration: Number,
      tags: [String]
    },
    
    // Orden personalizado de tours (drag-and-drop)
    tourOrder: [{
      tourId: { type: mongoose.Schema.Types.ObjectId, ref: 'Itinerary' },
      order: Number
    }]
  },
  
  // Configuración de precios
  pricing: {
    showPrices: { type: Boolean, default: true },
    
    // Temporadas a incluir
    seasons: {
      showLowSeason: { type: Boolean, default: true },
      showMediumSeason: { type: Boolean, default: true },
      showHighSeason: { type: Boolean, default: true },
      showPeakSeason: { type: Boolean, default: true }
    },
    
    // Tipos de habitación
    roomTypes: {
      showDouble: { type: Boolean, default: true },
      showTriple: { type: Boolean, default: true },
      showSingleSupplement: { type: Boolean, default: true }
    },
    
    // Categorías de hoteles
    hotelCategories: {
      show3Star: { type: Boolean, default: true },
      show4Star: { type: Boolean, default: true },
      show5Star: { type: Boolean, default: true }
    },
    
    showMealSupplements: { type: Boolean, default: true },
    
    // Moneda
    currency: { 
      type: String, 
      default: 'USD',
      enum: ['USD', 'EUR', 'MXN', 'COP', 'ARS', 'CLP', 'PEN', 'BRL']
    },
    
    // Formato de números
    numberFormat: {
      decimalPlaces: { type: Number, default: 2 },
      thousandsSeparator: { type: String, default: ',' },
      decimalSeparator: { type: String, default: '.' }
    }
  },
  
  // Páginas personalizadas
  customPages: {
    // Páginas al inicio
    firstPages: [{
      type: { 
        type: String, 
        enum: ['company-info', 'welcome', 'introduction', 'custom']
      },
      title: String,
      content: String, // HTML rico
      image: String,
      order: Number
    }],
    
    // Páginas al final
    lastPages: [{
      type: { 
        type: String, 
        enum: ['hotel-list', 'policies', 'terms', 'contacts', 'booking-info', 'custom']
      },
      title: String,
      content: String,
      order: Number
    }]
  },
  
  // Diseño y estilo
  design: {
    // Template base
    template: { 
      type: String, 
      default: 'modern',
      enum: ['modern', 'classic', 'minimal', 'luxury', 'adventure']
    },
    
    // Colores
    primaryColor: { type: String, default: '#2563eb' },
    secondaryColor: { type: String, default: '#7c3aed' },
    accentColor: String,
    textColor: { type: String, default: '#1f2937' },
    backgroundColor: { type: String, default: '#ffffff' },
    
    // Tipografía
    fontFamily: { 
      type: String, 
      default: 'Inter',
      enum: ['Inter', 'Roboto', 'Montserrat', 'Playfair Display', 'Lato', 'Open Sans']
    },
    headingFont: String,
    bodyFont: String,
    
    // Branding
    logo: String,
    logoSize: { type: String, default: 'medium', enum: ['small', 'medium', 'large'] },
    headerImage: String,
    footerContent: String, // HTML
    
    // Layout
    pageSize: { type: String, default: 'A4', enum: ['A4', 'Letter', 'A5'] },
    orientation: { type: String, default: 'portrait', enum: ['portrait', 'landscape'] },
    margins: {
      top: { type: Number, default: 20 },
      right: { type: Number, default: 20 },
      bottom: { type: Number, default: 20 },
      left: { type: Number, default: 20 }
    },
    
    // Opciones visuales
    showPageNumbers: { type: Boolean, default: true },
    includeTableOfContents: { type: Boolean, default: true },
    showDayByDayItinerary: { type: Boolean, default: true },
    showMaps: { type: Boolean, default: true },
    showPhotos: { type: Boolean, default: true },
    photosPerPage: { type: Number, default: 3 }
  },
  
  // Configuración de exportación
  export: {
    // Formatos disponibles
    formats: {
      pdf: { type: Boolean, default: true },
      word: { type: Boolean, default: true },
      flipbook: { type: Boolean, default: true }
    },
    
    // Configuración específica de PDF
    pdfSettings: {
      quality: { type: String, default: 'high', enum: ['low', 'medium', 'high', 'print'] },
      compression: { type: Boolean, default: true },
      embedFonts: { type: Boolean, default: true },
      includeBookmarks: { type: Boolean, default: true },
      allowPrinting: { type: Boolean, default: true },
      allowCopying: { type: Boolean, default: false }
    },
    
    // Configuración de Word
    wordSettings: {
      format: { type: String, default: 'docx', enum: ['docx', 'doc'] },
      includeStyles: { type: Boolean, default: true },
      embedImages: { type: Boolean, default: true }
    },
    
    // Configuración de Flipbook
    flipbookSettings: {
      autoFlip: { type: Boolean, default: false },
      flipSound: { type: Boolean, default: true },
      zoom: { type: Boolean, default: true },
      download: { type: Boolean, default: true },
      share: { type: Boolean, default: true }
    }
  },
  
  // Control de acceso
  access: {
    isPublic: { type: Boolean, default: false },
    
    // Agencias/usuarios específicos con acceso
    allowedAgencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'TravelAgency' }],
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Protección con contraseña
    requiresPassword: { type: Boolean, default: false },
    password: String, // Hasheada
    
    // Fecha de expiración
    expiresAt: Date,
    
    // Límite de descargas
    downloadLimit: Number,
    currentDownloads: { type: Number, default: 0 }
  },
  
  // Estadísticas
  stats: {
    views: { type: Number, default: 0 },
    uniqueViews: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    lastViewed: Date,
    lastDownloaded: Date,
    averageViewTime: Number // en segundos
  },
  
  // Estado del catálogo
  status: {
    type: String,
    enum: ['draft', 'generating', 'ready', 'error', 'expired'],
    default: 'draft',
    index: true
  },
  
  // Archivos generados
  generatedFiles: {
    pdf: {
      url: String,
      size: Number,
      generatedAt: Date
    },
    word: {
      url: String,
      size: Number,
      generatedAt: Date
    },
    flipbook: {
      url: String,
      generatedAt: Date
    }
  },
  
  // Información de generación
  generation: {
    lastGenerated: Date,
    generationTime: Number, // en segundos
    error: String,
    retryCount: { type: Number, default: 0 }
  },
  
  // Metadata
  language: { 
    type: String, 
    default: 'es',
    enum: ['es', 'en', 'pt', 'fr', 'it']
  },
  
  tags: [String],
  
  // Autor
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
catalogSchema.index({ title: 'text', description: 'text' });
catalogSchema.index({ status: 1, createdBy: 1 });
catalogSchema.index({ 'access.isPublic': 1, status: 1 });
catalogSchema.index({ createdAt: -1 });

// Virtual para verificar si está expirado
catalogSchema.virtual('isExpired').get(function() {
  return this.access.expiresAt && this.access.expiresAt < new Date();
});

// Virtual para verificar si está listo
catalogSchema.virtual('isReady').get(function() {
  return this.status === 'ready' && !this.isExpired;
});

// Pre-save: Verificar expiración
catalogSchema.pre('save', function(next) {
  if (this.isExpired && this.status === 'ready') {
    this.status = 'expired';
  }
  next();
});

// Método para incrementar vistas
catalogSchema.methods.incrementViews = function(isUnique = false) {
  this.stats.views += 1;
  if (isUnique) {
    this.stats.uniqueViews += 1;
  }
  this.stats.lastViewed = new Date();
  return this.save();
};

// Método para incrementar descargas
catalogSchema.methods.incrementDownloads = function() {
  this.stats.downloads += 1;
  this.access.currentDownloads += 1;
  this.stats.lastDownloaded = new Date();
  return this.save();
};

// Método para verificar acceso
catalogSchema.methods.hasAccess = function(userId, agencyId = null) {
  // Si es público y no expirado
  if (this.access.isPublic && !this.isExpired) {
    return true;
  }
  
  // Si es el creador
  if (this.createdBy.toString() === userId.toString()) {
    return true;
  }
  
  // Si está en la lista de usuarios permitidos
  if (this.access.allowedUsers.some(id => id.toString() === userId.toString())) {
    return true;
  }
  
  // Si la agencia tiene acceso
  if (agencyId && this.access.allowedAgencies.some(id => id.toString() === agencyId.toString())) {
    return true;
  }
  
  return false;
};

// Método para verificar límite de descargas
catalogSchema.methods.canDownload = function() {
  if (!this.access.downloadLimit) {
    return true;
  }
  return this.access.currentDownloads < this.access.downloadLimit;
};

// Método para marcar como generando
catalogSchema.methods.startGeneration = function() {
  this.status = 'generating';
  this.generation.lastGenerated = new Date();
  return this.save();
};

// Método para marcar como listo
catalogSchema.methods.markAsReady = function(files, generationTime) {
  this.status = 'ready';
  this.generation.generationTime = generationTime;
  this.generation.error = null;
  this.generation.retryCount = 0;
  
  if (files.pdf) {
    this.generatedFiles.pdf = {
      url: files.pdf.url,
      size: files.pdf.size,
      generatedAt: new Date()
    };
  }
  
  if (files.word) {
    this.generatedFiles.word = {
      url: files.word.url,
      size: files.word.size,
      generatedAt: new Date()
    };
  }
  
  if (files.flipbook) {
    this.generatedFiles.flipbook = {
      url: files.flipbook.url,
      generatedAt: new Date()
    };
  }
  
  return this.save();
};

// Método para marcar error
catalogSchema.methods.markAsError = function(error) {
  this.status = 'error';
  this.generation.error = error;
  this.generation.retryCount += 1;
  return this.save();
};

// Método estático para buscar catálogos accesibles por usuario
catalogSchema.statics.findAccessibleByUser = function(userId, agencyId = null, options = {}) {
  const query = {
    $or: [
      { 'access.isPublic': true },
      { createdBy: userId },
      { 'access.allowedUsers': userId }
    ]
  };
  
  if (agencyId) {
    query.$or.push({ 'access.allowedAgencies': agencyId });
  }
  
  // Solo catálogos listos y no expirados
  query.status = 'ready';
  query.$or.push(
    { 'access.expiresAt': { $exists: false } },
    { 'access.expiresAt': null },
    { 'access.expiresAt': { $gt: new Date() } }
  );
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50);
};

const Catalog = mongoose.model('Catalog', catalogSchema);

module.exports = Catalog;
