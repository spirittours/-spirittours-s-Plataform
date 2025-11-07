/**
 * Project Routes
 * 
 * API endpoints for project management, tasks, milestones, and resources.
 * Post-sales project tracking and delivery management.
 */

const express = require('express');
const router = express.Router();
const Project = require('../../models/Project');
const Activity = require('../../models/Activity');
const AuditLog = require('../../models/AuditLog');
const { authenticate } = require('../../middleware/auth');
const { hasPermission } = require('../../middleware/permissions');

// All routes require authentication
router.use(authenticate);

/**
 * GET /projects/:workspaceId
 * Get all projects in workspace
 */
router.get('/:workspaceId', 
  hasPermission('workspace', 'view'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { status, includeArchived } = req.query;
      
      const projects = await Project.findByWorkspace(workspaceId, {
        status,
        includeArchived: includeArchived === 'true',
      });
      
      res.json({
        success: true,
        projects,
        total: projects.length,
      });
    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({ error: 'Failed to retrieve projects' });
    }
  }
);

/**
 * GET /projects/:workspaceId/:projectId
 * Get single project details
 */
router.get('/:workspaceId/:projectId',
  hasPermission('workspace', 'view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      
      const project = await Project.findById(projectId)
        .populate('projectManager', 'firstName lastName email avatar')
        .populate('team.user', 'firstName lastName email avatar')
        .populate('deal', 'title value stage')
        .populate('contact', 'firstName lastName company email')
        .populate('resources.user', 'firstName lastName email');
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json({ success: true, project });
    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({ error: 'Failed to retrieve project' });
    }
  }
);

/**
 * POST /projects/:workspaceId
 * Create new project
 */
router.post('/:workspaceId',
  hasPermission('workspace', 'edit'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const projectData = req.body;
      
      // Generate project code
      const code = await Project.generateProjectCode(workspaceId);
      
      const project = new Project({
        ...projectData,
        workspace: workspaceId,
        code,
        projectManager: projectData.projectManager || req.user.id,
      });
      
      await project.save();
      
      // Log activity
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'project_created',
        metadata: {
          projectId: project._id,
          projectName: project.name,
          projectCode: project.code,
        },
      });
      
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'create',
        resourceType: 'Project',
        resourceId: project._id,
        changes: { after: project.toObject() },
        severity: 'info',
      });
      
      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        project,
      });
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
);

/**
 * PUT /projects/:workspaceId/:projectId
 * Update project
 */
router.put('/:workspaceId/:projectId',
  hasPermission('workspace', 'edit'),
  async (req, res) => {
    try {
      const { projectId, workspaceId } = req.params;
      const updates = req.body;
      
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const before = project.toObject();
      
      Object.assign(project, updates);
      await project.save();
      
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'update',
        resourceType: 'Project',
        resourceId: project._id,
        changes: { before, after: project.toObject() },
        severity: 'info',
      });
      
      res.json({
        success: true,
        message: 'Project updated successfully',
        project,
      });
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }
);

/**
 * DELETE /projects/:workspaceId/:projectId
 * Archive project
 */
router.delete('/:workspaceId/:projectId',
  hasPermission('workspace', 'delete'),
  async (req, res) => {
    try {
      const { projectId, workspaceId } = req.params;
      
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      project.isArchived = true;
      project.archivedAt = new Date();
      project.archivedBy = req.user.id;
      await project.save();
      
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'delete',
        resourceType: 'Project',
        resourceId: project._id,
        severity: 'warning',
      });
      
      res.json({
        success: true,
        message: 'Project archived successfully',
      });
    } catch (error) {
      console.error('Archive project error:', error);
      res.status(500).json({ error: 'Failed to archive project' });
    }
  }
);

/**
 * POST /projects/:workspaceId/:projectId/tasks
 * Add task to project
 */
router.post('/:workspaceId/:projectId/tasks',
  hasPermission('workspace', 'edit'),
  async (req, res) => {
    try {
      const { projectId, workspaceId } = req.params;
      const taskData = req.body;
      
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      await project.addTask(taskData);
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'task_created',
        metadata: {
          projectId: project._id,
          taskTitle: taskData.title,
        },
      });
      
      res.status(201).json({
        success: true,
        message: 'Task added successfully',
        project,
      });
    } catch (error) {
      console.error('Add task error:', error);
      res.status(500).json({ error: 'Failed to add task' });
    }
  }
);

/**
 * PUT /projects/:workspaceId/:projectId/tasks/:taskId
 * Update task
 */
router.put('/:workspaceId/:projectId/tasks/:taskId',
  hasPermission('workspace', 'edit'),
  async (req, res) => {
    try {
      const { projectId, taskId } = req.params;
      const updates = req.body;
      
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      await project.updateTask(taskId, updates);
      
      res.json({
        success: true,
        message: 'Task updated successfully',
        project,
      });
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  }
);

/**
 * POST /projects/:workspaceId/:projectId/milestones
 * Add milestone
 */
router.post('/:workspaceId/:projectId/milestones',
  hasPermission('workspace', 'edit'),
  async (req, res) => {
    try {
      const { projectId, workspaceId } = req.params;
      const milestoneData = req.body;
      
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      await project.addMilestone(milestoneData);
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'milestone_created',
        metadata: {
          projectId: project._id,
          milestoneTitle: milestoneData.title,
        },
      });
      
      res.status(201).json({
        success: true,
        message: 'Milestone added successfully',
        project,
      });
    } catch (error) {
      console.error('Add milestone error:', error);
      res.status(500).json({ error: 'Failed to add milestone' });
    }
  }
);

/**
 * POST /projects/:workspaceId/:projectId/team
 * Add team member
 */
router.post('/:workspaceId/:projectId/team',
  hasPermission('workspace', 'edit'),
  async (req, res) => {
    try {
      const { projectId, workspaceId } = req.params;
      const { userId, role } = req.body;
      
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      await project.addTeamMember(userId, role);
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'team_member_added',
        metadata: {
          projectId: project._id,
          addedUserId: userId,
          role,
        },
      });
      
      res.json({
        success: true,
        message: 'Team member added successfully',
        project,
      });
    } catch (error) {
      console.error('Add team member error:', error);
      res.status(500).json({ error: error.message || 'Failed to add team member' });
    }
  }
);

/**
 * DELETE /projects/:workspaceId/:projectId/team/:userId
 * Remove team member
 */
router.delete('/:workspaceId/:projectId/team/:userId',
  hasPermission('workspace', 'edit'),
  async (req, res) => {
    try {
      const { projectId, userId } = req.params;
      
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      await project.removeTeamMember(userId);
      
      res.json({
        success: true,
        message: 'Team member removed successfully',
        project,
      });
    } catch (error) {
      console.error('Remove team member error:', error);
      res.status(500).json({ error: 'Failed to remove team member' });
    }
  }
);

/**
 * GET /projects/:workspaceId/:projectId/stats
 * Get project statistics
 */
router.get('/:workspaceId/:projectId/stats',
  hasPermission('workspace', 'view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const stats = {
        progress: project.progress,
        health: project.health,
        totalTasks: project.totalTasks,
        completedTasks: project.completedTasks,
        overdueTasks: project.overdueTasks,
        daysRemaining: project.daysRemaining,
        budgetUsagePercentage: project.budgetUsagePercentage,
        milestones: {
          total: project.milestones.length,
          completed: project.milestones.filter(m => m.status === 'completed').length,
          pending: project.milestones.filter(m => m.status === 'pending').length,
        },
        team: {
          totalMembers: project.team.length,
          roles: project.team.reduce((acc, member) => {
            acc[member.role] = (acc[member.role] || 0) + 1;
            return acc;
          }, {}),
        },
      };
      
      res.json({ success: true, stats });
    } catch (error) {
      console.error('Get project stats error:', error);
      res.status(500).json({ error: 'Failed to retrieve statistics' });
    }
  }
);

module.exports = router;
