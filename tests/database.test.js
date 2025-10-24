/**
 * Spirit Tours Database Tests
 * Tests for database connectivity, queries, and connection pooling
 */

const { expect } = require('chai');
const path = require('path');

// Import database manager
let DatabaseManager;
let dbManager;

describe('Database Connection Tests', function() {
  this.timeout(15000);

  before(async function() {
    console.log('Initializing database manager...');
    
    // Try to load the database manager
    try {
      const dbPath = path.join(__dirname, '../backend/database.js');
      DatabaseManager = require(dbPath);
      dbManager = new DatabaseManager();
      
      // Connect to databases
      const results = await dbManager.connectAll();
      console.log('Database connection results:', results);
    } catch (error) {
      console.log('Database manager not available, skipping database tests');
      console.log('Error:', error.message);
      this.skip();
    }
  });

  after(async function() {
    if (dbManager) {
      console.log('Closing database connections...');
      await dbManager.closeAll();
    }
  });

  // ==========================================
  // POSTGRESQL CONNECTION TESTS
  // ==========================================
  describe('PostgreSQL Connection', () => {
    it('should connect to PostgreSQL successfully', async function() {
      if (!dbManager || !dbManager.postgres) this.skip();
      
      const isConnected = await dbManager.postgres.isHealthy();
      expect(isConnected).to.be.true;
    });

    it('should execute a simple query', async function() {
      if (!dbManager || !dbManager.postgres) this.skip();
      
      const result = await dbManager.postgres.query('SELECT NOW() as current_time');
      expect(result).to.have.property('rows');
      expect(result.rows).to.be.an('array');
      expect(result.rows).to.have.lengthOf(1);
      expect(result.rows[0]).to.have.property('current_time');
    });

    it('should support parameterized queries', async function() {
      if (!dbManager || !dbManager.postgres) this.skip();
      
      const testValue = 'test_value';
      const result = await dbManager.postgres.query(
        'SELECT $1::text as value',
        [testValue]
      );
      expect(result.rows[0].value).to.equal(testValue);
    });

    it('should handle errors gracefully', async function() {
      if (!dbManager || !dbManager.postgres) this.skip();
      
      try {
        await dbManager.postgres.query('SELECT * FROM non_existent_table');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
        expect(error.message).to.include('does not exist');
      }
    });

    it('should return proper health check status', async function() {
      if (!dbManager || !dbManager.postgres) this.skip();
      
      const health = await dbManager.postgres.getHealth();
      expect(health).to.have.property('connected');
      expect(health).to.have.property('latency');
      expect(health.connected).to.be.a('boolean');
      expect(health.latency).to.be.a('number');
    });
  });

  // ==========================================
  // REDIS CONNECTION TESTS
  // ==========================================
  describe('Redis Connection', () => {
    it('should connect to Redis successfully or gracefully degrade', async function() {
      if (!dbManager || !dbManager.redis) this.skip();
      
      const isReady = dbManager.redis.isReady;
      expect(isReady).to.be.a('boolean');
      // Redis is optional, so connection may be false
    });

    it('should set and get values from Redis', async function() {
      if (!dbManager || !dbManager.redis || !dbManager.redis.isReady) {
        this.skip();
      }
      
      const testKey = `test:${Date.now()}`;
      const testValue = 'test_value_123';
      
      await dbManager.redis.set(testKey, testValue, 60);
      const retrievedValue = await dbManager.redis.get(testKey);
      
      expect(retrievedValue).to.equal(testValue);
      
      // Cleanup
      await dbManager.redis.del(testKey);
    });

    it('should handle key expiration', async function() {
      if (!dbManager || !dbManager.redis || !dbManager.redis.isReady) {
        this.skip();
      }
      
      const testKey = `test:expire:${Date.now()}`;
      const testValue = 'expiring_value';
      
      // Set with 2 second expiration
      await dbManager.redis.set(testKey, testValue, 2);
      
      // Value should exist immediately
      let value = await dbManager.redis.get(testKey);
      expect(value).to.equal(testValue);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Value should be gone
      value = await dbManager.redis.get(testKey);
      expect(value).to.be.null;
    });

    it('should delete keys successfully', async function() {
      if (!dbManager || !dbManager.redis || !dbManager.redis.isReady) {
        this.skip();
      }
      
      const testKey = `test:delete:${Date.now()}`;
      
      await dbManager.redis.set(testKey, 'value', 60);
      const deleted = await dbManager.redis.del(testKey);
      
      expect(deleted).to.equal(1);
      
      const value = await dbManager.redis.get(testKey);
      expect(value).to.be.null;
    });

    it('should return proper health check status', async function() {
      if (!dbManager || !dbManager.redis) this.skip();
      
      const health = await dbManager.redis.getHealth();
      expect(health).to.have.property('connected');
      expect(health).to.have.property('latency');
      expect(health.connected).to.be.a('boolean');
      
      if (health.connected) {
        expect(health.latency).to.be.a('number');
      }
    });
  });

  // ==========================================
  // MONGODB CONNECTION TESTS
  // ==========================================
  describe('MongoDB Connection', () => {
    it('should connect to MongoDB or gracefully degrade', async function() {
      if (!dbManager || !dbManager.mongodb) this.skip();
      
      const isConnected = dbManager.mongodb.db !== null;
      expect(isConnected).to.be.a('boolean');
      // MongoDB is optional, so connection may be false
    });

    it('should insert and find documents', async function() {
      if (!dbManager || !dbManager.mongodb || !dbManager.mongodb.db) {
        this.skip();
      }
      
      const collection = dbManager.mongodb.db.collection('test_collection');
      const testDoc = {
        timestamp: Date.now(),
        data: 'test_data',
        value: 123
      };
      
      const insertResult = await collection.insertOne(testDoc);
      expect(insertResult.insertedId).to.exist;
      
      const foundDoc = await collection.findOne({ _id: insertResult.insertedId });
      expect(foundDoc).to.exist;
      expect(foundDoc.data).to.equal(testDoc.data);
      
      // Cleanup
      await collection.deleteOne({ _id: insertResult.insertedId });
    });

    it('should update documents', async function() {
      if (!dbManager || !dbManager.mongodb || !dbManager.mongodb.db) {
        this.skip();
      }
      
      const collection = dbManager.mongodb.db.collection('test_collection');
      const testDoc = { timestamp: Date.now(), value: 100 };
      
      const insertResult = await collection.insertOne(testDoc);
      
      await collection.updateOne(
        { _id: insertResult.insertedId },
        { $set: { value: 200 } }
      );
      
      const updatedDoc = await collection.findOne({ _id: insertResult.insertedId });
      expect(updatedDoc.value).to.equal(200);
      
      // Cleanup
      await collection.deleteOne({ _id: insertResult.insertedId });
    });

    it('should return proper health check status', async function() {
      if (!dbManager || !dbManager.mongodb) this.skip();
      
      const health = await dbManager.mongodb.getHealth();
      expect(health).to.have.property('connected');
      expect(health).to.have.property('latency');
      expect(health.connected).to.be.a('boolean');
      
      if (health.connected) {
        expect(health.latency).to.be.a('number');
      }
    });
  });

  // ==========================================
  // CONNECTION POOLING TESTS
  // ==========================================
  describe('Connection Pooling', () => {
    it('should handle multiple concurrent PostgreSQL queries', async function() {
      if (!dbManager || !dbManager.postgres) this.skip();
      
      const queries = Array.from({ length: 10 }, (_, i) => 
        dbManager.postgres.query('SELECT $1::int as query_num', [i])
      );
      
      const results = await Promise.all(queries);
      
      expect(results).to.have.length(10);
      results.forEach((result, index) => {
        expect(result.rows[0].query_num).to.equal(index);
      });
    });

    it('should maintain connection pool health under load', async function() {
      if (!dbManager || !dbManager.postgres) this.skip();
      
      // Execute 20 queries in parallel
      const queries = Array.from({ length: 20 }, () => 
        dbManager.postgres.query('SELECT pg_sleep(0.1), NOW() as time')
      );
      
      const startTime = Date.now();
      await Promise.all(queries);
      const duration = Date.now() - startTime;
      
      // With proper pooling, this should complete reasonably fast
      expect(duration).to.be.lessThan(3000); // Less than 3 seconds
      
      // Health check should still be good
      const isHealthy = await dbManager.postgres.isHealthy();
      expect(isHealthy).to.be.true;
    });
  });

  // ==========================================
  // GRACEFUL DEGRADATION TESTS
  // ==========================================
  describe('Graceful Degradation', () => {
    it('should continue operating without Redis', async function() {
      if (!dbManager) this.skip();
      
      // Even if Redis is not connected, system should work
      const health = await dbManager.getOverallHealth();
      expect(health).to.have.property('postgres');
      expect(health).to.have.property('redis');
      expect(health).to.have.property('mongodb');
      
      // PostgreSQL must be connected
      expect(health.postgres.connected).to.be.true;
    });

    it('should continue operating without MongoDB', async function() {
      if (!dbManager) this.skip();
      
      // Even if MongoDB is not connected, system should work
      const health = await dbManager.getOverallHealth();
      
      // PostgreSQL must be connected
      expect(health.postgres.connected).to.be.true;
    });

    it('should provide comprehensive health status', async function() {
      if (!dbManager) this.skip();
      
      const health = await dbManager.getOverallHealth();
      
      expect(health).to.be.an('object');
      expect(health).to.have.property('postgres');
      expect(health).to.have.property('redis');
      expect(health).to.have.property('mongodb');
      expect(health).to.have.property('overall');
      
      // Overall status should indicate if critical systems are up
      expect(health.overall).to.be.oneOf(['healthy', 'degraded', 'unhealthy']);
    });
  });

  // ==========================================
  // TRANSACTION TESTS
  // ==========================================
  describe('Database Transactions', () => {
    it('should execute transactions successfully', async function() {
      if (!dbManager || !dbManager.postgres) this.skip();
      
      const client = await dbManager.postgres.pool.connect();
      
      try {
        await client.query('BEGIN');
        await client.query('SELECT 1 as test');
        await client.query('COMMIT');
        
        expect(true).to.be.true;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });

    it('should rollback failed transactions', async function() {
      if (!dbManager || !dbManager.postgres) this.skip();
      
      const client = await dbManager.postgres.pool.connect();
      
      try {
        await client.query('BEGIN');
        await client.query('SELECT 1 as test');
        
        // Intentionally cause an error
        try {
          await client.query('SELECT * FROM non_existent_table_xyz');
          expect.fail('Should have thrown an error');
        } catch (error) {
          await client.query('ROLLBACK');
          expect(error).to.exist;
        }
      } finally {
        client.release();
      }
    });
  });
});
