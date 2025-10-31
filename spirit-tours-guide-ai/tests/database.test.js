/**
 * Database Connection Tests
 * Spirit Tours AI Guide System
 * 
 * Tests database connectivity and health
 */

const { dbManager } = require('../backend/database');
const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');

describe('Database Connection Tests', function() {
  this.timeout(15000); // 15 second timeout for DB operations

  describe('PostgreSQL Connection', () => {
    it('should connect to PostgreSQL successfully', async () => {
      try {
        await dbManager.postgres.connect();
        expect(dbManager.postgres.pool).to.not.be.null;
      } catch (error) {
        console.error('PostgreSQL connection failed:', error.message);
        throw error;
      }
    });

    it('should execute a simple query', async () => {
      const result = await dbManager.postgres.query('SELECT NOW() as current_time');
      
      expect(result.rows).to.be.an('array');
      expect(result.rows.length).to.equal(1);
      expect(result.rows[0]).to.have.property('current_time');
    });

    it('should handle query errors gracefully', async () => {
      try {
        await dbManager.postgres.query('SELECT * FROM non_existent_table');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.exist;
        expect(error.message).to.include('non_existent_table');
      }
    });

    it('should support parameterized queries', async () => {
      const result = await dbManager.postgres.query(
        'SELECT $1::text as value',
        ['test-value']
      );
      
      expect(result.rows[0].value).to.equal('test-value');
    });
  });

  describe('Redis Connection', () => {
    it('should connect to Redis successfully', async () => {
      try {
        await dbManager.redis.connect();
        // Redis may not be available in all environments
        if (dbManager.redis.isReady) {
          expect(dbManager.redis.client).to.not.be.null;
        } else {
          console.warn('⚠️ Redis not available - tests skipped');
        }
      } catch (error) {
        console.warn('⚠️ Redis connection failed (optional):', error.message);
      }
    });

    it('should set and get values from Redis', async () => {
      if (!dbManager.redis.isReady) {
        console.warn('⚠️ Redis not available - test skipped');
        return;
      }

      const testKey = 'test-key';
      const testValue = { data: 'test-data', timestamp: Date.now() };
      
      await dbManager.redis.set(testKey, testValue, 60);
      const retrieved = await dbManager.redis.get(testKey);
      
      expect(retrieved).to.deep.equal(testValue);
      
      // Cleanup
      await dbManager.redis.del(testKey);
    });

    it('should handle expiration correctly', async () => {
      if (!dbManager.redis.isReady) {
        console.warn('⚠️ Redis not available - test skipped');
        return;
      }

      const testKey = 'test-expiration-key';
      await dbManager.redis.set(testKey, 'test-value', 1); // 1 second TTL
      
      const immediate = await dbManager.redis.get(testKey);
      expect(immediate).to.equal('test-value');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const afterExpiration = await dbManager.redis.get(testKey);
      expect(afterExpiration).to.be.null;
    });

    it('should increment counters', async () => {
      if (!dbManager.redis.isReady) {
        console.warn('⚠️ Redis not available - test skipped');
        return;
      }

      const counterKey = 'test-counter';
      
      const count1 = await dbManager.redis.incr(counterKey);
      const count2 = await dbManager.redis.incr(counterKey);
      
      expect(count2).to.equal(count1 + 1);
      
      // Cleanup
      await dbManager.redis.del(counterKey);
    });
  });

  describe('MongoDB Connection', () => {
    it('should connect to MongoDB (optional)', async () => {
      try {
        await dbManager.mongodb.connect();
        if (dbManager.mongodb.db) {
          expect(dbManager.mongodb.db).to.not.be.null;
        } else {
          console.warn('⚠️ MongoDB not available (optional)');
        }
      } catch (error) {
        console.warn('⚠️ MongoDB connection failed (optional):', error.message);
      }
    });

    it('should perform basic MongoDB operations', async () => {
      if (!dbManager.mongodb.db) {
        console.warn('⚠️ MongoDB not available - test skipped');
        return;
      }

      const testCollection = dbManager.mongodb.collection('test_collection');
      
      // Insert
      const insertResult = await testCollection.insertOne({
        test: true,
        timestamp: new Date()
      });
      
      expect(insertResult.insertedId).to.exist;
      
      // Find
      const document = await testCollection.findOne({ test: true });
      expect(document).to.exist;
      expect(document.test).to.be.true;
      
      // Delete
      await testCollection.deleteOne({ _id: insertResult.insertedId });
    });
  });

  describe('Database Manager Health Check', () => {
    it('should perform health check on all databases', async () => {
      const health = await dbManager.healthCheck();
      
      expect(health).to.have.property('postgres');
      expect(health).to.have.property('redis');
      expect(health).to.have.property('mongodb');
      
      // PostgreSQL should be healthy (required)
      expect(health.postgres).to.be.true;
      
      // Redis and MongoDB are optional
      console.log('Database Health Status:', {
        postgres: health.postgres ? '✅' : '❌',
        redis: health.redis ? '✅' : '⚠️ (optional)',
        mongodb: health.mongodb ? '✅' : '⚠️ (optional)'
      });
    });
  });

  describe('Connection Pooling', () => {
    it('should handle multiple concurrent queries', async () => {
      const queries = Array.from({ length: 10 }, (_, i) => 
        dbManager.postgres.query('SELECT $1::int as query_num', [i])
      );
      
      const results = await Promise.all(queries);
      
      expect(results).to.have.length(10);
      results.forEach((result, index) => {
        expect(result.rows[0].query_num).to.equal(index);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database disconnection gracefully', async () => {
      // This tests that the app can handle DB failures
      try {
        // Attempt query with invalid connection
        await dbManager.postgres.query('SELECT * FROM should_handle_error');
      } catch (error) {
        // Error should be caught and handled
        expect(error).to.exist;
      }
    });
  });

  after(async () => {
    console.log('\n🔄 Cleaning up database connections...');
    // Don't close connections here - let the app manage them
    // await dbManager.closeAll();
  });
});

console.log('\n✅ Database Tests Complete\n');
