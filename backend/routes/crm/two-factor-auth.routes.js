/**
 * Two-Factor Authentication Routes
 * 
 * Complete 2FA management system
 * Features:
 * - Enable/disable 2FA
 * - Generate QR code for setup
 * - Verify TOTP codes
 * - Manage backup codes
 * - Session verification tracking
 */

const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const {
  generate2FASecret,
  generateQRCode,
  verifyTOTP,
  generateBackupCodes,
  rateLimitVerification,
  hashBackupCode,
  verifyBackupCode,
} = require('../../middleware/twoFactorAuth');

/**
 * POST /api/crm/2fa/setup
 * Initialize 2FA setup (generate secret and QR code)
 */
router.post('/setup', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if 2FA is already enabled
    if (user.twoFactorAuth?.enabled) {
      return res.status(400).json({
        error: '2FA already enabled',
        message: 'Two-factor authentication is already enabled for this account. Disable it first to re-setup.',
      });
    }

    // Generate new secret
    const { secret, otpauthUrl } = await generate2FASecret(userId, user.email);
    
    // Generate QR code
    const qrCode = await generateQRCode(otpauthUrl);

    // Store temporary secret (not enabled yet)
    user.twoFactorAuth = {
      enabled: false,
      secret,
      tempSecret: secret, // Store temporarily until verified
      backupCodes: [],
    };
    await user.save();

    console.log('2FA setup initiated for user:', userId);
    res.json({
      message: '2FA setup initiated',
      secret, // Show secret for manual entry if QR code doesn't work
      qrCode,
      setupComplete: false,
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

/**
 * POST /api/crm/2fa/enable
 * Enable 2FA after verifying initial code
 */
router.post('/enable', rateLimitVerification, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.twoFactorAuth?.enabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    const secret = user.twoFactorAuth?.tempSecret;
    if (!secret) {
      return res.status(400).json({
        error: 'No pending 2FA setup',
        message: 'Please initiate 2FA setup first by calling /api/crm/2fa/setup',
      });
    }

    // Verify the code
    const isValid = verifyTOTP(secret, code);
    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid code',
        message: 'The verification code is invalid or has expired. Please try again.',
      });
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = backupCodes.map(code => ({
      code: hashBackupCode(code),
      used: false,
    }));

    // Enable 2FA
    user.twoFactorAuth = {
      enabled: true,
      secret,
      tempSecret: null,
      backupCodes: hashedBackupCodes,
      enabledAt: new Date(),
    };
    await user.save();

    console.log('2FA enabled for user:', userId);
    res.json({
      message: '2FA enabled successfully',
      backupCodes, // Return unhashed codes to user (only time they'll see them)
      warning: 'Save these backup codes in a secure location. They will not be shown again.',
    });
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    res.status(500).json({ error: 'Failed to enable 2FA' });
  }
});

/**
 * POST /api/crm/2fa/verify
 * Verify 2FA code for session
 */
router.post('/verify', rateLimitVerification, async (req, res) => {
  try {
    const { code, useBackupCode = false } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.twoFactorAuth?.enabled) {
      return res.status(400).json({ error: '2FA is not enabled for this account' });
    }

    let isValid = false;

    if (useBackupCode) {
      // Verify backup code
      const backupCodeIndex = user.twoFactorAuth.backupCodes.findIndex(
        bc => !bc.used && verifyBackupCode(bc.code, code)
      );

      if (backupCodeIndex !== -1) {
        // Mark backup code as used
        user.twoFactorAuth.backupCodes[backupCodeIndex].used = true;
        user.twoFactorAuth.backupCodes[backupCodeIndex].usedAt = new Date();
        await user.save();
        isValid = true;
        
        console.log('Backup code used for user:', userId);
      }
    } else {
      // Verify TOTP code
      isValid = verifyTOTP(user.twoFactorAuth.secret, code);
    }

    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid code',
        message: 'The verification code is invalid or has expired. Please try again.',
      });
    }

    // Mark session as 2FA verified
    if (req.session) {
      req.session.twoFactorVerified = true;
      req.session.twoFactorVerifiedAt = new Date();
    }

    // Update last verified timestamp
    user.twoFactorAuth.lastVerifiedAt = new Date();
    await user.save();

    console.log('2FA verified for user:', userId);
    res.json({
      message: '2FA verification successful',
      verified: true,
    });
  } catch (error) {
    console.error('Error verifying 2FA:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

/**
 * POST /api/crm/2fa/disable
 * Disable 2FA (requires current code verification)
 */
router.post('/disable', rateLimitVerification, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ error: 'Verification code required to disable 2FA' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.twoFactorAuth?.enabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    // Verify the code before disabling
    const isValid = verifyTOTP(user.twoFactorAuth.secret, code);
    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid code',
        message: 'Please provide a valid verification code to disable 2FA.',
      });
    }

    // Disable 2FA
    user.twoFactorAuth = {
      enabled: false,
      secret: null,
      tempSecret: null,
      backupCodes: [],
      disabledAt: new Date(),
    };
    await user.save();

    // Clear session verification
    if (req.session) {
      req.session.twoFactorVerified = false;
    }

    console.log('2FA disabled for user:', userId);
    res.json({
      message: '2FA disabled successfully',
      warning: 'Two-factor authentication has been disabled for your account.',
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

/**
 * GET /api/crm/2fa/status
 * Get 2FA status for current user
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const twoFactorAuth = user.twoFactorAuth || {};
    const remainingBackupCodes = twoFactorAuth.backupCodes?.filter(bc => !bc.used).length || 0;

    res.json({
      enabled: twoFactorAuth.enabled || false,
      enabledAt: twoFactorAuth.enabledAt || null,
      lastVerifiedAt: twoFactorAuth.lastVerifiedAt || null,
      remainingBackupCodes,
      sessionVerified: req.session?.twoFactorVerified || false,
    });
  } catch (error) {
    console.error('Error getting 2FA status:', error);
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

/**
 * POST /api/crm/2fa/regenerate-backup-codes
 * Regenerate backup codes (requires verification)
 */
router.post('/regenerate-backup-codes', rateLimitVerification, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.twoFactorAuth?.enabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    // Verify the code
    const isValid = verifyTOTP(user.twoFactorAuth.secret, code);
    if (!isValid) {
      return res.status(400).json({
        error: 'Invalid code',
        message: 'Please provide a valid verification code to regenerate backup codes.',
      });
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = backupCodes.map(code => ({
      code: hashBackupCode(code),
      used: false,
      generatedAt: new Date(),
    }));

    user.twoFactorAuth.backupCodes = hashedBackupCodes;
    await user.save();

    console.log('Backup codes regenerated for user:', userId);
    res.json({
      message: 'Backup codes regenerated successfully',
      backupCodes,
      warning: 'Old backup codes have been invalidated. Save these new codes in a secure location.',
    });
  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    res.status(500).json({ error: 'Failed to regenerate backup codes' });
  }
});

module.exports = router;
