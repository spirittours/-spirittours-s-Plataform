const mongoose = require('mongoose');

/**
 * QueryOptimizer - Advanced database query optimization service
 * 
 * Features:
 * - Query analysis and optimization recommendations
 * - Index recommendations
 * - Query caching
 * - Slow query detection
 * - Query plan analysis
 * - Aggregation pipeline optimization
 */
class QueryOptimizer {
  constructor() {
    this.config = {
      slowQueryThreshold: 100, // 100ms
      enableQueryProfiling: process.env.ENABLE_QUERY_PROFILING === 'true',
      cacheQueryPlans: true,
      maxCachedPlans: 1000
    };

    this.queryCache = new Map();
    this.slowQueries = [];
    this.queryStats = new Map();
    this.recommendedIndexes = new Set();

    this.stats = {
      totalQueries: 0,
      slowQueries: 0,
      cachedQueries: 0,
      optimizedQueries: 0,
      averageQueryTime: 0
    };
  }

  /**
   * Optimize a MongoDB query
   */
  async optimizeQuery(model, query, options = {}) {
    const startTime = Date.now();
    const queryKey = this.generateQueryKey(model.modelName, query, options);

    // Check query cache
    if (this.config.cacheQueryPlans && this.queryCache.has(queryKey)) {
      const cached = this.queryCache.get(queryKey);
      this.stats.cachedQueries++;
      return cached;
    }

    // Analyze query before execution
    const analysis = await this.analyzeQuery(model, query, options);

    // Apply optimizations
    const optimizedOptions = this.applyOptimizations(options, analysis);

    // Execute query
    let result;
    try {
      if (options.aggregate) {
        result = await model.aggregate(query).explain('executionStats');
      } else {
        const queryBuilder = model.find(query, null, optimizedOptions);
        if (options.explain) {
          result = await queryBuilder.explain('executionStats');
        } else {
          result = await queryBuilder.exec();
        }
      }
    } catch (error) {
      console.error('Query optimization error:', error);
      throw error;
    }

    const executionTime = Date.now() - startTime;

    // Track query performance
    this.trackQueryPerformance(queryKey, executionTime, analysis);

    // Detect slow queries
    if (executionTime > this.config.slowQueryThreshold) {
      this.detectSlowQuery(model.modelName, query, executionTime, analysis);
    }

    // Cache successful query plan
    if (this.config.cacheQueryPlans && result) {
      this.cacheQueryPlan(queryKey, result, analysis);
    }

    this.stats.totalQueries++;
    this.updateAverageQueryTime(executionTime);

    return result;
  }

  /**
   * Analyze query for optimization opportunities
   */
  async analyzeQuery(model, query, options) {
    const analysis = {
      hasIndexes: false,
      usesProjection: !!options.select,
      usesLimit: !!options.limit,
      usesSort: !!options.sort,
      usesPagination: !!options.skip || !!options.limit,
      hasPopulate: !!options.populate,
      complexity: 'simple',
      recommendations: []
    };

    // Check if query uses indexed fields
    const schema = model.schema;
    const indexes = schema.indexes();
    const queryFields = Object.keys(query);

    // Analyze index usage
    for (const index of indexes) {
      const indexFields = Object.keys(index[0]);
      const hasMatchingIndex = indexFields.some(field => queryFields.includes(field));
      if (hasMatchingIndex) {
        analysis.hasIndexes = true;
        break;
      }
    }

    // Generate recommendations
    if (!analysis.hasIndexes && queryFields.length > 0) {
      analysis.recommendations.push({
        type: 'index',
        field: queryFields[0],
        message: `Consider adding index on field: ${queryFields[0]}`
      });
      this.recommendedIndexes.add(`${model.modelName}.${queryFields[0]}`);
    }

    if (!analysis.usesProjection) {
      analysis.recommendations.push({
        type: 'projection',
        message: 'Consider using field projection to reduce data transfer'
      });
    }

    if (!analysis.usesLimit) {
      analysis.recommendations.push({
        type: 'limit',
        message: 'Consider adding limit to prevent large result sets'
      });
    }

    if (options.sort && !analysis.hasIndexes) {
      analysis.recommendations.push({
        type: 'sort_index',
        message: 'Sort operation without index may be slow'
      });
    }

    // Determine query complexity
    if (queryFields.length > 5 || options.populate || options.aggregate) {
      analysis.complexity = 'complex';
    } else if (queryFields.length > 2) {
      analysis.complexity = 'moderate';
    }

    return analysis;
  }

  /**
   * Apply optimizations to query options
   */
  applyOptimizations(options, analysis) {
    const optimized = { ...options };

    // Add default limit if not specified
    if (!optimized.limit && !options.count) {
      optimized.limit = 1000; // Default max results
    }

    // Use lean queries for read-only operations
    if (!optimized.lean && !options.populate) {
      optimized.lean = true;
    }

    // Add hint for index usage if available
    if (analysis.hasIndexes && options.sort) {
      // Mongoose will use appropriate index
    }

    // Optimize projection
    if (!optimized.select && !options.populate) {
      // Could add default projection to exclude large fields
      // optimized.select = '-largeField1 -largeField2';
    }

    this.stats.optimizedQueries++;

    return optimized;
  }

  /**
   * Track query performance metrics
   */
  trackQueryPerformance(queryKey, executionTime, analysis) {
    const stats = this.queryStats.get(queryKey) || {
      executions: 0,
      totalTime: 0,
      avgTime: 0,
      minTime: Infinity,
      maxTime: 0,
      complexity: analysis.complexity
    };

    stats.executions++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.executions;
    stats.minTime = Math.min(stats.minTime, executionTime);
    stats.maxTime = Math.max(stats.maxTime, executionTime);

    this.queryStats.set(queryKey, stats);
  }

  /**
   * Detect and log slow queries
   */
  detectSlowQuery(modelName, query, executionTime, analysis) {
    const slowQuery = {
      modelName,
      query: JSON.stringify(query),
      executionTime,
      timestamp: new Date(),
      complexity: analysis.complexity,
      recommendations: analysis.recommendations,
      hasIndexes: analysis.hasIndexes
    };

    this.slowQueries.push(slowQuery);
    this.stats.slowQueries++;

    // Keep only last 100 slow queries
    if (this.slowQueries.length > 100) {
      this.slowQueries.shift();
    }

    console.warn(`⚠️ Slow query detected (${executionTime}ms):`, {
      model: modelName,
      query: JSON.stringify(query).substring(0, 100),
      recommendations: analysis.recommendations.length
    });
  }

  /**
   * Cache query plan for reuse
   */
  cacheQueryPlan(queryKey, result, analysis) {
    if (this.queryCache.size >= this.config.maxCachedPlans) {
      // Remove oldest entry
      const firstKey = this.queryCache.keys().next().value;
      this.queryCache.delete(firstKey);
    }

    this.queryCache.set(queryKey, {
      result,
      analysis,
      cachedAt: Date.now()
    });
  }

  /**
   * Generate unique query key for caching
   */
  generateQueryKey(modelName, query, options) {
    const queryStr = JSON.stringify(query);
    const optionsStr = JSON.stringify({
      select: options.select,
      sort: options.sort,
      limit: options.limit,
      skip: options.skip
    });
    return `${modelName}:${queryStr}:${optionsStr}`;
  }

  /**
   * Get query optimization recommendations
   */
  getRecommendations() {
    const recommendations = {
      indexes: Array.from(this.recommendedIndexes),
      slowQueries: this.slowQueries.slice(-10), // Last 10 slow queries
      topSlowModels: this.getTopSlowModels(),
      optimizationTips: this.getOptimizationTips()
    };

    return recommendations;
  }

  /**
   * Get models with slowest queries
   */
  getTopSlowModels() {
    const modelStats = new Map();

    for (const [queryKey, stats] of this.queryStats.entries()) {
      const modelName = queryKey.split(':')[0];
      const existing = modelStats.get(modelName) || {
        queries: 0,
        totalTime: 0,
        avgTime: 0
      };

      existing.queries += stats.executions;
      existing.totalTime += stats.totalTime;
      existing.avgTime = existing.totalTime / existing.queries;

      modelStats.set(modelName, existing);
    }

    return Array.from(modelStats.entries())
      .sort((a, b) => b[1].avgTime - a[1].avgTime)
      .slice(0, 10)
      .map(([model, stats]) => ({ model, ...stats }));
  }

  /**
   * Get general optimization tips
   */
  getOptimizationTips() {
    const tips = [];

    if (this.stats.slowQueries > this.stats.totalQueries * 0.1) {
      tips.push({
        severity: 'high',
        message: 'More than 10% of queries are slow. Consider adding indexes.'
      });
    }

    if (this.recommendedIndexes.size > 0) {
      tips.push({
        severity: 'medium',
        message: `${this.recommendedIndexes.size} fields would benefit from indexes`
      });
    }

    if (this.stats.optimizedQueries < this.stats.totalQueries * 0.5) {
      tips.push({
        severity: 'low',
        message: 'Consider using lean() and select() for better performance'
      });
    }

    return tips;
  }

  /**
   * Optimize aggregation pipeline
   */
  optimizeAggregation(pipeline) {
    const optimized = [...pipeline];
    let hasMatch = false;
    let hasProject = false;

    // Analyze pipeline stages
    for (const stage of pipeline) {
      if (stage.$match) hasMatch = true;
      if (stage.$project) hasProject = true;
    }

    // Recommendations
    const recommendations = [];

    if (!hasMatch) {
      recommendations.push({
        type: 'match',
        message: 'Consider adding $match early in pipeline to reduce documents'
      });
    }

    if (!hasProject) {
      recommendations.push({
        type: 'project',
        message: 'Consider adding $project to reduce data transfer'
      });
    }

    // Reorder pipeline for optimization
    // Move $match stages to the beginning
    const matchStages = optimized.filter(s => s.$match);
    const otherStages = optimized.filter(s => !s.$match);
    const reordered = [...matchStages, ...otherStages];

    return {
      optimized: reordered,
      recommendations
    };
  }

  /**
   * Analyze collection for index recommendations
   */
  async analyzeCollection(model) {
    const schema = model.schema;
    const existingIndexes = schema.indexes();
    const paths = schema.paths;

    const recommendations = [];

    // Analyze each field
    for (const [fieldName, pathType] of Object.entries(paths)) {
      if (fieldName === '_id' || fieldName === '__v') continue;

      const fieldStats = {
        field: fieldName,
        type: pathType.instance,
        isRequired: pathType.isRequired,
        isUnique: pathType.options?.unique,
        hasIndex: existingIndexes.some(idx => idx[0][fieldName])
      };

      // Recommend indexes for frequently queried fields
      if (!fieldStats.hasIndex) {
        // Fields that commonly need indexes
        const commonIndexFields = ['email', 'username', 'status', 'createdAt', 'userId'];
        
        if (commonIndexFields.includes(fieldName)) {
          recommendations.push({
            field: fieldName,
            type: 'single',
            reason: 'Commonly queried field'
          });
        }

        // Unique fields should be indexed
        if (fieldStats.isUnique) {
          recommendations.push({
            field: fieldName,
            type: 'unique',
            reason: 'Unique constraint requires index'
          });
        }
      }
    }

    return {
      model: model.modelName,
      existingIndexes: existingIndexes.length,
      recommendations
    };
  }

  /**
   * Get query statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.queryCache.size,
      slowQueriesCount: this.slowQueries.length,
      trackedQueries: this.queryStats.size,
      recommendedIndexesCount: this.recommendedIndexes.size
    };
  }

  /**
   * Get detailed query stats
   */
  getDetailedStats() {
    const queryStatsArray = Array.from(this.queryStats.entries())
      .map(([key, stats]) => ({
        query: key,
        ...stats
      }))
      .sort((a, b) => b.avgTime - a.avgTime);

    return {
      summary: this.getStats(),
      topSlowQueries: queryStatsArray.slice(0, 20),
      slowQueries: this.slowQueries.slice(-20),
      recommendations: this.getRecommendations()
    };
  }

  /**
   * Clear cache and statistics
   */
  reset() {
    this.queryCache.clear();
    this.slowQueries = [];
    this.queryStats.clear();
    this.recommendedIndexes.clear();
    
    this.stats = {
      totalQueries: 0,
      slowQueries: 0,
      cachedQueries: 0,
      optimizedQueries: 0,
      averageQueryTime: 0
    };
  }

  /**
   * Update average query time
   */
  updateAverageQueryTime(executionTime) {
    const total = this.stats.totalQueries;
    this.stats.averageQueryTime = 
      (this.stats.averageQueryTime * (total - 1) + executionTime) / total;
  }

  /**
   * Export recommended indexes as MongoDB commands
   */
  exportIndexCommands() {
    const commands = [];

    for (const indexKey of this.recommendedIndexes) {
      const [modelName, field] = indexKey.split('.');
      commands.push({
        collection: modelName.toLowerCase() + 's',
        command: `db.${modelName.toLowerCase()}s.createIndex({ "${field}": 1 })`
      });
    }

    return commands;
  }
}

module.exports = new QueryOptimizer();
