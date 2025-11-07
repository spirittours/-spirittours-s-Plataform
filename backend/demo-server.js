/**
 * Spirit Tours CMS - Demo Server (No MongoDB Required)
 * 
 * This demo server allows testing the CMS frontend without MongoDB.
 * Uses in-memory mock data for all CMS operations.
 * Perfect for frontend development, demos, and testing.
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./utils/logger');
const portManager = require('./config/port-manager');

// Initialize Express app
const app = express();
let PORT = process.env.DEMO_PORT || 5002;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// ============================================
// MOCK DATA - In-Memory Database
// ============================================

// Mock institutional pages (from seed script)
let mockPages = [
  {
    _id: '1',
    slug: 'about-us',
    title: 'About Us - Spirit Tours',
    type: 'standard',
    status: 'published',
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          heading: 'About Us',
          subheading: 'Our Story and Mission',
        },
        settings: {
          height: 'medium',
          backgroundImage: '',
          textColor: '#FFFFFF',
        },
        order: 0,
      },
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h2>Our Story</h2><p>Spirit Tours was founded with a vision to create transformative travel experiences that nourish the soul and expand consciousness. We believe that travel is not just about visiting places, but about discovering yourself and connecting with the essence of different cultures.</p><h3>Our Mission</h3><p>To facilitate meaningful journeys that inspire personal growth, cultural understanding, and spiritual awakening through carefully curated travel experiences.</p>',
        },
        settings: {
          maxWidth: '800px',
          alignment: 'center',
        },
        order: 1,
      },
      {
        id: 'gallery-1',
        type: 'gallery',
        content: {
          title: 'Our Team',
          images: [],
        },
        settings: {
          columns: 3,
          aspectRatio: '1:1',
          showCaptions: true,
        },
        order: 2,
      },
    ],
    seo: {
      metaTitle: 'About Spirit Tours - Our Story & Mission',
      metaDescription: 'Learn about Spirit Tours\' journey, mission, and the passionate team behind transformative spiritual travel experiences.',
      keywords: ['spirit tours', 'about us', 'tour company', 'spiritual travel'],
    },
    stats: {
      views: 156,
      lastViewed: new Date(),
    },
    createdAt: new Date('2024-11-01'),
    updatedAt: new Date('2024-11-06'),
    publishedAt: new Date('2024-11-01'),
  },
  {
    _id: '2',
    slug: 'contact-us',
    title: 'Contact Us - Spirit Tours',
    type: 'standard',
    status: 'published',
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          heading: 'Get in Touch',
          subheading: 'We\'d love to hear from you',
        },
        settings: { height: 'small' },
        order: 0,
      },
      {
        id: 'form-1',
        type: 'form',
        content: {
          title: 'Contact Form',
          fields: [
            { id: '1', type: 'text', label: 'Name', placeholder: 'Your name', required: true },
            { id: '2', type: 'email', label: 'Email', placeholder: 'your@email.com', required: true },
            { id: '3', type: 'tel', label: 'Phone', placeholder: '+1 (555) 000-0000', required: false },
            { id: '4', type: 'select', label: 'Subject', options: ['General Inquiry', 'Booking Question', 'Partnership', 'Press'], required: true },
            { id: '5', type: 'textarea', label: 'Message', placeholder: 'Tell us how we can help...', required: true, rows: 5 },
          ],
          submitButtonText: 'Send Message',
        },
        settings: {
          submitAction: 'email',
          emailTo: 'info@spirittours.com',
        },
        order: 1,
      },
    ],
    seo: {
      metaTitle: 'Contact Spirit Tours - Get in Touch',
      metaDescription: 'Contact Spirit Tours for inquiries about our spiritual travel experiences, bookings, or partnerships.',
      keywords: ['contact spirit tours', 'customer service', 'travel inquiries'],
    },
    stats: { views: 234, lastViewed: new Date() },
    createdAt: new Date('2024-11-01'),
    updatedAt: new Date('2024-11-06'),
    publishedAt: new Date('2024-11-01'),
  },
  {
    _id: '3',
    slug: 'our-services',
    title: 'Our Services - Spirit Tours',
    type: 'standard',
    status: 'published',
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          heading: 'Our Services',
          subheading: 'Comprehensive Spiritual Travel Solutions',
        },
        settings: { height: 'medium' },
        order: 0,
      },
      {
        id: 'text-1',
        type: 'text',
        content: {
          html: '<h2>What We Offer</h2><ul><li><strong>Guided Spiritual Tours:</strong> Expert-led journeys to sacred destinations worldwide</li><li><strong>Custom Itineraries:</strong> Personalized travel plans tailored to your spiritual goals</li><li><strong>Group Travel:</strong> Join like-minded travelers on transformative group experiences</li><li><strong>Accommodation Booking:</strong> Carefully selected lodging that enhances your journey</li><li><strong>Transportation Services:</strong> Comfortable and reliable transport throughout your trip</li><li><strong>Cultural Immersion:</strong> Authentic experiences with local communities and traditions</li></ul>',
        },
        settings: { maxWidth: '800px' },
        order: 1,
      },
    ],
    seo: {
      metaTitle: 'Tour Services - Spirit Tours Offerings',
      metaDescription: 'Discover our comprehensive spiritual travel services including guided tours, custom itineraries, and cultural immersion experiences.',
      keywords: ['tour services', 'travel packages', 'spiritual tours'],
    },
    stats: { views: 189, lastViewed: new Date() },
    createdAt: new Date('2024-11-01'),
    updatedAt: new Date('2024-11-06'),
    publishedAt: new Date('2024-11-01'),
  },
  {
    _id: '4',
    slug: 'faq',
    title: 'FAQ - Spirit Tours',
    type: 'standard',
    status: 'published',
    sections: [
      {
        id: 'hero-1',
        type: 'hero',
        content: {
          heading: 'Frequently Asked Questions',
          subheading: 'Find answers to common questions about our tours',
        },
        settings: { height: 'small' },
        order: 0,
      },
      {
        id: 'accordion-1',
        type: 'accordion',
        content: {
          items: [
            {
              id: '1',
              title: 'What is included in the tour price?',
              content: 'Our tour prices typically include accommodation, most meals, transportation during the tour, entrance fees to sites, and guided tours. International flights are usually not included unless specifically mentioned.',
            },
            {
              id: '2',
              title: 'Do I need travel insurance?',
              content: 'Yes, we strongly recommend purchasing comprehensive travel insurance that covers medical emergencies, trip cancellation, and lost luggage.',
            },
            {
              id: '3',
              title: 'What is your cancellation policy?',
              content: 'Cancellations made 60+ days before departure receive a full refund minus $100 processing fee. 30-59 days: 50% refund. Less than 30 days: no refund unless we can fill your spot.',
            },
            {
              id: '4',
              title: 'Are your tours suitable for solo travelers?',
              content: 'Absolutely! Many of our travelers journey solo and find it to be a deeply rewarding experience. We foster a welcoming group dynamic.',
            },
            {
              id: '5',
              title: 'What level of fitness is required?',
              content: 'Fitness requirements vary by tour. Most tours require a moderate fitness level - ability to walk 2-4 hours per day. Specific requirements are listed on each tour page.',
            },
            {
              id: '6',
              title: 'Can dietary restrictions be accommodated?',
              content: 'Yes, we can accommodate most dietary restrictions including vegetarian, vegan, gluten-free, and allergies. Please inform us at booking.',
            },
          ],
        },
        settings: {
          allowMultiple: false,
          startOpen: false,
          style: 'bordered',
        },
        order: 1,
      },
    ],
    seo: {
      metaTitle: 'FAQ - Spirit Tours | Common Questions About Spiritual Travel',
      metaDescription: 'Find answers to frequently asked questions about Spirit Tours, our booking process, cancellation policies, and what to expect.',
      keywords: ['spirit tours faq', 'travel questions', 'tour information'],
    },
    stats: { views: 312, lastViewed: new Date() },
    createdAt: new Date('2024-11-01'),
    updatedAt: new Date('2024-11-06'),
    publishedAt: new Date('2024-11-01'),
  },
];

// Mock media assets
let mockMedia = [
  {
    _id: 'm1',
    filename: 'hero-image.jpg',
    originalName: 'hero-image.jpg',
    mimeType: 'image/jpeg',
    size: 245680,
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080',
    alt: 'Mountain landscape at sunset',
    folder: 'heroes',
    createdAt: new Date('2024-11-01'),
  },
  {
    _id: 'm2',
    filename: 'team-photo.jpg',
    originalName: 'team-photo.jpg',
    mimeType: 'image/jpeg',
    size: 198450,
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600',
    alt: 'Spirit Tours team photo',
    folder: 'team',
    createdAt: new Date('2024-11-01'),
  },
];

// Mock templates
let mockTemplates = [
  {
    _id: 't1',
    name: 'About Us Template',
    description: 'Professional about us page with team section',
    category: 'page',
    sections: [
      { type: 'hero', content: { heading: 'About Us', subheading: 'Our Story' } },
      { type: 'text', content: { html: '<p>Company information...</p>' } },
      { type: 'gallery', content: { title: 'Our Team' } },
    ],
    variables: [],
    stats: { uses: 150, rating: 4.8 },
    createdAt: new Date('2024-11-01'),
  },
];

// ============================================
// MOCK API ROUTES - CMS Pages
// ============================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Spirit Tours CMS Demo Server',
    mode: 'DEMO - No MongoDB Required',
    timestamp: new Date().toISOString(),
    version: '1.0.0-demo'
  });
});

// GET /api/cms/pages - List all pages
app.get('/api/cms/pages', (req, res) => {
  const { status, type, search, limit = 20, page = 1 } = req.query;
  
  let filteredPages = [...mockPages];
  
  // Filter by status
  if (status) {
    filteredPages = filteredPages.filter(p => p.status === status);
  }
  
  // Filter by type
  if (type) {
    filteredPages = filteredPages.filter(p => p.type === type);
  }
  
  // Search by title or slug
  if (search) {
    const searchLower = search.toLowerCase();
    filteredPages = filteredPages.filter(p => 
      p.title.toLowerCase().includes(searchLower) || 
      p.slug.toLowerCase().includes(searchLower)
    );
  }
  
  // Pagination
  const total = filteredPages.length;
  const start = (page - 1) * limit;
  const paginatedPages = filteredPages.slice(start, start + parseInt(limit));
  
  res.json({
    success: true,
    pages: paginatedPages,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(total / limit),
  });
});

// GET /api/cms/pages/stats - Get page statistics
app.get('/api/cms/pages/stats', (req, res) => {
  const stats = {
    total: mockPages.length,
    published: mockPages.filter(p => p.status === 'published').length,
    draft: mockPages.filter(p => p.status === 'draft').length,
    archived: mockPages.filter(p => p.status === 'archived').length,
    totalViews: mockPages.reduce((sum, p) => sum + p.stats.views, 0),
    recentlyUpdated: mockPages
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5)
      .map(p => ({ _id: p._id, title: p.title, updatedAt: p.updatedAt })),
  };
  
  res.json({
    success: true,
    stats,
  });
});

// GET /api/cms/pages/:id - Get page by ID
app.get('/api/cms/pages/:id', (req, res) => {
  const page = mockPages.find(p => p._id === req.params.id);
  
  if (!page) {
    return res.status(404).json({
      success: false,
      message: 'Page not found',
    });
  }
  
  res.json({
    success: true,
    page,
  });
});

// GET /api/cms/pages/by-slug/:slug - Get page by slug
app.get('/api/cms/pages/by-slug/:slug', (req, res) => {
  const page = mockPages.find(p => p.slug === req.params.slug);
  
  if (!page) {
    return res.status(404).json({
      success: false,
      message: 'Page not found',
    });
  }
  
  // Increment views
  page.stats.views += 1;
  page.stats.lastViewed = new Date();
  
  res.json({
    success: true,
    page,
  });
});

// POST /api/cms/pages - Create new page
app.post('/api/cms/pages', (req, res) => {
  const newPage = {
    _id: Date.now().toString(),
    slug: req.body.slug || `page-${Date.now()}`,
    title: req.body.title || 'New Page',
    type: req.body.type || 'standard',
    status: req.body.status || 'draft',
    sections: req.body.sections || [],
    seo: req.body.seo || {},
    stats: { views: 0, lastViewed: null },
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: req.body.status === 'published' ? new Date() : null,
  };
  
  mockPages.push(newPage);
  
  logger.info('✅ Demo: Page created:', newPage.title);
  
  res.status(201).json({
    success: true,
    page: newPage,
    message: 'Page created successfully (demo mode)',
  });
});

// PUT /api/cms/pages/:id - Update page
app.put('/api/cms/pages/:id', (req, res) => {
  const pageIndex = mockPages.findIndex(p => p._id === req.params.id);
  
  if (pageIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Page not found',
    });
  }
  
  mockPages[pageIndex] = {
    ...mockPages[pageIndex],
    ...req.body,
    _id: req.params.id, // Preserve ID
    updatedAt: new Date(),
    publishedAt: req.body.status === 'published' && !mockPages[pageIndex].publishedAt 
      ? new Date() 
      : mockPages[pageIndex].publishedAt,
  };
  
  logger.info('✅ Demo: Page updated:', mockPages[pageIndex].title);
  
  res.json({
    success: true,
    page: mockPages[pageIndex],
    message: 'Page updated successfully (demo mode)',
  });
});

// DELETE /api/cms/pages/:id - Delete page
app.delete('/api/cms/pages/:id', (req, res) => {
  const pageIndex = mockPages.findIndex(p => p._id === req.params.id);
  
  if (pageIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Page not found',
    });
  }
  
  const deletedPage = mockPages.splice(pageIndex, 1)[0];
  
  logger.info('✅ Demo: Page deleted:', deletedPage.title);
  
  res.json({
    success: true,
    message: 'Page deleted successfully (demo mode)',
  });
});

// POST /api/cms/pages/:id/duplicate - Duplicate page
app.post('/api/cms/pages/:id/duplicate', (req, res) => {
  const page = mockPages.find(p => p._id === req.params.id);
  
  if (!page) {
    return res.status(404).json({
      success: false,
      message: 'Page not found',
    });
  }
  
  const duplicatedPage = {
    ...JSON.parse(JSON.stringify(page)), // Deep clone
    _id: Date.now().toString(),
    slug: `${page.slug}-copy`,
    title: `${page.title} (Copy)`,
    status: 'draft',
    stats: { views: 0, lastViewed: null },
    createdAt: new Date(),
    updatedAt: new Date(),
    publishedAt: null,
  };
  
  mockPages.push(duplicatedPage);
  
  logger.info('✅ Demo: Page duplicated:', duplicatedPage.title);
  
  res.json({
    success: true,
    page: duplicatedPage,
    message: 'Page duplicated successfully (demo mode)',
  });
});

// ============================================
// MOCK API ROUTES - Media Library
// ============================================

// GET /api/cms/media - List all media
app.get('/api/cms/media', (req, res) => {
  const { type, search, folder, limit = 24, page = 1 } = req.query;
  
  let filteredMedia = [...mockMedia];
  
  if (type) {
    filteredMedia = filteredMedia.filter(m => m.mimeType.startsWith(type));
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    filteredMedia = filteredMedia.filter(m => 
      m.filename.toLowerCase().includes(searchLower) ||
      (m.alt && m.alt.toLowerCase().includes(searchLower))
    );
  }
  
  if (folder) {
    filteredMedia = filteredMedia.filter(m => m.folder === folder);
  }
  
  const total = filteredMedia.length;
  const start = (page - 1) * limit;
  const paginatedMedia = filteredMedia.slice(start, start + parseInt(limit));
  
  res.json({
    success: true,
    assets: paginatedMedia,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
  });
});

// POST /api/cms/media/upload - Mock file upload
app.post('/api/cms/media/upload', (req, res) => {
  // In demo mode, simulate file upload
  const newAsset = {
    _id: `m${Date.now()}`,
    filename: `demo-upload-${Date.now()}.jpg`,
    originalName: 'uploaded-image.jpg',
    mimeType: 'image/jpeg',
    size: 150000,
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600',
    alt: 'Demo uploaded image',
    folder: req.body.folder || 'uploads',
    createdAt: new Date(),
  };
  
  mockMedia.push(newAsset);
  
  logger.info('✅ Demo: Media uploaded (simulated)');
  
  res.json({
    success: true,
    asset: newAsset,
    message: 'File uploaded successfully (demo mode - simulated)',
  });
});

// DELETE /api/cms/media/:id - Delete media
app.delete('/api/cms/media/:id', (req, res) => {
  const mediaIndex = mockMedia.findIndex(m => m._id === req.params.id);
  
  if (mediaIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Media not found',
    });
  }
  
  mockMedia.splice(mediaIndex, 1);
  
  logger.info('✅ Demo: Media deleted');
  
  res.json({
    success: true,
    message: 'Media deleted successfully (demo mode)',
  });
});

// ============================================
// MOCK API ROUTES - Templates
// ============================================

// GET /api/cms/templates - List all templates
app.get('/api/cms/templates', (req, res) => {
  res.json({
    success: true,
    templates: mockTemplates,
    total: mockTemplates.length,
  });
});

// GET /api/cms/templates/:id - Get template by ID
app.get('/api/cms/templates/:id', (req, res) => {
  const template = mockTemplates.find(t => t._id === req.params.id);
  
  if (!template) {
    return res.status(404).json({
      success: false,
      message: 'Template not found',
    });
  }
  
  res.json({
    success: true,
    template,
  });
});

// ============================================
// MOCK API ROUTES - SEO
// ============================================

// POST /api/cms/seo/analyze - Analyze SEO
app.post('/api/cms/seo/analyze', (req, res) => {
  const { metaTitle, metaDescription, content, keywords } = req.body;
  
  const analysis = {
    score: 85,
    issues: [],
    suggestions: [],
    checks: {
      titleLength: metaTitle && metaTitle.length >= 50 && metaTitle.length <= 60,
      descriptionLength: metaDescription && metaDescription.length >= 150 && metaDescription.length <= 160,
      keywordsPresent: keywords && keywords.length >= 3,
      hasHeadings: content && content.includes('<h'),
    },
  };
  
  if (!analysis.checks.titleLength) {
    analysis.suggestions.push('Title should be 50-60 characters');
  }
  
  if (!analysis.checks.descriptionLength) {
    analysis.suggestions.push('Description should be 150-160 characters');
  }
  
  res.json({
    success: true,
    analysis,
  });
});

// ============================================
// Error handling middleware
// ============================================

app.use((err, req, res, next) => {
  logger.error('Demo server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error (demo mode)',
    error: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// ============================================
// Start Demo Server
// ============================================

async function startServer() {
  try {
    // Get available port dynamically
    PORT = await portManager.getServicePort('demo');
    
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🎭 SPIRIT TOURS CMS - DEMO SERVER');
      console.log('='.repeat(60));
      console.log(`✅ Demo server running on: http://localhost:${PORT}`);
      console.log(`📊 Mode: DEMO (No MongoDB required)`);
      console.log(`📄 Mock pages loaded: ${mockPages.length}`);
      console.log(`🖼️  Mock media loaded: ${mockMedia.length}`);
      console.log(`📋 Mock templates loaded: ${mockTemplates.length}`);
      console.log('\n📍 Available Endpoints:');
      console.log(`   GET  /health`);
      console.log(`   GET  /api/cms/pages`);
      console.log(`   POST /api/cms/pages`);
      console.log(`   GET  /api/cms/pages/:id`);
      console.log(`   PUT  /api/cms/pages/:id`);
      console.log(`   DELETE /api/cms/pages/:id`);
      console.log(`   GET  /api/cms/media`);
      console.log(`   POST /api/cms/media/upload`);
      console.log(`   GET  /api/cms/templates`);
      console.log('\n💡 Tips:');
      console.log('   - All data is in-memory (resets on restart)');
      console.log('   - Perfect for frontend development and demos');
      console.log('   - No authentication required');
      console.log('   - Update REACT_APP_API_URL to http://localhost:' + PORT);
      console.log('\n' + '='.repeat(60) + '\n');
      
      logger.info(`Demo server started on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down demo server...');
      portManager.releasePort(PORT);
      process.exit(0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down demo server...');
      portManager.releasePort(PORT);
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start demo server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
