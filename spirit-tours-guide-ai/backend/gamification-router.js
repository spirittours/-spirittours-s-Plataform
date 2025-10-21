/**
 * Gamification API Router
 * 
 * Endpoints for gamification features:
 * - Player profiles and progress
 * - Points awarding and transactions
 * - Badge unlocking and management
 * - Leaderboards (global, monthly, weekly)
 * - Achievement tracking
 * - Streak management
 * - Social sharing
 */

const express = require('express');
const router = express.Router();

/**
 * Initialize router with gamification system
 */
function initGamificationRouter(gamificationSystem) {
  
  // ============================================
  // PLAYER PROFILE ENDPOINTS
  // ============================================
  
  /**
   * Get player profile with all achievements
   * GET /api/gamification/profile/:userId
   */
  router.get('/profile/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const profile = await gamificationSystem.getPlayerProfile(userId);
      
      res.json({ success: true, profile });
      
    } catch (error) {
      console.error('Error getting player profile:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // POINTS ENDPOINTS
  // ============================================
  
  /**
   * Award points to a user
   * POST /api/gamification/points/award
   */
  router.post('/points/award', async (req, res) => {
    try {
      const { userId, actionType, referenceId, referenceType } = req.body;
      
      if (!userId || !actionType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, actionType',
        });
      }
      
      const result = await gamificationSystem.awardPoints(
        userId,
        actionType,
        referenceId,
        referenceType
      );
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error awarding points:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Get points transaction history
   * GET /api/gamification/points/history/:userId
   */
  router.get('/points/history/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { limit = 50 } = req.query;
      
      // This would query the transactions table
      // For now, return empty array
      res.json({ success: true, transactions: [] });
      
    } catch (error) {
      console.error('Error getting points history:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // ACHIEVEMENT ENDPOINTS
  // ============================================
  
  /**
   * Increment achievement counter
   * POST /api/gamification/achievements/increment
   */
  router.post('/achievements/increment', async (req, res) => {
    try {
      const { userId, counterType } = req.body;
      
      if (!userId || !counterType) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, counterType',
        });
      }
      
      await gamificationSystem.incrementCounter(userId, counterType);
      
      res.json({ success: true, message: `${counterType} incremented` });
      
    } catch (error) {
      console.error('Error incrementing counter:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Update streak for user
   * POST /api/gamification/achievements/streak
   */
  router.post('/achievements/streak', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: userId',
        });
      }
      
      const newStreak = await gamificationSystem.updateStreak(userId);
      
      res.json({
        success: true,
        streak: newStreak,
      });
      
    } catch (error) {
      console.error('Error updating streak:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // BADGE ENDPOINTS
  // ============================================
  
  /**
   * Get user's badges
   * GET /api/gamification/badges/:userId
   */
  router.get('/badges/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const badges = await gamificationSystem.getUserBadges(userId);
      
      res.json({ success: true, badges });
      
    } catch (error) {
      console.error('Error getting badges:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Check and unlock badges
   * POST /api/gamification/badges/check
   */
  router.post('/badges/check', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: userId',
        });
      }
      
      const unlockedBadges = await gamificationSystem.checkBadgeUnlocks(userId);
      
      res.json({
        success: true,
        unlockedBadges,
        count: unlockedBadges.length,
      });
      
    } catch (error) {
      console.error('Error checking badges:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // LEADERBOARD ENDPOINTS
  // ============================================
  
  /**
   * Get leaderboard
   * GET /api/gamification/leaderboard/:type
   */
  router.get('/leaderboard/:type', async (req, res) => {
    try {
      const { type } = req.params;
      const { limit = 100 } = req.query;
      
      if (!['global', 'monthly', 'weekly'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid leaderboard type. Use: global, monthly, or weekly',
        });
      }
      
      const leaderboard = await gamificationSystem.getLeaderboard(type, parseInt(limit));
      
      res.json({ success: true, leaderboard });
      
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Get user's rank
   * GET /api/gamification/rank/:userId
   */
  router.get('/rank/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { type = 'global' } = req.query;
      
      const rank = await gamificationSystem.getUserRank(userId, type);
      
      res.json({
        success: true,
        userId,
        rank,
        leaderboardType: type,
      });
      
    } catch (error) {
      console.error('Error getting user rank:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // SOCIAL SHARING ENDPOINTS
  // ============================================
  
  /**
   * Record social share
   * POST /api/gamification/share
   */
  router.post('/share', async (req, res) => {
    try {
      const { userId, badgeId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: userId',
        });
      }
      
      // Increment social shares counter
      await gamificationSystem.incrementCounter(userId, 'social_shares');
      
      // Award points for sharing
      const result = await gamificationSystem.awardPoints(
        userId,
        'SOCIAL_SHARE',
        badgeId,
        'badge_share'
      );
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error recording share:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // HELPER ENDPOINTS FOR TOUR ACTIONS
  // ============================================
  
  /**
   * Complete tour action (awards points and updates counters)
   * POST /api/gamification/actions/tour-completed
   */
  router.post('/actions/tour-completed', async (req, res) => {
    try {
      const { userId, tourId } = req.body;
      
      if (!userId || !tourId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, tourId',
        });
      }
      
      // Award points
      const pointsResult = await gamificationSystem.awardPoints(
        userId,
        'TOUR_COMPLETED',
        tourId,
        'tour'
      );
      
      // Increment counter
      await gamificationSystem.incrementCounter(userId, 'tours_completed');
      
      // Update streak
      const newStreak = await gamificationSystem.updateStreak(userId);
      
      res.json({
        success: true,
        ...pointsResult,
        streak: newStreak,
      });
      
    } catch (error) {
      console.error('Error processing tour completion:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Rate tour action
   * POST /api/gamification/actions/tour-rated
   */
  router.post('/actions/tour-rated', async (req, res) => {
    try {
      const { userId, tourId, rating } = req.body;
      
      if (!userId || !tourId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, tourId',
        });
      }
      
      // Award points
      let actionType = 'TOUR_RATED';
      if (rating === 5) {
        actionType = 'PERFECT_RATING_GIVEN';
        await gamificationSystem.incrementCounter(userId, 'perfect_ratings_given');
      }
      
      const result = await gamificationSystem.awardPoints(
        userId,
        actionType,
        tourId,
        'rating'
      );
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error processing rating:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Write review action
   * POST /api/gamification/actions/review-written
   */
  router.post('/actions/review-written', async (req, res) => {
    try {
      const { userId, reviewId, tourId } = req.body;
      
      if (!userId || !reviewId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, reviewId',
        });
      }
      
      // Award points
      const result = await gamificationSystem.awardPoints(
        userId,
        'REVIEW_WRITTEN',
        reviewId,
        'review'
      );
      
      // Increment counter
      await gamificationSystem.incrementCounter(userId, 'reviews_written');
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error processing review:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Referral action
   * POST /api/gamification/actions/referral
   */
  router.post('/actions/referral', async (req, res) => {
    try {
      const { userId, referredUserId } = req.body;
      
      if (!userId || !referredUserId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, referredUserId',
        });
      }
      
      // Award points
      const result = await gamificationSystem.awardPoints(
        userId,
        'FRIEND_REFERRAL',
        referredUserId,
        'referral'
      );
      
      // Increment counter
      await gamificationSystem.incrementCounter(userId, 'referrals_made');
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error processing referral:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // STATISTICS ENDPOINT
  // ============================================
  
  /**
   * Get gamification statistics
   * GET /api/gamification/stats
   */
  router.get('/stats', (req, res) => {
    try {
      const stats = gamificationSystem.getStatistics();
      res.json({ success: true, stats });
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  return router;
}

module.exports = initGamificationRouter;
