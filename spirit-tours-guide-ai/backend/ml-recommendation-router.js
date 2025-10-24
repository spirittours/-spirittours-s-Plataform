/**
 * ML Recommendation Router - Spirit Tours AI Guide
 * 
 * REST API for ML Recommendation Engine
 */

const express = require('express');

function initMLRecommendationRouter(mlEngine) {
  const router = express.Router();
  
  /**
   * POST /api/recommendations/track-interaction
   * Registrar interacción de usuario con tour
   */
  router.post('/track-interaction', async (req, res) => {
    try {
      const { userId, tourId, interactionType, context } = req.body;
      
      if (!userId || !tourId || !interactionType) {
        return res.status(400).json({
          error: 'Missing required fields: userId, tourId, interactionType'
        });
      }
      
      const validInteractionTypes = [
        'view', 'click', 'bookmark', 'share', 'booking', 'completion', 'rating'
      ];
      
      if (!validInteractionTypes.includes(interactionType)) {
        return res.status(400).json({
          error: `Invalid interaction type. Must be one of: ${validInteractionTypes.join(', ')}`
        });
      }
      
      const result = await mlEngine.trackInteraction(userId, tourId, interactionType, context || {});
      
      res.json({
        success: true,
        interaction: {
          userId,
          tourId,
          interactionType,
          weight: result.weight,
          sessionId: result.sessionId
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error tracking interaction:', error);
      res.status(500).json({ error: 'Failed to track interaction' });
    }
  });
  
  /**
   * GET /api/recommendations/user/:userId
   * Obtener recomendaciones personalizadas para usuario
   */
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const {
        limit = 10,
        algorithm = 'hybrid',
        excludeTourIds = [],
        skipCache = false
      } = req.query;
      
      const parsedExclude = typeof excludeTourIds === 'string' 
        ? excludeTourIds.split(',').filter(id => id.trim())
        : Array.isArray(excludeTourIds) ? excludeTourIds : [];
      
      const recommendations = await mlEngine.generateRecommendations(userId, {
        limit: parseInt(limit),
        algorithm,
        excludeTourIds: parsedExclude,
        context: {
          skipCache: skipCache === 'true',
          requestedAt: new Date(),
          userAgent: req.headers['user-agent']
        }
      });
      
      res.json({
        userId,
        recommendations,
        algorithm,
        count: recommendations.length,
        generatedAt: new Date()
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  });
  
  /**
   * GET /api/recommendations/similar-tours/:tourId
   * Obtener tours similares a un tour específico
   */
  router.get('/similar-tours/:tourId', async (req, res) => {
    try {
      const { tourId } = req.params;
      const { limit = 10 } = req.query;
      
      // Obtener features del tour
      const tourResult = await mlEngine.db.query(`
        SELECT * FROM tour_features WHERE tour_id = $1
      `, [tourId]);
      
      if (tourResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tour not found' });
      }
      
      const targetTour = tourResult.rows[0];
      
      // Buscar tours similares basados en características
      const similarResult = await mlEngine.db.query(`
        SELECT 
          tf.*,
          (
            CASE 
              WHEN tf.category = $1 THEN 0.3 
              ELSE 0 
            END +
            CASE 
              WHEN ABS(tf.duration_minutes - $2) < 60 THEN 0.2 
              WHEN ABS(tf.duration_minutes - $2) < 120 THEN 0.1 
              ELSE 0 
            END +
            CASE 
              WHEN tf.price_range = $3 THEN 0.2 
              ELSE 0 
            END +
            (
              SELECT COUNT(*) * 0.05 
              FROM unnest(tf.tags) tag 
              WHERE tag = ANY($4)
            )
          ) as similarity_score
        FROM tour_features tf
        WHERE tf.tour_id != $5
        ORDER BY similarity_score DESC
        LIMIT $6
      `, [
        targetTour.category,
        targetTour.duration_minutes,
        targetTour.price_range,
        targetTour.tags || [],
        tourId,
        parseInt(limit)
      ]);
      
      const similarTours = similarResult.rows.map((tour, index) => ({
        tourId: tour.tour_id,
        score: parseFloat(tour.similarity_score),
        rank: index + 1,
        metadata: {
          category: tour.category,
          duration: tour.duration_minutes,
          priceRange: tour.price_range,
          tags: tour.tags
        }
      }));
      
      res.json({
        sourceTourId: tourId,
        similarTours,
        count: similarTours.length
      });
    } catch (error) {
      console.error('Error finding similar tours:', error);
      res.status(500).json({ error: 'Failed to find similar tours' });
    }
  });
  
  /**
   * GET /api/recommendations/popular
   * Obtener tours más populares
   */
  router.get('/popular', async (req, res) => {
    try {
      const { limit = 20, category, timeframe = '30d' } = req.query;
      
      let query = `
        SELECT 
          tf.tour_id,
          tf.category,
          COUNT(DISTINCT ui.user_id) as unique_users,
          SUM(ui.interaction_value) as total_score,
          AVG(CASE WHEN tr.rating IS NOT NULL THEN tr.rating ELSE 0 END) as avg_rating
        FROM tour_features tf
        LEFT JOIN user_interactions ui ON tf.tour_id = ui.tour_id
          AND ui.created_at > NOW() - INTERVAL '${timeframe}'
        LEFT JOIN tour_ratings tr ON tf.tour_id = tr.tour_id
      `;
      
      const params = [];
      
      if (category) {
        query += ` WHERE tf.category = $1`;
        params.push(category);
      }
      
      query += `
        GROUP BY tf.tour_id, tf.category
        ORDER BY total_score DESC, unique_users DESC, avg_rating DESC
        LIMIT $${params.length + 1}
      `;
      
      params.push(parseInt(limit));
      
      const result = await mlEngine.db.query(query, params);
      
      const popularTours = result.rows.map((row, index) => ({
        tourId: row.tour_id,
        rank: index + 1,
        score: parseFloat(row.total_score),
        metadata: {
          category: row.category,
          uniqueUsers: parseInt(row.unique_users),
          avgRating: parseFloat(row.avg_rating)
        }
      }));
      
      res.json({
        popularTours,
        category: category || 'all',
        timeframe,
        count: popularTours.length
      });
    } catch (error) {
      console.error('Error getting popular tours:', error);
      res.status(500).json({ error: 'Failed to get popular tours' });
    }
  });
  
  /**
   * GET /api/recommendations/trending
   * Obtener tours en tendencia (crecimiento reciente de popularidad)
   */
  router.get('/trending', async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      
      const result = await mlEngine.db.query(`
        WITH recent_scores AS (
          SELECT 
            tour_id,
            SUM(interaction_value) as recent_score
          FROM user_interactions
          WHERE created_at > NOW() - INTERVAL '7 days'
          GROUP BY tour_id
        ),
        previous_scores AS (
          SELECT 
            tour_id,
            SUM(interaction_value) as previous_score
          FROM user_interactions
          WHERE created_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
          GROUP BY tour_id
        )
        SELECT 
          tf.tour_id,
          tf.category,
          COALESCE(rs.recent_score, 0) as recent_score,
          COALESCE(ps.previous_score, 0) as previous_score,
          (COALESCE(rs.recent_score, 0) - COALESCE(ps.previous_score, 0)) as growth,
          CASE 
            WHEN COALESCE(ps.previous_score, 0) > 0 
            THEN ((COALESCE(rs.recent_score, 0) - COALESCE(ps.previous_score, 0)) / COALESCE(ps.previous_score, 1)) * 100
            ELSE 100
          END as growth_percentage
        FROM tour_features tf
        LEFT JOIN recent_scores rs ON tf.tour_id = rs.tour_id
        LEFT JOIN previous_scores ps ON tf.tour_id = ps.tour_id
        WHERE COALESCE(rs.recent_score, 0) > 0
        ORDER BY growth DESC, recent_score DESC
        LIMIT $1
      `, [parseInt(limit)]);
      
      const trendingTours = result.rows.map((row, index) => ({
        tourId: row.tour_id,
        rank: index + 1,
        metadata: {
          category: row.category,
          recentScore: parseFloat(row.recent_score),
          previousScore: parseFloat(row.previous_score),
          growth: parseFloat(row.growth),
          growthPercentage: parseFloat(row.growth_percentage)
        }
      }));
      
      res.json({
        trendingTours,
        count: trendingTours.length,
        period: 'last_7_days'
      });
    } catch (error) {
      console.error('Error getting trending tours:', error);
      res.status(500).json({ error: 'Failed to get trending tours' });
    }
  });
  
  /**
   * GET /api/recommendations/user-profile/:userId
   * Obtener perfil de usuario
   */
  router.get('/user-profile/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const profile = await mlEngine.getUserProfile(userId);
      
      if (!profile) {
        // Si no existe perfil, crear uno vacío
        await mlEngine.updateUserProfile(userId);
        const newProfile = await mlEngine.getUserProfile(userId);
        
        return res.json({
          userId,
          profile: newProfile || {},
          isNew: true
        });
      }
      
      res.json({
        userId,
        profile,
        isNew: false
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({ error: 'Failed to get user profile' });
    }
  });
  
  /**
   * POST /api/recommendations/update-tour-features
   * Actualizar features de un tour
   */
  router.post('/update-tour-features', async (req, res) => {
    try {
      const {
        tourId,
        category,
        subcategories,
        durationMinutes,
        priceRange,
        locationCoordinates,
        tags
      } = req.body;
      
      if (!tourId) {
        return res.status(400).json({ error: 'Missing tourId' });
      }
      
      await mlEngine.db.query(`
        INSERT INTO tour_features (
          tour_id, category, subcategories, duration_minutes, 
          price_range, location_coordinates, tags, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
        ON CONFLICT (tour_id) DO UPDATE
        SET category = EXCLUDED.category,
            subcategories = EXCLUDED.subcategories,
            duration_minutes = EXCLUDED.duration_minutes,
            price_range = EXCLUDED.price_range,
            location_coordinates = EXCLUDED.location_coordinates,
            tags = EXCLUDED.tags,
            last_updated = CURRENT_TIMESTAMP
      `, [
        tourId,
        category,
        subcategories || [],
        durationMinutes,
        priceRange,
        JSON.stringify(locationCoordinates || {}),
        tags || []
      ]);
      
      // Invalidar cache relacionado
      if (mlEngine.redis) {
        await mlEngine.redis.del(`tour_features:${tourId}`);
        await mlEngine.redis.del('popular_tours');
      }
      
      res.json({
        success: true,
        tourId,
        message: 'Tour features updated successfully'
      });
    } catch (error) {
      console.error('Error updating tour features:', error);
      res.status(500).json({ error: 'Failed to update tour features' });
    }
  });
  
  /**
   * POST /api/recommendations/recommendation-clicked
   * Registrar click en recomendación
   */
  router.post('/recommendation-clicked', async (req, res) => {
    try {
      const { userId, tourId, algorithm } = req.body;
      
      if (!userId || !tourId) {
        return res.status(400).json({ error: 'Missing userId or tourId' });
      }
      
      await mlEngine.db.query(`
        UPDATE generated_recommendations
        SET clicked = true, clicked_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 
          AND tour_id = $2
          AND algorithm = $3
          AND clicked = false
      `, [userId, tourId, algorithm || 'hybrid']);
      
      // También registrar como interacción
      await mlEngine.trackInteraction(userId, tourId, 'click', {
        source: 'recommendation',
        algorithm
      });
      
      res.json({
        success: true,
        message: 'Recommendation click tracked'
      });
    } catch (error) {
      console.error('Error tracking recommendation click:', error);
      res.status(500).json({ error: 'Failed to track recommendation click' });
    }
  });
  
  /**
   * POST /api/recommendations/recommendation-converted
   * Registrar conversión de recomendación (booking)
   */
  router.post('/recommendation-converted', async (req, res) => {
    try {
      const { userId, tourId, algorithm } = req.body;
      
      if (!userId || !tourId) {
        return res.status(400).json({ error: 'Missing userId or tourId' });
      }
      
      await mlEngine.db.query(`
        UPDATE generated_recommendations
        SET converted = true, converted_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 
          AND tour_id = $2
          AND algorithm = $3
          AND converted = false
      `, [userId, tourId, algorithm || 'hybrid']);
      
      res.json({
        success: true,
        message: 'Recommendation conversion tracked'
      });
    } catch (error) {
      console.error('Error tracking recommendation conversion:', error);
      res.status(500).json({ error: 'Failed to track recommendation conversion' });
    }
  });
  
  /**
   * GET /api/recommendations/performance-metrics
   * Obtener métricas de performance del modelo
   */
  router.get('/performance-metrics', async (req, res) => {
    try {
      const { timeframe = '7d' } = req.query;
      
      const metrics = await mlEngine.calculatePerformanceMetrics(timeframe);
      
      // Obtener métricas adicionales
      const overallResult = await mlEngine.db.query(`
        SELECT
          COUNT(*) as total_recommendations,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(CASE WHEN clicked THEN 1 ELSE 0 END) as overall_ctr,
          AVG(CASE WHEN converted THEN 1 ELSE 0 END) as overall_cvr
        FROM generated_recommendations
        WHERE generated_at > NOW() - INTERVAL $1
      `, [timeframe]);
      
      const overall = overallResult.rows[0];
      
      res.json({
        timeframe,
        byAlgorithm: metrics,
        overall: {
          totalRecommendations: parseInt(overall.total_recommendations),
          uniqueUsers: parseInt(overall.unique_users),
          clickThroughRate: parseFloat(overall.overall_ctr),
          conversionRate: parseFloat(overall.overall_cvr)
        },
        generatedAt: new Date()
      });
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      res.status(500).json({ error: 'Failed to get performance metrics' });
    }
  });
  
  /**
   * GET /api/recommendations/user-interactions/:userId
   * Obtener historial de interacciones del usuario
   */
  router.get('/user-interactions/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 50, interactionType } = req.query;
      
      let query = `
        SELECT 
          ui.*,
          tf.category,
          tf.tags
        FROM user_interactions ui
        LEFT JOIN tour_features tf ON ui.tour_id = tf.tour_id
        WHERE ui.user_id = $1
      `;
      
      const params = [userId];
      
      if (interactionType) {
        query += ` AND ui.interaction_type = $2`;
        params.push(interactionType);
      }
      
      query += ` ORDER BY ui.created_at DESC LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));
      
      const result = await mlEngine.db.query(query, params);
      
      res.json({
        userId,
        interactions: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('Error getting user interactions:', error);
      res.status(500).json({ error: 'Failed to get user interactions' });
    }
  });
  
  /**
   * POST /api/recommendations/ab-experiment
   * Crear experimento A/B
   */
  router.post('/ab-experiment', async (req, res) => {
    try {
      const {
        name,
        description,
        variants,
        targetMetric
      } = req.body;
      
      if (!name || !variants || variants.length < 2) {
        return res.status(400).json({
          error: 'Missing required fields or insufficient variants'
        });
      }
      
      const experimentId = `exp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      
      await mlEngine.db.query(`
        INSERT INTO ab_experiments (
          experiment_id, name, description, variants, status, target_metric
        ) VALUES ($1, $2, $3, $4, 'draft', $5)
      `, [
        experimentId,
        name,
        description,
        JSON.stringify(variants),
        targetMetric
      ]);
      
      res.json({
        success: true,
        experimentId,
        message: 'A/B experiment created successfully'
      });
    } catch (error) {
      console.error('Error creating A/B experiment:', error);
      res.status(500).json({ error: 'Failed to create A/B experiment' });
    }
  });
  
  /**
   * GET /api/recommendations/ab-experiment/:experimentId
   * Obtener detalles de experimento A/B
   */
  router.get('/ab-experiment/:experimentId', async (req, res) => {
    try {
      const { experimentId } = req.params;
      
      const expResult = await mlEngine.db.query(`
        SELECT * FROM ab_experiments WHERE experiment_id = $1
      `, [experimentId]);
      
      if (expResult.rows.length === 0) {
        return res.status(404).json({ error: 'Experiment not found' });
      }
      
      const experiment = expResult.rows[0];
      
      // Obtener estadísticas por variante
      const statsResult = await mlEngine.db.query(`
        SELECT
          variant,
          COUNT(*) as assignments,
          COUNT(DISTINCT user_id) as unique_users
        FROM ab_assignments
        WHERE experiment_id = $1
        GROUP BY variant
      `, [experimentId]);
      
      const variantStats = {};
      statsResult.rows.forEach(row => {
        variantStats[row.variant] = {
          assignments: parseInt(row.assignments),
          uniqueUsers: parseInt(row.unique_users)
        };
      });
      
      res.json({
        experiment,
        variantStats
      });
    } catch (error) {
      console.error('Error getting A/B experiment:', error);
      res.status(500).json({ error: 'Failed to get A/B experiment' });
    }
  });
  
  /**
   * GET /api/recommendations/stats
   * Obtener estadísticas generales del sistema
   */
  router.get('/stats', async (req, res) => {
    try {
      const { timeframe = '7d' } = req.query;
      
      const statsResult = await mlEngine.db.query(`
        SELECT
          (SELECT COUNT(*) FROM user_profiles) as total_users,
          (SELECT COUNT(*) FROM tour_features) as total_tours,
          (SELECT COUNT(*) FROM user_interactions WHERE created_at > NOW() - INTERVAL $1) as recent_interactions,
          (SELECT COUNT(DISTINCT user_id) FROM user_interactions WHERE created_at > NOW() - INTERVAL $1) as active_users,
          (SELECT COUNT(*) FROM generated_recommendations WHERE generated_at > NOW() - INTERVAL $1) as recommendations_generated
      `, [timeframe]);
      
      const interactionTypesResult = await mlEngine.db.query(`
        SELECT
          interaction_type,
          COUNT(*) as count
        FROM user_interactions
        WHERE created_at > NOW() - INTERVAL $1
        GROUP BY interaction_type
        ORDER BY count DESC
      `, [timeframe]);
      
      const interactionsByType = {};
      interactionTypesResult.rows.forEach(row => {
        interactionsByType[row.interaction_type] = parseInt(row.count);
      });
      
      res.json({
        timeframe,
        ...statsResult.rows[0],
        interactionsByType
      });
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });
  
  return router;
}

module.exports = initMLRecommendationRouter;
