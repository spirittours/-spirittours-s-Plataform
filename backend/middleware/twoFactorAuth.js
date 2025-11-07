/**
 * Two-Factor Authentication Middleware
 * 
 * TOTP (Time-based One-Time Password) implementation using speakeasy
 * Features:
 * - Generate 2FA secrets
 * - Generate QR codes for authenticator apps
 * - Verify TOTP codes
 * - Backup codes generation
 * - Rate limiting for verification attempts
 * - Workspace-level 2FA requirement enforcement
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const Workspace = require('../models/Workspace');

/**
 * Generate 2FA secret for user
 */
const generate2FASecret = async (userId, email) => {
  const secret = speakeasy.generateSecret({
    name: `Spirit Tours CRM (${email})`,
    issuer: 'Spirit Tours',
    length: 32,
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
  };
};

/**
 * Generate QR code for 2FA setup
 */
const generateQRCode = async (otpauthUrl) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Verify TOTP code
 */
const verifyTOTP = (secret, token) => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 steps before/after for clock skew
  });
};

/**
 * Generate backup codes
 */
const generateBackupCodes = (count = 10) => {
  const codes = [];
  const crypto = require('crypto');
  
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    // Format as XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  
  return codes;
};

/**
 * Middleware to check if 2FA is required for workspace
 */
const require2FA = async (req, res, next) => {
  try {
    const workspaceId = req.body.workspace || req.params.workspaceId || req.query.workspace;
    
    if (!workspaceId) {
      return next(); // No workspace specified, skip 2FA check
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if 2FA is required for this workspace
    if (workspace.security?.twoFactorRequired) {
      const user = await User.findById(req.user.id);
      
      if (!user.twoFactorAuth?.enabled) {
        return res.status(403).json({
          error: '2FA required',
          message: 'This workspace requires two-factor authentication. Please enable 2FA in your account settings.',
          requires2FA: true,
        });
      }

      // Check if current session is 2FA verified
      if (!req.session?.twoFactorVerified) {
        return res.status(403).json({
          error: '2FA verification required',
          message: 'Please verify your 2FA code to access this workspace.',
          needs2FAVerification: true,
        });
      }
    }

    next();
  } catch (error) {
    console.error('2FA middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to rate limit 2FA verification attempts
 */
const rateLimitVerification = async (req, res, next) => {
  const userId = req.user.id;
  const key = `2fa_attempts_${userId}`;
  
  // Simple in-memory rate limiting (in production, use Redis)
  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }
  
  const attempts = global.rateLimitStore.get(key) || { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
  
  // Reset counter if time window passed
  if (Date.now() > attempts.resetAt) {
    attempts.count = 0;
    attempts.resetAt = Date.now() + 15 * 60 * 1000; // 15 minutes
  }
  
  // Check if rate limit exceeded (max 5 attempts per 15 minutes)
  if (attempts.count >= 5) {
    const remainingTime = Math.ceil((attempts.resetAt - Date.now()) / 1000 / 60);
    return res.status(429).json({
      error: 'Too many attempts',
      message: `Too many verification attempts. Please try again in ${remainingTime} minutes.`,
      retryAfter: attempts.resetAt,
    });
  }
  
  // Increment attempt counter
  attempts.count++;
  global.rateLimitStore.set(key, attempts);
  
  next();
};

/**
 * Hash backup code for storage
 */
const hashBackupCode = (code) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(code).digest('hex');
};

/**
 * Verify backup code
 */
const verifyBackupCode = (hashedCode, code) => {
  const crypto = require('crypto');
  const codeHash = crypto.createHash('sha256').update(code).digest('hex');
  return hashedCode === codeHash;
};

module.exports = {
  generate2FASecret,
  generateQRCode,
  verifyTOTP,
  generateBackupCodes,
  require2FA,
  rateLimitVerification,
  hashBackupCode,
  verifyBackupCode,
};
