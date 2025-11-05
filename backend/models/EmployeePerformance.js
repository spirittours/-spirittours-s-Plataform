/**
 * Employee Performance Model
 * Stores comprehensive performance data from EmployeeAnalyticsAgent
 */

const mongoose = require('mongoose');

const employeePerformanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  period: {
    startDate: {
      type: Date,
      required: true,
      index: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },

  timeMetrics: {
    totalDays: Number,
    daysWorked: Number,
    totalHours: Number,
    activeHours: Number,
    idleHours: Number,
    breakHours: Number,
    averageDailyHours: Number,
    punctualityScore: Number,
    adherenceToSchedule: Number,
    overtimeHours: Number,
    meetsMinimumHours: Boolean,
    score: Number
  },

  productivityMetrics: {
    tasksCompleted: Number,
    tasksAssigned: Number,
    taskCompletionRate: Number,
    callsMade: Number,
    callsReceived: Number,
    averageCallDuration: Number,
    emailsSent: Number,
    emailsResponded: Number,
    chatsHandled: Number,
    salesCompleted: Number,
    salesVolume: Number,
    conversionRate: Number,
    quotesGenerated: Number,
    bookingsProcessed: Number,
    revenueGenerated: Number,
    averageResponseTime: Number,
    firstResponseTime: Number,
    score: Number
  },

  qualityMetrics: {
    customerSatisfactionScore: Number,
    averageRating: Number,
    positiveReviews: Number,
    negativeReviews: Number,
    errorRate: Number,
    accuracyRate: Number,
    firstCallResolution: Number,
    escalationRate: Number,
    complaintRate: Number,
    qualityAuditScore: Number,
    complianceScore: Number,
    score: Number
  },

  communicationMetrics: {
    averageResponseTime: Number,
    responseTimeCompliance: Number,
    communicationClarity: Number,
    professionalismScore: Number,
    empathyScore: Number,
    activeListeningScore: Number,
    conflictResolution: Number,
    customerEngagement: Number,
    score: Number
  },

  attitudeMetrics: {
    punctualityScore: Number,
    attendanceRate: Number,
    initiativeScore: Number,
    teamworkScore: Number,
    adaptabilityScore: Number,
    motivationLevel: Number,
    professionalDevelopment: Number,
    peerFeedbackScore: Number,
    score: Number
  },

  overallScore: {
    total: Number,
    breakdown: {
      time: Number,
      productivity: Number,
      quality: Number,
      communication: Number,
      attitude: Number
    },
    category: {
      type: String,
      enum: ['exceptional', 'exceeds_expectations', 'meets_expectations', 'needs_improvement', 'unsatisfactory']
    }
  },

  insights: {
    overall: String,
    strengths: [String],
    improvements: [String],
    trend: {
      type: String,
      enum: ['improving', 'stable', 'declining']
    },
    risks: [String],
    highlights: [String]
  },

  recommendations: {
    training: [String],
    processImprovements: [String],
    coachingAreas: [String],
    recognition: [String],
    developmentPlan: [String],
    shortTerm: [String],
    longTerm: [String]
  },

  calculatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
employeePerformanceSchema.index({ employeeId: 1, 'period.startDate': -1 });
employeePerformanceSchema.index({ 'overallScore.total': -1 });
employeePerformanceSchema.index({ 'overallScore.category': 1 });
employeePerformanceSchema.index({ calculatedAt: -1 });

module.exports = mongoose.model('EmployeePerformance', employeePerformanceSchema);
