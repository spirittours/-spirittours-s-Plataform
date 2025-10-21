/**
 * Gamification & Badges System
 * 
 * Features:
 * - Points system for passengers and guides
 * - Achievement badges with multiple tiers
 * - Leaderboards (global, regional, monthly)
 * - Streak tracking (consecutive tours/days)
 * - Social sharing of achievements
 * - Reward redemption system
 * - Challenge system (daily, weekly, special)
 * - Level progression with unlockable perks
 * - Milestone celebrations
 * - Team competitions
 * 
 * Point Actions:
 * - Complete tour: 100 points
 * - Rate tour: 20 points
 * - Share on social media: 30 points
 * - Refer a friend: 500 points
 * - Perfect attendance streak: Bonus points
 * - Early booking: 50 points
 * - Photo upload: 10 points
 * - Review written: 40 points
 * 
 * Badge Categories:
 * - Explorer (tour completion)
 * - Social Butterfly (social sharing)
 * - Loyal Traveler (repeat bookings)
 * - Early Bird (early bookings)
 * - Perfect Reviewer (quality reviews)
 * - Ambassador (referrals)
 * - Streak Master (consecutive tours)
 * - Cultural Enthusiast (multiple perspectives)
 * 
 * Architecture:
 * - Event-driven point allocation
 * - Real-time leaderboard updates
 * - Achievement unlock notifications
 * - Redis for fast leaderboard queries
 * - PostgreSQL for persistent data
 * - WebSocket for live updates
 */

const EventEmitter = require('events');
const { Pool } = require('pg');
const Redis = require('redis');

class GamificationSystem extends EventEmitter {
  constructor() {
    super();
    
    // Database connections
    this.pgPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'spirit_tours',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20,
    });
    
    this.redisClient = Redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      db: 4, // Use DB 4 for gamification
    });
    
    this.redisClient.on('error', (err) => console.error('Redis Client Error:', err));
    this.redisClient.connect();
    
    // Point values for different actions
    this.pointValues = {
      TOUR_COMPLETED: 100,
      TOUR_RATED: 20,
      SOCIAL_SHARE: 30,
      FRIEND_REFERRAL: 500,
      EARLY_BOOKING: 50,
      PHOTO_UPLOADED: 10,
      REVIEW_WRITTEN: 40,
      PERSPECTIVE_EXPLORED: 15,
      WAYPOINT_CHECKED_IN: 5,
      PERFECT_RATING_GIVEN: 50,
      STREAK_BONUS_DAILY: 10,
      STREAK_BONUS_WEEKLY: 50,
      STREAK_BONUS_MONTHLY: 200,
    };
    
    // Badge definitions with tiers
    this.badges = {
      // Explorer badges (tours completed)
      EXPLORER_NOVICE: {
        id: 'explorer_novice',
        name: 'Curious Explorer',
        description: 'Complete your first tour',
        icon: '🗺️',
        tier: 'bronze',
        requirement: { type: 'tours_completed', value: 1 },
        points: 50,
      },
      EXPLORER_EXPERIENCED: {
        id: 'explorer_experienced',
        name: 'Experienced Traveler',
        description: 'Complete 5 tours',
        icon: '🎒',
        tier: 'silver',
        requirement: { type: 'tours_completed', value: 5 },
        points: 200,
      },
      EXPLORER_VETERAN: {
        id: 'explorer_veteran',
        name: 'Veteran Explorer',
        description: 'Complete 20 tours',
        icon: '🏆',
        tier: 'gold',
        requirement: { type: 'tours_completed', value: 20 },
        points: 500,
      },
      EXPLORER_MASTER: {
        id: 'explorer_master',
        name: 'Master Explorer',
        description: 'Complete 50 tours',
        icon: '👑',
        tier: 'platinum',
        requirement: { type: 'tours_completed', value: 50 },
        points: 1000,
      },
      
      // Social badges
      SOCIAL_STARTER: {
        id: 'social_starter',
        name: 'Social Starter',
        description: 'Share your first tour on social media',
        icon: '📱',
        tier: 'bronze',
        requirement: { type: 'social_shares', value: 1 },
        points: 30,
      },
      SOCIAL_INFLUENCER: {
        id: 'social_influencer',
        name: 'Travel Influencer',
        description: 'Share 10 tours on social media',
        icon: '📸',
        tier: 'gold',
        requirement: { type: 'social_shares', value: 10 },
        points: 300,
      },
      
      // Loyalty badges
      LOYAL_BRONZE: {
        id: 'loyal_bronze',
        name: 'Regular Visitor',
        description: 'Book 3 tours in a month',
        icon: '🎫',
        tier: 'bronze',
        requirement: { type: 'tours_per_month', value: 3 },
        points: 150,
      },
      LOYAL_SILVER: {
        id: 'loyal_silver',
        name: 'Devoted Traveler',
        description: 'Book 6 tours in a month',
        icon: '🎟️',
        tier: 'silver',
        requirement: { type: 'tours_per_month', value: 6 },
        points: 400,
      },
      LOYAL_GOLD: {
        id: 'loyal_gold',
        name: 'VIP Explorer',
        description: 'Book 12 tours in a month',
        icon: '💎',
        tier: 'gold',
        requirement: { type: 'tours_per_month', value: 12 },
        points: 1000,
      },
      
      // Reviewer badges
      REVIEWER_STARTER: {
        id: 'reviewer_starter',
        name: 'Feedback Beginner',
        description: 'Write your first review',
        icon: '✍️',
        tier: 'bronze',
        requirement: { type: 'reviews_written', value: 1 },
        points: 40,
      },
      REVIEWER_EXPERT: {
        id: 'reviewer_expert',
        name: 'Review Expert',
        description: 'Write 10 detailed reviews',
        icon: '📝',
        tier: 'silver',
        requirement: { type: 'reviews_written', value: 10 },
        points: 400,
      },
      REVIEWER_CRITIC: {
        id: 'reviewer_critic',
        name: 'Top Critic',
        description: 'Write 50 helpful reviews',
        icon: '🌟',
        tier: 'gold',
        requirement: { type: 'reviews_written', value: 50 },
        points: 2000,
      },
      
      // Streak badges
      STREAK_WEEK: {
        id: 'streak_week',
        name: 'Week Warrior',
        description: 'Complete tours 7 days in a row',
        icon: '🔥',
        tier: 'silver',
        requirement: { type: 'daily_streak', value: 7 },
        points: 350,
      },
      STREAK_MONTH: {
        id: 'streak_month',
        name: 'Month Champion',
        description: 'Complete tours 30 days in a row',
        icon: '⚡',
        tier: 'gold',
        requirement: { type: 'daily_streak', value: 30 },
        points: 1500,
      },
      
      // Ambassador badges
      AMBASSADOR_BRONZE: {
        id: 'ambassador_bronze',
        name: 'Friend Referrer',
        description: 'Refer 3 friends',
        icon: '👥',
        tier: 'bronze',
        requirement: { type: 'referrals', value: 3 },
        points: 1500,
      },
      AMBASSADOR_SILVER: {
        id: 'ambassador_silver',
        name: 'Community Builder',
        description: 'Refer 10 friends',
        icon: '🌐',
        tier: 'silver',
        requirement: { type: 'referrals', value: 10 },
        points: 5000,
      },
      AMBASSADOR_GOLD: {
        id: 'ambassador_gold',
        name: 'Brand Ambassador',
        description: 'Refer 25 friends',
        icon: '👑',
        tier: 'gold',
        requirement: { type: 'referrals', value: 25 },
        points: 12500,
      },
      
      // Cultural badges
      CULTURAL_CURIOUS: {
        id: 'cultural_curious',
        name: 'Culture Curious',
        description: 'Explore all perspective types at one location',
        icon: '🌍',
        tier: 'silver',
        requirement: { type: 'all_perspectives', value: 1 },
        points: 250,
      },
      CULTURAL_SCHOLAR: {
        id: 'cultural_scholar',
        name: 'Cultural Scholar',
        description: 'Explore all perspectives at 10 locations',
        icon: '🎓',
        tier: 'gold',
        requirement: { type: 'all_perspectives', value: 10 },
        points: 2500,
      },
      
      // Early bird badges
      EARLY_BIRD: {
        id: 'early_bird',
        name: 'Early Planner',
        description: 'Book 5 tours more than 7 days in advance',
        icon: '🕐',
        tier: 'bronze',
        requirement: { type: 'early_bookings', value: 5 },
        points: 250,
      },
      
      // Perfect rating badges
      PERFECT_REVIEWER: {
        id: 'perfect_reviewer',
        name: 'Five Star Specialist',
        description: 'Give perfect ratings to 10 tours',
        icon: '⭐',
        tier: 'silver',
        requirement: { type: 'perfect_ratings', value: 10 },
        points: 500,
      },
    };
    
    // Level system
    this.levels = [
      { level: 1, name: 'Novice Traveler', minPoints: 0, maxPoints: 499, perks: [] },
      { level: 2, name: 'Explorer', minPoints: 500, maxPoints: 999, perks: ['5% discount'] },
      { level: 3, name: 'Adventurer', minPoints: 1000, maxPoints: 2499, perks: ['10% discount', 'Priority booking'] },
      { level: 4, name: 'Veteran', minPoints: 2500, maxPoints: 4999, perks: ['15% discount', 'Priority booking', 'Free tour upgrade'] },
      { level: 5, name: 'Master', minPoints: 5000, maxPoints: 9999, perks: ['20% discount', 'Priority booking', 'Free tour upgrade', 'VIP lounge access'] },
      { level: 6, name: 'Legend', minPoints: 10000, maxPoints: Infinity, perks: ['25% discount', 'All perks', 'Exclusive tours', 'Personal concierge'] },
    ];
    
    // Statistics
    this.stats = {
      totalPointsAwarded: 0,
      totalBadgesEarned: 0,
      activePlayers: 0,
      challengesCompleted: 0,
    };
    
    // Initialize database
    this.initDatabase();
    
    console.log('✅ Gamification System initialized');
  }
  
  /**
   * Initialize database schema
   */
  async initDatabase() {
    try {
      // Player profiles table
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS gamification_players (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) UNIQUE NOT NULL,
          user_type VARCHAR(50) NOT NULL, -- passenger, guide
          
          -- Points and level
          total_points INTEGER DEFAULT 0,
          current_level INTEGER DEFAULT 1,
          points_to_next_level INTEGER,
          
          -- Streaks
          current_streak INTEGER DEFAULT 0,
          longest_streak INTEGER DEFAULT 0,
          last_activity_date DATE,
          
          -- Counters
          tours_completed INTEGER DEFAULT 0,
          social_shares INTEGER DEFAULT 0,
          reviews_written INTEGER DEFAULT 0,
          referrals_made INTEGER DEFAULT 0,
          early_bookings INTEGER DEFAULT 0,
          perfect_ratings_given INTEGER DEFAULT 0,
          perspectives_explored INTEGER DEFAULT 0,
          
          -- Metadata
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_user_id (user_id),
          INDEX idx_total_points (total_points DESC),
          INDEX idx_user_type (user_type)
        )
      `);
      
      // Badges earned table
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS gamification_badges (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) NOT NULL,
          badge_id VARCHAR(100) NOT NULL,
          
          badge_name VARCHAR(255),
          badge_tier VARCHAR(50),
          badge_icon VARCHAR(10),
          points_awarded INTEGER,
          
          earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          shared_on_social BOOLEAN DEFAULT FALSE,
          
          UNIQUE (user_id, badge_id),
          INDEX idx_user_badges (user_id),
          INDEX idx_badge_id (badge_id),
          INDEX idx_earned_at (earned_at DESC)
        )
      `);
      
      // Points transactions table
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS gamification_transactions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) NOT NULL,
          
          action_type VARCHAR(100) NOT NULL,
          points_change INTEGER NOT NULL,
          
          description TEXT,
          reference_id VARCHAR(255), -- tour_id, review_id, etc.
          reference_type VARCHAR(50), -- tour, review, referral, etc.
          
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          
          INDEX idx_user_transactions (user_id),
          INDEX idx_action_type (action_type),
          INDEX idx_created_at (created_at DESC)
        )
      `);
      
      // Challenges table
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS gamification_challenges (
          id SERIAL PRIMARY KEY,
          challenge_id VARCHAR(100) UNIQUE NOT NULL,
          
          title VARCHAR(255) NOT NULL,
          description TEXT,
          challenge_type VARCHAR(50) NOT NULL, -- daily, weekly, monthly, special
          
          requirement_type VARCHAR(100),
          requirement_value INTEGER,
          
          reward_points INTEGER,
          reward_badge_id VARCHAR(100),
          
          start_date TIMESTAMP,
          end_date TIMESTAMP,
          
          active BOOLEAN DEFAULT TRUE,
          
          INDEX idx_challenge_type (challenge_type),
          INDEX idx_active (active),
          INDEX idx_dates (start_date, end_date)
        )
      `);
      
      // Challenge completions table
      await this.pgPool.query(`
        CREATE TABLE IF NOT EXISTS gamification_challenge_completions (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100) NOT NULL,
          challenge_id VARCHAR(100) NOT NULL,
          
          progress INTEGER DEFAULT 0,
          completed BOOLEAN DEFAULT FALSE,
          completed_at TIMESTAMP,
          
          UNIQUE (user_id, challenge_id),
          INDEX idx_user_challenges (user_id),
          INDEX idx_completed (completed)
        )
      `);
      
      console.log('✅ Gamification database schema initialized');
    } catch (error) {
      console.error('❌ Error initializing gamification database:', error);
    }
  }
  
  /**
   * Award points to a user for an action
   */
  async awardPoints(userId, actionType, referenceId = null, referenceType = null) {
    try {
      const points = this.pointValues[actionType] || 0;
      
      if (points === 0) {
        throw new Error(`Invalid action type: ${actionType}`);
      }
      
      // Get or create player profile
      const player = await this.getOrCreatePlayer(userId);
      
      // Add points
      const newTotalPoints = player.total_points + points;
      
      // Check for level up
      const newLevel = this.calculateLevel(newTotalPoints);
      const leveledUp = newLevel > player.current_level;
      
      // Update player
      await this.pgPool.query(
        `UPDATE gamification_players
         SET total_points = $1,
             current_level = $2,
             points_to_next_level = $3,
             updated_at = NOW()
         WHERE user_id = $4`,
        [
          newTotalPoints,
          newLevel,
          this.getPointsToNextLevel(newTotalPoints),
          userId
        ]
      );
      
      // Record transaction
      await this.pgPool.query(
        `INSERT INTO gamification_transactions
         (user_id, action_type, points_change, description, reference_id, reference_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          actionType,
          points,
          `Earned ${points} points for ${actionType}`,
          referenceId,
          referenceType
        ]
      );
      
      // Update Redis leaderboard
      await this.updateLeaderboard(userId, newTotalPoints);
      
      // Update statistics
      this.stats.totalPointsAwarded += points;
      
      // Check for badge unlocks
      const unlockedBadges = await this.checkBadgeUnlocks(userId);
      
      // Emit events
      this.emit('points:awarded', {
        userId,
        actionType,
        points,
        newTotal: newTotalPoints,
        leveledUp,
        newLevel: leveledUp ? newLevel : null,
      });
      
      if (leveledUp) {
        this.emit('level:up', {
          userId,
          oldLevel: player.current_level,
          newLevel,
          perks: this.levels.find(l => l.level === newLevel).perks,
        });
      }
      
      return {
        success: true,
        points,
        newTotal: newTotalPoints,
        leveledUp,
        newLevel: leveledUp ? newLevel : null,
        unlockedBadges,
      };
      
    } catch (error) {
      console.error('❌ Error awarding points:', error);
      throw error;
    }
  }
  
  /**
   * Get or create player profile
   */
  async getOrCreatePlayer(userId, userType = 'passenger') {
    let result = await this.pgPool.query(
      'SELECT * FROM gamification_players WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Create new player
      result = await this.pgPool.query(
        `INSERT INTO gamification_players (user_id, user_type, points_to_next_level)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, userType, this.levels[1].minPoints]
      );
      
      this.stats.activePlayers++;
    }
    
    return result.rows[0];
  }
  
  /**
   * Calculate level from total points
   */
  calculateLevel(totalPoints) {
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (totalPoints >= this.levels[i].minPoints) {
        return this.levels[i].level;
      }
    }
    return 1;
  }
  
  /**
   * Get points needed to reach next level
   */
  getPointsToNextLevel(currentPoints) {
    const currentLevel = this.calculateLevel(currentPoints);
    const nextLevel = this.levels.find(l => l.level === currentLevel + 1);
    
    if (!nextLevel) return 0; // Max level reached
    
    return nextLevel.minPoints - currentPoints;
  }
  
  /**
   * Check and unlock badges based on player achievements
   */
  async checkBadgeUnlocks(userId) {
    try {
      const player = await this.getOrCreatePlayer(userId);
      const unlockedBadges = [];
      
      // Get already earned badges
      const earnedResult = await this.pgPool.query(
        'SELECT badge_id FROM gamification_badges WHERE user_id = $1',
        [userId]
      );
      const earnedBadgeIds = new Set(earnedResult.rows.map(r => r.badge_id));
      
      // Check each badge requirement
      for (const [key, badge] of Object.entries(this.badges)) {
        if (earnedBadgeIds.has(badge.id)) continue; // Already earned
        
        let earned = false;
        
        switch (badge.requirement.type) {
          case 'tours_completed':
            earned = player.tours_completed >= badge.requirement.value;
            break;
          case 'social_shares':
            earned = player.social_shares >= badge.requirement.value;
            break;
          case 'reviews_written':
            earned = player.reviews_written >= badge.requirement.value;
            break;
          case 'referrals':
            earned = player.referrals_made >= badge.requirement.value;
            break;
          case 'daily_streak':
            earned = player.current_streak >= badge.requirement.value;
            break;
          case 'early_bookings':
            earned = player.early_bookings >= badge.requirement.value;
            break;
          case 'perfect_ratings':
            earned = player.perfect_ratings_given >= badge.requirement.value;
            break;
          case 'all_perspectives':
            // Complex check - would need additional query
            earned = false;
            break;
          case 'tours_per_month':
            // Complex check - would need additional query
            earned = false;
            break;
        }
        
        if (earned) {
          await this.awardBadge(userId, badge);
          unlockedBadges.push(badge);
        }
      }
      
      return unlockedBadges;
      
    } catch (error) {
      console.error('❌ Error checking badge unlocks:', error);
      return [];
    }
  }
  
  /**
   * Award a badge to a user
   */
  async awardBadge(userId, badge) {
    try {
      await this.pgPool.query(
        `INSERT INTO gamification_badges
         (user_id, badge_id, badge_name, badge_tier, badge_icon, points_awarded)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, badge_id) DO NOTHING`,
        [userId, badge.id, badge.name, badge.tier, badge.icon, badge.points]
      );
      
      // Award bonus points for badge
      if (badge.points > 0) {
        await this.awardPoints(userId, 'BADGE_EARNED', badge.id, 'badge');
      }
      
      this.stats.totalBadgesEarned++;
      
      // Emit event
      this.emit('badge:unlocked', {
        userId,
        badge,
      });
      
    } catch (error) {
      console.error('❌ Error awarding badge:', error);
    }
  }
  
  /**
   * Update leaderboard in Redis
   */
  async updateLeaderboard(userId, totalPoints) {
    const leaderboardKeys = [
      'leaderboard:global',
      `leaderboard:month:${new Date().toISOString().slice(0, 7)}`, // YYYY-MM
      `leaderboard:week:${this.getWeekNumber()}`,
    ];
    
    for (const key of leaderboardKeys) {
      await this.redisClient.zAdd(key, {
        score: totalPoints,
        value: userId,
      });
      
      // Set expiry for time-based leaderboards
      if (key.includes('month') || key.includes('week')) {
        await this.redisClient.expire(key, 60 * 60 * 24 * 90); // 90 days
      }
    }
  }
  
  /**
   * Get leaderboard
   */
  async getLeaderboard(type = 'global', limit = 100) {
    let key = 'leaderboard:global';
    
    if (type === 'monthly') {
      key = `leaderboard:month:${new Date().toISOString().slice(0, 7)}`;
    } else if (type === 'weekly') {
      key = `leaderboard:week:${this.getWeekNumber()}`;
    }
    
    // Get top players from Redis
    const results = await this.redisClient.zRangeWithScores(key, 0, limit - 1, { REV: true });
    
    // Enrich with player data
    const leaderboard = [];
    for (const result of results) {
      const player = await this.getOrCreatePlayer(result.value);
      leaderboard.push({
        rank: leaderboard.length + 1,
        userId: result.value,
        points: result.score,
        level: player.current_level,
        badges: await this.getUserBadges(result.value),
      });
    }
    
    return leaderboard;
  }
  
  /**
   * Get user's badges
   */
  async getUserBadges(userId) {
    const result = await this.pgPool.query(
      `SELECT badge_id, badge_name, badge_tier, badge_icon, earned_at
       FROM gamification_badges
       WHERE user_id = $1
       ORDER BY earned_at DESC`,
      [userId]
    );
    
    return result.rows;
  }
  
  /**
   * Get user's rank
   */
  async getUserRank(userId, type = 'global') {
    let key = 'leaderboard:global';
    
    if (type === 'monthly') {
      key = `leaderboard:month:${new Date().toISOString().slice(0, 7)}`;
    } else if (type === 'weekly') {
      key = `leaderboard:week:${this.getWeekNumber()}`;
    }
    
    const rank = await this.redisClient.zRevRank(key, userId);
    return rank !== null ? rank + 1 : null;
  }
  
  /**
   * Get player profile with achievements
   */
  async getPlayerProfile(userId) {
    const player = await this.getOrCreatePlayer(userId);
    const badges = await this.getUserBadges(userId);
    const rank = await this.getUserRank(userId);
    const currentLevel = this.levels.find(l => l.level === player.current_level);
    
    return {
      userId: player.user_id,
      totalPoints: player.total_points,
      level: {
        current: player.current_level,
        name: currentLevel.name,
        perks: currentLevel.perks,
        pointsToNext: player.points_to_next_level,
      },
      streaks: {
        current: player.current_streak,
        longest: player.longest_streak,
        lastActivity: player.last_activity_date,
      },
      achievements: {
        toursCompleted: player.tours_completed,
        socialShares: player.social_shares,
        reviewsWritten: player.reviews_written,
        referralsMade: player.referrals_made,
      },
      badges,
      rank,
    };
  }
  
  /**
   * Increment achievement counter
   */
  async incrementCounter(userId, counterType) {
    const validCounters = [
      'tours_completed',
      'social_shares',
      'reviews_written',
      'referrals_made',
      'early_bookings',
      'perfect_ratings_given',
      'perspectives_explored'
    ];
    
    if (!validCounters.includes(counterType)) {
      throw new Error(`Invalid counter type: ${counterType}`);
    }
    
    await this.pgPool.query(
      `UPDATE gamification_players
       SET ${counterType} = ${counterType} + 1,
           updated_at = NOW()
       WHERE user_id = $1`,
      [userId]
    );
    
    // Check for badge unlocks
    await this.checkBadgeUnlocks(userId);
  }
  
  /**
   * Update streak
   */
  async updateStreak(userId) {
    const player = await this.getOrCreatePlayer(userId);
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = player.last_activity_date ? 
      new Date(player.last_activity_date).toISOString().split('T')[0] : null;
    
    let newStreak = 1;
    
    if (lastActivity) {
      const daysDiff = Math.floor(
        (new Date(today) - new Date(lastActivity)) / (1000 * 60 * 60 * 24)
      );
      
      if (daysDiff === 0) {
        // Same day, no change
        return player.current_streak;
      } else if (daysDiff === 1) {
        // Consecutive day
        newStreak = player.current_streak + 1;
      } else {
        // Streak broken
        newStreak = 1;
      }
    }
    
    const longestStreak = Math.max(newStreak, player.longest_streak);
    
    await this.pgPool.query(
      `UPDATE gamification_players
       SET current_streak = $1,
           longest_streak = $2,
           last_activity_date = $3,
           updated_at = NOW()
       WHERE user_id = $4`,
      [newStreak, longestStreak, today, userId]
    );
    
    // Award streak bonuses
    if (newStreak === 7) {
      await this.awardPoints(userId, 'STREAK_BONUS_WEEKLY');
    } else if (newStreak === 30) {
      await this.awardPoints(userId, 'STREAK_BONUS_MONTHLY');
    } else if (newStreak > 0) {
      await this.awardPoints(userId, 'STREAK_BONUS_DAILY');
    }
    
    return newStreak;
  }
  
  /**
   * Get week number
   */
  getWeekNumber() {
    const date = new Date();
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }
  
  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      totalBadges: Object.keys(this.badges).length,
      totalLevels: this.levels.length,
    };
  }
  
  /**
   * Close connections
   */
  async close() {
    await this.pgPool.end();
    await this.redisClient.quit();
    console.log('✅ Gamification System closed');
  }
}

module.exports = GamificationSystem;
