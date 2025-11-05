/**
 * Specialized AI Agents Routes
 * Routes for TravelPreferences, PostTripSupport, HRRecruitment, CustomerFollowup, and EmployeeAnalytics agents
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const logger = require('../../config/logger');
const { getQueueService } = require('../../services/queue/QueueService');

// Agent imports
const TravelPreferencesAgent = require('../../services/agents/TravelPreferencesAgent');
const PostTripSupportAgent = require('../../services/agents/PostTripSupportAgent');
const HRRecruitmentAgent = require('../../services/agents/HRRecruitmentAgent');
const CustomerFollowupAgent = require('../../services/agents/CustomerFollowupAgent');
const EmployeeAnalyticsAgent = require('../../services/agents/EmployeeAnalyticsAgent');

// Model imports
const CustomerPreference = require('../../models/CustomerPreference');
const PostTripSurvey = require('../../models/PostTripSurvey');
const JobApplication = require('../../models/JobApplication');
const CustomerInteraction = require('../../models/CustomerInteraction');
const CustomerChecklist = require('../../models/CustomerChecklist');
const EmployeePerformance = require('../../models/EmployeePerformance');
const EmployeeActivity = require('../../models/EmployeeActivity');
const PerformanceNote = require('../../models/PerformanceNote');
const Booking = require('../../models/Booking');

// Initialize agents
const travelAgent = new TravelPreferencesAgent();
const postTripAgent = new PostTripSupportAgent();
const hrAgent = new HRRecruitmentAgent();
const followupAgent = new CustomerFollowupAgent();
const analyticsAgent = new EmployeeAnalyticsAgent();

/**
 * ============================================
 * TRAVEL PREFERENCES AGENT ROUTES
 * ============================================
 */

// Analyze customer preferences
router.post('/:workspaceId/travel-preferences/analyze/:customerId', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // Fetch customer bookings
    const bookings = await Booking.find({ customerId }).sort({ travelDate: -1 });
    
    const result = await travelAgent.analyzeCustomerPreferences(customerId, bookings);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Save to database
    await CustomerPreference.findOneAndUpdate(
      { customerId },
      {
        ...result,
        lastAnalyzed: new Date()
      },
      { upsert: true, new: true }
    );
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error analyzing travel preferences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get customer preferences
router.get('/:workspaceId/travel-preferences/:customerId', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const preferences = await CustomerPreference.findOne({ customerId });
    
    if (!preferences) {
      return res.status(404).json({
        success: false,
        message: 'No preferences found. Run analysis first.'
      });
    }
    
    res.json({
      success: true,
      data: preferences
    });
  } catch (error) {
    logger.error('Error fetching preferences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Predict preferences for new customer
router.post('/:workspaceId/travel-preferences/predict', authenticateToken, async (req, res) => {
  try {
    const { customerData } = req.body;
    
    const predictions = await travelAgent.predictPreferences(customerData);
    
    res.json({
      success: true,
      predictions
    });
  } catch (error) {
    logger.error('Error predicting preferences:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================
 * POST-TRIP SUPPORT AGENT ROUTES
 * ============================================
 */

// Process completed trip
router.post('/:workspaceId/post-trip/process/:tripId', authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    
    const trip = await Booking.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found'
      });
    }
    
    const result = await postTripAgent.processCompletedTrip(trip);
    
    // Queue survey for later
    const queueService = await getQueueService();
    await queueService.addJob('customer-followup', {
      type: 'send_survey',
      tripId: trip.id,
      customerId: trip.customerId,
      scheduledFor: result.surveySchedule.scheduledFor
    }, {
      delay: result.surveySchedule.scheduledFor - Date.now()
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error processing trip:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Submit survey response
router.post('/:workspaceId/post-trip/survey/:tripId', authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const surveyResponse = req.body;
    
    const analysis = await postTripAgent.processSurveyResponse(surveyResponse);
    
    // Save to database
    const survey = await PostTripSurvey.create({
      tripId,
      ...surveyResponse,
      ...analysis,
      submittedAt: new Date(),
      processedAt: new Date()
    });
    
    res.json({
      success: true,
      data: survey
    });
  } catch (error) {
    logger.error('Error processing survey:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Request review
router.post('/:workspaceId/post-trip/request-review/:tripId', authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params;
    const { platform } = req.body;
    
    const trip = await Booking.findById(tripId);
    if (!trip) {
      return res.status(404).json({
        success: false,
        error: 'Trip not found'
      });
    }
    
    const reviewRequest = await postTripAgent.requestReview(trip, platform);
    
    res.json({
      success: true,
      data: reviewRequest
    });
  } catch (error) {
    logger.error('Error requesting review:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process review
router.post('/:workspaceId/post-trip/process-review', authenticateToken, async (req, res) => {
  try {
    const reviewData = req.body;
    
    const result = await postTripAgent.processReview(reviewData);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error processing review:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get survey statistics
router.get('/:workspaceId/post-trip/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const stats = await PostTripSurvey.aggregate([
      {
        $match: {
          submittedAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        }
      },
      {
        $group: {
          _id: null,
          totalSurveys: { $sum: 1 },
          avgSatisfaction: { $avg: '$answers.overall_satisfaction' },
          avgNPS: { $avg: '$nps.score' },
          promoters: {
            $sum: { $cond: [{ $eq: ['$nps.category', 'promoter'] }, 1, 0] }
          },
          detractors: {
            $sum: { $cond: [{ $eq: ['$nps.category', 'detractor'] }, 1, 0] }
          }
        }
      }
    ]);
    
    res.json({
      success: true,
      stats: stats[0] || {}
    });
  } catch (error) {
    logger.error('Error fetching survey stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================
 * HR RECRUITMENT AGENT ROUTES
 * ============================================
 */

// Submit job application
router.post('/:workspaceId/hr/apply', async (req, res) => {
  try {
    const { position, cvContent, personalInfo, ...otherData } = req.body;
    
    // Parse CV
    const parsed = await hrAgent.parseCVContent(cvContent);
    
    // Create application
    const application = await JobApplication.create({
      position,
      personalInfo,
      ...parsed.parsed,
      cvAnalysis: parsed.analysis,
      positionMatches: parsed.matches,
      applicationDate: new Date(),
      status: 'new'
    });
    
    // Queue for auto-screening
    const queueService = await getQueueService();
    await queueService.addJob('ai-tasks', {
      type: 'screen_candidate',
      applicationId: application._id
    });
    
    res.json({
      success: true,
      applicationId: application._id,
      message: 'Application submitted successfully'
    });
  } catch (error) {
    logger.error('Error submitting application:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Screen candidate
router.post('/:workspaceId/hr/screen/:applicationId', authenticateToken, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { screeningResponses } = req.body;
    
    const application = await JobApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }
    
    const candidateData = {
      ...application.toObject(),
      screeningResponses
    };
    
    const result = await hrAgent.screenCandidate(candidateData, application.position);
    
    // Update application
    application.screening = {
      ...result.responseAnalysis,
      completedAt: new Date()
    };
    application.status = result.decision.status === 'approved' ? 'interview' : result.decision.status;
    await application.save();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error screening candidate:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Rank candidates
router.get('/:workspaceId/hr/rank/:position', authenticateToken, async (req, res) => {
  try {
    const { position } = req.params;
    
    const candidates = await JobApplication.find({ position, status: { $in: ['screening', 'interview'] } });
    
    const ranking = await hrAgent.rankCandidates(candidates, position);
    
    res.json({
      success: true,
      data: ranking
    });
  } catch (error) {
    logger.error('Error ranking candidates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate interview questions
router.post('/:workspaceId/hr/interview-questions/:applicationId', authenticateToken, async (req, res) => {
  try {
    const { applicationId } = req.params;
    
    const application = await JobApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }
    
    const questions = await hrAgent.generateInterviewQuestions(application, application.position);
    
    res.json({
      success: true,
      questions
    });
  } catch (error) {
    logger.error('Error generating questions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get applications
router.get('/:workspaceId/hr/applications', authenticateToken, async (req, res) => {
  try {
    const { position, status, limit = 50 } = req.query;
    
    const query = {};
    if (position) query.position = position;
    if (status) query.status = status;
    
    const applications = await JobApplication.find(query)
      .sort({ applicationDate: -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    logger.error('Error fetching applications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================
 * CUSTOMER FOLLOW-UP AGENT ROUTES
 * ============================================
 */

// Track interaction
router.post('/:workspaceId/followup/track', authenticateToken, async (req, res) => {
  try {
    const interactionData = req.body;
    
    const result = await followupAgent.trackInteraction(interactionData);
    
    // Save to database
    const interaction = await CustomerInteraction.create({
      ...interactionData,
      ...result.analysis,
      engagementPoints: result.engagementUpdate.pointsEarned,
      followUpTasks: result.followUpTasks,
      trackedAt: new Date()
    });
    
    // Queue follow-up tasks
    const queueService = await getQueueService();
    for (const task of result.followUpTasks) {
      await queueService.addJob('customer-followup', task, {
        delay: task.dueDate - Date.now()
      });
    }
    
    res.json({
      success: true,
      data: interaction
    });
  } catch (error) {
    logger.error('Error tracking interaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create checklist
router.post('/:workspaceId/followup/checklist/:customerId', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { templateName, customItems } = req.body;
    
    const checklist = await followupAgent.createChecklist(customerId, templateName, customItems);
    
    // Save to database
    const saved = await CustomerChecklist.create(checklist);
    
    res.json({
      success: true,
      data: saved
    });
  } catch (error) {
    logger.error('Error creating checklist:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update checklist item
router.patch('/:workspaceId/followup/checklist/:checklistId/:itemId', authenticateToken, async (req, res) => {
  try {
    const { checklistId, itemId } = req.params;
    const update = req.body;
    
    const checklist = await CustomerChecklist.findById(checklistId);
    if (!checklist) {
      return res.status(404).json({
        success: false,
        error: 'Checklist not found'
      });
    }
    
    const item = checklist.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }
    
    Object.assign(item, update);
    if (update.completed) {
      item.completedAt = new Date();
      item.completedBy = req.user.id;
    }
    
    await checklist.save();
    
    res.json({
      success: true,
      data: checklist
    });
  } catch (error) {
    logger.error('Error updating checklist item:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get customer engagement score
router.get('/:workspaceId/followup/engagement/:customerId', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    
    const interactions = await CustomerInteraction.find({ customerId });
    
    const customerData = {
      interactions: {},
      lastInteraction: interactions.length > 0 ? interactions[0].trackedAt : null
    };
    
    // Count interactions by type
    interactions.forEach(i => {
      customerData.interactions[i.type] = (customerData.interactions[i.type] || 0) + 1;
    });
    
    const score = followupAgent.calculateEngagementScore(customerData);
    
    res.json({
      success: true,
      data: score
    });
  } catch (error) {
    logger.error('Error calculating engagement:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Schedule follow-up
router.post('/:workspaceId/followup/schedule/:customerId', authenticateToken, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { type, scheduledFor, context } = req.body;
    
    const followUp = await followupAgent.scheduleFollowUp(customerId, type, scheduledFor, context);
    
    // Queue the follow-up
    const queueService = await getQueueService();
    await queueService.addJob('customer-followup', followUp, {
      delay: new Date(scheduledFor) - Date.now()
    });
    
    res.json({
      success: true,
      data: followUp
    });
  } catch (error) {
    logger.error('Error scheduling follow-up:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * ============================================
 * EMPLOYEE ANALYTICS AGENT ROUTES
 * ============================================
 */

// Track employee activity
router.post('/:workspaceId/analytics/track/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const activityData = req.body;
    
    const result = await analyticsAgent.trackActivity(employeeId, activityData);
    
    // Save to database
    const activity = await EmployeeActivity.create({
      ...result.activity,
      trackedAt: new Date()
    });
    
    res.json({
      success: true,
      data: activity,
      alerts: result.alerts
    });
  } catch (error) {
    logger.error('Error tracking activity:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Calculate performance metrics
router.post('/:workspaceId/analytics/calculate/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.body;
    
    const metrics = await analyticsAgent.calculatePerformanceMetrics(
      employeeId,
      new Date(startDate),
      new Date(endDate)
    );
    
    // Save to database
    const performance = await EmployeePerformance.create(metrics);
    
    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    logger.error('Error calculating metrics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get employee dashboard
router.get('/:workspaceId/analytics/dashboard/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    const dashboard = await analyticsAgent.getEmployeeDashboard(employeeId);
    
    res.json({
      success: true,
      data: dashboard
    });
  } catch (error) {
    logger.error('Error fetching dashboard:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Analyze interaction quality
router.post('/:workspaceId/analytics/interaction-quality/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const interactionData = req.body;
    
    const analysis = await analyticsAgent.analyzeInteractionQuality(employeeId, interactionData);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Error analyzing interaction:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Analyze communication style
router.post('/:workspaceId/analytics/communication-style/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { interactions } = req.body;
    
    const analysis = await analyticsAgent.analyzeCommunicationStyle(employeeId, interactions);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    logger.error('Error analyzing communication:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate call report
router.get('/:workspaceId/analytics/call-report/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;
    
    const report = await analyticsAgent.generateCallReport(
      employeeId,
      new Date(startDate),
      new Date(endDate)
    );
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error('Error generating call report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Track sales performance
router.get('/:workspaceId/analytics/sales/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;
    
    const performance = await analyticsAgent.trackSalesPerformance(
      employeeId,
      new Date(startDate),
      new Date(endDate)
    );
    
    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    logger.error('Error tracking sales:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Monitor system usage
router.get('/:workspaceId/analytics/system-usage/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;
    
    const usage = await analyticsAgent.monitorSystemUsage(
      employeeId,
      new Date(startDate),
      new Date(endDate)
    );
    
    res.json({
      success: true,
      data: usage
    });
  } catch (error) {
    logger.error('Error monitoring usage:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create performance note
router.post('/:workspaceId/analytics/note/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const noteData = {
      ...req.body,
      createdBy: req.user.id
    };
    
    const note = await analyticsAgent.createPerformanceNote(employeeId, noteData);
    
    // Save to database
    const saved = await PerformanceNote.create(note);
    
    res.json({
      success: true,
      data: saved
    });
  } catch (error) {
    logger.error('Error creating note:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get performance history
router.get('/:workspaceId/analytics/history/:employeeId', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { limit = 12 } = req.query;
    
    const history = await EmployeePerformance.find({ employeeId })
      .sort({ 'period.startDate': -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check work hour compliance
router.get('/:workspaceId/analytics/compliance/:employeeId/:date', authenticateToken, async (req, res) => {
  try {
    const { employeeId, date } = req.params;
    
    const compliance = await analyticsAgent.checkWorkHourCompliance(employeeId, date);
    
    res.json({
      success: true,
      data: compliance
    });
  } catch (error) {
    logger.error('Error checking compliance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
