/**
 * Prospects API Routes
 * Fase 8 - B2B Prospecting System
 * 
 * Endpoints for prospect management and CRUD operations
 */

const express = require('express');
const router = express.Router();
const Prospect = require('../models/Prospect');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/prospects
 * List prospects with filtering, search, and pagination
 * 
 * Query params:
 * - search: string (searches in business_name, city)
 * - country: string (country_code filter)
 * - type: string (business_type filter)
 * - status: string (status filter)
 * - minScore: number (minimum lead_score)
 * - page: number (default 1)
 * - limit: number (default 25)
 * - sort: string (default '-created_at')
 */
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      country = 'all',
      type = 'all',
      status = 'all',
      minScore = 0,
      page = 1,
      limit = 25,
      sort = '-created_at'
    } = req.query;

    // Build query
    const query = {};

    // Text search
    if (search) {
      query.$or = [
        { business_name: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    // Filters
    if (country !== 'all') {
      query.country_code = country;
    }

    if (type !== 'all') {
      query.business_type = type;
    }

    if (status !== 'all') {
      query.status = status;
    }

    if (minScore > 0) {
      query.lead_score = { $gte: parseInt(minScore) };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Execute query
    const [prospects, total] = await Promise.all([
      Prospect.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Prospect.countDocuments(query)
    ]);

    res.json({
      success: true,
      prospects,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching prospects:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/prospects/stats
 * Get prospect statistics
 * 
 * Returns:
 * - total prospects
 * - breakdown by status, country, type
 * - average lead score
 * - conversion rate
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      total,
      byStatus,
      byCountry,
      byType,
      avgLeadScore,
      totalConverted
    ] = await Promise.all([
      // Total prospects
      Prospect.countDocuments(),
      
      // By status
      Prospect.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      
      // By country
      Prospect.aggregate([
        { $group: { _id: '$country_code', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // By type
      Prospect.aggregate([
        { $group: { _id: '$business_type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      
      // Average lead score
      Prospect.aggregate([
        { $group: { _id: null, avg: { $avg: '$lead_score' } } }
      ]),
      
      // Total converted
      Prospect.countDocuments({ status: 'converted' })
    ]);

    // Format results
    const statusMap = {};
    byStatus.forEach(item => {
      statusMap[item._id] = item.count;
    });

    const countryMap = {};
    byCountry.forEach(item => {
      countryMap[item._id] = item.count;
    });

    const typeMap = {};
    byType.forEach(item => {
      typeMap[item._id] = item.count;
    });

    const stats = {
      total,
      byStatus: statusMap,
      byCountry: countryMap,
      byType: typeMap,
      averageLeadScore: avgLeadScore[0]?.avg || 0,
      conversionRate: total > 0 ? totalConverted / total : 0
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/prospects/:id
 * Get prospect details by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const prospect = await Prospect.findById(req.params.id);

    if (!prospect) {
      return res.status(404).json({
        success: false,
        error: 'Prospect not found'
      });
    }

    res.json({
      success: true,
      prospect
    });
  } catch (error) {
    console.error('Error fetching prospect:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/prospects
 * Create a new prospect manually
 * 
 * Body: Prospect object
 */
router.post('/', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const prospectData = req.body;

    // Validate required fields
    if (!prospectData.business_name || !prospectData.city || !prospectData.country_code) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: business_name, city, country_code'
      });
    }

    // Set defaults
    prospectData.source = prospectData.source || 'manual';
    prospectData.status = prospectData.status || 'new';
    prospectData.lead_score = prospectData.lead_score || 50;

    // Create prospect
    const prospect = new Prospect(prospectData);
    await prospect.save();

    res.status(201).json({
      success: true,
      prospect
    });
  } catch (error) {
    console.error('Error creating prospect:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/prospects/:id
 * Update prospect
 */
router.put('/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const updates = req.body;
    updates.updated_at = new Date();

    const prospect = await Prospect.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!prospect) {
      return res.status(404).json({
        success: false,
        error: 'Prospect not found'
      });
    }

    res.json({
      success: true,
      prospect
    });
  } catch (error) {
    console.error('Error updating prospect:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/prospects/:id
 * Delete prospect
 */
router.delete('/:id', authorize(['admin']), async (req, res) => {
  try {
    const prospect = await Prospect.findByIdAndDelete(req.params.id);

    if (!prospect) {
      return res.status(404).json({
        success: false,
        error: 'Prospect not found'
      });
    }

    res.json({
      success: true,
      message: 'Prospect deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting prospect:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/prospects/bulk-action
 * Perform bulk actions on prospects
 * 
 * Body:
 * {
 *   action: 'delete' | 'update_status' | 'export',
 *   prospectIds: string[],
 *   data: object (for update actions)
 * }
 */
router.post('/bulk-action', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { action, prospectIds, data } = req.body;

    if (!action || !prospectIds || !Array.isArray(prospectIds)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request: action and prospectIds array required'
      });
    }

    let result;

    switch (action) {
      case 'delete':
        result = await Prospect.deleteMany({
          _id: { $in: prospectIds }
        });
        break;

      case 'update_status':
        if (!data || !data.status) {
          return res.status(400).json({
            success: false,
            error: 'Status is required for update_status action'
          });
        }
        result = await Prospect.updateMany(
          { _id: { $in: prospectIds } },
          { $set: { status: data.status, updated_at: new Date() } }
        );
        break;

      case 'export':
        const prospects = await Prospect.find({
          _id: { $in: prospectIds }
        }).lean();
        
        return res.json({
          success: true,
          action: 'export',
          data: prospects
        });

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown action: ${action}`
        });
    }

    res.json({
      success: true,
      action,
      modified: result.modifiedCount || result.deletedCount,
      message: `${action} completed successfully`
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/prospects/export/csv
 * Export prospects to CSV
 */
router.get('/export/csv', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const prospects = await Prospect.find().lean();

    // Convert to CSV
    const csv = [
      // Header
      'Business Name,Type,City,Country,Email,Phone,Website,Lead Score,Status,Created',
      // Data rows
      ...prospects.map(p => [
        p.business_name,
        p.business_type,
        p.city,
        p.country_code,
        p.email || '',
        p.phone || '',
        p.website || '',
        p.lead_score,
        p.status,
        p.created_at
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=prospects.csv');
    res.send(csv);
  } catch (error) {
    console.error('Error exporting prospects:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
