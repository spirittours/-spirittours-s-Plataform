const mongoose = require('mongoose');

/**
 * MediaAsset Model - Gestión de archivos multimedia
 * Maneja imágenes, videos, documentos, audio
 * Incluye metadata, thumbnails, CDN integration, organización por carpetas
 */
const mediaAssetSchema = new mongoose.Schema({
  // Información del archivo
  filename: { 
    type: String, 
    required: true,
    index: true
  },
  
  originalName: { 
    type: String, 
    required: true 
  },
  
  // Tipo MIME
  mimeType: { 
    type: String, 
    required: true 
  },
  
  // Tamaño en bytes
  size: { 
    type: Number, 
    required: true 
  },
  
  // URLs
  url: { 
    type: String, 
    required: true 
  }, // URL local o storage
  
  cdnUrl: String, // URL de CDN (Cloudflare, AWS CloudFront, etc.)
  
  thumbnailUrl: String, // Thumbnail generado automáticamente
  
  // Tipo de asset
  type: { 
    type: String, 
    enum: ['image', 'video', 'document', 'audio', 'other'],
    required: true,
    index: true
  },
  
  // Organización
  folder: { 
    type: String, 
    default: '/',
    index: true
  }, // /uploads/2024/11/, /media/tours/, etc.
  
  // Metadata específica del tipo
  metadata: {
    // Para imágenes
    width: Number,
    height: Number,
    aspectRatio: String, // 16:9, 4:3, 1:1, etc.
    format: String, // jpg, png, webp, svg
    
    // Para videos
    duration: Number, // en segundos
    codec: String,
    bitrate: Number,
    fps: Number,
    
    // Para documentos
    pages: Number,
    wordCount: Number,
    
    // Información descriptiva
    alt: String, // Texto alternativo (importante para SEO)
    title: String,
    caption: String,
    description: String,
    
    // Información de copyright
    copyright: String,
    license: String,
    attribution: String,
    
    // EXIF data (para fotos)
    exif: {
      camera: String,
      lens: String,
      iso: Number,
      aperture: String,
      shutterSpeed: String,
      focalLength: String,
      dateTime: Date,
      gps: {
        latitude: Number,
        longitude: Number,
        altitude: Number
      }
    },
    
    // Color dominante (útil para UI)
    dominantColor: String, // hex color
    palette: [String] // array de colores principales
  },
  
  // Variantes generadas (thumbnails, responsive sizes)
  variants: [{
    name: String, // 'thumbnail', 'small', 'medium', 'large', 'webp', etc.
    url: String,
    width: Number,
    height: Number,
    size: Number,
    mimeType: String
  }],
  
  // Tags y categorización
  tags: [{ 
    type: String, 
    index: true 
  }],
  
  category: { 
    type: String,
    enum: ['tours', 'destinations', 'hotels', 'team', 'testimonials', 'blog', 'marketing', 'other'],
    default: 'other',
    index: true
  },
  
  // Relaciones
  relatedTo: [{
    model: String, // 'Page', 'Itinerary', 'Tour', etc.
    id: mongoose.Schema.Types.ObjectId
  }],
  
  // Usuario que subió
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  
  // Estadísticas de uso
  usageCount: { 
    type: Number, 
    default: 0,
    index: true
  }, // Cuántas veces se usa en páginas/posts
  
  lastUsedAt: Date,
  
  // Estado
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active',
    index: true
  },
  
  // Procesamiento
  processing: {
    isProcessing: { type: Boolean, default: false },
    progress: { type: Number, default: 0 }, // 0-100
    error: String
  },
  
  // Optimización
  optimization: {
    isOptimized: { type: Boolean, default: false },
    originalSize: Number,
    optimizedSize: Number,
    savings: Number // porcentaje
  },
  
  // Almacenamiento
  storage: {
    provider: { 
      type: String, 
      enum: ['local', 's3', 'cloudflare-r2', 'gcs', 'azure'],
      default: 'local'
    },
    bucket: String,
    region: String,
    key: String // storage key/path
  },
  
  // Acceso y permisos
  access: {
    isPublic: { type: Boolean, default: true },
    allowedRoles: [String],
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    requireAuth: { type: Boolean, default: false }
  },
  
  // SEO
  seo: {
    optimized: Boolean,
    altText: String,
    keywords: [String]
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices compuestos
mediaAssetSchema.index({ type: 1, category: 1, status: 1 });
mediaAssetSchema.index({ uploadedBy: 1, createdAt: -1 });
mediaAssetSchema.index({ folder: 1, type: 1 });
mediaAssetSchema.index({ tags: 1, status: 1 });

// Text index para búsqueda
mediaAssetSchema.index({ 
  originalName: 'text', 
  'metadata.alt': 'text', 
  'metadata.title': 'text',
  'metadata.description': 'text',
  tags: 'text'
});

// Virtual para URL preferida (CDN si existe, sino local)
mediaAssetSchema.virtual('preferredUrl').get(function() {
  return this.cdnUrl || this.url;
});

// Virtual para saber si es imagen
mediaAssetSchema.virtual('isImage').get(function() {
  return this.type === 'image';
});

// Virtual para saber si es video
mediaAssetSchema.virtual('isVideo').get(function() {
  return this.type === 'video';
});

// Virtual para tamaño legible
mediaAssetSchema.virtual('readableSize').get(function() {
  const bytes = this.size;
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
});

// Pre-save: Determinar tipo basado en MIME type
mediaAssetSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('mimeType')) {
    if (this.mimeType.startsWith('image/')) {
      this.type = 'image';
    } else if (this.mimeType.startsWith('video/')) {
      this.type = 'video';
    } else if (this.mimeType.startsWith('audio/')) {
      this.type = 'audio';
    } else if (
      this.mimeType.includes('pdf') ||
      this.mimeType.includes('word') ||
      this.mimeType.includes('document') ||
      this.mimeType.includes('spreadsheet')
    ) {
      this.type = 'document';
    } else {
      this.type = 'other';
    }
  }
  next();
});

// Método para incrementar uso
mediaAssetSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

// Método para decrementar uso
mediaAssetSchema.methods.decrementUsage = function() {
  if (this.usageCount > 0) {
    this.usageCount -= 1;
  }
  return this.save();
};

// Método para archivar
mediaAssetSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Método para restaurar
mediaAssetSchema.methods.restore = function() {
  this.status = 'active';
  return this.save();
};

// Método para eliminar (soft delete)
mediaAssetSchema.methods.softDelete = function() {
  this.status = 'deleted';
  return this.save();
};

// Método para añadir variante
mediaAssetSchema.methods.addVariant = function(variant) {
  // Evitar duplicados
  const existingIndex = this.variants.findIndex(v => v.name === variant.name);
  
  if (existingIndex > -1) {
    this.variants[existingIndex] = variant;
  } else {
    this.variants.push(variant);
  }
  
  return this.save();
};

// Método para obtener variante específica
mediaAssetSchema.methods.getVariant = function(variantName) {
  return this.variants.find(v => v.name === variantName);
};

// Método estático para buscar por tipo
mediaAssetSchema.statics.findByType = function(type, options = {}) {
  const query = { type, status: 'active' };
  
  if (options.folder) query.folder = options.folder;
  if (options.category) query.category = options.category;
  if (options.uploadedBy) query.uploadedBy = options.uploadedBy;
  
  return this.find(query)
    .sort(options.sort || { createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0);
};

// Método estático para buscar por tags
mediaAssetSchema.statics.findByTags = function(tags, options = {}) {
  return this.find({
    tags: { $in: tags },
    status: 'active'
  })
  .sort(options.sort || { usageCount: -1 })
  .limit(options.limit || 50);
};

// Método estático para búsqueda de texto
mediaAssetSchema.statics.search = function(searchTerm, options = {}) {
  return this.find({
    $text: { $search: searchTerm },
    status: 'active'
  }, {
    score: { $meta: 'textScore' }
  })
  .sort({ score: { $meta: 'textScore' } })
  .limit(options.limit || 50);
};

// Método estático para obtener assets sin usar
mediaAssetSchema.statics.findUnused = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.find({
    $or: [
      { usageCount: 0 },
      { lastUsedAt: { $lt: cutoffDate } }
    ],
    status: 'active'
  }).sort({ createdAt: -1 });
};

// Método estático para estadísticas de almacenamiento
mediaAssetSchema.statics.getStorageStats = async function() {
  const stats = await this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalSize: { $sum: '$size' },
        avgSize: { $avg: '$size' }
      }
    }
  ]);
  
  const totalStats = await this.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
        totalSize: { $sum: '$size' }
      }
    }
  ]);
  
  return {
    byType: stats,
    total: totalStats[0] || { totalCount: 0, totalSize: 0 }
  };
};

const MediaAsset = mongoose.model('MediaAsset', mediaAssetSchema);

module.exports = MediaAsset;
