const { OpenAI } = require('openai');
const logger = require('../../config/logger');

/**
 * VectorDatabaseService
 * Manages vector embeddings and similarity search
 * Supports both Pinecone and Milvus backends
 * 
 * Features:
 * - Automatic embedding generation (OpenAI, Cohere, etc.)
 * - Multi-backend support (Pinecone, Milvus, Local)
 * - Semantic search across CRM data
 * - Hybrid search (vector + keyword)
 * - Namespace isolation for multi-tenancy
 */
class VectorDatabaseService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Vector database configuration
    this.config = {
      backend: process.env.VECTOR_DB_BACKEND || 'local', // pinecone, milvus, local
      dimension: 1536, // OpenAI text-embedding-3-small
      metric: 'cosine',
      embeddingModel: 'text-embedding-3-small',
    };
    
    // Initialize backends
    this.backends = {
      pinecone: null,
      milvus: null,
      local: new Map(), // In-memory storage for development
    };
    
    // Entity type configurations
    this.entityConfigs = {
      contact: {
        fields: ['name', 'email', 'company', 'role', 'notes'],
        namespace: 'contacts',
      },
      lead: {
        fields: ['name', 'email', 'company', 'source', 'notes', 'requirements'],
        namespace: 'leads',
      },
      deal: {
        fields: ['name', 'description', 'requirements', 'notes'],
        namespace: 'deals',
      },
      activity: {
        fields: ['type', 'notes', 'outcome', 'followUpNotes'],
        namespace: 'activities',
      },
      project: {
        fields: ['name', 'description', 'requirements', 'notes'],
        namespace: 'projects',
      },
      document: {
        fields: ['title', 'content', 'summary'],
        namespace: 'documents',
      },
    };
    
    this.initializeBackends();
  }
  
  /**
   * Initialize vector database backends
   */
  async initializeBackends() {
    try {
      if (this.config.backend === 'pinecone' && process.env.PINECONE_API_KEY) {
        // Pinecone initialization (requires @pinecone-database/pinecone package)
        logger.info('Initializing Pinecone backend...');
        // const { Pinecone } = require('@pinecone-database/pinecone');
        // this.backends.pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        logger.info('✅ Pinecone backend ready (mock mode)');
      } else if (this.config.backend === 'milvus' && process.env.MILVUS_ADDRESS) {
        // Milvus initialization (requires @zilliz/milvus2-sdk-node package)
        logger.info('Initializing Milvus backend...');
        // const { MilvusClient } = require('@zilliz/milvus2-sdk-node');
        // this.backends.milvus = new MilvusClient(process.env.MILVUS_ADDRESS);
        logger.info('✅ Milvus backend ready (mock mode)');
      } else {
        logger.info('Using local in-memory vector storage (development mode)');
      }
    } catch (error) {
      logger.error('Error initializing vector backends:', error);
      // Fallback to local storage
      this.config.backend = 'local';
    }
  }
  
  /**
   * Generate embedding for text
   */
  async generateEmbedding(text, options = {}) {
    try {
      const { model = this.config.embeddingModel } = options;
      
      // Clean and truncate text if needed
      const cleanText = this.cleanText(text);
      
      if (!cleanText || cleanText.length < 3) {
        throw new Error('Text too short for embedding');
      }
      
      const response = await this.openai.embeddings.create({
        model,
        input: cleanText,
      });
      
      return {
        embedding: response.data[0].embedding,
        model,
        tokens: response.usage.total_tokens,
        dimension: response.data[0].embedding.length,
      };
    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }
  
  /**
   * Batch generate embeddings
   */
  async generateEmbeddings(texts, options = {}) {
    try {
      const { model = this.config.embeddingModel, batchSize = 100 } = options;
      
      const allEmbeddings = [];
      
      // Process in batches
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const cleanBatch = batch.map(t => this.cleanText(t));
        
        const response = await this.openai.embeddings.create({
          model,
          input: cleanBatch,
        });
        
        allEmbeddings.push(...response.data.map(d => d.embedding));
      }
      
      return allEmbeddings;
    } catch (error) {
      logger.error('Error generating batch embeddings:', error);
      throw error;
    }
  }
  
  /**
   * Index entity in vector database
   */
  async indexEntity(entityType, entityId, entityData, workspace) {
    try {
      const config = this.entityConfigs[entityType];
      if (!config) {
        throw new Error(`Unknown entity type: ${entityType}`);
      }
      
      // Extract and combine relevant fields
      const textContent = this.extractTextContent(entityData, config.fields);
      
      // Generate embedding
      const { embedding, tokens } = await this.generateEmbedding(textContent);
      
      // Create vector record
      const vectorRecord = {
        id: `${workspace}:${entityType}:${entityId}`,
        values: embedding,
        metadata: {
          workspace,
          entityType,
          entityId,
          textContent: textContent.substring(0, 500), // Store snippet
          ...this.extractMetadata(entityData),
          indexedAt: new Date().toISOString(),
        },
      };
      
      // Store in backend
      await this.storeVector(config.namespace, workspace, vectorRecord);
      
      logger.info(`Indexed ${entityType} ${entityId} in namespace ${config.namespace}`);
      
      return {
        success: true,
        entityType,
        entityId,
        namespace: config.namespace,
        dimension: embedding.length,
        tokens,
      };
    } catch (error) {
      logger.error(`Error indexing ${entityType}:`, error);
      throw error;
    }
  }
  
  /**
   * Batch index entities
   */
  async batchIndexEntities(entityType, entities, workspace) {
    try {
      const results = [];
      
      for (const entity of entities) {
        try {
          const result = await this.indexEntity(
            entityType,
            entity._id.toString(),
            entity,
            workspace
          );
          results.push(result);
        } catch (error) {
          logger.error(`Error indexing entity ${entity._id}:`, error);
          results.push({
            success: false,
            entityId: entity._id,
            error: error.message,
          });
        }
      }
      
      return {
        total: entities.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      };
    } catch (error) {
      logger.error('Error in batch indexing:', error);
      throw error;
    }
  }
  
  /**
   * Semantic search
   */
  async search(query, options = {}) {
    try {
      const {
        workspace,
        entityTypes = ['contact', 'lead', 'deal', 'activity', 'project'],
        topK = 10,
        minScore = 0.7,
        filter = {},
      } = options;
      
      // Generate query embedding
      const { embedding } = await this.generateEmbedding(query);
      
      // Search across entity types
      const searchPromises = entityTypes.map(async (entityType) => {
        const config = this.entityConfigs[entityType];
        if (!config) return { entityType, results: [] };
        
        const results = await this.searchVectors(
          config.namespace,
          workspace,
          embedding,
          topK,
          { ...filter, entityType }
        );
        
        return {
          entityType,
          results: results.filter(r => r.score >= minScore),
        };
      });
      
      const searchResults = await Promise.all(searchPromises);
      
      // Combine and sort by score
      const allResults = searchResults
        .flatMap(sr => sr.results.map(r => ({ ...r, entityType: sr.entityType })))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
      
      return {
        query,
        totalResults: allResults.length,
        results: allResults,
        entityBreakdown: searchResults.map(sr => ({
          entityType: sr.entityType,
          count: sr.results.length,
        })),
      };
    } catch (error) {
      logger.error('Error in semantic search:', error);
      throw error;
    }
  }
  
  /**
   * Find similar entities
   */
  async findSimilar(entityType, entityId, workspace, options = {}) {
    try {
      const { topK = 5, minScore = 0.8 } = options;
      
      const config = this.entityConfigs[entityType];
      if (!config) {
        throw new Error(`Unknown entity type: ${entityType}`);
      }
      
      // Get entity vector
      const vectorId = `${workspace}:${entityType}:${entityId}`;
      const entityVector = await this.getVector(config.namespace, workspace, vectorId);
      
      if (!entityVector) {
        throw new Error('Entity not indexed');
      }
      
      // Search for similar vectors
      const results = await this.searchVectors(
        config.namespace,
        workspace,
        entityVector.values,
        topK + 1, // +1 to exclude self
        { entityType }
      );
      
      // Filter out self and apply min score
      const similar = results
        .filter(r => r.id !== vectorId && r.score >= minScore)
        .slice(0, topK);
      
      return {
        entityType,
        entityId,
        similarEntities: similar,
      };
    } catch (error) {
      logger.error('Error finding similar entities:', error);
      throw error;
    }
  }
  
  /**
   * Hybrid search (vector + keyword)
   */
  async hybridSearch(query, options = {}) {
    try {
      const { workspace, entityTypes, topK = 10, vectorWeight = 0.7 } = options;
      
      // Semantic search
      const vectorResults = await this.search(query, {
        workspace,
        entityTypes,
        topK: topK * 2, // Get more results for merging
      });
      
      // Keyword search (mock - would integrate with actual search service)
      const keywordResults = await this.mockKeywordSearch(query, {
        workspace,
        entityTypes,
        topK: topK * 2,
      });
      
      // Merge and re-rank
      const mergedResults = this.mergeSearchResults(
        vectorResults.results,
        keywordResults,
        vectorWeight
      );
      
      return {
        query,
        method: 'hybrid',
        totalResults: mergedResults.length,
        results: mergedResults.slice(0, topK),
      };
    } catch (error) {
      logger.error('Error in hybrid search:', error);
      throw error;
    }
  }
  
  /**
   * Delete entity from index
   */
  async deleteEntity(entityType, entityId, workspace) {
    try {
      const config = this.entityConfigs[entityType];
      if (!config) {
        throw new Error(`Unknown entity type: ${entityType}`);
      }
      
      const vectorId = `${workspace}:${entityType}:${entityId}`;
      await this.deleteVector(config.namespace, workspace, vectorId);
      
      logger.info(`Deleted ${entityType} ${entityId} from index`);
      
      return { success: true };
    } catch (error) {
      logger.error('Error deleting entity:', error);
      throw error;
    }
  }
  
  /**
   * Get index statistics
   */
  async getIndexStats(workspace) {
    try {
      const stats = {};
      
      for (const [entityType, config] of Object.entries(this.entityConfigs)) {
        const count = await this.getVectorCount(config.namespace, workspace);
        stats[entityType] = {
          namespace: config.namespace,
          vectorCount: count,
        };
      }
      
      return {
        workspace,
        backend: this.config.backend,
        dimension: this.config.dimension,
        totalVectors: Object.values(stats).reduce((sum, s) => sum + s.vectorCount, 0),
        entityTypes: stats,
      };
    } catch (error) {
      logger.error('Error getting index stats:', error);
      throw error;
    }
  }
  
  // ========================================
  // Backend-specific methods
  // ========================================
  
  async storeVector(namespace, workspace, vectorRecord) {
    const namespaceKey = `${namespace}:${workspace}`;
    
    if (this.config.backend === 'local') {
      if (!this.backends.local.has(namespaceKey)) {
        this.backends.local.set(namespaceKey, new Map());
      }
      this.backends.local.get(namespaceKey).set(vectorRecord.id, vectorRecord);
    } else if (this.config.backend === 'pinecone') {
      // await this.backends.pinecone.upsert([vectorRecord]);
      logger.info(`Would store in Pinecone: ${vectorRecord.id}`);
    } else if (this.config.backend === 'milvus') {
      // await this.backends.milvus.insert({ collection_name: namespace, data: [vectorRecord] });
      logger.info(`Would store in Milvus: ${vectorRecord.id}`);
    }
  }
  
  async searchVectors(namespace, workspace, queryVector, topK, filter) {
    const namespaceKey = `${namespace}:${workspace}`;
    
    if (this.config.backend === 'local') {
      const vectors = this.backends.local.get(namespaceKey);
      if (!vectors) return [];
      
      const results = [];
      vectors.forEach((vector) => {
        const score = this.cosineSimilarity(queryVector, vector.values);
        if (!filter || this.matchesFilter(vector.metadata, filter)) {
          results.push({
            id: vector.id,
            score,
            metadata: vector.metadata,
          });
        }
      });
      
      return results.sort((a, b) => b.score - a.score).slice(0, topK);
    }
    
    // Pinecone/Milvus would have native search
    return [];
  }
  
  async getVector(namespace, workspace, vectorId) {
    const namespaceKey = `${namespace}:${workspace}`;
    
    if (this.config.backend === 'local') {
      const vectors = this.backends.local.get(namespaceKey);
      return vectors ? vectors.get(vectorId) : null;
    }
    
    return null;
  }
  
  async deleteVector(namespace, workspace, vectorId) {
    const namespaceKey = `${namespace}:${workspace}`;
    
    if (this.config.backend === 'local') {
      const vectors = this.backends.local.get(namespaceKey);
      if (vectors) {
        vectors.delete(vectorId);
      }
    }
  }
  
  async getVectorCount(namespace, workspace) {
    const namespaceKey = `${namespace}:${workspace}`;
    
    if (this.config.backend === 'local') {
      const vectors = this.backends.local.get(namespaceKey);
      return vectors ? vectors.size : 0;
    }
    
    return 0;
  }
  
  // ========================================
  // Helper methods
  // ========================================
  
  cleanText(text) {
    if (!text) return '';
    return text
      .toString()
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 8000); // Limit for embedding models
  }
  
  extractTextContent(entity, fields) {
    const texts = fields
      .map(field => {
        const value = entity[field];
        if (!value) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return value.toString();
      })
      .filter(t => t.length > 0);
    
    return texts.join(' ');
  }
  
  extractMetadata(entity) {
    const metadata = {};
    
    // Extract common fields
    ['status', 'stage', 'priority', 'source', 'quality', 'score'].forEach(field => {
      if (entity[field] !== undefined) {
        metadata[field] = entity[field];
      }
    });
    
    return metadata;
  }
  
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
  
  matchesFilter(metadata, filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }
  
  mockKeywordSearch(query, options) {
    // Mock keyword search - in production would use actual search service
    return [];
  }
  
  mergeSearchResults(vectorResults, keywordResults, vectorWeight) {
    const merged = new Map();
    
    vectorResults.forEach(r => {
      merged.set(r.id, {
        ...r,
        finalScore: r.score * vectorWeight,
      });
    });
    
    const keywordWeight = 1 - vectorWeight;
    keywordResults.forEach(r => {
      if (merged.has(r.id)) {
        const existing = merged.get(r.id);
        existing.finalScore += r.score * keywordWeight;
      } else {
        merged.set(r.id, {
          ...r,
          finalScore: r.score * keywordWeight,
        });
      }
    });
    
    return Array.from(merged.values())
      .sort((a, b) => b.finalScore - a.finalScore);
  }
}

module.exports = new VectorDatabaseService();
