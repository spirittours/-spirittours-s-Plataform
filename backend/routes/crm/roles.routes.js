/**
 * Roles & Permissions Routes
 * 
 * CRUD operations for custom roles and permission management
 */

const express = require('express');
const router = express.Router();
const Role = require('../../models/Role');
const Workspace = require('../../models/Workspace');
const { isAdminOrOwner, isOwner } = require('../../middleware/permissions');

/**
 * GET /api/crm/roles/:workspaceId
 * Get all roles for workspace
 */
router.get('/:workspaceId', isAdminOrOwner, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    
    const roles = await Role.find({ workspace: workspaceId })
      .sort({ priority: -1, name: 1 });

    res.json({
      roles,
      totalCount: roles.length,
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

/**
 * GET /api/crm/roles/:workspaceId/:roleId
 * Get specific role details
 */
router.get('/:workspaceId/:roleId', isAdminOrOwner, async (req, res) => {
  try {
    const { workspaceId, roleId } = req.params;
    
    const role = await Role.findOne({
      _id: roleId,
      workspace: workspaceId,
    }).populate('inheritsFrom', 'name description');

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json(role);
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

/**
 * POST /api/crm/roles/:workspaceId
 * Create custom role
 */
router.post('/:workspaceId', isOwner, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, permissions, color, inheritsFrom, priority } = req.body;

    // Validate workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    // Check if role name already exists
    const existingRole = await Role.findOne({ workspace: workspaceId, name });
    if (existingRole) {
      return res.status(400).json({ error: 'Role with this name already exists' });
    }

    // Create role
    const role = new Role({
      workspace: workspaceId,
      name,
      description,
      permissions,
      color,
      inheritsFrom,
      priority: priority || 50,
      type: 'custom',
      isSystem: false,
      createdBy: req.user.id,
    });

    await role.save();

    console.log('Custom role created:', role._id);
    res.status(201).json({
      message: 'Role created successfully',
      role,
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

/**
 * PUT /api/crm/roles/:workspaceId/:roleId
 * Update role
 */
router.put('/:workspaceId/:roleId', isOwner, async (req, res) => {
  try {
    const { workspaceId, roleId } = req.params;
    const { name, description, permissions, color, inheritsFrom, priority } = req.body;

    const role = await Role.findOne({
      _id: roleId,
      workspace: workspaceId,
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Cannot edit system roles
    if (role.isSystem) {
      return res.status(403).json({ error: 'Cannot edit system roles' });
    }

    // Update fields
    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (permissions) role.permissions = { ...role.permissions, ...permissions };
    if (color) role.color = color;
    if (inheritsFrom !== undefined) role.inheritsFrom = inheritsFrom;
    if (priority !== undefined) role.priority = priority;

    await role.save();

    console.log('Role updated:', roleId);
    res.json({
      message: 'Role updated successfully',
      role,
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

/**
 * DELETE /api/crm/roles/:workspaceId/:roleId
 * Delete custom role
 */
router.delete('/:workspaceId/:roleId', isOwner, async (req, res) => {
  try {
    const { workspaceId, roleId } = req.params;

    const role = await Role.findOne({
      _id: roleId,
      workspace: workspaceId,
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Cannot delete system roles
    if (role.isSystem) {
      return res.status(403).json({ error: 'Cannot delete system roles' });
    }

    // Check if role is in use
    const workspace = await Workspace.findById(workspaceId);
    const inUse = workspace.members.some(m => m.role === role.name);

    if (inUse) {
      return res.status(400).json({
        error: 'Role is in use',
        message: 'Cannot delete role that is assigned to members. Reassign members first.',
      });
    }

    await role.deleteOne();

    console.log('Role deleted:', roleId);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

/**
 * POST /api/crm/roles/:workspaceId/initialize
 * Initialize system roles for workspace
 */
router.post('/:workspaceId/initialize', isOwner, async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const roles = await Role.createSystemRoles(workspaceId);

    console.log('System roles initialized for workspace:', workspaceId);
    res.json({
      message: 'System roles initialized successfully',
      roles,
    });
  } catch (error) {
    console.error('Error initializing roles:', error);
    res.status(500).json({ error: 'Failed to initialize roles' });
  }
});

/**
 * PUT /api/crm/roles/:workspaceId/:roleId/permissions
 * Update role permissions
 */
router.put('/:workspaceId/:roleId/permissions', isOwner, async (req, res) => {
  try {
    const { workspaceId, roleId } = req.params;
    const { category, permission, value } = req.body;

    const role = await Role.findOne({
      _id: roleId,
      workspace: workspaceId,
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (role.isSystem) {
      return res.status(403).json({ error: 'Cannot modify system role permissions' });
    }

    // Update permission
    if (value) {
      role.grantPermission(category, permission);
    } else {
      role.revokePermission(category, permission);
    }

    await role.save();

    console.log(`Permission ${category}.${permission} ${value ? 'granted' : 'revoked'} for role:`, roleId);
    res.json({
      message: 'Permission updated successfully',
      role,
    });
  } catch (error) {
    console.error('Error updating permission:', error);
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

/**
 * POST /api/crm/roles/:workspaceId/:roleId/duplicate
 * Duplicate role as custom role
 */
router.post('/:workspaceId/:roleId/duplicate', isOwner, async (req, res) => {
  try {
    const { workspaceId, roleId } = req.params;
    const { name } = req.body;

    const sourceRole = await Role.findOne({
      _id: roleId,
      workspace: workspaceId,
    });

    if (!sourceRole) {
      return res.status(404).json({ error: 'Source role not found' });
    }

    // Check if new name exists
    const existingRole = await Role.findOne({ workspace: workspaceId, name });
    if (existingRole) {
      return res.status(400).json({ error: 'Role with this name already exists' });
    }

    // Create duplicate
    const newRole = new Role({
      workspace: workspaceId,
      name,
      description: `Copy of ${sourceRole.name}`,
      permissions: sourceRole.permissions,
      color: sourceRole.color,
      priority: sourceRole.priority - 1,
      type: 'custom',
      isSystem: false,
      createdBy: req.user.id,
    });

    await newRole.save();

    console.log('Role duplicated:', newRole._id);
    res.status(201).json({
      message: 'Role duplicated successfully',
      role: newRole,
    });
  } catch (error) {
    console.error('Error duplicating role:', error);
    res.status(500).json({ error: 'Failed to duplicate role' });
  }
});

/**
 * GET /api/crm/roles/:workspaceId/templates
 * Get role templates
 */
router.get('/:workspaceId/templates', isOwner, async (req, res) => {
  try {
    const templates = [
      {
        name: 'Sales Manager',
        description: 'Full access to deals and pipelines, limited admin access',
        permissions: {
          workspace: { view: true, edit: false },
          members: { view: true, invite: true, edit: false },
          boards: { view: true, create: true, edit: true, delete: false },
          items: { view: true, create: true, edit: true, delete: false },
          pipelines: { view: true, create: true, edit: true, delete: false, manageStages: true, viewAnalytics: true },
          deals: { view: true, create: true, edit: true, delete: true, moveStages: true, markWonLost: true, viewValue: true, editValue: true },
          contacts: { view: true, create: true, edit: true, delete: false, export: true, import: true },
          activities: { view: true, viewAll: true, viewOwn: true, export: true },
          integrations: { useEmail: true, useCalendar: true, useDocuSign: true, useZoom: true },
          dataExport: { exportOwn: true, exportAll: true, exportSensitive: false },
        },
        color: '#059669', // Green
      },
      {
        name: 'Sales Rep',
        description: 'Access to own deals and contacts',
        permissions: {
          workspace: { view: true },
          members: { view: true },
          boards: { view: true, create: false },
          items: { view: true, create: true, editOwn: true, deleteOwn: true },
          pipelines: { view: true, viewAnalytics: true },
          deals: { view: true, create: true, editOwn: true, moveStages: true, viewValue: true },
          contacts: { view: true, create: true, edit: false },
          activities: { view: true, viewOwn: true },
          integrations: { useEmail: true, useCalendar: true, useZoom: true },
          dataExport: { exportOwn: true },
        },
        color: '#0EA5E9', // Sky
      },
      {
        name: 'Support Agent',
        description: 'Access to contacts and activities, limited deal access',
        permissions: {
          workspace: { view: true },
          members: { view: true },
          boards: { view: true },
          items: { view: true, create: true, editOwn: true },
          pipelines: { view: true },
          deals: { view: true },
          contacts: { view: true, create: true, edit: true },
          activities: { view: true, viewAll: true, viewOwn: true },
          integrations: { useEmail: true, useCalendar: true },
          dataExport: { exportOwn: true },
        },
        color: '#8B5CF6', // Violet
      },
      {
        name: 'Analyst',
        description: 'Read-only access with export capabilities',
        permissions: {
          workspace: { view: true },
          members: { view: true },
          boards: { view: true },
          items: { view: true },
          pipelines: { view: true, viewAnalytics: true },
          deals: { view: true, viewValue: true },
          contacts: { view: true, export: true },
          activities: { view: true, viewAll: true, export: true },
          dataExport: { exportOwn: true, exportAll: true },
        },
        color: '#F59E0B', // Amber
      },
    ];

    res.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

module.exports = router;
