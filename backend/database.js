/**
 * Spirit Tours - Database Manager
 * Centralized database connection management with health checks and graceful degradation
 */

const { Pool } = require('pg');
const Redis = require('ioredis');
const { MongoClient } = require('mongodb');
const logger = require('./utils/logger');

// PostgreSQL Manager
class PostgreSQLManager {
  constructor() {
    this.pool = null;
    this.config = {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || process.env.DB_NAME || 'spirit_tours',
      user: process.env.POSTGRES_USER || process.env.DB_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'spirit2024',
      max: parseInt(process.env.DB_POOL_SIZE || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000
    };
  }

  async connect() {
    try {
      logger.info('🐘 Connecting to PostgreSQL...', {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user
      });

      this.pool = new Pool(this.config);

      // Test connection
      const client = await this.pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      logger.info('✅ PostgreSQL connected successfully', {
        serverTime: result.rows[0].now,
        poolSize: this.config.max
      });

      // Setup error handlers
      this.pool.on('error', (err) => {
        logger.error('❌ PostgreSQL pool error', { error: err.message });
      });

      this.pool.on('connect', () => {
        logger.debug('🔌 New PostgreSQL client connected to pool');
      });

      this.pool.on('remove', () => {
        logger.debug('🔌 PostgreSQL client removed from pool');
      });

      return true;
    } catch (error) {
      logger.error('❌ Failed to connect to PostgreSQL', {
        error: error.message,
        config: { ...this.config, password: '***' }
      });
      throw error;
    }
  }

  async query(text, params) {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized');
    }

    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('🔍 PostgreSQL query executed', {
        duration: `${duration}ms`,
        rows: result.rowCount
      });

      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('❌ PostgreSQL query failed', {
        error: error.message,
        duration: `${duration}ms`,
        query: text
      });
      throw error;
    }
  }

  async isHealthy() {
    try {
      if (!this.pool) return false;
      
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      logger.error('❌ PostgreSQL health check failed', { error: error.message });
      return false;
    }
  }

  async getHealth() {
    const start = Date.now();
    try {
      const connected = await this.isHealthy();
      const latency = Date.now() - start;
      
      return {
        connected,
        latency,
        poolSize: this.pool ? this.pool.totalCount : 0,
        idleConnections: this.pool ? this.pool.idleCount : 0,
        waitingClients: this.pool ? this.pool.waitingCount : 0
      };
    } catch (error) {
      return {
        connected: false,
        latency: Date.now() - start,
        error: error.message
      };
    }
  }

  async close() {
    if (this.pool) {
      logger.info('🔌 Closing PostgreSQL connections...');
      await this.pool.end();
      this.pool = null;
      logger.info('✅ PostgreSQL connections closed');
    }
  }
}

// Redis Manager
class RedisManager {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.warn('⚠️ Redis connection failed after 3 retries, continuing without cache');
          return null; // Stop retrying
        }
        return Math.min(times * 200, 1000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false
    };
  }

  async connect() {
    try {
      logger.info('📦 Connecting to Redis...', {
        host: this.config.host,
        port: this.config.port
      });

      this.client = new Redis(this.config);

      // Event handlers
      this.client.on('connect', () => {
        logger.info('🔌 Redis client connecting...');
      });

      this.client.on('ready', () => {
        this.isReady = true;
        logger.info('✅ Redis connected successfully');
      });

      this.client.on('error', (err) => {
        this.isReady = false;
        logger.warn('⚠️ Redis error (system will continue without cache)', {
          error: err.message
        });
      });

      this.client.on('close', () => {
        this.isReady = false;
        logger.warn('🔌 Redis connection closed');
      });

      // Wait for connection with timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          logger.warn('⚠️ Redis connection timeout, continuing without cache');
          resolve(); // Don't reject, allow graceful degradation
        }, 5000);

        this.client.once('ready', () => {
          clearTimeout(timeout);
          resolve();
        });

        this.client.once('error', (err) => {
          clearTimeout(timeout);
          logger.warn('⚠️ Redis connection failed, continuing without cache');
          resolve(); // Don't reject, allow graceful degradation
        });
      });

      return this.isReady;
    } catch (error) {
      logger.warn('⚠️ Failed to connect to Redis, continuing without cache', {
        error: error.message
      });
      this.isReady = false;
      return false;
    }
  }

  async get(key) {
    if (!this.isReady) return null;
    
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.warn('⚠️ Redis GET failed', { key, error: error.message });
      return null;
    }
  }

  async set(key, value, ttl = 3600) {
    if (!this.isReady) return false;
    
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.warn('⚠️ Redis SET failed', { key, error: error.message });
      return false;
    }
  }

  async del(key) {
    if (!this.isReady) return 0;
    
    try {
      return await this.client.del(key);
    } catch (error) {
      logger.warn('⚠️ Redis DEL failed', { key, error: error.message });
      return 0;
    }
  }

  async isHealthy() {
    try {
      if (!this.client || !this.isReady) return false;
      await this.client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getHealth() {
    const start = Date.now();
    try {
      const connected = await this.isHealthy();
      const latency = Date.now() - start;
      
      let info = {};
      if (connected) {
        info = await this.client.info('memory');
      }
      
      return {
        connected,
        latency,
        ready: this.isReady,
        info: info
      };
    } catch (error) {
      return {
        connected: false,
        latency: Date.now() - start,
        error: error.message
      };
    }
  }

  async close() {
    if (this.client) {
      logger.info('🔌 Closing Redis connection...');
      await this.client.quit();
      this.client = null;
      this.isReady = false;
      logger.info('✅ Redis connection closed');
    }
  }
}

// MongoDB Manager
class MongoDBManager {
  constructor() {
    this.client = null;
    this.db = null;
    this.config = {
      url: process.env.MONGODB_URL || process.env.MONGO_URL || 'mongodb://localhost:27017',
      dbName: process.env.MONGODB_DB || 'spirit_tours',
      options: {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000
      }
    };
  }

  async connect() {
    try {
      logger.info('🍃 Connecting to MongoDB...', {
        url: this.config.url.replace(/\/\/.*@/, '//*****@'), // Hide credentials in log
        database: this.config.dbName
      });

      this.client = new MongoClient(this.config.url, this.config.options);
      await this.client.connect();
      this.db = this.client.db(this.config.dbName);

      // Test connection
      await this.db.command({ ping: 1 });

      logger.info('✅ MongoDB connected successfully');

      return true;
    } catch (error) {
      logger.warn('⚠️ Failed to connect to MongoDB (optional), system will continue without it', {
        error: error.message
      });
      this.db = null;
      return false;
    }
  }

  async isHealthy() {
    try {
      if (!this.db) return false;
      await this.db.command({ ping: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getHealth() {
    const start = Date.now();
    try {
      const connected = await this.isHealthy();
      const latency = Date.now() - start;
      
      let stats = {};
      if (connected) {
        stats = await this.db.stats();
      }
      
      return {
        connected,
        latency,
        stats
      };
    } catch (error) {
      return {
        connected: false,
        latency: Date.now() - start,
        error: error.message
      };
    }
  }

  async close() {
    if (this.client) {
      logger.info('🔌 Closing MongoDB connection...');
      await this.client.close();
      this.client = null;
      this.db = null;
      logger.info('✅ MongoDB connection closed');
    }
  }
}

// Main Database Manager
class DatabaseManager {
  constructor() {
    this.postgres = new PostgreSQLManager();
    this.redis = new RedisManager();
    this.mongodb = new MongoDBManager();
  }

  async connectAll() {
    const results = {
      postgres: false,
      redis: false,
      mongodb: false
    };

    try {
      // PostgreSQL is REQUIRED
      logger.info('🚀 Initializing database connections...');
      
      await this.postgres.connect();
      results.postgres = true;
      logger.info('✅ PostgreSQL: Connected');

      // Redis is OPTIONAL but recommended
      try {
        await this.redis.connect();
        results.redis = this.redis.isReady;
        if (results.redis) {
          logger.info('✅ Redis: Connected');
        } else {
          logger.warn('⚠️ Redis: Not available, continuing without cache');
        }
      } catch (error) {
        logger.warn('⚠️ Redis: Connection failed, continuing without cache', {
          error: error.message
        });
        results.redis = false;
      }

      // MongoDB is OPTIONAL
      try {
        await this.mongodb.connect();
        results.mongodb = this.mongodb.db !== null;
        if (results.mongodb) {
          logger.info('✅ MongoDB: Connected');
        } else {
          logger.warn('⚠️ MongoDB: Not available');
        }
      } catch (error) {
        logger.warn('⚠️ MongoDB: Connection failed', {
          error: error.message
        });
        results.mongodb = false;
      }

      logger.info('✅ Database initialization complete', results);
      return results;
    } catch (error) {
      logger.error('❌ Failed to initialize databases', {
        error: error.message,
        results
      });
      throw error;
    }
  }

  async getOverallHealth() {
    const [postgresHealth, redisHealth, mongoHealth] = await Promise.all([
      this.postgres.getHealth(),
      this.redis.getHealth(),
      this.mongodb.getHealth()
    ]);

    const overall = postgresHealth.connected ? 
      (redisHealth.connected ? 'healthy' : 'degraded') : 
      'unhealthy';

    return {
      postgres: postgresHealth,
      redis: redisHealth,
      mongodb: mongoHealth,
      overall,
      timestamp: new Date().toISOString()
    };
  }

  async closeAll() {
    logger.info('🔌 Closing all database connections...');
    
    await Promise.all([
      this.postgres.close(),
      this.redis.close(),
      this.mongodb.close()
    ]);
    
    logger.info('✅ All database connections closed');
  }
}

// Singleton instance
let dbManager = null;

function getDatabaseManager() {
  if (!dbManager) {
    dbManager = new DatabaseManager();
  }
  return dbManager;
}

module.exports = DatabaseManager;
module.exports.getDatabaseManager = getDatabaseManager;
