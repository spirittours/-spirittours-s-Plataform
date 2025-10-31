/**
 * AI Content Cache System
 * Sistema de caché inteligente multi-nivel para contenido de IA
 * Ahorro del 90%+ en costos mediante cache y búsqueda semántica
 */

const Redis = require('redis');
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/ai-cache.log' }),
    new winston.transports.Console()
  ]
});

class AIContentCache {
  constructor(config = {}) {
    this.config = {
      redis: {
        url: config.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
        ttl: config.redisTTL || 86400 // 24 horas
      },
      mongodb: {
        url: config.mongoUrl || process.env.MONGODB_URL || 'mongodb://localhost:27017',
        database: config.mongoDatabase || 'spirit_tours_cache',
        collection: config.mongoCollection || 'ai_content'
      },
      pinecone: {
        apiKey: config.pineconeApiKey || process.env.PINECONE_API_KEY,
        environment: config.pineconeEnv || process.env.PINECONE_ENV || 'us-east-1-aws',
        index: config.pineconeIndex || 'spirit-tours-content'
      },
      similarity: {
        threshold: config.similarityThreshold || 0.92, // 92% similitud mínima
        maxResults: config.maxSimilarResults || 3
      },
      openai: {
        apiKey: config.openaiApiKey || process.env.OPENAI_API_KEY,
        embeddingModel: 'text-embedding-3-small' // Más económico
      }
    };

    this.stats = {
      requests: 0,
      cacheHits: {
        exact: 0,
        similar: 0,
        total: 0
      },
      cacheMisses: 0,
      generated: 0,
      savedCost: 0
    };

    this.initialized = false;
  }

  /**
   * Inicializa conexiones a los sistemas de cache
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Inicializar Redis
      this.redisClient = Redis.createClient({ url: this.config.redis.url });
      await this.redisClient.connect();
      logger.info('Redis client connected');

      // Inicializar MongoDB
      this.mongoClient = new MongoClient(this.config.mongodb.url);
      await this.mongoClient.connect();
      this.mongodb = this.mongoClient.db(this.config.mongodb.database);
      this.collection = this.mongodb.collection(this.config.mongodb.collection);
      
      // Crear índices
      await this.collection.createIndex({ hash: 1 }, { unique: true });
      await this.collection.createIndex({ createdAt: 1 });
      await this.collection.createIndex({ uses: -1 });
      await this.collection.createIndex({ 'metadata.poi': 1 });
      await this.collection.createIndex({ 'metadata.perspective': 1 });
      
      logger.info('MongoDB client connected and indexed');

      // Inicializar Pinecone (vector database)
      if (this.config.pinecone.apiKey) {
        await this.initializePinecone();
      } else {
        logger.warn('Pinecone not configured - semantic search disabled');
      }

      this.initialized = true;
      logger.info('AI Content Cache fully initialized');

    } catch (error) {
      logger.error('Error initializing cache:', error);
      throw error;
    }
  }

  /**
   * Inicializa Pinecone para búsqueda semántica
   */
  async initializePinecone() {
    const { PineconeClient } = require('@pinecone-database/pinecone');
    
    this.pinecone = new PineconeClient();
    await this.pinecone.init({
      apiKey: this.config.pinecone.apiKey,
      environment: this.config.pinecone.environment
    });

    // Obtener o crear índice
    const indexList = await this.pinecone.listIndexes();
    
    if (!indexList.includes(this.config.pinecone.index)) {
      await this.pinecone.createIndex({
        createRequest: {
          name: this.config.pinecone.index,
          dimension: 1536, // Dimensión de text-embedding-3-small
          metric: 'cosine'
        }
      });
      logger.info(`Created Pinecone index: ${this.config.pinecone.index}`);
    }

    this.vectorIndex = this.pinecone.Index(this.config.pinecone.index);
    logger.info('Pinecone vector database initialized');
  }

  /**
   * Obtiene contenido del cache o genera nuevo
   */
  async getOrGenerate(query, generator, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    this.stats.requests++;

    const {
      metadata = {},
      skipCache = false,
      forceRefresh = false,
      costPerGeneration = 0.01
    } = options;

    // Si se solicita saltar cache, generar directamente
    if (skipCache || forceRefresh) {
      const content = await this.generateAndCache(query, generator, metadata, costPerGeneration);
      return { ...content, source: 'generated' };
    }

    // 1. Buscar coincidencia exacta en Redis (más rápido)
    const exactMatch = await this.getFromRedis(query);
    if (exactMatch) {
      this.stats.cacheHits.exact++;
      this.stats.cacheHits.total++;
      this.stats.savedCost += costPerGeneration;
      
      logger.info('Cache hit - exact match (Redis)', { 
        query: query.substring(0, 50) 
      });
      
      return { 
        content: exactMatch, 
        source: 'cache-exact',
        confidence: 1.0
      };
    }

    // 2. Buscar en MongoDB (cache persistente)
    const persistentMatch = await this.getFromMongoDB(query);
    if (persistentMatch) {
      this.stats.cacheHits.exact++;
      this.stats.cacheHits.total++;
      this.stats.savedCost += costPerGeneration;

      // Actualizar Redis para próximas búsquedas
      await this.saveToRedis(query, persistentMatch.content);
      
      logger.info('Cache hit - persistent (MongoDB)', {
        query: query.substring(0, 50)
      });

      return {
        content: persistentMatch.content,
        source: 'cache-persistent',
        confidence: 1.0,
        uses: persistentMatch.uses
      };
    }

    // 3. Búsqueda semántica en Pinecone
    if (this.vectorIndex) {
      const similarContent = await this.findSimilar(query);
      
      if (similarContent && similarContent.confidence >= this.config.similarity.threshold) {
        this.stats.cacheHits.similar++;
        this.stats.cacheHits.total++;
        this.stats.savedCost += costPerGeneration * 0.95; // 95% de ahorro

        logger.info('Cache hit - similar content (Pinecone)', {
          query: query.substring(0, 50),
          confidence: similarContent.confidence
        });

        // Guardar asociación para futuras búsquedas exactas
        await this.saveToRedis(query, similarContent.content);

        return {
          content: similarContent.content,
          source: 'cache-similar',
          confidence: similarContent.confidence,
          originalQuery: similarContent.originalQuery
        };
      }
    }

    // 4. No hay cache, generar nuevo contenido
    this.stats.cacheMisses++;
    const content = await this.generateAndCache(query, generator, metadata, costPerGeneration);
    
    return {
      content,
      source: 'generated',
      confidence: 1.0
    };
  }

  /**
   * Genera contenido y lo guarda en todos los caches
   */
  async generateAndCache(query, generator, metadata, cost) {
    this.stats.generated++;

    logger.info('Generating new content', { 
      query: query.substring(0, 50),
      estimatedCost: cost
    });

    try {
      // Generar contenido con el generador proporcionado
      const content = await generator(query);

      // Guardar en todos los niveles de cache
      await this.saveToAllCaches(query, content, metadata);

      logger.info('Content generated and cached', {
        query: query.substring(0, 50),
        contentLength: typeof content === 'string' ? content.length : JSON.stringify(content).length
      });

      return content;

    } catch (error) {
      logger.error('Error generating content:', error);
      throw error;
    }
  }

  /**
   * Guarda contenido en todos los niveles de cache
   */
  async saveToAllCaches(query, content, metadata = {}) {
    const hash = this.generateHash(query);

    // 1. Guardar en Redis (cache rápido)
    await this.saveToRedis(query, content);

    // 2. Guardar en MongoDB (cache persistente)
    await this.saveToMongoDB(hash, query, content, metadata);

    // 3. Guardar en Pinecone (búsqueda semántica)
    if (this.vectorIndex) {
      await this.saveToVectorDB(hash, query, content, metadata);
    }
  }

  /**
   * Obtiene contenido de Redis
   */
  async getFromRedis(query) {
    try {
      const hash = this.generateHash(query);
      const cached = await this.redisClient.get(`ai:${hash}`);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting from Redis:', error);
      return null;
    }
  }

  /**
   * Guarda contenido en Redis
   */
  async saveToRedis(query, content) {
    try {
      const hash = this.generateHash(query);
      await this.redisClient.setEx(
        `ai:${hash}`,
        this.config.redis.ttl,
        JSON.stringify(content)
      );
    } catch (error) {
      logger.error('Error saving to Redis:', error);
    }
  }

  /**
   * Obtiene contenido de MongoDB
   */
  async getFromMongoDB(query) {
    try {
      const hash = this.generateHash(query);
      const doc = await this.collection.findOne({ hash });

      if (doc) {
        // Incrementar contador de usos
        await this.collection.updateOne(
          { hash },
          { 
            $inc: { uses: 1 },
            $set: { lastUsed: new Date() }
          }
        );

        return {
          content: doc.content,
          uses: doc.uses + 1,
          metadata: doc.metadata
        };
      }

      return null;
    } catch (error) {
      logger.error('Error getting from MongoDB:', error);
      return null;
    }
  }

  /**
   * Guarda contenido en MongoDB
   */
  async saveToMongoDB(hash, query, content, metadata) {
    try {
      await this.collection.updateOne(
        { hash },
        {
          $setOnInsert: {
            hash,
            query,
            content,
            metadata,
            createdAt: new Date(),
            uses: 0
          },
          $set: {
            lastUsed: new Date()
          }
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Error saving to MongoDB:', error);
    }
  }

  /**
   * Busca contenido similar usando embeddings
   */
  async findSimilar(query) {
    if (!this.vectorIndex) return null;

    try {
      // Generar embedding del query
      const embedding = await this.generateEmbedding(query);

      // Buscar vectores similares
      const results = await this.vectorIndex.query({
        queryRequest: {
          vector: embedding,
          topK: this.config.similarity.maxResults,
          includeMetadata: true
        }
      });

      if (!results.matches || results.matches.length === 0) {
        return null;
      }

      // Obtener el resultado más similar
      const bestMatch = results.matches[0];

      if (bestMatch.score >= this.config.similarity.threshold) {
        // Obtener contenido completo de MongoDB
        const fullContent = await this.collection.findOne({ 
          hash: bestMatch.id 
        });

        if (fullContent) {
          return {
            content: fullContent.content,
            confidence: bestMatch.score,
            originalQuery: fullContent.query,
            metadata: fullContent.metadata
          };
        }
      }

      return null;

    } catch (error) {
      logger.error('Error in semantic search:', error);
      return null;
    }
  }

  /**
   * Guarda en base de datos vectorial
   */
  async saveToVectorDB(hash, query, content, metadata) {
    if (!this.vectorIndex) return;

    try {
      // Generar embedding
      const embedding = await this.generateEmbedding(query);

      // Guardar en Pinecone
      await this.vectorIndex.upsert({
        upsertRequest: {
          vectors: [
            {
              id: hash,
              values: embedding,
              metadata: {
                query: query.substring(0, 1000), // Limitar tamaño
                preview: typeof content === 'string' 
                  ? content.substring(0, 500) 
                  : JSON.stringify(content).substring(0, 500),
                ...metadata,
                timestamp: new Date().toISOString()
              }
            }
          ]
        }
      });

      logger.debug('Vector saved to Pinecone', { hash });

    } catch (error) {
      logger.error('Error saving to vector DB:', error);
    }
  }

  /**
   * Genera embedding usando OpenAI
   */
  async generateEmbedding(text) {
    const axios = require('axios');

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          input: text,
          model: this.config.openai.embeddingModel
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.openai.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.data[0].embedding;

    } catch (error) {
      logger.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Genera hash único para query
   */
  generateHash(query) {
    // Normalizar query para mejor matching
    const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Obtiene estadísticas del cache
   */
  async getStats() {
    const cacheHitRate = this.stats.requests > 0
      ? (this.stats.cacheHits.total / this.stats.requests * 100).toFixed(2)
      : 0;

    const similarHitRate = this.stats.cacheHits.total > 0
      ? (this.stats.cacheHits.similar / this.stats.cacheHits.total * 100).toFixed(2)
      : 0;

    // Estadísticas de MongoDB
    const mongoStats = await this.collection.countDocuments();
    const topUsed = await this.collection
      .find()
      .sort({ uses: -1 })
      .limit(10)
      .project({ query: 1, uses: 1, _id: 0 })
      .toArray();

    return {
      requests: this.stats.requests,
      cacheHits: this.stats.cacheHits,
      cacheMisses: this.stats.cacheMisses,
      generated: this.stats.generated,
      cacheHitRate: `${cacheHitRate}%`,
      similarHitRate: `${similarHitRate}%`,
      savedCost: `$${this.stats.savedCost.toFixed(2)}`,
      storage: {
        mongoDB: {
          documents: mongoStats,
          topUsed
        }
      },
      efficiency: {
        avgCostSaving: this.stats.requests > 0
          ? `$${(this.stats.savedCost / this.stats.requests).toFixed(4)}`
          : '$0'
      }
    };
  }

  /**
   * Limpia cache antiguo
   */
  async cleanOldCache(daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      // Limpiar MongoDB
      const mongoResult = await this.collection.deleteMany({
        lastUsed: { $lt: cutoffDate },
        uses: { $lt: 5 } // Solo eliminar contenido poco usado
      });

      logger.info(`Cleaned ${mongoResult.deletedCount} old documents from MongoDB`);

      // Redis se limpia automáticamente por TTL

      return {
        mongoDeleted: mongoResult.deletedCount
      };

    } catch (error) {
      logger.error('Error cleaning old cache:', error);
      throw error;
    }
  }

  /**
   * Pre-caliente el cache con contenido común
   */
  async warmupCache(commonQueries, generator) {
    logger.info(`Warming up cache with ${commonQueries.length} queries`);

    const results = [];

    for (const query of commonQueries) {
      try {
        const result = await this.getOrGenerate(query, generator, {
          skipCache: false
        });
        results.push({ query, success: true, source: result.source });
      } catch (error) {
        results.push({ query, success: false, error: error.message });
      }
    }

    logger.info('Cache warmup completed', {
      total: results.length,
      cached: results.filter(r => r.source && r.source.includes('cache')).length,
      generated: results.filter(r => r.source === 'generated').length
    });

    return results;
  }

  /**
   * Cierra conexiones
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
    logger.info('AI Content Cache connections closed');
  }
}

module.exports = AIContentCache;
