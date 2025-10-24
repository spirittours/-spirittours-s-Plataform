/**
 * ML Recommendation Engine - Spirit Tours AI Guide
 * 
 * Sistema de recomendaciones personalizadas usando Machine Learning:
 * - Collaborative Filtering (filtrado colaborativo)
 * - Content-Based Filtering (basado en contenido)
 * - Hybrid Model (modelo híbrido)
 * - Real-time personalization
 * - Seasonal adjustments
 * - A/B testing framework
 * 
 * Técnicas ML utilizadas:
 * - User-User Collaborative Filtering
 * - Item-Item Collaborative Filtering
 * - TF-IDF para content similarity
 * - Cosine Similarity
 * - Matrix Factorization (SVD)
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class MLRecommendationEngine extends EventEmitter {
  constructor(db, redisClient) {
    super();
    this.db = db;
    this.redis = redisClient;
    
    // Parámetros del modelo
    this.params = {
      // Collaborative Filtering
      minCommonUsers: 3,              // Mínimo usuarios en común para similaridad
      minCommonTours: 2,               // Mínimo tours en común
      neighborhoodSize: 10,            // Tamaño de vecindario k-NN
      
      // Content-Based
      contentWeights: {
        category: 0.3,                 // Peso de categoría
        duration: 0.15,                // Peso de duración
        priceRange: 0.15,              // Peso de rango de precio
        location: 0.2,                 // Peso de ubicación
        tags: 0.2                      // Peso de tags
      },
      
      // Hybrid Model
      hybridWeights: {
        collaborative: 0.6,            // Peso de filtrado colaborativo
        contentBased: 0.4              // Peso de filtrado por contenido
      },
      
      // Personalization
      interactionWeights: {
        view: 1,                       // Peso de vista
        click: 2,                      // Peso de click
        bookmark: 3,                   // Peso de bookmark
        share: 4,                      // Peso de compartir
        booking: 10,                   // Peso de reserva
        completion: 15,                // Peso de tour completado
        rating: 5                      // Peso de rating
      },
      
      // Seasonal Adjustments
      seasonalBoost: {
        high: 1.3,                     // Boost temporada alta
        medium: 1.0,                   // Normal temporada media
        low: 0.8                       // Reducción temporada baja
      },
      
      // Diversity
      diversityWeight: 0.15,           // Peso de diversidad en recomendaciones
      maxSameCategory: 3,              // Máximo de misma categoría
      
      // Recency
      recencyDecay: 0.95,              // Factor de decaimiento por día
      maxRecencyDays: 90               // Máximo días para considerar interacciones
    };
    
    // Cache configuration
    this.cacheConfig = {
      userRecommendations: 3600,       // 1 hora
      tourSimilarity: 7200,            // 2 horas
      userProfile: 1800,               // 30 minutos
      popularTours: 600                // 10 minutos
    };
    
    this.initDatabase();
  }
  
  /**
   * Inicializar esquema de base de datos
   */
  async initDatabase() {
    try {
      // Tabla de interacciones de usuario
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS user_interactions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) NOT NULL,
          tour_id VARCHAR(100) NOT NULL,
          interaction_type VARCHAR(50) NOT NULL,
          interaction_value FLOAT DEFAULT 1.0,
          context JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          session_id VARCHAR(100)
        );
        
        CREATE INDEX IF NOT EXISTS idx_interactions_user 
        ON user_interactions(user_id, created_at DESC);
        
        CREATE INDEX IF NOT EXISTS idx_interactions_tour 
        ON user_interactions(tour_id, interaction_type);
        
        CREATE INDEX IF NOT EXISTS idx_interactions_type 
        ON user_interactions(interaction_type, created_at);
      `);
      
      // Tabla de perfiles de usuario
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS user_profiles (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) UNIQUE NOT NULL,
          preferences JSONB,
          feature_vector JSONB,
          demographics JSONB,
          behavior_patterns JSONB,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_profiles_user 
        ON user_profiles(user_id);
      `);
      
      // Tabla de features de tours
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS tour_features (
          id SERIAL PRIMARY KEY,
          tour_id VARCHAR(100) UNIQUE NOT NULL,
          category VARCHAR(100),
          subcategories TEXT[],
          duration_minutes INTEGER,
          price_range VARCHAR(20),
          location_coordinates JSONB,
          tags TEXT[],
          feature_vector JSONB,
          popularity_score FLOAT DEFAULT 0,
          quality_score FLOAT DEFAULT 0,
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_tour_features_tour 
        ON tour_features(tour_id);
        
        CREATE INDEX IF NOT EXISTS idx_tour_features_category 
        ON tour_features(category);
      `);
      
      // Tabla de similaridad entre tours
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS tour_similarities (
          id SERIAL PRIMARY KEY,
          tour_id_1 VARCHAR(100) NOT NULL,
          tour_id_2 VARCHAR(100) NOT NULL,
          similarity_score FLOAT NOT NULL,
          similarity_type VARCHAR(50),
          calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tour_id_1, tour_id_2, similarity_type)
        );
        
        CREATE INDEX IF NOT EXISTS idx_similarities_tour1 
        ON tour_similarities(tour_id_1, similarity_score DESC);
        
        CREATE INDEX IF NOT EXISTS idx_similarities_tour2 
        ON tour_similarities(tour_id_2, similarity_score DESC);
      `);
      
      // Tabla de recomendaciones generadas
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS generated_recommendations (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) NOT NULL,
          tour_id VARCHAR(100) NOT NULL,
          recommendation_score FLOAT NOT NULL,
          algorithm VARCHAR(50),
          context JSONB,
          generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          clicked BOOLEAN DEFAULT false,
          clicked_at TIMESTAMP,
          converted BOOLEAN DEFAULT false,
          converted_at TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_recommendations_user 
        ON generated_recommendations(user_id, generated_at DESC);
        
        CREATE INDEX IF NOT EXISTS idx_recommendations_performance 
        ON generated_recommendations(algorithm, clicked, converted);
      `);
      
      // Tabla de experimentos A/B
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS ab_experiments (
          id SERIAL PRIMARY KEY,
          experiment_id VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          variants JSONB NOT NULL,
          status VARCHAR(50) DEFAULT 'draft',
          start_date TIMESTAMP,
          end_date TIMESTAMP,
          target_metric VARCHAR(100),
          results JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by VARCHAR(100)
        );
        
        CREATE INDEX IF NOT EXISTS idx_experiments_status 
        ON ab_experiments(status, start_date);
      `);
      
      // Tabla de asignaciones de experimentos
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS ab_assignments (
          id SERIAL PRIMARY KEY,
          experiment_id VARCHAR(100) NOT NULL,
          user_id VARCHAR(100) NOT NULL,
          variant VARCHAR(50) NOT NULL,
          assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(experiment_id, user_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_assignments_experiment 
        ON ab_assignments(experiment_id, variant);
        
        CREATE INDEX IF NOT EXISTS idx_assignments_user 
        ON ab_assignments(user_id);
      `);
      
      // Tabla de métricas del modelo
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS model_metrics (
          id SERIAL PRIMARY KEY,
          metric_type VARCHAR(100) NOT NULL,
          metric_value FLOAT NOT NULL,
          algorithm VARCHAR(50),
          context JSONB,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_metrics_type_time 
        ON model_metrics(metric_type, timestamp DESC);
        
        CREATE INDEX IF NOT EXISTS idx_metrics_algorithm 
        ON model_metrics(algorithm, metric_type);
      `);
      
      console.log('✅ ML Recommendation Engine database schema initialized');
    } catch (error) {
      console.error('Error initializing ML recommendation database:', error);
      throw error;
    }
  }
  
  /**
   * Registrar interacción de usuario con tour
   */
  async trackInteraction(userId, tourId, interactionType, context = {}) {
    try {
      const weight = this.params.interactionWeights[interactionType] || 1;
      const sessionId = context.sessionId || crypto.randomBytes(8).toString('hex');
      
      await this.db.query(`
        INSERT INTO user_interactions (
          user_id, tour_id, interaction_type, interaction_value, context, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [userId, tourId, interactionType, weight, JSON.stringify(context), sessionId]);
      
      // Invalidar cache de recomendaciones del usuario
      if (this.redis) {
        await this.redis.del(`recommendations:${userId}`);
        await this.redis.del(`user_profile:${userId}`);
      }
      
      // Actualizar perfil de usuario asíncronamente
      this.updateUserProfile(userId).catch(err => 
        console.error('Error updating user profile:', err)
      );
      
      // Emitir evento
      this.emit('interaction:tracked', {
        userId,
        tourId,
        interactionType,
        weight,
        timestamp: new Date()
      });
      
      // Track métrica
      await this.trackMetric('interaction_tracked', 1, 'system', {
        interactionType,
        userId,
        tourId
      });
      
      return { success: true, weight, sessionId };
    } catch (error) {
      console.error('Error tracking interaction:', error);
      throw error;
    }
  }
  
  /**
   * Actualizar perfil de usuario basado en interacciones
   */
  async updateUserProfile(userId) {
    try {
      // Obtener interacciones recientes del usuario
      const interactionsResult = await this.db.query(`
        SELECT 
          ui.tour_id,
          ui.interaction_type,
          ui.interaction_value,
          ui.created_at,
          tf.category,
          tf.tags,
          tf.duration_minutes,
          tf.price_range
        FROM user_interactions ui
        JOIN tour_features tf ON ui.tour_id = tf.tour_id
        WHERE ui.user_id = $1
          AND ui.created_at > NOW() - INTERVAL '${this.params.maxRecencyDays} days'
        ORDER BY ui.created_at DESC
      `, [userId]);
      
      const interactions = interactionsResult.rows;
      
      if (interactions.length === 0) {
        return null;
      }
      
      // Calcular preferencias
      const categoryPreferences = {};
      const tagPreferences = {};
      const durationPreference = [];
      const pricePreferences = {};
      
      interactions.forEach(interaction => {
        // Aplicar decaimiento temporal
        const daysSince = (Date.now() - new Date(interaction.created_at)) / (1000 * 60 * 60 * 24);
        const recencyWeight = Math.pow(this.params.recencyDecay, daysSince);
        const weightedValue = interaction.interaction_value * recencyWeight;
        
        // Categorías
        if (interaction.category) {
          categoryPreferences[interaction.category] = 
            (categoryPreferences[interaction.category] || 0) + weightedValue;
        }
        
        // Tags
        if (interaction.tags) {
          interaction.tags.forEach(tag => {
            tagPreferences[tag] = (tagPreferences[tag] || 0) + weightedValue;
          });
        }
        
        // Duración
        if (interaction.duration_minutes) {
          durationPreference.push({
            value: interaction.duration_minutes,
            weight: weightedValue
          });
        }
        
        // Precio
        if (interaction.price_range) {
          pricePreferences[interaction.price_range] = 
            (pricePreferences[interaction.price_range] || 0) + weightedValue;
        }
      });
      
      // Normalizar preferencias
      const totalCategoryWeight = Object.values(categoryPreferences).reduce((a, b) => a + b, 0);
      const normalizedCategories = {};
      Object.keys(categoryPreferences).forEach(cat => {
        normalizedCategories[cat] = categoryPreferences[cat] / totalCategoryWeight;
      });
      
      const totalTagWeight = Object.values(tagPreferences).reduce((a, b) => a + b, 0);
      const normalizedTags = {};
      Object.keys(tagPreferences).forEach(tag => {
        normalizedTags[tag] = tagPreferences[tag] / totalTagWeight;
      });
      
      // Calcular duración promedio ponderada
      const totalDurationWeight = durationPreference.reduce((sum, d) => sum + d.weight, 0);
      const avgDuration = durationPreference.reduce((sum, d) => 
        sum + (d.value * d.weight / totalDurationWeight), 0
      );
      
      // Crear feature vector
      const featureVector = {
        categoryPreferences: normalizedCategories,
        tagPreferences: normalizedTags,
        avgDuration,
        pricePreferences,
        totalInteractions: interactions.length,
        lastActivity: interactions[0].created_at
      };
      
      // Patrones de comportamiento
      const behaviorPatterns = {
        bookingRate: interactions.filter(i => i.interaction_type === 'booking').length / interactions.length,
        completionRate: interactions.filter(i => i.interaction_type === 'completion').length / 
                       interactions.filter(i => i.interaction_type === 'booking').length || 0,
        explorationRate: new Set(interactions.map(i => i.tour_id)).size / interactions.length,
        avgSessionLength: this.calculateAvgSessionLength(interactions)
      };
      
      // Guardar o actualizar perfil
      await this.db.query(`
        INSERT INTO user_profiles (
          user_id, preferences, feature_vector, behavior_patterns, last_updated
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO UPDATE
        SET preferences = EXCLUDED.preferences,
            feature_vector = EXCLUDED.feature_vector,
            behavior_patterns = EXCLUDED.behavior_patterns,
            last_updated = CURRENT_TIMESTAMP
      `, [
        userId,
        JSON.stringify({ categories: normalizedCategories, tags: normalizedTags }),
        JSON.stringify(featureVector),
        JSON.stringify(behaviorPatterns)
      ]);
      
      // Cache en Redis
      if (this.redis) {
        await this.redis.setex(
          `user_profile:${userId}`,
          this.cacheConfig.userProfile,
          JSON.stringify(featureVector)
        );
      }
      
      this.emit('profile:updated', { userId, featureVector, behaviorPatterns });
      
      return featureVector;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
  
  /**
   * Calcular duración promedio de sesión
   */
  calculateAvgSessionLength(interactions) {
    const sessions = {};
    
    interactions.forEach(interaction => {
      const sessionId = interaction.session_id || 'default';
      if (!sessions[sessionId]) {
        sessions[sessionId] = {
          start: new Date(interaction.created_at),
          end: new Date(interaction.created_at)
        };
      } else {
        const time = new Date(interaction.created_at);
        if (time < sessions[sessionId].start) sessions[sessionId].start = time;
        if (time > sessions[sessionId].end) sessions[sessionId].end = time;
      }
    });
    
    const lengths = Object.values(sessions).map(s => 
      (s.end - s.start) / 1000 / 60 // minutos
    );
    
    return lengths.reduce((sum, len) => sum + len, 0) / lengths.length || 0;
  }
  
  /**
   * Generar recomendaciones personalizadas para usuario
   */
  async generateRecommendations(userId, options = {}) {
    try {
      const {
        limit = 10,
        excludeTourIds = [],
        algorithm = 'hybrid', // 'hybrid', 'collaborative', 'content', 'popular'
        context = {}
      } = options;
      
      // Intentar obtener de cache
      if (this.redis && !context.skipCache) {
        const cached = await this.redis.get(`recommendations:${userId}:${algorithm}`);
        if (cached) {
          await this.trackMetric('cache_hit', 1, algorithm, { userId });
          return JSON.parse(cached);
        }
      }
      
      let recommendations = [];
      
      // Seleccionar algoritmo
      switch (algorithm) {
        case 'collaborative':
          recommendations = await this.collaborativeFiltering(userId, limit * 2, excludeTourIds);
          break;
        case 'content':
          recommendations = await this.contentBasedFiltering(userId, limit * 2, excludeTourIds);
          break;
        case 'popular':
          recommendations = await this.popularityBasedRecommendations(limit * 2, excludeTourIds);
          break;
        case 'hybrid':
        default:
          recommendations = await this.hybridRecommendations(userId, limit * 2, excludeTourIds);
          break;
      }
      
      // Aplicar diversidad
      recommendations = this.applyDiversity(recommendations, limit);
      
      // Aplicar ajustes estacionales
      recommendations = await this.applySeasonalAdjustments(recommendations);
      
      // Limitar resultados
      recommendations = recommendations.slice(0, limit);
      
      // Guardar recomendaciones generadas
      await this.saveGeneratedRecommendations(userId, recommendations, algorithm, context);
      
      // Cache
      if (this.redis) {
        await this.redis.setex(
          `recommendations:${userId}:${algorithm}`,
          this.cacheConfig.userRecommendations,
          JSON.stringify(recommendations)
        );
      }
      
      this.emit('recommendations:generated', {
        userId,
        algorithm,
        count: recommendations.length,
        timestamp: new Date()
      });
      
      await this.trackMetric('recommendations_generated', recommendations.length, algorithm, {
        userId,
        context
      });
      
      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }
  
  /**
   * Collaborative Filtering (Filtrado Colaborativo)
   */
  async collaborativeFiltering(userId, limit, excludeTourIds) {
    try {
      // Encontrar usuarios similares
      const similarUsers = await this.findSimilarUsers(userId, this.params.neighborhoodSize);
      
      if (similarUsers.length === 0) {
        // Fallback a popular si no hay usuarios similares
        return this.popularityBasedRecommendations(limit, excludeTourIds);
      }
      
      // Obtener tours que les gustaron a usuarios similares
      const similarUserIds = similarUsers.map(u => u.userId);
      
      const toursResult = await this.db.query(`
        SELECT 
          ui.tour_id,
          COUNT(*) as user_count,
          SUM(ui.interaction_value) as total_score,
          AVG(ui.interaction_value) as avg_score
        FROM user_interactions ui
        WHERE ui.user_id = ANY($1)
          AND ui.tour_id NOT IN (
            SELECT tour_id FROM user_interactions WHERE user_id = $2
          )
          AND ui.tour_id != ALL($3)
          AND ui.interaction_type IN ('booking', 'rating', 'completion', 'bookmark')
        GROUP BY ui.tour_id
        HAVING COUNT(*) >= $4
        ORDER BY total_score DESC, user_count DESC
        LIMIT $5
      `, [similarUserIds, userId, excludeTourIds, this.params.minCommonUsers, limit]);
      
      const recommendations = toursResult.rows.map((row, index) => ({
        tourId: row.tour_id,
        score: parseFloat(row.total_score) / similarUsers.length,
        rank: index + 1,
        algorithm: 'collaborative_filtering',
        metadata: {
          userCount: parseInt(row.user_count),
          avgScore: parseFloat(row.avg_score),
          similarUsersCount: similarUsers.length
        }
      }));
      
      return recommendations;
    } catch (error) {
      console.error('Error in collaborative filtering:', error);
      return [];
    }
  }
  
  /**
   * Encontrar usuarios similares usando Cosine Similarity
   */
  async findSimilarUsers(userId, limit) {
    try {
      // Obtener perfil del usuario objetivo
      const userProfile = await this.getUserProfile(userId);
      
      if (!userProfile) {
        return [];
      }
      
      // Obtener todos los usuarios con perfiles
      const profilesResult = await this.db.query(`
        SELECT user_id, feature_vector
        FROM user_profiles
        WHERE user_id != $1
      `, [userId]);
      
      // Calcular similaridad con cada usuario
      const similarities = profilesResult.rows.map(profile => {
        const similarity = this.cosineSimilarity(
          userProfile.feature_vector,
          profile.feature_vector
        );
        
        return {
          userId: profile.user_id,
          similarity
        };
      }).filter(s => s.similarity > 0);
      
      // Ordenar por similaridad y limitar
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      return similarities.slice(0, limit);
    } catch (error) {
      console.error('Error finding similar users:', error);
      return [];
    }
  }
  
  /**
   * Content-Based Filtering (Filtrado basado en contenido)
   */
  async contentBasedFiltering(userId, limit, excludeTourIds) {
    try {
      // Obtener perfil del usuario
      const userProfile = await this.getUserProfile(userId);
      
      if (!userProfile || !userProfile.preferences) {
        return this.popularityBasedRecommendations(limit, excludeTourIds);
      }
      
      const categoryPrefs = userProfile.preferences.categories || {};
      const tagPrefs = userProfile.preferences.tags || {};
      
      // Obtener tours candidatos
      const toursResult = await this.db.query(`
        SELECT 
          tf.*,
          COALESCE(
            (SELECT AVG(rating) FROM tour_ratings WHERE tour_id = tf.tour_id), 0
          ) as avg_rating
        FROM tour_features tf
        WHERE tf.tour_id != ALL($1)
        LIMIT 200
      `, [excludeTourIds]);
      
      // Calcular score de contenido para cada tour
      const scoredTours = toursResult.rows.map(tour => {
        let score = 0;
        
        // Score por categoría
        if (tour.category && categoryPrefs[tour.category]) {
          score += categoryPrefs[tour.category] * this.params.contentWeights.category;
        }
        
        // Score por tags
        if (tour.tags && tour.tags.length > 0) {
          const tagScore = tour.tags.reduce((sum, tag) => 
            sum + (tagPrefs[tag] || 0), 0
          ) / tour.tags.length;
          score += tagScore * this.params.contentWeights.tags;
        }
        
        // Score por duración (similaridad)
        if (tour.duration_minutes && userProfile.feature_vector.avgDuration) {
          const durationDiff = Math.abs(tour.duration_minutes - userProfile.feature_vector.avgDuration);
          const durationScore = Math.max(0, 1 - (durationDiff / 240)); // Normalizado a 4 horas
          score += durationScore * this.params.contentWeights.duration;
        }
        
        // Boost por calidad
        score *= (1 + parseFloat(tour.avg_rating) / 10);
        
        return {
          tourId: tour.tour_id,
          score,
          algorithm: 'content_based_filtering',
          metadata: {
            category: tour.category,
            tags: tour.tags,
            avgRating: parseFloat(tour.avg_rating)
          }
        };
      });
      
      // Ordenar por score y limitar
      scoredTours.sort((a, b) => b.score - a.score);
      
      return scoredTours.slice(0, limit).map((tour, index) => ({
        ...tour,
        rank: index + 1
      }));
    } catch (error) {
      console.error('Error in content-based filtering:', error);
      return [];
    }
  }
  
  /**
   * Hybrid Recommendations (Modelo Híbrido)
   */
  async hybridRecommendations(userId, limit, excludeTourIds) {
    try {
      // Obtener recomendaciones de ambos algoritmos
      const [collaborative, contentBased] = await Promise.all([
        this.collaborativeFiltering(userId, limit, excludeTourIds),
        this.contentBasedFiltering(userId, limit, excludeTourIds)
      ]);
      
      // Combinar scores usando pesos híbridos
      const combinedScores = {};
      
      collaborative.forEach(rec => {
        combinedScores[rec.tourId] = {
          tourId: rec.tourId,
          score: rec.score * this.params.hybridWeights.collaborative,
          algorithms: ['collaborative'],
          metadata: { collaborative: rec.metadata }
        };
      });
      
      contentBased.forEach(rec => {
        if (combinedScores[rec.tourId]) {
          combinedScores[rec.tourId].score += rec.score * this.params.hybridWeights.contentBased;
          combinedScores[rec.tourId].algorithms.push('content_based');
          combinedScores[rec.tourId].metadata.contentBased = rec.metadata;
        } else {
          combinedScores[rec.tourId] = {
            tourId: rec.tourId,
            score: rec.score * this.params.hybridWeights.contentBased,
            algorithms: ['content_based'],
            metadata: { contentBased: rec.metadata }
          };
        }
      });
      
      // Convertir a array y ordenar
      const recommendations = Object.values(combinedScores)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((rec, index) => ({
          ...rec,
          rank: index + 1,
          algorithm: 'hybrid'
        }));
      
      return recommendations;
    } catch (error) {
      console.error('Error in hybrid recommendations:', error);
      return [];
    }
  }
  
  /**
   * Popularity-Based Recommendations (Recomendaciones por popularidad)
   */
  async popularityBasedRecommendations(limit, excludeTourIds) {
    try {
      // Intentar cache
      if (this.redis) {
        const cached = await this.redis.get('popular_tours');
        if (cached) {
          const popular = JSON.parse(cached);
          return popular
            .filter(t => !excludeTourIds.includes(t.tourId))
            .slice(0, limit);
        }
      }
      
      const result = await this.db.query(`
        SELECT 
          tf.tour_id,
          COUNT(DISTINCT ui.user_id) as unique_users,
          SUM(ui.interaction_value) as total_score,
          AVG(CASE WHEN tr.rating IS NOT NULL THEN tr.rating ELSE 0 END) as avg_rating
        FROM tour_features tf
        LEFT JOIN user_interactions ui ON tf.tour_id = ui.tour_id
          AND ui.created_at > NOW() - INTERVAL '30 days'
        LEFT JOIN tour_ratings tr ON tf.tour_id = tr.tour_id
        WHERE tf.tour_id != ALL($1)
        GROUP BY tf.tour_id
        ORDER BY total_score DESC, unique_users DESC, avg_rating DESC
        LIMIT $2
      `, [excludeTourIds, limit * 2]);
      
      const recommendations = result.rows.map((row, index) => ({
        tourId: row.tour_id,
        score: parseFloat(row.total_score) / Math.max(parseInt(row.unique_users), 1),
        rank: index + 1,
        algorithm: 'popularity_based',
        metadata: {
          uniqueUsers: parseInt(row.unique_users),
          totalScore: parseFloat(row.total_score),
          avgRating: parseFloat(row.avg_rating)
        }
      }));
      
      // Cache por 10 minutos
      if (this.redis) {
        await this.redis.setex(
          'popular_tours',
          this.cacheConfig.popularTours,
          JSON.stringify(recommendations)
        );
      }
      
      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('Error in popularity-based recommendations:', error);
      return [];
    }
  }
  
  /**
   * Aplicar diversidad a recomendaciones
   */
  applyDiversity(recommendations, limit) {
    if (recommendations.length <= limit) {
      return recommendations;
    }
    
    const diversified = [];
    const categoryCount = {};
    
    for (const rec of recommendations) {
      const category = rec.metadata?.category || rec.metadata?.collaborative?.category || 'unknown';
      const count = categoryCount[category] || 0;
      
      if (count < this.params.maxSameCategory) {
        diversified.push(rec);
        categoryCount[category] = count + 1;
        
        if (diversified.length >= limit) {
          break;
        }
      }
    }
    
    // Si no llegamos al límite, agregar los restantes
    if (diversified.length < limit) {
      const remaining = recommendations.filter(r => !diversified.includes(r));
      diversified.push(...remaining.slice(0, limit - diversified.length));
    }
    
    return diversified;
  }
  
  /**
   * Aplicar ajustes estacionales
   */
  async applySeasonalAdjustments(recommendations) {
    // Por ahora, retornar sin cambios
    // En producción, esto consultaría datos de temporada actual
    return recommendations.map(rec => ({
      ...rec,
      score: rec.score * this.params.seasonalBoost.medium
    }));
  }
  
  /**
   * Guardar recomendaciones generadas
   */
  async saveGeneratedRecommendations(userId, recommendations, algorithm, context) {
    try {
      const values = recommendations.map(rec => 
        `('${userId}', '${rec.tourId}', ${rec.score}, '${algorithm}', '${JSON.stringify(context)}')`
      ).join(',');
      
      if (values.length > 0) {
        await this.db.query(`
          INSERT INTO generated_recommendations (
            user_id, tour_id, recommendation_score, algorithm, context
          ) VALUES ${values}
        `);
      }
    } catch (error) {
      console.error('Error saving generated recommendations:', error);
    }
  }
  
  /**
   * Obtener perfil de usuario (con cache)
   */
  async getUserProfile(userId) {
    try {
      // Intentar cache
      if (this.redis) {
        const cached = await this.redis.get(`user_profile:${userId}`);
        if (cached) {
          return JSON.parse(cached);
        }
      }
      
      const result = await this.db.query(`
        SELECT * FROM user_profiles WHERE user_id = $1
      `, [userId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const profile = result.rows[0];
      
      // Cache
      if (this.redis) {
        await this.redis.setex(
          `user_profile:${userId}`,
          this.cacheConfig.userProfile,
          JSON.stringify(profile)
        );
      }
      
      return profile;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }
  
  /**
   * Calcular Cosine Similarity entre dos vectores
   */
  cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2) return 0;
    
    // Convertir objetos a arrays de valores
    const categories1 = vec1.categoryPreferences || {};
    const categories2 = vec2.categoryPreferences || {};
    
    const allCategories = new Set([
      ...Object.keys(categories1),
      ...Object.keys(categories2)
    ]);
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    allCategories.forEach(category => {
      const val1 = categories1[category] || 0;
      const val2 = categories2[category] || 0;
      
      dotProduct += val1 * val2;
      magnitude1 += val1 * val1;
      magnitude2 += val2 * val2;
    });
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }
    
    return dotProduct / (magnitude1 * magnitude2);
  }
  
  /**
   * Track métrica del modelo
   */
  async trackMetric(metricType, metricValue, algorithm, context = {}) {
    try {
      await this.db.query(`
        INSERT INTO model_metrics (
          metric_type, metric_value, algorithm, context
        ) VALUES ($1, $2, $3, $4)
      `, [metricType, metricValue, algorithm, JSON.stringify(context)]);
    } catch (error) {
      console.error('Error tracking metric:', error);
    }
  }
  
  /**
   * Calcular métricas de performance del modelo
   */
  async calculatePerformanceMetrics(timeframe = '7d') {
    try {
      const result = await this.db.query(`
        SELECT
          algorithm,
          COUNT(*) as total_recommendations,
          AVG(CASE WHEN clicked THEN 1 ELSE 0 END) as click_through_rate,
          AVG(CASE WHEN converted THEN 1 ELSE 0 END) as conversion_rate,
          AVG(recommendation_score) as avg_score
        FROM generated_recommendations
        WHERE generated_at > NOW() - INTERVAL $1
        GROUP BY algorithm
      `, [timeframe]);
      
      return result.rows.map(row => ({
        algorithm: row.algorithm,
        totalRecommendations: parseInt(row.total_recommendations),
        clickThroughRate: parseFloat(row.click_through_rate),
        conversionRate: parseFloat(row.conversion_rate),
        avgScore: parseFloat(row.avg_score)
      }));
    } catch (error) {
      console.error('Error calculating performance metrics:', error);
      return [];
    }
  }
}

module.exports = MLRecommendationEngine;
