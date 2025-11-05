/**
 * Job Application Model
 * Stores CV and candidate data from HRRecruitmentAgent
 */

const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema({
  position: {
    type: String,
    required: true,
    index: true
  },

  personalInfo: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      index: true
    },
    phone: String,
    location: String
  },

  summary: String,

  experience: [{
    company: String,
    position: String,
    duration: String,
    responsibilities: [String],
    startDate: Date,
    endDate: Date,
    current: Boolean
  }],

  education: [{
    degree: String,
    institution: String,
    year: Number,
    field: String
  }],

  skills: [String],

  languages: [{
    language: String,
    proficiency: {
      type: String,
      enum: ['basic', 'intermediate', 'advanced', 'native']
    }
  }],

  certifications: [String],

  references: [{
    name: String,
    company: String,
    position: String,
    contact: String
  }],

  cvAnalysis: {
    completeness: Number,
    relevance: Number,
    presentation: Number,
    redFlags: [String],
    strengths: [String],
    clarificationNeeded: [String]
  },

  positionMatches: [{
    position: String,
    score: Number,
    breakdown: {
      skills: Number,
      experience: Number,
      languages: Number,
      certifications: Number
    },
    recommendation: String
  }],

  screening: {
    questions: [{
      question: String,
      answer: String,
      score: Number
    }],
    analysis: {
      quality: Number,
      experience: String,
      communication: Number,
      enthusiasm: Number,
      redFlags: [String],
      proceedToInterview: {
        type: String,
        enum: ['yes', 'no', 'maybe']
      }
    },
    completedAt: Date
  },

  interviews: [{
    scheduledAt: Date,
    conductedAt: Date,
    interviewers: [String],
    notes: String,
    assessment: {
      rating: Number,
      strengths: [String],
      concerns: [String],
      culturalFit: String,
      recommendation: {
        type: String,
        enum: ['strong_hire', 'hire', 'maybe', 'no_hire']
      },
      nextSteps: [String]
    }
  }],

  status: {
    type: String,
    enum: ['new', 'screening', 'interview', 'assessment', 'offer', 'accepted', 'rejected', 'withdrawn'],
    default: 'new',
    index: true
  },

  currentStage: String,

  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  score: {
    total: Number,
    breakdown: {
      cv_quality: Number,
      position_match: Number,
      screening: Number,
      interview: Number
    }
  },

  source: String,
  notes: [String],

  applicationDate: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
jobApplicationSchema.index({ position: 1, status: 1 });
jobApplicationSchema.index({ 'personalInfo.email': 1 });
jobApplicationSchema.index({ 'score.total': -1 });
jobApplicationSchema.index({ applicationDate: -1 });

module.exports = mongoose.model('JobApplication', jobApplicationSchema);
