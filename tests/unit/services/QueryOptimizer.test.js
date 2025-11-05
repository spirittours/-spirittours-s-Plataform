const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const QueryOptimizer = require('../../../backend/services/optimization/QueryOptimizer');

describe('QueryOptimizer Service', () => {
  beforeEach(() => {
    QueryOptimizer.reset();
  });

  describe('Query Analysis', () => {
    it('should analyze query complexity correctly', async () => {
      const mockModel = {
        modelName: 'TestModel',
        schema: {
          indexes: () => [
            [{ field1: 1 }, {}]
          ]
        }
      };

      const query = { field1: 'value1' };
      const options = { select: 'field1 field2', limit: 10 };

      const analysis = await QueryOptimizer.analyzeQuery(mockModel, query, options);

      expect(analysis).toBeDefined();
      expect(analysis.hasIndexes).toBe(true);
      expect(analysis.usesProjection).toBe(true);
      expect(analysis.usesLimit).toBe(true);
      expect(analysis.complexity).toBe('simple');
    });

    it('should recommend indexes for non-indexed fields', async () => {
      const mockModel = {
        modelName: 'TestModel',
        schema: {
          indexes: () => []
        }
      };

      const query = { email: 'test@example.com' };
      const options = {};

      const analysis = await QueryOptimizer.analyzeQuery(mockModel, query, options);

      expect(analysis.hasIndexes).toBe(false);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
      expect(analysis.recommendations[0].type).toBe('index');
    });
  });

  describe('Query Optimization', () => {
    it('should apply optimization strategies', () => {
      const options = {};
      const analysis = {
        hasIndexes: true,
        complexity: 'simple'
      };

      const optimized = QueryOptimizer.applyOptimizations(options, analysis);

      expect(optimized.limit).toBe(1000); // Default limit added
      expect(optimized.lean).toBe(true); // Lean query enabled
    });

    it('should preserve existing options', () => {
      const options = { limit: 50, select: 'name email' };
      const analysis = { hasIndexes: true };

      const optimized = QueryOptimizer.applyOptimizations(options, analysis);

      expect(optimized.limit).toBe(50);
      expect(optimized.select).toBe('name email');
    });
  });

  describe('Slow Query Detection', () => {
    it('should detect slow queries', () => {
      const queryKey = 'TestModel:{"email":"test"}:{}';
      const executionTime = 150; // Above threshold
      const analysis = { complexity: 'simple', recommendations: [] };

      QueryOptimizer.detectSlowQuery('TestModel', { email: 'test' }, executionTime, analysis);

      const stats = QueryOptimizer.getStats();
      expect(stats.slowQueries).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should track query statistics', () => {
      const queryKey = 'test-key';
      const executionTime = 50;
      const analysis = { complexity: 'simple' };

      QueryOptimizer.trackQueryPerformance(queryKey, executionTime, analysis);

      const stats = QueryOptimizer.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalQueries).toBeGreaterThan(0);
    });

    it('should reset statistics', () => {
      QueryOptimizer.reset();
      const stats = QueryOptimizer.getStats();

      expect(stats.totalQueries).toBe(0);
      expect(stats.slowQueries).toBe(0);
    });
  });

  describe('Recommendations', () => {
    it('should generate optimization recommendations', () => {
      QueryOptimizer.detectSlowQuery('TestModel', { email: 'test' }, 200, {
        hasIndexes: false,
        complexity: 'complex',
        recommendations: [{ type: 'index', message: 'Add index' }]
      });

      const recommendations = QueryOptimizer.getRecommendations();

      expect(recommendations).toBeDefined();
      expect(recommendations.slowQueries).toBeDefined();
      expect(recommendations.optimizationTips).toBeDefined();
    });
  });
});
