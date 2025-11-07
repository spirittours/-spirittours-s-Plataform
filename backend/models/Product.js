/**
 * Product Model
 * 
 * Represents Spirit Tours travel packages and products.
 * Used by AI to generate relevant email content.
 */

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Basic information
  name: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  
  description: {
    type: String,
    required: true,
  },
  
  shortDescription: {
    type: String,
    maxlength: 200,
  },
  
  // Destination
  destination: {
    type: String,
    required: true,
    index: true,
  },
  
  country: {
    type: String,
    required: true,
    index: true,
  },
  
  region: String,
  
  // Duration
  duration: {
    type: String,
    required: true, // e.g., "7 days / 6 nights"
  },
  
  durationDays: {
    type: Number,
    required: true,
  },
  
  // Pricing
  price: {
    type: Number,
    required: true,
  },
  
  currency: {
    type: String,
    default: 'USD',
  },
  
  // Commission for agencies
  commission: {
    percentage: {
      type: Number,
      required: true,
      default: 10, // 10% default
    },
    amount: Number, // Calculated
  },
  
  // Categories
  categories: [{
    type: String,
    enum: [
      'adventure',
      'luxury',
      'family',
      'couples',
      'group',
      'eco-tourism',
      'cultural',
      'beach',
      'mountain',
      'city',
      'cruise',
      'safari',
      'wellness',
      'food-wine',
    ],
  }],
  
  // Seasonality
  seasonality: {
    type: String,
    enum: ['spring', 'summer', 'fall', 'winter', 'year-round'],
    default: 'year-round',
  },
  
  bestMonths: [String], // ["January", "February", "December"]
  
  // Highlights
  highlights: [String], // Key selling points
  
  // Inclusions
  inclusions: [String], // What's included
  
  exclusions: [String], // What's not included
  
  // Itinerary summary
  itinerary: [{
    day: Number,
    title: String,
    description: String,
    meals: [String], // ["Breakfast", "Dinner"]
    accommodation: String,
  }],
  
  // Difficulty level
  difficulty: {
    type: String,
    enum: ['easy', 'moderate', 'challenging', 'extreme'],
    default: 'moderate',
  },
  
  // Group size
  groupSize: {
    min: Number,
    max: Number,
  },
  
  // Availability
  availability: {
    type: String,
    enum: ['available', 'limited', 'sold-out', 'coming-soon'],
    default: 'available',
  },
  
  startDates: [Date], // Fixed departure dates
  
  // Media
  images: [{
    url: String,
    caption: String,
    isPrimary: Boolean,
  }],
  
  videos: [{
    url: String,
    title: String,
  }],
  
  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'active',
    index: true,
  },
  
  featured: {
    type: Boolean,
    default: false,
    index: true,
  },
  
  // Popularity metrics
  popularity: {
    type: Number,
    default: 0,
  },
  
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  
  reviewCount: {
    type: Number,
    default: 0,
  },
  
  // Sales data
  sales: {
    total: {
      type: Number,
      default: 0,
    },
    thisMonth: {
      type: Number,
      default: 0,
    },
    thisYear: {
      type: Number,
      default: 0,
    },
  },
  
  // Email campaign usage
  emailCampaigns: {
    featured: {
      type: Number,
      default: 0,
    },
    conversionRate: {
      type: Number,
      default: 0,
    },
  },
  
  // SEO
  slug: {
    type: String,
    unique: true,
    index: true,
  },
  
  metaTitle: String,
  metaDescription: String,
  
  // Tags
  tags: [String],
  
}, {
  timestamps: true,
});

// Indexes
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ destination: 1, seasonality: 1 });
productSchema.index({ categories: 1, status: 1 });
productSchema.index({ featured: 1, popularity: -1 });

// Pre-save hook to generate slug
productSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  
  // Calculate commission amount
  if (this.isModified('price') || this.isModified('commission.percentage')) {
    this.commission.amount = this.price * (this.commission.percentage / 100);
  }
  
  next();
});

// Methods
productSchema.methods.incrementEmailUsage = function() {
  this.emailCampaigns.featured += 1;
  return this.save();
};

productSchema.methods.updateConversionRate = function(conversions, totalSends) {
  if (totalSends > 0) {
    this.emailCampaigns.conversionRate = (conversions / totalSends * 100).toFixed(2);
    return this.save();
  }
};

// Static methods
productSchema.statics.findFeatured = function(limit = 10) {
  return this.find({
    status: 'active',
    featured: true,
  })
  .sort({ popularity: -1 })
  .limit(limit);
};

productSchema.statics.findBySeason = function(season) {
  return this.find({
    status: 'active',
    $or: [
      { seasonality: season },
      { seasonality: 'year-round' },
    ],
  })
  .sort({ popularity: -1 });
};

productSchema.statics.findByCategory = function(category) {
  return this.find({
    status: 'active',
    categories: category,
  })
  .sort({ popularity: -1 });
};

productSchema.statics.findForEmailCampaign = function(options = {}) {
  const { season, categories, limit = 5 } = options;
  
  const query = { status: 'active' };
  
  if (season) {
    query.$or = [
      { seasonality: season },
      { seasonality: 'year-round' },
    ];
  }
  
  if (categories && categories.length > 0) {
    query.categories = { $in: categories };
  }
  
  return this.find(query)
    .sort({ featured: -1, popularity: -1, rating: -1 })
    .limit(limit);
};

productSchema.statics.getTopPerformingForEmails = function(limit = 10) {
  return this.find({
    status: 'active',
    'emailCampaigns.featured': { $gte: 3 },
  })
  .sort({ 'emailCampaigns.conversionRate': -1 })
  .limit(limit);
};

module.exports = mongoose.model('Product', productSchema);
