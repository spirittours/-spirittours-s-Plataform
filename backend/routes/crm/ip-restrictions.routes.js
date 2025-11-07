/**
 * IP Restrictions Routes
 * 
 * API endpoints for managing workspace IP restrictions and geo-blocking.
 * Requires admin/owner permissions.
 */

const express = require('express');
const router = express.Router();
const Workspace = require('../../models/Workspace');
const AuditLog = require('../../models/AuditLog');
const Activity = require('../../models/Activity');
const { authenticate } = require('../../middleware/auth');
const { hasPermission, isOwner } = require('../../middleware/permissions');
const { getIPInfo, getClientIP, getIPLocation } = require('../../middleware/ipRestriction');

// All routes require authentication
router.use(authenticate);

/**
 * GET /:workspaceId/restrictions
 * Get IP restriction configuration
 */
router.get('/:workspaceId/restrictions', 
  hasPermission('security', 'manageSecurity'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      // Check user access
      if (!workspace.canUserAccess(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const restrictions = workspace.security.ipRestrictions || {
        enabled: false,
        whitelist: [],
        blacklist: [],
        allowedCountries: [],
        blockedCountries: [],
      };
      
      res.json({
        restrictions,
        workspace: {
          id: workspace._id,
          name: workspace.name,
        },
      });
    } catch (error) {
      console.error('Get IP restrictions error:', error);
      res.status(500).json({ error: 'Failed to retrieve IP restrictions' });
    }
  }
);

/**
 * POST /:workspaceId/restrictions/enable
 * Enable IP restrictions for workspace
 */
router.post('/:workspaceId/restrictions/enable',
  hasPermission('security', 'manageSecurity'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      // Check user access
      if (!workspace.canUserAccess(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Initialize if not exists
      if (!workspace.security.ipRestrictions) {
        workspace.security.ipRestrictions = {
          enabled: true,
          whitelist: [],
          blacklist: [],
          allowedCountries: [],
          blockedCountries: [],
          enabledAt: new Date(),
          enabledBy: req.user.id,
        };
      } else {
        workspace.security.ipRestrictions.enabled = true;
        workspace.security.ipRestrictions.enabledAt = new Date();
        workspace.security.ipRestrictions.enabledBy = req.user.id;
      }
      
      await workspace.save();
      
      // Log activity
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'security_setting_changed',
        resourceType: 'Workspace',
        changes: {
          after: { ipRestrictionsEnabled: true },
        },
        severity: 'warning',
        tags: ['security', 'ip-restrictions'],
      });
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'settings_updated',
        metadata: {
          setting: 'ip_restrictions',
          action: 'enabled',
        },
      });
      
      res.json({
        message: 'IP restrictions enabled',
        restrictions: workspace.security.ipRestrictions,
      });
    } catch (error) {
      console.error('Enable IP restrictions error:', error);
      res.status(500).json({ error: 'Failed to enable IP restrictions' });
    }
  }
);

/**
 * POST /:workspaceId/restrictions/disable
 * Disable IP restrictions for workspace
 */
router.post('/:workspaceId/restrictions/disable',
  hasPermission('security', 'manageSecurity'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      // Check user access
      if (!workspace.canUserAccess(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (workspace.security.ipRestrictions) {
        workspace.security.ipRestrictions.enabled = false;
      }
      
      await workspace.save();
      
      // Log activity
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'security_setting_changed',
        resourceType: 'Workspace',
        changes: {
          after: { ipRestrictionsEnabled: false },
        },
        severity: 'warning',
        tags: ['security', 'ip-restrictions'],
      });
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'settings_updated',
        metadata: {
          setting: 'ip_restrictions',
          action: 'disabled',
        },
      });
      
      res.json({
        message: 'IP restrictions disabled',
        restrictions: workspace.security.ipRestrictions,
      });
    } catch (error) {
      console.error('Disable IP restrictions error:', error);
      res.status(500).json({ error: 'Failed to disable IP restrictions' });
    }
  }
);

/**
 * POST /:workspaceId/restrictions/whitelist
 * Add IP to whitelist
 */
router.post('/:workspaceId/restrictions/whitelist',
  hasPermission('security', 'manageSecurity'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { ip, description } = req.body;
      
      if (!ip) {
        return res.status(400).json({ error: 'IP address required' });
      }
      
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      // Check user access
      if (!workspace.canUserAccess(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Initialize if not exists
      if (!workspace.security.ipRestrictions) {
        workspace.security.ipRestrictions = {
          enabled: true,
          whitelist: [],
          blacklist: [],
          allowedCountries: [],
          blockedCountries: [],
        };
      }
      
      // Check if already in whitelist
      const existingEntry = workspace.security.ipRestrictions.whitelist.find(
        entry => entry.pattern === ip
      );
      
      if (existingEntry) {
        return res.status(400).json({ error: 'IP already in whitelist' });
      }
      
      // Add to whitelist
      workspace.security.ipRestrictions.whitelist.push({
        pattern: ip,
        description: description || '',
        addedBy: req.user.id,
        addedAt: new Date(),
      });
      
      await workspace.save();
      
      // Log activity
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'security_setting_changed',
        resourceType: 'Workspace',
        changes: {
          after: { ipWhitelistAdded: ip },
        },
        severity: 'info',
        tags: ['security', 'ip-restrictions'],
      });
      
      res.json({
        message: 'IP added to whitelist',
        whitelist: workspace.security.ipRestrictions.whitelist,
      });
    } catch (error) {
      console.error('Add IP to whitelist error:', error);
      res.status(500).json({ error: 'Failed to add IP to whitelist' });
    }
  }
);

/**
 * DELETE /:workspaceId/restrictions/whitelist/:ip
 * Remove IP from whitelist
 */
router.delete('/:workspaceId/restrictions/whitelist/:ip',
  hasPermission('security', 'manageSecurity'),
  async (req, res) => {
    try {
      const { workspaceId, ip } = req.params;
      
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      // Check user access
      if (!workspace.canUserAccess(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!workspace.security.ipRestrictions) {
        return res.status(404).json({ error: 'IP restrictions not configured' });
      }
      
      const decodedIP = decodeURIComponent(ip);
      const initialLength = workspace.security.ipRestrictions.whitelist.length;
      
      workspace.security.ipRestrictions.whitelist = 
        workspace.security.ipRestrictions.whitelist.filter(
          entry => entry.pattern !== decodedIP
        );
      
      if (workspace.security.ipRestrictions.whitelist.length === initialLength) {
        return res.status(404).json({ error: 'IP not found in whitelist' });
      }
      
      await workspace.save();
      
      // Log activity
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'security_setting_changed',
        resourceType: 'Workspace',
        changes: {
          after: { ipWhitelistRemoved: decodedIP },
        },
        severity: 'info',
        tags: ['security', 'ip-restrictions'],
      });
      
      res.json({
        message: 'IP removed from whitelist',
        whitelist: workspace.security.ipRestrictions.whitelist,
      });
    } catch (error) {
      console.error('Remove IP from whitelist error:', error);
      res.status(500).json({ error: 'Failed to remove IP from whitelist' });
    }
  }
);

/**
 * POST /:workspaceId/restrictions/blacklist
 * Add IP to blacklist
 */
router.post('/:workspaceId/restrictions/blacklist',
  hasPermission('security', 'manageSecurity'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { ip, description, reason } = req.body;
      
      if (!ip) {
        return res.status(400).json({ error: 'IP address required' });
      }
      
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      // Check user access
      if (!workspace.canUserAccess(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Initialize if not exists
      if (!workspace.security.ipRestrictions) {
        workspace.security.ipRestrictions = {
          enabled: true,
          whitelist: [],
          blacklist: [],
          allowedCountries: [],
          blockedCountries: [],
        };
      }
      
      // Check if already in blacklist
      const existingEntry = workspace.security.ipRestrictions.blacklist.find(
        entry => entry.pattern === ip
      );
      
      if (existingEntry) {
        return res.status(400).json({ error: 'IP already in blacklist' });
      }
      
      // Add to blacklist
      workspace.security.ipRestrictions.blacklist.push({
        pattern: ip,
        description: description || '',
        reason: reason || 'Blocked by administrator',
        addedBy: req.user.id,
        addedAt: new Date(),
      });
      
      await workspace.save();
      
      // Log activity
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'security_setting_changed',
        resourceType: 'Workspace',
        changes: {
          after: { ipBlacklistAdded: ip },
        },
        severity: 'warning',
        tags: ['security', 'ip-restrictions'],
      });
      
      res.json({
        message: 'IP added to blacklist',
        blacklist: workspace.security.ipRestrictions.blacklist,
      });
    } catch (error) {
      console.error('Add IP to blacklist error:', error);
      res.status(500).json({ error: 'Failed to add IP to blacklist' });
    }
  }
);

/**
 * DELETE /:workspaceId/restrictions/blacklist/:ip
 * Remove IP from blacklist
 */
router.delete('/:workspaceId/restrictions/blacklist/:ip',
  hasPermission('security', 'manageSecurity'),
  async (req, res) => {
    try {
      const { workspaceId, ip } = req.params;
      
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      // Check user access
      if (!workspace.canUserAccess(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!workspace.security.ipRestrictions) {
        return res.status(404).json({ error: 'IP restrictions not configured' });
      }
      
      const decodedIP = decodeURIComponent(ip);
      const initialLength = workspace.security.ipRestrictions.blacklist.length;
      
      workspace.security.ipRestrictions.blacklist = 
        workspace.security.ipRestrictions.blacklist.filter(
          entry => entry.pattern !== decodedIP
        );
      
      if (workspace.security.ipRestrictions.blacklist.length === initialLength) {
        return res.status(404).json({ error: 'IP not found in blacklist' });
      }
      
      await workspace.save();
      
      // Log activity
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'security_setting_changed',
        resourceType: 'Workspace',
        changes: {
          after: { ipBlacklistRemoved: decodedIP },
        },
        severity: 'info',
        tags: ['security', 'ip-restrictions'],
      });
      
      res.json({
        message: 'IP removed from blacklist',
        blacklist: workspace.security.ipRestrictions.blacklist,
      });
    } catch (error) {
      console.error('Remove IP from blacklist error:', error);
      res.status(500).json({ error: 'Failed to remove IP from blacklist' });
    }
  }
);

/**
 * POST /:workspaceId/restrictions/countries/allow
 * Add country to allowlist (geo-whitelisting)
 */
router.post('/:workspaceId/restrictions/countries/allow',
  hasPermission('security', 'manageSecurity'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { countryCode, countryName } = req.body;
      
      if (!countryCode) {
        return res.status(400).json({ error: 'Country code required (ISO 3166-1 alpha-2)' });
      }
      
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      // Check user access
      if (!workspace.canUserAccess(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Initialize if not exists
      if (!workspace.security.ipRestrictions) {
        workspace.security.ipRestrictions = {
          enabled: true,
          whitelist: [],
          blacklist: [],
          allowedCountries: [],
          blockedCountries: [],
        };
      }
      
      // Check if already allowed
      if (workspace.security.ipRestrictions.allowedCountries.includes(countryCode)) {
        return res.status(400).json({ error: 'Country already in allowlist' });
      }
      
      workspace.security.ipRestrictions.allowedCountries.push(countryCode);
      
      await workspace.save();
      
      // Log activity
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'security_setting_changed',
        resourceType: 'Workspace',
        changes: {
          after: { countryAllowed: countryCode },
        },
        severity: 'info',
        tags: ['security', 'geo-blocking'],
      });
      
      res.json({
        message: 'Country added to allowlist',
        allowedCountries: workspace.security.ipRestrictions.allowedCountries,
      });
    } catch (error) {
      console.error('Add country to allowlist error:', error);
      res.status(500).json({ error: 'Failed to add country to allowlist' });
    }
  }
);

/**
 * DELETE /:workspaceId/restrictions/countries/allow/:countryCode
 * Remove country from allowlist
 */
router.delete('/:workspaceId/restrictions/countries/allow/:countryCode',
  hasPermission('security', 'manageSecurity'),
  async (req, res) => {
    try {
      const { workspaceId, countryCode } = req.params;
      
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      // Check user access
      if (!workspace.canUserAccess(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!workspace.security.ipRestrictions) {
        return res.status(404).json({ error: 'IP restrictions not configured' });
      }
      
      const initialLength = workspace.security.ipRestrictions.allowedCountries.length;
      
      workspace.security.ipRestrictions.allowedCountries = 
        workspace.security.ipRestrictions.allowedCountries.filter(
          code => code !== countryCode
        );
      
      if (workspace.security.ipRestrictions.allowedCountries.length === initialLength) {
        return res.status(404).json({ error: 'Country not found in allowlist' });
      }
      
      await workspace.save();
      
      // Log activity
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'security_setting_changed',
        resourceType: 'Workspace',
        changes: {
          after: { countryAllowRemoved: countryCode },
        },
        severity: 'info',
        tags: ['security', 'geo-blocking'],
      });
      
      res.json({
        message: 'Country removed from allowlist',
        allowedCountries: workspace.security.ipRestrictions.allowedCountries,
      });
    } catch (error) {
      console.error('Remove country from allowlist error:', error);
      res.status(500).json({ error: 'Failed to remove country from allowlist' });
    }
  }
);

/**
 * POST /:workspaceId/restrictions/countries/block
 * Add country to blocklist (geo-blocking)
 */
router.post('/:workspaceId/restrictions/countries/block',
  hasPermission('security', 'manageSecurity'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { countryCode, countryName, reason } = req.body;
      
      if (!countryCode) {
        return res.status(400).json({ error: 'Country code required (ISO 3166-1 alpha-2)' });
      }
      
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      // Check user access
      if (!workspace.canUserAccess(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Initialize if not exists
      if (!workspace.security.ipRestrictions) {
        workspace.security.ipRestrictions = {
          enabled: true,
          whitelist: [],
          blacklist: [],
          allowedCountries: [],
          blockedCountries: [],
        };
      }
      
      // Check if already blocked
      if (workspace.security.ipRestrictions.blockedCountries.includes(countryCode)) {
        return res.status(400).json({ error: 'Country already blocked' });
      }
      
      workspace.security.ipRestrictions.blockedCountries.push(countryCode);
      
      await workspace.save();
      
      // Log activity
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'security_setting_changed',
        resourceType: 'Workspace',
        changes: {
          after: { countryBlocked: countryCode },
        },
        severity: 'warning',
        tags: ['security', 'geo-blocking'],
      });
      
      res.json({
        message: 'Country added to blocklist',
        blockedCountries: workspace.security.ipRestrictions.blockedCountries,
      });
    } catch (error) {
      console.error('Add country to blocklist error:', error);
      res.status(500).json({ error: 'Failed to add country to blocklist' });
    }
  }
);

/**
 * DELETE /:workspaceId/restrictions/countries/block/:countryCode
 * Remove country from blocklist
 */
router.delete('/:workspaceId/restrictions/countries/block/:countryCode',
  hasPermission('security', 'manageSecurity'),
  async (req, res) => {
    try {
      const { workspaceId, countryCode } = req.params;
      
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      // Check user access
      if (!workspace.canUserAccess(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!workspace.security.ipRestrictions) {
        return res.status(404).json({ error: 'IP restrictions not configured' });
      }
      
      const initialLength = workspace.security.ipRestrictions.blockedCountries.length;
      
      workspace.security.ipRestrictions.blockedCountries = 
        workspace.security.ipRestrictions.blockedCountries.filter(
          code => code !== countryCode
        );
      
      if (workspace.security.ipRestrictions.blockedCountries.length === initialLength) {
        return res.status(404).json({ error: 'Country not found in blocklist' });
      }
      
      await workspace.save();
      
      // Log activity
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'security_setting_changed',
        resourceType: 'Workspace',
        changes: {
          after: { countryBlockRemoved: countryCode },
        },
        severity: 'info',
        tags: ['security', 'geo-blocking'],
      });
      
      res.json({
        message: 'Country removed from blocklist',
        blockedCountries: workspace.security.ipRestrictions.blockedCountries,
      });
    } catch (error) {
      console.error('Remove country from blocklist error:', error);
      res.status(500).json({ error: 'Failed to remove country from blocklist' });
    }
  }
);

/**
 * GET /:workspaceId/restrictions/test
 * Test current IP against restrictions
 */
router.get('/:workspaceId/restrictions/test',
  hasPermission('security', 'manageSecurity'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      // Check user access
      if (!workspace.canUserAccess(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const clientIP = getClientIP(req);
      const location = getIPLocation(clientIP);
      
      res.json({
        ip: clientIP,
        location,
        restrictions: workspace.security.ipRestrictions || {},
        wouldBeAllowed: true, // If we reach here, user is allowed
      });
    } catch (error) {
      console.error('Test IP restrictions error:', error);
      res.status(500).json({ error: 'Failed to test IP restrictions' });
    }
  }
);

/**
 * GET /ip-info
 * Get current request IP information (utility endpoint)
 */
router.get('/ip-info', getIPInfo);

module.exports = router;
