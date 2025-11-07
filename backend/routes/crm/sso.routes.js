/**
 * Single Sign-On Routes
 * 
 * SSO authentication endpoints for multiple providers
 */

const express = require('express');
const router = express.Router();
const { passport, initializeWorkspaceSSO } = require('../../middleware/sso');
const Workspace = require('../../models/Workspace');
const Activity = require('../../models/Activity');

/**
 * GET /api/crm/sso/providers/:workspaceId
 * Get available SSO providers for workspace
 */
router.get('/providers/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const providers = [];
    
    if (workspace.sso?.saml?.enabled) {
      providers.push({
        type: 'saml',
        name: 'SAML 2.0',
        loginUrl: `/api/crm/sso/saml/login/${workspaceId}`,
      });
    }
    
    if (workspace.sso?.azureAD?.enabled) {
      providers.push({
        type: 'azure',
        name: 'Microsoft Azure AD',
        loginUrl: `/api/crm/sso/azure/login/${workspaceId}`,
      });
    }
    
    if (workspace.sso?.google?.enabled) {
      providers.push({
        type: 'google',
        name: 'Google Workspace',
        loginUrl: `/api/crm/sso/google/login/${workspaceId}`,
      });
    }
    
    if (workspace.sso?.okta?.enabled) {
      providers.push({
        type: 'okta',
        name: 'Okta',
        loginUrl: `/api/crm/sso/okta/login/${workspaceId}`,
      });
    }

    res.json({
      workspaceId,
      ssoEnabled: workspace.security?.ssoEnabled || false,
      providers,
    });
  } catch (error) {
    console.error('Error getting SSO providers:', error);
    res.status(500).json({ error: 'Failed to get SSO providers' });
  }
});

/**
 * SAML SSO Routes
 */
router.get('/saml/login/:workspaceId', async (req, res, next) => {
  const { workspaceId } = req.params;
  
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  await initializeWorkspaceSSO(workspace);
  
  passport.authenticate(`saml-${workspaceId}`, {
    session: false,
  })(req, res, next);
});

router.post('/saml/callback/:workspaceId', async (req, res, next) => {
  const { workspaceId } = req.params;
  
  passport.authenticate(`saml-${workspaceId}`, async (err, user) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=sso_failed`);
    }

    // Create session
    req.session.userId = user._id;
    req.session.ssoProvider = 'saml';
    
    // Log activity
    await Activity.logActivity({
      workspace: workspaceId,
      type: 'sso_login',
      user: user._id,
      metadata: { provider: 'saml' },
    });

    res.redirect(`${process.env.FRONTEND_URL}/crm?workspace=${workspaceId}`);
  })(req, res, next);
});

/**
 * Azure AD SSO Routes
 */
router.get('/azure/login/:workspaceId', async (req, res, next) => {
  const { workspaceId } = req.params;
  
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  await initializeWorkspaceSSO(workspace);
  
  passport.authenticate(`azure-${workspaceId}`, {
    session: false,
  })(req, res, next);
});

router.post('/azure/callback/:workspaceId', async (req, res, next) => {
  const { workspaceId } = req.params;
  
  passport.authenticate(`azure-${workspaceId}`, async (err, user) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=sso_failed`);
    }

    req.session.userId = user._id;
    req.session.ssoProvider = 'azure';
    
    await Activity.logActivity({
      workspace: workspaceId,
      type: 'sso_login',
      user: user._id,
      metadata: { provider: 'azure' },
    });

    res.redirect(`${process.env.FRONTEND_URL}/crm?workspace=${workspaceId}`);
  })(req, res, next);
});

/**
 * Google Workspace SSO Routes
 */
router.get('/google/login/:workspaceId', async (req, res, next) => {
  const { workspaceId } = req.params;
  
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  await initializeWorkspaceSSO(workspace);
  
  passport.authenticate(`google-${workspaceId}`, {
    scope: ['profile', 'email'],
    session: false,
  })(req, res, next);
});

router.get('/google/callback/:workspaceId', async (req, res, next) => {
  const { workspaceId } = req.params;
  
  passport.authenticate(`google-${workspaceId}`, async (err, user, info) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=sso_failed&message=${info?.message || 'Unknown error'}`);
    }

    req.session.userId = user._id;
    req.session.ssoProvider = 'google';
    
    await Activity.logActivity({
      workspace: workspaceId,
      type: 'sso_login',
      user: user._id,
      metadata: { provider: 'google' },
    });

    res.redirect(`${process.env.FRONTEND_URL}/crm?workspace=${workspaceId}`);
  })(req, res, next);
});

/**
 * Okta SSO Routes
 */
router.get('/okta/login/:workspaceId', async (req, res, next) => {
  const { workspaceId } = req.params;
  
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) {
    return res.status(404).json({ error: 'Workspace not found' });
  }

  await initializeWorkspaceSSO(workspace);
  
  passport.authenticate(`okta-${workspaceId}`, {
    session: false,
  })(req, res, next);
});

router.post('/okta/callback/:workspaceId', async (req, res, next) => {
  const { workspaceId } = req.params;
  
  passport.authenticate(`okta-${workspaceId}`, async (err, user) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=sso_failed`);
    }

    req.session.userId = user._id;
    req.session.ssoProvider = 'okta';
    
    await Activity.logActivity({
      workspace: workspaceId,
      type: 'sso_login',
      user: user._id,
      metadata: { provider: 'okta' },
    });

    res.redirect(`${process.env.FRONTEND_URL}/crm?workspace=${workspaceId}`);
  })(req, res, next);
});

/**
 * PUT /api/crm/sso/configure/:workspaceId
 * Configure SSO for workspace (admin only)
 */
router.put('/configure/:workspaceId', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { provider, config } = req.body;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Validate user is admin
    const member = workspace.members.find(m => m.user.toString() === req.user.id);
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Update SSO configuration
    if (!workspace.sso) {
      workspace.sso = {};
    }
    
    workspace.sso[provider] = {
      ...config,
      configuredAt: new Date(),
      configuredBy: req.user.id,
    };
    
    await workspace.save();

    console.log(`SSO ${provider} configured for workspace:`, workspaceId);
    res.json({
      message: `SSO ${provider} configured successfully`,
      provider,
    });
  } catch (error) {
    console.error('Error configuring SSO:', error);
    res.status(500).json({ error: 'Failed to configure SSO' });
  }
});

/**
 * POST /api/crm/sso/test/:workspaceId/:provider
 * Test SSO configuration
 */
router.post('/test/:workspaceId/:provider', async (req, res) => {
  try {
    const { workspaceId, provider } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const ssoConfig = workspace.sso?.[provider];
    if (!ssoConfig || !ssoConfig.enabled) {
      return res.status(400).json({ error: `SSO ${provider} not configured or not enabled` });
    }

    // Initialize strategies to test configuration
    await initializeWorkspaceSSO(workspace);

    res.json({
      message: `SSO ${provider} configuration is valid`,
      provider,
      configured: true,
    });
  } catch (error) {
    console.error('Error testing SSO:', error);
    res.status(500).json({
      error: 'SSO configuration test failed',
      message: error.message,
    });
  }
});

module.exports = router;
