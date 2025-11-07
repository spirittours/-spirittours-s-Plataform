const express = require('express');
const router = express.Router();
const AdvancedSearchService = require('../../services/search/AdvancedSearchService');
const { authenticateToken } = require('../../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/search/:workspaceId/universal
 * @desc    Universal search across all entities
 * @access  Private
 */
router.get('/:workspaceId/universal', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { q, entities, limit, sortBy } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    const results = await AdvancedSearchService.universalSearch(
      workspaceId,
      q,
      {
        entities: entities ? entities.split(',') : undefined,
        limit: limit ? parseInt(limit) : undefined,
        sortBy,
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in universal search:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
    });
  }
});

/**
 * @route   GET /api/search/:workspaceId/:entityType
 * @desc    Search specific entity type
 * @access  Private
 */
router.get('/:workspaceId/:entityType', async (req, res) => {
  try {
    const { workspaceId, entityType } = req.params;
    const { q, limit, skip, sortBy, sortOrder } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    const results = await AdvancedSearchService.searchEntity(
      entityType,
      workspaceId,
      q,
      {
        limit: limit ? parseInt(limit) : undefined,
        skip: skip ? parseInt(skip) : undefined,
        sortBy,
        sortOrder,
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error searching entity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Search failed',
    });
  }
});

/**
 * @route   POST /api/search/:workspaceId/:entityType/filter
 * @desc    Advanced filtering with complex conditions
 * @access  Private
 */
router.post('/:workspaceId/:entityType/filter', async (req, res) => {
  try {
    const { workspaceId, entityType } = req.params;
    const { filters, limit, skip, sortBy, sortOrder } = req.body;

    if (!filters) {
      return res.status(400).json({
        success: false,
        error: 'Filters are required',
      });
    }

    const results = await AdvancedSearchService.advancedFilter(
      entityType,
      workspaceId,
      filters,
      {
        limit,
        skip,
        sortBy,
        sortOrder,
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in advanced filter:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Filter failed',
    });
  }
});

/**
 * @route   GET /api/search/:workspaceId/:entityType/suggestions
 * @desc    Get search suggestions
 * @access  Private
 */
router.get('/:workspaceId/:entityType/suggestions', async (req, res) => {
  try {
    const { workspaceId, entityType } = req.params;
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const suggestions = await AdvancedSearchService.getSearchSuggestions(
      workspaceId,
      q,
      entityType
    );

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions',
    });
  }
});

/**
 * @route   POST /api/search/:workspaceId/:entityType/boolean
 * @desc    Boolean search with AND, OR, NOT operators
 * @access  Private
 */
router.post('/:workspaceId/:entityType/boolean', async (req, res) => {
  try {
    const { workspaceId, entityType } = req.params;
    const { query, limit, skip } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
      });
    }

    const results = await AdvancedSearchService.booleanSearch(
      workspaceId,
      entityType,
      query,
      { limit, skip }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in boolean search:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Boolean search failed',
    });
  }
});

/**
 * @route   POST /api/search/:workspaceId/:entityType/date-range
 * @desc    Search by date range
 * @access  Private
 */
router.post('/:workspaceId/:entityType/date-range', async (req, res) => {
  try {
    const { workspaceId, entityType } = req.params;
    const { dateField, startDate, endDate, limit, skip } = req.body;

    if (!dateField || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'dateField, startDate, and endDate are required',
      });
    }

    const results = await AdvancedSearchService.searchByDateRange(
      entityType,
      workspaceId,
      dateField,
      startDate,
      endDate,
      { limit, skip }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in date range search:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Date range search failed',
    });
  }
});

/**
 * @route   POST /api/search/:workspaceId/:entityType/aggregate
 * @desc    Search with aggregation pipeline
 * @access  Private
 */
router.post('/:workspaceId/:entityType/aggregate', async (req, res) => {
  try {
    const { workspaceId, entityType } = req.params;
    const { aggregation } = req.body;

    if (!aggregation || !Array.isArray(aggregation)) {
      return res.status(400).json({
        success: false,
        error: 'Aggregation pipeline is required',
      });
    }

    const results = await AdvancedSearchService.aggregateSearch(
      entityType,
      workspaceId,
      aggregation
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in aggregate search:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Aggregate search failed',
    });
  }
});

/**
 * @route   GET /api/search/:workspaceId/:entityType/fuzzy
 * @desc    Fuzzy search (typo-tolerant)
 * @access  Private
 */
router.get('/:workspaceId/:entityType/fuzzy', async (req, res) => {
  try {
    const { workspaceId, entityType } = req.params;
    const { q, limit, skip, threshold } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required',
      });
    }

    const results = await AdvancedSearchService.fuzzySearch(
      entityType,
      workspaceId,
      q,
      {
        limit: limit ? parseInt(limit) : undefined,
        skip: skip ? parseInt(skip) : undefined,
        threshold: threshold ? parseFloat(threshold) : undefined,
      }
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error in fuzzy search:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Fuzzy search failed',
    });
  }
});

/**
 * @route   POST /api/search/:workspaceId/save
 * @desc    Save search query
 * @access  Private
 */
router.post('/:workspaceId/save', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;
    const searchData = req.body;

    const savedSearch = await AdvancedSearchService.saveSearch(
      workspaceId,
      userId,
      searchData
    );

    res.json({
      success: true,
      data: savedSearch,
    });
  } catch (error) {
    console.error('Error saving search:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save search',
    });
  }
});

/**
 * @route   GET /api/search/:workspaceId/saved
 * @desc    Get saved searches
 * @access  Private
 */
router.get('/:workspaceId/saved', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    const savedSearches = await AdvancedSearchService.getSavedSearches(
      workspaceId,
      userId
    );

    res.json({
      success: true,
      data: savedSearches,
    });
  } catch (error) {
    console.error('Error getting saved searches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get saved searches',
    });
  }
});

/**
 * @route   GET /api/search/:workspaceId/analytics
 * @desc    Get search analytics
 * @access  Private
 */
router.get('/:workspaceId/analytics', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { dateRange } = req.query;

    const analytics = await AdvancedSearchService.getSearchAnalytics(
      workspaceId,
      dateRange
    );

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Error getting search analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get search analytics',
    });
  }
});

module.exports = router;
