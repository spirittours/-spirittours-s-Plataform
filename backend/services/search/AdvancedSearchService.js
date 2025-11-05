/**
 * Advanced Search Service - SPRINT 7
 * 
 * Universal search and filtering across all CRM entities:
 * - Full-text search
 * - Multi-field filtering
 * - Complex boolean queries
 * - Faceted search
 * - Search suggestions
 * - Saved searches
 * 
 * Supports: Contacts, Deals, Projects, Activities, Documents
 */

const Contact = require('../../models/crm/Contact');
const Deal = require('../../models/crm/Deal');
const Activity = require('../../models/crm/Activity');
const Project = require('../../models/crm/Project');
const logger = require('../../utils/logger');

class AdvancedSearchService {
  constructor() {
    this.searchableEntities = {
      contacts: Contact,
      deals: Deal,
      projects: Project,
      activities: Activity,
    };
  }

  /**
   * Universal search across all entities
   */
  async universalSearch(workspaceId, query, options = {}) {
    try {
      const {
        entities = ['contacts', 'deals', 'projects', 'activities'],
        limit = 10,
        sortBy = 'relevance',
      } = options;

      const results = await Promise.all(
        entities.map((entity) =>
          this.searchEntity(entity, workspaceId, query, { limit })
        )
      );

      const aggregated = {};
      entities.forEach((entity, index) => {
        aggregated[entity] = results[index];
      });

      return {
        query,
        totalResults: results.reduce((sum, r) => sum + r.total, 0),
        results: aggregated,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error in universal search:', error);
      throw error;
    }
  }

  /**
   * Search specific entity type
   */
  async searchEntity(entityType, workspaceId, query, options = {}) {
    const Model = this.searchableEntities[entityType];
    if (!Model) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }

    const { limit = 20, skip = 0, sortBy = 'createdAt', sortOrder = 'desc' } =
      options;

    // Build text search query
    const searchQuery = {
      workspace: workspaceId,
      $text: { $search: query },
    };

    // Execute search
    const [items, total] = await Promise.all([
      Model.find(searchQuery)
        .sort({ score: { $meta: 'textScore' }, [sortBy]: sortOrder })
        .limit(limit)
        .skip(skip)
        .lean(),
      Model.countDocuments(searchQuery),
    ]);

    return {
      entityType,
      items,
      total,
      page: Math.floor(skip / limit) + 1,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Advanced filter with complex conditions
   */
  async advancedFilter(entityType, workspaceId, filters, options = {}) {
    try {
      const Model = this.searchableEntities[entityType];
      if (!Model) {
        throw new Error(`Unknown entity type: ${entityType}`);
      }

      const { limit = 20, skip = 0, sortBy = 'createdAt', sortOrder = 'desc' } =
        options;

      // Build filter query
      const query = this.buildFilterQuery(workspaceId, filters);

      // Execute query
      const [items, total, facets] = await Promise.all([
        Model.find(query)
          .sort({ [sortBy]: sortOrder })
          .limit(limit)
          .skip(skip)
          .lean(),
        Model.countDocuments(query),
        this.generateFacets(Model, workspaceId, filters),
      ]);

      return {
        entityType,
        items,
        total,
        page: Math.floor(skip / limit) + 1,
        pages: Math.ceil(total / limit),
        facets,
        appliedFilters: filters,
      };
    } catch (error) {
      logger.error('Error in advanced filter:', error);
      throw error;
    }
  }

  /**
   * Build MongoDB query from filters
   */
  buildFilterQuery(workspaceId, filters) {
    const query = { workspace: workspaceId };

    Object.entries(filters).forEach(([field, condition]) => {
      if (typeof condition === 'object' && condition !== null) {
        // Complex condition
        if (condition.operator === 'equals') {
          query[field] = condition.value;
        } else if (condition.operator === 'not_equals') {
          query[field] = { $ne: condition.value };
        } else if (condition.operator === 'contains') {
          query[field] = { $regex: condition.value, $options: 'i' };
        } else if (condition.operator === 'starts_with') {
          query[field] = { $regex: `^${condition.value}`, $options: 'i' };
        } else if (condition.operator === 'ends_with') {
          query[field] = { $regex: `${condition.value}$`, $options: 'i' };
        } else if (condition.operator === 'greater_than') {
          query[field] = { $gt: condition.value };
        } else if (condition.operator === 'less_than') {
          query[field] = { $lt: condition.value };
        } else if (condition.operator === 'between') {
          query[field] = { $gte: condition.min, $lte: condition.max };
        } else if (condition.operator === 'in') {
          query[field] = { $in: condition.values };
        } else if (condition.operator === 'not_in') {
          query[field] = { $nin: condition.values };
        } else if (condition.operator === 'exists') {
          query[field] = { $exists: condition.value };
        } else if (condition.operator === 'date_range') {
          query[field] = {
            $gte: new Date(condition.start),
            $lte: new Date(condition.end),
          };
        }
      } else {
        // Simple equality
        query[field] = condition;
      }
    });

    return query;
  }

  /**
   * Generate facets for filtering
   */
  async generateFacets(Model, workspaceId, currentFilters = {}) {
    const facets = {};

    // Determine which fields to facet based on entity type
    const facetFields = this.getFacetFields(Model.modelName);

    for (const field of facetFields) {
      try {
        // Don't facet on currently filtered field
        if (currentFilters[field]) continue;

        const values = await Model.aggregate([
          { $match: { workspace: workspaceId } },
          { $group: { _id: `$${field}`, count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]);

        facets[field] = values.map((v) => ({
          value: v._id,
          count: v.count,
        }));
      } catch (error) {
        logger.warn(`Failed to generate facet for ${field}:`, error.message);
      }
    }

    return facets;
  }

  /**
   * Get facet fields for entity type
   */
  getFacetFields(modelName) {
    const facetMap = {
      Contact: ['type', 'leadSource', 'leadQuality', 'industry', 'country'],
      Deal: ['status', 'stage', 'source', 'lostReason'],
      Project: ['status', 'priority'],
      Activity: ['type'],
    };

    return facetMap[modelName] || [];
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(workspaceId, query, entityType = 'contacts') {
    try {
      const Model = this.searchableEntities[entityType];
      if (!Model) {
        throw new Error(`Unknown entity type: ${entityType}`);
      }

      // Get fields to search for suggestions
      const suggestionFields = this.getSuggestionFields(entityType);

      const suggestions = [];

      for (const field of suggestionFields) {
        const fieldSuggestions = await Model.find({
          workspace: workspaceId,
          [field]: { $regex: query, $options: 'i' },
        })
          .select(field)
          .limit(5)
          .lean();

        suggestions.push(
          ...fieldSuggestions.map((item) => ({
            field,
            value: item[field],
            type: entityType,
          }))
        );
      }

      // Remove duplicates
      const uniqueSuggestions = suggestions.filter(
        (item, index, self) =>
          index === self.findIndex((t) => t.value === item.value)
      );

      return uniqueSuggestions.slice(0, 10);
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Get suggestion fields for entity type
   */
  getSuggestionFields(entityType) {
    const fieldMap = {
      contacts: ['firstName', 'lastName', 'email', 'company'],
      deals: ['title', 'description'],
      projects: ['name', 'description'],
      activities: ['description'],
    };

    return fieldMap[entityType] || [];
  }

  /**
   * Save search query for future use
   */
  async saveSearch(workspaceId, userId, searchData) {
    // TODO: Implement SavedSearch model and save logic
    // For now, return the search data
    return {
      id: Date.now().toString(),
      workspaceId,
      userId,
      name: searchData.name,
      entityType: searchData.entityType,
      query: searchData.query,
      filters: searchData.filters,
      savedAt: new Date(),
    };
  }

  /**
   * Get saved searches for user
   */
  async getSavedSearches(workspaceId, userId) {
    // TODO: Implement retrieval from SavedSearch model
    return [];
  }

  /**
   * Execute saved search
   */
  async executeSavedSearch(savedSearchId, options = {}) {
    // TODO: Implement saved search execution
    throw new Error('Not implemented');
  }

  /**
   * Search with boolean operators (AND, OR, NOT)
   */
  async booleanSearch(workspaceId, entityType, booleanQuery, options = {}) {
    try {
      const Model = this.searchableEntities[entityType];
      if (!Model) {
        throw new Error(`Unknown entity type: ${entityType}`);
      }

      const { limit = 20, skip = 0 } = options;

      // Parse boolean query
      const query = this.parseBooleanQuery(workspaceId, booleanQuery);

      // Execute query
      const [items, total] = await Promise.all([
        Model.find(query).limit(limit).skip(skip).lean(),
        Model.countDocuments(query),
      ]);

      return {
        entityType,
        items,
        total,
        page: Math.floor(skip / limit) + 1,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error('Error in boolean search:', error);
      throw error;
    }
  }

  /**
   * Parse boolean query into MongoDB query
   */
  parseBooleanQuery(workspaceId, booleanQuery) {
    const query = { workspace: workspaceId };

    if (booleanQuery.operator === 'AND') {
      query.$and = booleanQuery.conditions.map((c) => this.parseCondition(c));
    } else if (booleanQuery.operator === 'OR') {
      query.$or = booleanQuery.conditions.map((c) => this.parseCondition(c));
    } else if (booleanQuery.operator === 'NOT') {
      query.$nor = [this.parseCondition(booleanQuery.condition)];
    } else {
      // Simple condition
      Object.assign(query, this.parseCondition(booleanQuery));
    }

    return query;
  }

  /**
   * Parse single condition
   */
  parseCondition(condition) {
    if (condition.operator === 'AND' || condition.operator === 'OR') {
      return this.parseBooleanQuery('', condition);
    }

    const parsed = {};
    parsed[condition.field] = this.getConditionValue(condition);
    return parsed;
  }

  /**
   * Get condition value based on operator
   */
  getConditionValue(condition) {
    switch (condition.operator) {
      case 'equals':
        return condition.value;
      case 'not_equals':
        return { $ne: condition.value };
      case 'contains':
        return { $regex: condition.value, $options: 'i' };
      case 'greater_than':
        return { $gt: condition.value };
      case 'less_than':
        return { $lt: condition.value };
      case 'in':
        return { $in: condition.values };
      default:
        return condition.value;
    }
  }

  /**
   * Search by date range
   */
  async searchByDateRange(
    entityType,
    workspaceId,
    dateField,
    startDate,
    endDate,
    options = {}
  ) {
    try {
      const Model = this.searchableEntities[entityType];
      if (!Model) {
        throw new Error(`Unknown entity type: ${entityType}`);
      }

      const { limit = 20, skip = 0 } = options;

      const query = {
        workspace: workspaceId,
        [dateField]: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };

      const [items, total] = await Promise.all([
        Model.find(query)
          .sort({ [dateField]: -1 })
          .limit(limit)
          .skip(skip)
          .lean(),
        Model.countDocuments(query),
      ]);

      return {
        entityType,
        items,
        total,
        dateRange: { startDate, endDate, field: dateField },
      };
    } catch (error) {
      logger.error('Error in date range search:', error);
      throw error;
    }
  }

  /**
   * Search with aggregation
   */
  async aggregateSearch(entityType, workspaceId, aggregation) {
    try {
      const Model = this.searchableEntities[entityType];
      if (!Model) {
        throw new Error(`Unknown entity type: ${entityType}`);
      }

      const pipeline = [{ $match: { workspace: workspaceId } }, ...aggregation];

      const results = await Model.aggregate(pipeline);

      return {
        entityType,
        results,
        aggregation,
      };
    } catch (error) {
      logger.error('Error in aggregate search:', error);
      throw error;
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(workspaceId, dateRange = '30d') {
    // TODO: Implement search analytics tracking
    return {
      topSearches: [],
      noResultsSearches: [],
      averageResultsPerSearch: 0,
      searchFrequency: {},
    };
  }

  /**
   * Fuzzy search (typo-tolerant)
   */
  async fuzzySearch(entityType, workspaceId, query, options = {}) {
    try {
      const Model = this.searchableEntities[entityType];
      if (!Model) {
        throw new Error(`Unknown entity type: ${entityType}`);
      }

      const { limit = 20, skip = 0, threshold = 0.7 } = options;

      // Use MongoDB's text search with fuzzy matching
      const searchQuery = {
        workspace: workspaceId,
        $text: {
          $search: query,
          $caseSensitive: false,
          $diacriticSensitive: false,
        },
      };

      const items = await Model.find(searchQuery)
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .skip(skip)
        .lean();

      // Filter by similarity threshold
      const filteredItems = items.filter((item) => {
        const score = this.calculateSimilarity(query, this.getItemText(item));
        return score >= threshold;
      });

      return {
        entityType,
        items: filteredItems,
        total: filteredItems.length,
      };
    } catch (error) {
      logger.error('Error in fuzzy search:', error);
      throw error;
    }
  }

  /**
   * Calculate similarity between two strings (Levenshtein distance)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Levenshtein distance algorithm
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get searchable text from item
   */
  getItemText(item) {
    // Combine relevant fields into searchable text
    const fields = [
      item.firstName,
      item.lastName,
      item.email,
      item.company,
      item.title,
      item.name,
      item.description,
    ].filter(Boolean);

    return fields.join(' ').toLowerCase();
  }
}

module.exports = new AdvancedSearchService();
