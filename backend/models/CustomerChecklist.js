/**
 * Customer Checklist Model
 * Stores checklists from CustomerFollowupAgent
 */

const mongoose = require('mongoose');

const customerChecklistSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  templateName: {
    type: String,
    required: true
  },

  name: {
    type: String,
    required: true
  },

  items: [{
    id: String,
    task: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent']
    },
    deadline: Number, // days from creation
    dueDate: Date,
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: String
  }],

  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled', 'overdue'],
    default: 'active',
    index: true
  },

  progress: {
    total: Number,
    completed: Number,
    percentage: Number
  },

  relatedBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },

  completedAt: Date
}, {
  timestamps: true
});

// Calculate progress before saving
customerChecklistSchema.pre('save', function(next) {
  this.progress = {
    total: this.items.length,
    completed: this.items.filter(item => item.completed).length
  };
  this.progress.percentage = this.progress.total > 0 
    ? Math.round((this.progress.completed / this.progress.total) * 100)
    : 0;

  // Update status based on progress
  if (this.progress.percentage === 100) {
    this.status = 'completed';
    if (!this.completedAt) {
      this.completedAt = new Date();
    }
  } else {
    const now = new Date();
    const hasOverdue = this.items.some(item => 
      !item.completed && item.dueDate && item.dueDate < now
    );
    if (hasOverdue && this.status === 'active') {
      this.status = 'overdue';
    }
  }

  next();
});

// Indexes
customerChecklistSchema.index({ customerId: 1, status: 1 });
customerChecklistSchema.index({ createdAt: -1 });
customerChecklistSchema.index({ 'items.dueDate': 1 });

module.exports = mongoose.model('CustomerChecklist', customerChecklistSchema);
