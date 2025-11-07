/**
 * Single Sign-On (SSO) Middleware
 * 
 * Support for multiple SSO providers:
 * - SAML 2.0 (generic)
 * - Okta
 * - Azure AD (Microsoft Entra ID)
 * - Google Workspace
 * 
 * Features:
 * - Multi-provider configuration
 * - Workspace-level SSO settings
 * - User provisioning (JIT - Just In Time)
 * - Attribute mapping
 * - Session management
 */

const passport = require('passport');
const SamlStrategy = require('passport-saml').Strategy;
const AzureAdOAuth2Strategy = require('passport-azure-ad').OIDCStrategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Workspace = require('../models/Workspace');

/**
 * Configure SAML strategy for workspace
 */
const configureSAMLStrategy = (workspace) => {
  const samlConfig = workspace.sso?.saml;
  
  if (!samlConfig || !samlConfig.enabled) {
    return null;
  }

  return new SamlStrategy(
    {
      entryPoint: samlConfig.entryPoint,
      issuer: samlConfig.issuer,
      callbackUrl: `${process.env.API_URL}/api/crm/sso/saml/callback/${workspace._id}`,
      cert: samlConfig.certificate,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      acceptedClockSkewMs: -1,
      passReqToCallback: true,
    },
    async (req, profile, done) => {
      try {
        const email = profile.nameID || profile.email;
        
        // Find or create user
        let user = await User.findOne({ email });
        
        if (!user) {
          // JIT provisioning
          user = new User({
            email,
            firstName: profile.firstName || profile.givenName || email.split('@')[0],
            lastName: profile.lastName || profile.surname || '',
            emailVerified: true,
            password: require('crypto').randomBytes(32).toString('hex'), // Random password (SSO only)
          });
          await user.save();
        }

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  );
};

/**
 * Configure Azure AD strategy for workspace
 */
const configureAzureADStrategy = (workspace) => {
  const azureConfig = workspace.sso?.azureAD;
  
  if (!azureConfig || !azureConfig.enabled) {
    return null;
  }

  return new AzureAdOAuth2Strategy(
    {
      identityMetadata: `https://login.microsoftonline.com/${azureConfig.tenantId}/v2.0/.well-known/openid-configuration`,
      clientID: azureConfig.clientId,
      clientSecret: azureConfig.clientSecret,
      responseType: 'code id_token',
      responseMode: 'form_post',
      redirectUrl: `${process.env.API_URL}/api/crm/sso/azure/callback/${workspace._id}`,
      allowHttpForRedirectUrl: process.env.NODE_ENV === 'development',
      passReqToCallback: true,
      scope: ['profile', 'email', 'openid'],
    },
    async (req, iss, sub, profile, accessToken, refreshToken, done) => {
      try {
        const email = profile._json.email || profile._json.preferred_username;
        
        let user = await User.findOne({ email });
        
        if (!user) {
          user = new User({
            email,
            firstName: profile._json.given_name || profile.displayName,
            lastName: profile._json.family_name || '',
            emailVerified: true,
            password: require('crypto').randomBytes(32).toString('hex'),
          });
          await user.save();
        }

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  );
};

/**
 * Configure Google Workspace strategy for workspace
 */
const configureGoogleStrategy = (workspace) => {
  const googleConfig = workspace.sso?.google;
  
  if (!googleConfig || !googleConfig.enabled) {
    return null;
  }

  return new GoogleStrategy(
    {
      clientID: googleConfig.clientId,
      clientSecret: googleConfig.clientSecret,
      callbackURL: `${process.env.API_URL}/api/crm/sso/google/callback/${workspace._id}`,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        
        // Verify domain if restricted
        if (googleConfig.allowedDomains && googleConfig.allowedDomains.length > 0) {
          const domain = email.split('@')[1];
          if (!googleConfig.allowedDomains.includes(domain)) {
            return done(null, false, { message: 'Domain not allowed' });
          }
        }
        
        let user = await User.findOne({ email });
        
        if (!user) {
          user = new User({
            email,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            avatar: profile.photos[0]?.value,
            emailVerified: true,
            password: require('crypto').randomBytes(32).toString('hex'),
          });
          await user.save();
        }

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  );
};

/**
 * Configure Okta SAML strategy for workspace
 */
const configureOktaStrategy = (workspace) => {
  const oktaConfig = workspace.sso?.okta;
  
  if (!oktaConfig || !oktaConfig.enabled) {
    return null;
  }

  return new SamlStrategy(
    {
      entryPoint: oktaConfig.entryPoint,
      issuer: oktaConfig.issuer,
      callbackUrl: `${process.env.API_URL}/api/crm/sso/okta/callback/${workspace._id}`,
      cert: oktaConfig.certificate,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      acceptedClockSkewMs: -1,
      passReqToCallback: true,
    },
    async (req, profile, done) => {
      try {
        const email = profile.nameID || profile.email;
        
        let user = await User.findOne({ email });
        
        if (!user) {
          user = new User({
            email,
            firstName: profile.firstName || profile.givenName || email.split('@')[0],
            lastName: profile.lastName || profile.surname || '',
            emailVerified: true,
            password: require('crypto').randomBytes(32).toString('hex'),
          });
          await user.save();
        }

        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  );
};

/**
 * Initialize SSO strategies for a workspace
 */
const initializeWorkspaceSSO = async (workspace) => {
  const strategies = [];

  // SAML
  const samlStrategy = configureSAMLStrategy(workspace);
  if (samlStrategy) {
    passport.use(`saml-${workspace._id}`, samlStrategy);
    strategies.push('saml');
  }

  // Azure AD
  const azureStrategy = configureAzureADStrategy(workspace);
  if (azureStrategy) {
    passport.use(`azure-${workspace._id}`, azureStrategy);
    strategies.push('azure');
  }

  // Google Workspace
  const googleStrategy = configureGoogleStrategy(workspace);
  if (googleStrategy) {
    passport.use(`google-${workspace._id}`, googleStrategy);
    strategies.push('google');
  }

  // Okta
  const oktaStrategy = configureOktaStrategy(workspace);
  if (oktaStrategy) {
    passport.use(`okta-${workspace._id}`, oktaStrategy);
    strategies.push('okta');
  }

  return strategies;
};

/**
 * Middleware to require SSO for workspace
 */
const requireSSO = async (req, res, next) => {
  try {
    const workspaceId = req.body.workspace || req.params.workspaceId || req.query.workspace;
    
    if (!workspaceId) {
      return next();
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if SSO is enabled
    if (workspace.security?.ssoEnabled) {
      const user = await User.findById(req.user.id);
      
      // Check if user logged in via SSO
      if (!req.session?.ssoProvider) {
        return res.status(403).json({
          error: 'SSO required',
          message: 'This workspace requires Single Sign-On authentication.',
          requiresSSO: true,
          availableProviders: workspace.sso ? Object.keys(workspace.sso).filter(k => workspace.sso[k]?.enabled) : [],
        });
      }
    }

    next();
  } catch (error) {
    console.error('SSO middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  configureSAMLStrategy,
  configureAzureADStrategy,
  configureGoogleStrategy,
  configureOktaStrategy,
  initializeWorkspaceSSO,
  requireSSO,
  passport,
};
