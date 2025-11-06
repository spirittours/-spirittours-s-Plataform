const mongoose = require('mongoose');

/**
 * ContentTemplate Model - Plantillas de contenido reutilizables
 * Permite crear templates predefinidos para secciones, páginas completas
 * con variables dinámicas que se pueden llenar al usar el template
 */
const contentTemplateSchema = new mongoose.Schema({
  // Información básica
  name: { 
    type: String, 
    required: true,
    index: true
  },
  
  description: String,
  
  // Categoría del template
  category: { 
    type: String,
    required: true,
    enum: [
      'page', // Página completa
      'section', // Sección individual
      'header', // Headers
      'footer', // Footers
      'hero', // Hero sections
      'feature', // Feature sections
      'testimonial', // Testimonials
      'tour', // Tour-related
      'form', // Formularios
      'cta', // Call-to-action
      'pricing', // Tablas de precios
      'gallery', // Galerías
      'other'
    ],
    index: true
  },
  
  // Thumbnail/preview
  thumbnail: String, // URL de imagen preview
  
  // Estructura de secciones (similar a Page.sections)
  sections: [{
    id: String,
    type: String,
    content: mongoose.Schema.Types.Mixed,
    settings: mongoose.Schema.Types.Mixed,
    order: Number
  }],
  
  // Variables dinámicas que se pueden personalizar
  variables: [{
    key: { 
      type: String, 
      required: true 
    }, // {{company_name}}, {{phone}}, etc.
    
    label: String, // Label amigable para el usuario
    
    type: { 
      type: String, 
      enum: ['text', 'textarea', 'number', 'email', 'url', 'image', 'video', 'color', 'date', 'select', 'boolean'],
      default: 'text'
    },
    
    defaultValue: mongoose.Schema.Types.Mixed,
    
    // Para type: 'select'
    options: [{
      value: String,
      label: String
    }],
    
    // Validación
    validation: {
      required: Boolean,
      minLength: Number,
      maxLength: Number,
      pattern: String, // regex
      min: Number, // para numbers
      max: Number
    },
    
    // Ayuda
    placeholder: String,
    helpText: String,
    
    // Organización en el formulario
    group: String, // 'content', 'styling', 'advanced', etc.
    order: Number
  }],
  
  // Configuración del template
  settings: {
    // Permite editar después de aplicar
    editable: { type: Boolean, default: true },
    
    // Permite modificar estructura
    structureEditable: { type: Boolean, default: true },
    
    // Plantilla premium (requiere permiso especial)
    isPremium: { type: Boolean, default: false },
    
    // Categorías de tours aplicables (si es template de tour)
    tourCategories: [String],
    
    // Dispositivos soportados
    supportedDevices: {
      desktop: { type: Boolean, default: true },
      tablet: { type: Boolean, default: true },
      mobile: { type: Boolean, default: true }
    }
  },
  
  // Acceso y visibilidad
  isPublic: { 
    type: Boolean, 
    default: true,
    index: true
  }, // Si es false, solo visible para el creador
  
  isFeatured: { 
    type: Boolean, 
    default: false 
  }, // Destacado en la galería
  
  // Autor
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  
  // Estadísticas de uso
  stats: {
    uses: { type: Number, default: 0 }, // Cuántas veces se ha usado
    lastUsed: Date,
    rating: { type: Number, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 }
  },
  
  // Tags para búsqueda
  tags: [String],
  
  // Estado
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published',
    index: true
  },
  
  // Versión del template (para futuras actualizaciones)
  version: { type: String, default: '1.0.0' },
  
  // Changelog
  changelog: [{
    version: String,
    changes: String,
    date: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices
contentTemplateSchema.index({ category: 1, status: 1, isPublic: 1 });
contentTemplateSchema.index({ createdBy: 1, status: 1 });
contentTemplateSchema.index({ 'stats.uses': -1 });
contentTemplateSchema.index({ 'stats.rating': -1 });
contentTemplateSchema.index({ tags: 1 });

// Text search index
contentTemplateSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text'
});

// Virtual para verificar si es popular
contentTemplateSchema.virtual('isPopular').get(function() {
  return this.stats.uses > 50 || this.stats.rating > 4;
});

// Método para incrementar uso
contentTemplateSchema.methods.incrementUsage = function() {
  this.stats.uses += 1;
  this.stats.lastUsed = new Date();
  return this.save();
};

// Método para añadir rating
contentTemplateSchema.methods.addRating = function(rating) {
  if (rating < 0 || rating > 5) {
    throw new Error('Rating must be between 0 and 5');
  }
  
  const currentTotal = this.stats.rating * this.stats.ratingCount;
  this.stats.ratingCount += 1;
  this.stats.rating = (currentTotal + rating) / this.stats.ratingCount;
  
  return this.save();
};

// Método para añadir a favoritos
contentTemplateSchema.methods.addFavorite = function() {
  this.stats.favorites += 1;
  return this.save();
};

// Método para remover de favoritos
contentTemplateSchema.methods.removeFavorite = function() {
  if (this.stats.favorites > 0) {
    this.stats.favorites -= 1;
  }
  return this.save();
};

// Método para aplicar template a una página
contentTemplateSchema.methods.applyToPage = function(variableValues = {}) {
  // Clonar sections
  let appliedSections = JSON.parse(JSON.stringify(this.sections));
  
  // Reemplazar variables
  const sectionsString = JSON.stringify(appliedSections);
  let processedString = sectionsString;
  
  // Reemplazar cada variable
  this.variables.forEach(variable => {
    const value = variableValues[variable.key] !== undefined 
      ? variableValues[variable.key] 
      : variable.defaultValue;
    
    if (value !== undefined) {
      const regex = new RegExp(`{{${variable.key}}}`, 'g');
      processedString = processedString.replace(regex, value);
    }
  });
  
  appliedSections = JSON.parse(processedString);
  
  return appliedSections;
};

// Método para validar valores de variables
contentTemplateSchema.methods.validateVariables = function(variableValues) {
  const errors = [];
  
  this.variables.forEach(variable => {
    const value = variableValues[variable.key];
    const validation = variable.validation || {};
    
    // Required
    if (validation.required && (value === undefined || value === null || value === '')) {
      errors.push({
        key: variable.key,
        message: `${variable.label || variable.key} is required`
      });
    }
    
    if (value) {
      // Min/Max length para strings
      if (typeof value === 'string') {
        if (validation.minLength && value.length < validation.minLength) {
          errors.push({
            key: variable.key,
            message: `${variable.label || variable.key} must be at least ${validation.minLength} characters`
          });
        }
        
        if (validation.maxLength && value.length > validation.maxLength) {
          errors.push({
            key: variable.key,
            message: `${variable.label || variable.key} must be at most ${validation.maxLength} characters`
          });
        }
        
        // Pattern
        if (validation.pattern) {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(value)) {
            errors.push({
              key: variable.key,
              message: `${variable.label || variable.key} format is invalid`
            });
          }
        }
      }
      
      // Min/Max para numbers
      if (typeof value === 'number') {
        if (validation.min !== undefined && value < validation.min) {
          errors.push({
            key: variable.key,
            message: `${variable.label || variable.key} must be at least ${validation.min}`
          });
        }
        
        if (validation.max !== undefined && value > validation.max) {
          errors.push({
            key: variable.key,
            message: `${variable.label || variable.key} must be at most ${validation.max}`
          });
        }
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Método estático para buscar por categoría
contentTemplateSchema.statics.findByCategory = function(category, options = {}) {
  const query = { 
    category, 
    status: 'published',
    isPublic: true
  };
  
  return this.find(query)
    .sort(options.sort || { 'stats.uses': -1 })
    .limit(options.limit || 50);
};

// Método estático para obtener templates populares
contentTemplateSchema.statics.findPopular = function(limit = 10) {
  return this.find({
    status: 'published',
    isPublic: true,
    $or: [
      { 'stats.uses': { $gte: 50 } },
      { 'stats.rating': { $gte: 4 } }
    ]
  })
  .sort({ 'stats.uses': -1, 'stats.rating': -1 })
  .limit(limit);
};

// Método estático para obtener templates destacados
contentTemplateSchema.statics.findFeatured = function() {
  return this.find({
    status: 'published',
    isPublic: true,
    isFeatured: true
  }).sort({ 'stats.uses': -1 });
};

// Método estático para búsqueda
contentTemplateSchema.statics.search = function(searchTerm, options = {}) {
  const query = {
    $text: { $search: searchTerm },
    status: 'published',
    isPublic: true
  };
  
  if (options.category) {
    query.category = options.category;
  }
  
  return this.find(query, {
    score: { $meta: 'textScore' }
  })
  .sort({ score: { $meta: 'textScore' } })
  .limit(options.limit || 50);
};

const ContentTemplate = mongoose.model('ContentTemplate', contentTemplateSchema);

module.exports = ContentTemplate;
