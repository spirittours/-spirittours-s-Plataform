/**
 * Permissions Middleware
 * 
 * Granular permission checking for RBAC system
 * Supports role-based and custom permissions
 */

const Role = require('../models/Role');
const Workspace = require('../models/Workspace');

/**
 * Check if user has specific permission
 */
const hasPermission = (category, permission) => {
  return async (req, res, next) => {
    try {
      const workspaceId = req.body.workspace || req.params.workspaceId || req.query.workspace;
      const userId = req.user.id;
      
      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID required' });
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      // Find user's membership
      const member = workspace.members.find(m => m.user.toString() === userId);
      if (!member) {
        return res.status(403).json({ error: 'Not a member of this workspace' });
      }

      // Owner always has all permissions
      if (member.role === 'owner') {
        return next();
      }

      // Get role permissions
      const role = await Role.findOne({
        workspace: workspaceId,
        name: member.role,
      });

      if (!role) {
        return res.status(403).json({ error: 'Role not found' });
      }

      // Check permission
      const hasAccess = role.hasPermission(category, permission);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: `${category}.${permission}`,
          message: `You need '${category}.${permission}' permission to perform this action`,
        });
      }

      // Attach role to request for further use
      req.userRole = role;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

/**
 * Check if user has any of the specified permissions
 */
const hasAnyPermission = (permissions) => {
  return async (req, res, next) => {
    try {
      const workspaceId = req.body.workspace || req.params.workspaceId || req.query.workspace;
      const userId = req.user.id;
      
      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID required' });
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      const member = workspace.members.find(m => m.user.toString() === userId);
      if (!member) {
        return res.status(403).json({ error: 'Not a member of this workspace' });
      }

      if (member.role === 'owner') {
        return next();
      }

      const role = await Role.findOne({
        workspace: workspaceId,
        name: member.role,
      });

      if (!role) {
        return res.status(403).json({ error: 'Role not found' });
      }

      // Check if user has any of the permissions
      const hasAccess = permissions.some(perm => {
        const [category, permission] = perm.split('.');
        return role.hasPermission(category, permission);
      });

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: permissions,
          message: 'You need at least one of the required permissions',
        });
      }

      req.userRole = role;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

/**
 * Check if user has all of the specified permissions
 */
const hasAllPermissions = (permissions) => {
  return async (req, res, next) => {
    try {
      const workspaceId = req.body.workspace || req.params.workspaceId || req.query.workspace;
      const userId = req.user.id;
      
      if (!workspaceId) {
        return res.status(400).json({ error: 'Workspace ID required' });
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }

      const member = workspace.members.find(m => m.user.toString() === userId);
      if (!member) {
        return res.status(403).json({ error: 'Not a member of this workspace' });
      }

      if (member.role === 'owner') {
        return next();
      }

      const role = await Role.findOne({
        workspace: workspaceId,
        name: member.role,
      });

      if (!role) {
        return res.status(403).json({ error: 'Role not found' });
      }

      // Check if user has all permissions
      const hasAccess = permissions.every(perm => {
        const [category, permission] = perm.split('.');
        return role.hasPermission(category, permission);
      });

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: permissions,
          message: 'You need all of the required permissions',
        });
      }

      req.userRole = role;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

/**
 * Check if user is owner or admin
 */
const isAdminOrOwner = async (req, res, next) => {
  try {
    const workspaceId = req.body.workspace || req.params.workspaceId || req.query.workspace;
    const userId = req.user.id;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID required' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const member = workspace.members.find(m => m.user.toString() === userId);
    if (!member) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    if (!['owner', 'admin'].includes(member.role.toLowerCase())) {
      return res.status(403).json({ error: 'Admin or Owner role required' });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ error: 'Permission check failed' });
  }
};

/**
 * Check if user is owner
 */
const isOwner = async (req, res, next) => {
  try {
    const workspaceId = req.body.workspace || req.params.workspaceId || req.query.workspace;
    const userId = req.user.id;
    
    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID required' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const member = workspace.members.find(m => m.user.toString() === userId);
    if (!member) {
      return res.status(403).json({ error: 'Not a member of this workspace' });
    }

    if (member.role.toLowerCase() !== 'owner') {
      return res.status(403).json({ error: 'Owner role required' });
    }

    next();
  } catch (error) {
    console.error('Owner check error:', error);
    res.status(500).json({ error: 'Permission check failed' });
  }
};

/**
 * Get user permissions for workspace
 */
const getUserPermissions = async (workspaceId, userId) => {
  try {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return null;
    }

    const member = workspace.members.find(m => m.user.toString() === userId);
    if (!member) {
      return null;
    }

    if (member.role === 'owner') {
      // Owner has all permissions
      return {
        role: 'owner',
        permissions: 'all',
      };
    }

    const role = await Role.findOne({
      workspace: workspaceId,
      name: member.role,
    });

    if (!role) {
      return null;
    }

    return {
      role: role.name,
      permissions: role.permissions,
    };
  } catch (error) {
    console.error('Get permissions error:', error);
    return null;
  }
};

module.exports = {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isAdminOrOwner,
  isOwner,
  getUserPermissions,
};
