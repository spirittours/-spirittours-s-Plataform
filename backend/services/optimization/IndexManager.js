const mongoose = require('mongoose');

/**
 * IndexManager - Database index management and optimization
 * 
 * Features:
 * - Automatic index creation based on query patterns
 * - Index usage analysis
 * - Index recommendations
 * - Index maintenance and rebuilding
 * - Compound index suggestions
 * - TTL index management
 */
class IndexManager {
  constructor() {
    this.config = {
      autoCreateIndexes: process.env.AUTO_CREATE_INDEXES !== 'false',
      analyzeUsage: true,
      indexCheckInterval: 3600000 // 1 hour
    };

    this.indexUsage = new Map();
    this.recommendations = [];
    
    this.stats = {
      totalIndexes: 0,
      createdIndexes: 0,
      droppedIndexes: 0,
      rebuiltIndexes: 0
    };

    // Essential indexes for all models
    this.essentialIndexes = {
      common: [
        { field: 'createdAt', type: 'date', order: -1 },
        { field: 'updatedAt', type: 'date', order: -1 },
        { field: 'status', type: 'enum', order: 1 }
      ],
      user: [
        { field: 'email', type: 'unique', order: 1 },
        { field: 'username', type: 'unique', order: 1 }
      ],
      workspace: [
        { field: 'workspace', type: 'string', order: 1 },
        { field: 'owner', type: 'objectid', order: 1 }
      ]
    };
  }

  /**
   * Analyze and create recommended indexes for a model
   */
  async analyzeAndCreateIndexes(model) {
    try {
      const modelName = model.modelName;
      console.log(`Analyzing indexes for model: ${modelName}`);

      // Get existing indexes
      const existingIndexes = await this.getExistingIndexes(model);
      
      // Get query patterns from schema
      const schema = model.schema;
      const schemaIndexes = schema.indexes();

      // Analyze field usage
      const fieldAnalysis = this.analyzeFields(schema);

      // Generate recommendations
      const recommendations = this.generateIndexRecommendations(
        modelName,
        existingIndexes,
        fieldAnalysis,
        schemaIndexes
      );

      // Create recommended indexes if auto-create is enabled
      if (this.config.autoCreateIndexes && recommendations.length > 0) {
        await this.createRecommendedIndexes(model, recommendations);
      }

      return {
        model: modelName,
        existingIndexes: existingIndexes.length,
        recommendations: recommendations.length,
        created: this.config.autoCreateIndexes ? recommendations.length : 0
      };
    } catch (error) {
      console.error(`Index analysis failed for ${model.modelName}:`, error);
      throw error;
    }
  }

  /**
   * Get existing indexes for a model
   */
  async getExistingIndexes(model) {
    try {
      const collection = model.collection;
      const indexes = await collection.indexes();
      return indexes;
    } catch (error) {
      console.error('Failed to get existing indexes:', error);
      return [];
    }
  }

  /**
   * Analyze fields in schema
   */
  analyzeFields(schema) {
    const analysis = [];
    const paths = schema.paths;

    for (const [fieldName, pathType] of Object.entries(paths)) {
      if (fieldName === '_id' || fieldName === '__v') continue;

      const fieldInfo = {
        name: fieldName,
        type: pathType.instance,
        isRequired: pathType.isRequired,
        isUnique: pathType.options?.unique,
        hasDefault: pathType.options?.default !== undefined,
        isEnum: pathType.options?.enum !== undefined,
        isArray: pathType.instance === 'Array',
        isRef: pathType.options?.ref !== undefined,
        priority: this.calculateFieldPriority(fieldName, pathType)
      };

      analysis.push(fieldInfo);
    }

    return analysis.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate field priority for indexing
   */
  calculateFieldPriority(fieldName, pathType) {
    let priority = 0;

    // High priority fields
    const highPriorityFields = [
      'email', 'username', 'userId', 'workspace', 
      'owner', 'status', 'type', 'category'
    ];
    if (highPriorityFields.includes(fieldName)) {
      priority += 50;
    }

    // Unique fields
    if (pathType.options?.unique) {
      priority += 40;
    }

    // Required fields
    if (pathType.isRequired) {
      priority += 20;
    }

    // Date fields (for sorting)
    if (pathType.instance === 'Date') {
      priority += 30;
    }

    // Enum fields (for filtering)
    if (pathType.options?.enum) {
      priority += 25;
    }

    // Reference fields
    if (pathType.options?.ref) {
      priority += 15;
    }

    return priority;
  }

  /**
   * Generate index recommendations
   */
  generateIndexRecommendations(modelName, existingIndexes, fieldAnalysis, schemaIndexes) {
    const recommendations = [];
    const existingFields = new Set();

    // Track existing indexed fields
    for (const index of existingIndexes) {
      const keys = Object.keys(index.key);
      keys.forEach(key => existingFields.add(key));
    }

    // Recommend indexes for high-priority fields
    for (const field of fieldAnalysis) {
      if (field.priority >= 30 && !existingFields.has(field.name)) {
        recommendations.push({
          field: field.name,
          type: field.isUnique ? 'unique' : 'single',
          order: field.type === 'Date' ? -1 : 1,
          reason: this.getIndexReason(field)
        });
      }
    }

    // Recommend compound indexes for common query patterns
    const compoundRecommendations = this.recommendCompoundIndexes(
      modelName,
      fieldAnalysis,
      existingIndexes
    );
    recommendations.push(...compoundRecommendations);

    // Recommend text indexes for searchable fields
    const textRecommendations = this.recommendTextIndexes(
      fieldAnalysis,
      existingFields
    );
    recommendations.push(...textRecommendations);

    // Recommend TTL indexes for expirable documents
    const ttlRecommendations = this.recommendTTLIndexes(
      fieldAnalysis,
      existingFields
    );
    recommendations.push(...ttlRecommendations);

    this.recommendations = recommendations;
    return recommendations;
  }

  /**
   * Get reason for index recommendation
   */
  getIndexReason(field) {
    if (field.isUnique) return 'Unique constraint requires index';
    if (field.type === 'Date') return 'Date field commonly used for sorting';
    if (field.isEnum) return 'Enum field commonly used for filtering';
    if (field.isRef) return 'Reference field used in joins';
    if (field.isRequired) return 'Required field likely queried frequently';
    return 'High-priority field based on name and type';
  }

  /**
   * Recommend compound indexes for common query patterns
   */
  recommendCompoundIndexes(modelName, fieldAnalysis, existingIndexes) {
    const recommendations = [];

    // Common compound index patterns
    const patterns = [
      // Workspace + status queries
      ['workspace', 'status'],
      // User + date range queries
      ['userId', 'createdAt'],
      ['owner', 'createdAt'],
      // Type + status queries
      ['type', 'status'],
      // Category + date queries
      ['category', 'createdAt']
    ];

    const fieldNames = new Set(fieldAnalysis.map(f => f.name));
    const existingCompound = existingIndexes
      .filter(idx => Object.keys(idx.key).length > 1)
      .map(idx => Object.keys(idx.key).join(','));

    for (const pattern of patterns) {
      const hasAllFields = pattern.every(field => fieldNames.has(field));
      const patternKey = pattern.join(',');
      const exists = existingCompound.some(key => key === patternKey);

      if (hasAllFields && !exists) {
        recommendations.push({
          fields: pattern,
          type: 'compound',
          order: { [pattern[0]]: 1, [pattern[1]]: -1 },
          reason: `Common query pattern: ${pattern.join(' + ')}`
        });
      }
    }

    return recommendations;
  }

  /**
   * Recommend text indexes for searchable fields
   */
  recommendTextIndexes(fieldAnalysis, existingFields) {
    const recommendations = [];
    
    // Fields that commonly need text search
    const textSearchFields = ['name', 'title', 'description', 'content', 'notes'];

    for (const field of fieldAnalysis) {
      if (textSearchFields.includes(field.name) && !existingFields.has(field.name)) {
        if (field.type === 'String' && !field.isEnum) {
          recommendations.push({
            field: field.name,
            type: 'text',
            order: 'text',
            reason: 'Text field suitable for full-text search'
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Recommend TTL indexes for expirable documents
   */
  recommendTTLIndexes(fieldAnalysis, existingFields) {
    const recommendations = [];
    
    // Fields that commonly indicate expiration
    const expirationFields = ['expiresAt', 'expireAt', 'ttl', 'validUntil'];

    for (const field of fieldAnalysis) {
      if (expirationFields.includes(field.name) && !existingFields.has(field.name)) {
        if (field.type === 'Date') {
          recommendations.push({
            field: field.name,
            type: 'ttl',
            order: 1,
            expireAfterSeconds: 0,
            reason: 'Expiration field suitable for TTL index'
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Create recommended indexes
   */
  async createRecommendedIndexes(model, recommendations) {
    const created = [];
    const failed = [];

    for (const rec of recommendations) {
      try {
        if (rec.type === 'compound') {
          await this.createCompoundIndex(model, rec.fields, rec.order);
          created.push(rec);
        } else if (rec.type === 'text') {
          await this.createTextIndex(model, rec.field);
          created.push(rec);
        } else if (rec.type === 'ttl') {
          await this.createTTLIndex(model, rec.field, rec.expireAfterSeconds);
          created.push(rec);
        } else {
          await this.createSingleIndex(model, rec.field, rec.type === 'unique', rec.order);
          created.push(rec);
        }
        
        this.stats.createdIndexes++;
      } catch (error) {
        console.error(`Failed to create index:`, error);
        failed.push({ ...rec, error: error.message });
      }
    }

    return { created: created.length, failed: failed.length, details: { created, failed } };
  }

  /**
   * Create single field index
   */
  async createSingleIndex(model, field, unique = false, order = 1) {
    const indexSpec = { [field]: order };
    const options = { background: true };
    
    if (unique) {
      options.unique = true;
    }

    await model.collection.createIndex(indexSpec, options);
    console.log(`Created ${unique ? 'unique ' : ''}index on ${model.modelName}.${field}`);
  }

  /**
   * Create compound index
   */
  async createCompoundIndex(model, fields, order) {
    const indexSpec = {};
    fields.forEach((field, idx) => {
      indexSpec[field] = order[field] || 1;
    });

    await model.collection.createIndex(indexSpec, { background: true });
    console.log(`Created compound index on ${model.modelName}: ${fields.join(', ')}`);
  }

  /**
   * Create text index
   */
  async createTextIndex(model, field) {
    const indexSpec = { [field]: 'text' };
    await model.collection.createIndex(indexSpec, { background: true });
    console.log(`Created text index on ${model.modelName}.${field}`);
  }

  /**
   * Create TTL index
   */
  async createTTLIndex(model, field, expireAfterSeconds = 0) {
    const indexSpec = { [field]: 1 };
    const options = {
      background: true,
      expireAfterSeconds
    };

    await model.collection.createIndex(indexSpec, options);
    console.log(`Created TTL index on ${model.modelName}.${field}`);
  }

  /**
   * Analyze index usage
   */
  async analyzeIndexUsage(model) {
    try {
      const collection = model.collection;
      const stats = await collection.stats();
      const indexes = await collection.indexes();

      const usage = {
        model: model.modelName,
        totalIndexes: indexes.length,
        indexSize: stats.totalIndexSize || 0,
        indexes: []
      };

      for (const index of indexes) {
        const indexName = index.name;
        const indexKeys = Object.keys(index.key).join(', ');

        // Get index stats (requires profiling)
        usage.indexes.push({
          name: indexName,
          keys: indexKeys,
          unique: index.unique || false,
          sparse: index.sparse || false,
          size: 0 // Would need additional query for exact size
        });
      }

      return usage;
    } catch (error) {
      console.error('Index usage analysis failed:', error);
      throw error;
    }
  }

  /**
   * Drop unused indexes
   */
  async dropUnusedIndexes(model, dryRun = true) {
    try {
      const indexes = await this.getExistingIndexes(model);
      const toDrop = [];

      for (const index of indexes) {
        // Never drop _id index
        if (index.name === '_id_') continue;

        // Check if index is used (simplified check)
        const isUsed = this.isIndexUsed(index);
        
        if (!isUsed) {
          toDrop.push(index.name);
          
          if (!dryRun) {
            await model.collection.dropIndex(index.name);
            this.stats.droppedIndexes++;
            console.log(`Dropped unused index: ${model.modelName}.${index.name}`);
          }
        }
      }

      return {
        model: model.modelName,
        unusedIndexes: toDrop.length,
        dropped: dryRun ? 0 : toDrop.length,
        indexes: toDrop,
        dryRun
      };
    } catch (error) {
      console.error('Drop unused indexes failed:', error);
      throw error;
    }
  }

  /**
   * Check if index is used (simplified)
   */
  isIndexUsed(index) {
    // Simplified check - in production would analyze query logs
    const indexName = index.name;
    
    // Always keep common indexes
    const commonIndexes = ['_id_', 'email_1', 'username_1', 'workspace_1'];
    if (commonIndexes.includes(indexName)) {
      return true;
    }

    // Check usage tracking
    if (this.indexUsage.has(indexName)) {
      return this.indexUsage.get(indexName) > 0;
    }

    // Assume used by default (conservative approach)
    return true;
  }

  /**
   * Rebuild all indexes for a model
   */
  async rebuildIndexes(model) {
    try {
      await model.collection.reIndex();
      this.stats.rebuiltIndexes++;
      console.log(`Rebuilt indexes for ${model.modelName}`);
      
      return {
        success: true,
        model: model.modelName,
        message: 'Indexes rebuilt successfully'
      };
    } catch (error) {
      console.error('Index rebuild failed:', error);
      throw error;
    }
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      ...this.stats,
      recommendationsCount: this.recommendations.length
    };
  }

  /**
   * Export index creation commands
   */
  exportIndexCommands(recommendations = this.recommendations) {
    const commands = [];

    for (const rec of recommendations) {
      let command = '';
      
      if (rec.type === 'compound') {
        const fields = rec.fields.map(f => `"${f}": 1`).join(', ');
        command = `db.collection.createIndex({ ${fields} })`;
      } else if (rec.type === 'text') {
        command = `db.collection.createIndex({ "${rec.field}": "text" })`;
      } else if (rec.type === 'ttl') {
        command = `db.collection.createIndex({ "${rec.field}": 1 }, { expireAfterSeconds: ${rec.expireAfterSeconds} })`;
      } else {
        const unique = rec.type === 'unique' ? ', { unique: true }' : '';
        command = `db.collection.createIndex({ "${rec.field}": ${rec.order} }${unique})`;
      }

      commands.push({
        type: rec.type,
        command,
        reason: rec.reason
      });
    }

    return commands;
  }

  /**
   * Get comprehensive index report
   */
  async getIndexReport(models) {
    const report = {
      summary: this.getStats(),
      models: [],
      totalIndexes: 0,
      recommendations: []
    };

    for (const model of models) {
      try {
        const usage = await this.analyzeIndexUsage(model);
        const analysis = await this.analyzeAndCreateIndexes(model);
        
        report.models.push({
          name: model.modelName,
          ...usage,
          ...analysis
        });
        
        report.totalIndexes += usage.totalIndexes;
      } catch (error) {
        console.error(`Report generation failed for ${model.modelName}:`, error);
      }
    }

    report.recommendations = this.recommendations;
    
    return report;
  }
}

module.exports = new IndexManager();
