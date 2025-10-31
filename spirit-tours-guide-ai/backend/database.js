/**
 * Database Configuration and Connection Manager
 * Spirit Tours AI Guide System
 * 
 * Maneja conexiones a:
 * - PostgreSQL (base de datos principal)
 * - Redis (cache y real-time data)
 * - MongoDB (opcional, para algunos features)
 */

const { Pool } = require('pg');
const redis = require('redis');
const { MongoClient } = require('mongodb');
const winston = require('winston');

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

/**
 * PostgreSQL Connection Pool
 */
class PostgreSQLManager {
  constructor() {
    this.pool = null;
  }

  /**
   * Inicializar conexión a PostgreSQL
   */
  async connect() {
    try {
      this.pool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'spirit_tours_db',
        user: process.env.POSTGRES_USER || 'postgres',
        password: process.env.POSTGRES_PASSWORD || '',
        max: 20, // maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        ssl: process.env.POSTGRES_SSL === 'true' ? {
          rejectUnauthorized: false
        } : false
      });

      // Test connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      logger.info(`✅ PostgreSQL connected successfully at ${result.rows[0].now}`);
      return this.pool;
    } catch (error) {
      logger.error('❌ Error connecting to PostgreSQL:', error.message);
      throw error;
    }
  }

  /**
   * Ejecutar query con manejo de errores
   */
  async query(text, params) {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized. Call connect() first.');
    }

    try {
      const start = Date.now();
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      logger.error('Query error:', { text, error: error.message });
      throw error;
    }
  }

  /**
   * Obtener un cliente del pool (para transacciones)
   */
  async getClient() {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized. Call connect() first.');
    }
    return await this.pool.connect();
  }

  /**
   * Cerrar conexión
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      logger.info('PostgreSQL connection closed');
    }
  }
}

/**
 * Redis Connection Manager
 */
class RedisManager {
  constructor() {
    this.client = null;
    this.isReady = false;
  }

  /**
   * Inicializar conexión a Redis
   */
  async connect() {
    try {
      this.client = redis.createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379')
        },
        password: process.env.REDIS_PASSWORD || undefined,
        database: parseInt(process.env.REDIS_DB || '0')
      });

      // Event handlers
      this.client.on('error', (err) => {
        logger.error('Redis Client Error:', err.message);
        this.isReady = false;
      });

      this.client.on('ready', () => {
        logger.info('✅ Redis client ready');
        this.isReady = true;
      });

      this.client.on('reconnecting', () => {
        logger.warn('⚠️ Redis client reconnecting...');
        this.isReady = false;
      });

      // Connect
      await this.client.connect();
      
      // Test connection
      await this.client.ping();
      logger.info('✅ Redis connected successfully');
      
      return this.client;
    } catch (error) {
      logger.error('❌ Error connecting to Redis:', error.message);
      logger.warn('⚠️ Redis features will be disabled. Cache will be in-memory only.');
      // Don't throw - allow app to run without Redis
      return null;
    }
  }

  /**
   * Set value with optional expiration
   */
  async set(key, value, expirationSeconds = null) {
    if (!this.isReady || !this.client) {
      logger.warn('Redis not available, skipping set operation');
      return false;
    }

    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      
      if (expirationSeconds) {
        await this.client.setEx(key, expirationSeconds, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
      return true;
    } catch (error) {
      logger.error('Redis set error:', error.message);
      return false;
    }
  }

  /**
   * Get value
   */
  async get(key) {
    if (!this.isReady || !this.client) {
      logger.warn('Redis not available, skipping get operation');
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) return null;

      // Try to parse JSON
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (error) {
      logger.error('Redis get error:', error.message);
      return null;
    }
  }

  /**
   * Delete key
   */
  async del(key) {
    if (!this.isReady || !this.client) {
      return false;
    }

    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis del error:', error.message);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!this.isReady || !this.client) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis exists error:', error.message);
      return false;
    }
  }

  /**
   * Increment counter
   */
  async incr(key) {
    if (!this.isReady || !this.client) {
      return null;
    }

    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error('Redis incr error:', error.message);
      return null;
    }
  }

  /**
   * Get all keys matching pattern
   */
  async keys(pattern) {
    if (!this.isReady || !this.client) {
      return [];
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Redis keys error:', error.message);
      return [];
    }
  }

  /**
   * Cerrar conexión
   */
  async close() {
    if (this.client) {
      await this.client.quit();
      this.isReady = false;
      logger.info('Redis connection closed');
    }
  }
}

/**
 * MongoDB Connection Manager (Optional)
 */
class MongoDBManager {
  constructor() {
    this.client = null;
    this.db = null;
  }

  /**
   * Inicializar conexión a MongoDB
   */
  async connect() {
    try {
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/spirit_tours';
      const dbName = process.env.MONGODB_DB_NAME || 'spirit_tours';

      this.client = new MongoClient(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000
      });

      await this.client.connect();
      this.db = this.client.db(dbName);

      // Test connection
      await this.db.command({ ping: 1 });
      logger.info('✅ MongoDB connected successfully');

      return this.db;
    } catch (error) {
      logger.error('❌ Error connecting to MongoDB:', error.message);
      logger.warn('⚠️ MongoDB features will be disabled.');
      // Don't throw - allow app to run without MongoDB
      return null;
    }
  }

  /**
   * Get collection
   */
  collection(name) {
    if (!this.db) {
      throw new Error('MongoDB not initialized. Call connect() first.');
    }
    return this.db.collection(name);
  }

  /**
   * Cerrar conexión
   */
  async close() {
    if (this.client) {
      await this.client.close();
      logger.info('MongoDB connection closed');
    }
  }
}

/**
 * Database Manager Principal
 * Gestiona todas las conexiones de base de datos
 */
class DatabaseManager {
  constructor() {
    this.postgres = new PostgreSQLManager();
    this.redis = new RedisManager();
    this.mongodb = new MongoDBManager();
  }

  /**
   * Conectar a todas las bases de datos
   */
  async connectAll() {
    const results = {
      postgres: false,
      redis: false,
      mongodb: false
    };

    try {
      // PostgreSQL (requerido)
      await this.postgres.connect();
      results.postgres = true;
      logger.info('✅ PostgreSQL: Connected');
    } catch (error) {
      logger.error('❌ PostgreSQL: Failed to connect');
      throw error; // PostgreSQL is required
    }

    try {
      // Redis (opcional pero recomendado)
      await this.redis.connect();
      results.redis = this.redis.isReady;
      logger.info(results.redis ? '✅ Redis: Connected' : '⚠️ Redis: Not available');
    } catch (error) {
      logger.warn('⚠️ Redis: Not available, continuing without cache');
    }

    try {
      // MongoDB (opcional)
      await this.mongodb.connect();
      results.mongodb = this.mongodb.db !== null;
      logger.info(results.mongodb ? '✅ MongoDB: Connected' : '⚠️ MongoDB: Not available');
    } catch (error) {
      logger.warn('⚠️ MongoDB: Not available, some features may be limited');
    }

    return results;
  }

  /**
   * Cerrar todas las conexiones
   */
  async closeAll() {
    await Promise.all([
      this.postgres.close(),
      this.redis.close(),
      this.mongodb.close()
    ]);
    logger.info('All database connections closed');
  }

  /**
   * Health check de todas las bases de datos
   */
  async healthCheck() {
    const health = {
      postgres: false,
      redis: false,
      mongodb: false
    };

    try {
      await this.postgres.query('SELECT 1');
      health.postgres = true;
    } catch (error) {
      logger.error('PostgreSQL health check failed:', error.message);
    }

    health.redis = this.redis.isReady;

    if (this.mongodb.db) {
      try {
        await this.mongodb.db.command({ ping: 1 });
        health.mongodb = true;
      } catch (error) {
        logger.error('MongoDB health check failed:', error.message);
      }
    }

    return health;
  }
}

// Exportar instancia singleton
const dbManager = new DatabaseManager();

module.exports = {
  DatabaseManager,
  PostgreSQLManager,
  RedisManager,
  MongoDBManager,
  dbManager
};
