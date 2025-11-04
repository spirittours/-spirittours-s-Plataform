/**
 * User Model
 * 
 * User account management with authentication and security features
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  password: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  phone: String,
  avatar: String,
  
  // Two-Factor Authentication
  twoFactorAuth: {
    enabled: {
      type: Boolean,
      default: false,
    },
    secret: String, // TOTP secret
    tempSecret: String, // Temporary secret during setup
    backupCodes: [{
      code: String, // Hashed backup code
      used: {
        type: Boolean,
        default: false,
      },
      usedAt: Date,
      generatedAt: Date,
    }],
    enabledAt: Date,
    lastVerifiedAt: Date,
    disabledAt: Date,
  },
  
  // Security
  lastLoginAt: Date,
  lastLoginIp: String,
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  accountLockedUntil: Date,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Email verification
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1, isDeleted: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Methods
userSchema.methods.isAccountLocked = function() {
  return this.accountLockedUntil && this.accountLockedUntil > Date.now();
};

userSchema.methods.incrementFailedLoginAttempts = async function() {
  this.failedLoginAttempts += 1;
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.failedLoginAttempts >= 5) {
    this.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
  
  await this.save();
};

userSchema.methods.resetFailedLoginAttempts = async function() {
  this.failedLoginAttempts = 0;
  this.accountLockedUntil = null;
  await this.save();
};

const User = mongoose.model('User', userSchema);

module.exports = User;
