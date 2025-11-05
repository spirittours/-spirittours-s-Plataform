/**
 * Time Entry Routes
 * 
 * API endpoints for time tracking, timers, and billable hours management.
 * Supports running timers, manual entries, and reporting.
 */

const express = require('express');
const router = express.Router();
const TimeEntry = require('../../models/TimeEntry');
const Activity = require('../../models/Activity');
const AuditLog = require('../../models/AuditLog');
const { authenticate } = require('../../middleware/auth');
const { hasPermission } = require('../../middleware/permissions');

// All routes require authentication
router.use(authenticate);

/**
 * GET /time-entries/:workspaceId
 * Get all time entries
 */
router.get('/:workspaceId',
  hasPermission('workspace', 'view'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { startDate, endDate, userId, billable, status } = req.query;
      
      const query = { workspace: workspaceId, isDeleted: false };
      
      if (startDate && endDate) {
        query.startTime = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }
      
      if (userId) query.user = userId;
      if (billable !== undefined) query.billable = billable === 'true';
      if (status) query.status = status;
      
      const entries = await TimeEntry.find(query)
        .populate('user', 'firstName lastName email avatar')
        .populate('workspace', 'name')
        .populate('relatedTo.entityId')
        .sort({ startTime: -1 });
      
      res.json({
        success: true,
        entries,
        total: entries.length,
      });
    } catch (error) {
      console.error('Get time entries error:', error);
      res.status(500).json({ error: 'Failed to retrieve time entries' });
    }
  }
);

/**
 * GET /time-entries/:workspaceId/my
 * Get current user's time entries
 */
router.get('/:workspaceId/my',
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { startDate, endDate, billable, status } = req.query;
      
      const entries = await TimeEntry.findByUser(req.user.id, {
        startDate,
        endDate,
        billable: billable === 'true',
        status,
      });
      
      res.json({
        success: true,
        entries,
        total: entries.length,
      });
    } catch (error) {
      console.error('Get my time entries error:', error);
      res.status(500).json({ error: 'Failed to retrieve time entries' });
    }
  }
);

/**
 * GET /time-entries/:workspaceId/running
 * Get currently running timer
 */
router.get('/:workspaceId/running',
  async (req, res) => {
    try {
      const runningTimer = await TimeEntry.getRunningTimer(req.user.id);
      
      res.json({
        success: true,
        timer: runningTimer,
        isRunning: !!runningTimer,
      });
    } catch (error) {
      console.error('Get running timer error:', error);
      res.status(500).json({ error: 'Failed to retrieve running timer' });
    }
  }
);

/**
 * POST /time-entries/:workspaceId/start
 * Start new timer
 */
router.post('/:workspaceId/start',
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { description, entityType, entityId, billable, type, hourlyRate } = req.body;
      
      // Check if there's already a running timer
      const runningTimer = await TimeEntry.getRunningTimer(req.user.id);
      if (runningTimer) {
        return res.status(400).json({
          error: 'Timer already running',
          runningTimer,
        });
      }
      
      const entry = new TimeEntry({
        user: req.user.id,
        workspace: workspaceId,
        relatedTo: {
          entityType,
          entityId,
        },
        description,
        startTime: new Date(),
        duration: 0,
        billable: billable !== false,
        type: type || 'work',
        hourlyRate,
        status: 'running',
      });
      
      await entry.save();
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'timer_started',
        metadata: {
          timeEntryId: entry._id,
          description,
        },
      });
      
      res.status(201).json({
        success: true,
        message: 'Timer started successfully',
        entry,
      });
    } catch (error) {
      console.error('Start timer error:', error);
      res.status(500).json({ error: 'Failed to start timer' });
    }
  }
);

/**
 * POST /time-entries/:workspaceId/:entryId/stop
 * Stop running timer
 */
router.post('/:workspaceId/:entryId/stop',
  async (req, res) => {
    try {
      const { entryId, workspaceId } = req.params;
      
      const entry = await TimeEntry.findById(entryId);
      if (!entry) {
        return res.status(404).json({ error: 'Time entry not found' });
      }
      
      if (entry.user.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Can only stop your own timer' });
      }
      
      await entry.stop();
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'timer_stopped',
        metadata: {
          timeEntryId: entry._id,
          duration: entry.duration,
        },
      });
      
      res.json({
        success: true,
        message: 'Timer stopped successfully',
        entry,
      });
    } catch (error) {
      console.error('Stop timer error:', error);
      res.status(500).json({ error: error.message || 'Failed to stop timer' });
    }
  }
);

/**
 * POST /time-entries/:workspaceId
 * Create manual time entry
 */
router.post('/:workspaceId',
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const {
        description,
        entityType,
        entityId,
        startTime,
        endTime,
        duration,
        billable,
        type,
        hourlyRate,
        notes,
      } = req.body;
      
      const entry = new TimeEntry({
        user: req.user.id,
        workspace: workspaceId,
        relatedTo: {
          entityType,
          entityId,
        },
        description,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        duration: duration || 0,
        billable: billable !== false,
        type: type || 'work',
        hourlyRate,
        notes,
        isManual: true,
        status: 'stopped',
      });
      
      await entry.save();
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'time_entry_created',
        metadata: {
          timeEntryId: entry._id,
          duration: entry.duration,
        },
      });
      
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'create',
        resourceType: 'TimeEntry',
        resourceId: entry._id,
        severity: 'info',
      });
      
      res.status(201).json({
        success: true,
        message: 'Time entry created successfully',
        entry,
      });
    } catch (error) {
      console.error('Create time entry error:', error);
      res.status(500).json({ error: 'Failed to create time entry' });
    }
  }
);

/**
 * PUT /time-entries/:workspaceId/:entryId
 * Update time entry
 */
router.put('/:workspaceId/:entryId',
  async (req, res) => {
    try {
      const { entryId, workspaceId } = req.params;
      const updates = req.body;
      
      const entry = await TimeEntry.findById(entryId);
      if (!entry) {
        return res.status(404).json({ error: 'Time entry not found' });
      }
      
      if (entry.user.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Can only edit your own time entries' });
      }
      
      if (entry.status === 'running') {
        return res.status(400).json({ error: 'Cannot edit running timer' });
      }
      
      const before = entry.toObject();
      Object.assign(entry, updates);
      await entry.save();
      
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'update',
        resourceType: 'TimeEntry',
        resourceId: entry._id,
        changes: { before, after: entry.toObject() },
        severity: 'info',
      });
      
      res.json({
        success: true,
        message: 'Time entry updated successfully',
        entry,
      });
    } catch (error) {
      console.error('Update time entry error:', error);
      res.status(500).json({ error: 'Failed to update time entry' });
    }
  }
);

/**
 * DELETE /time-entries/:workspaceId/:entryId
 * Delete time entry
 */
router.delete('/:workspaceId/:entryId',
  async (req, res) => {
    try {
      const { entryId, workspaceId } = req.params;
      
      const entry = await TimeEntry.findById(entryId);
      if (!entry) {
        return res.status(404).json({ error: 'Time entry not found' });
      }
      
      if (entry.user.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Can only delete your own time entries' });
      }
      
      entry.isDeleted = true;
      entry.deletedAt = new Date();
      entry.deletedBy = req.user.id;
      await entry.save();
      
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'delete',
        resourceType: 'TimeEntry',
        resourceId: entry._id,
        severity: 'warning',
      });
      
      res.json({
        success: true,
        message: 'Time entry deleted successfully',
      });
    } catch (error) {
      console.error('Delete time entry error:', error);
      res.status(500).json({ error: 'Failed to delete time entry' });
    }
  }
);

/**
 * POST /time-entries/:workspaceId/:entryId/approve
 * Approve time entry
 */
router.post('/:workspaceId/:entryId/approve',
  hasPermission('workspace', 'edit'),
  async (req, res) => {
    try {
      const { entryId, workspaceId } = req.params;
      
      const entry = await TimeEntry.findById(entryId);
      if (!entry) {
        return res.status(404).json({ error: 'Time entry not found' });
      }
      
      await entry.approve(req.user.id);
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'time_entry_approved',
        metadata: {
          timeEntryId: entry._id,
          userId: entry.user,
        },
      });
      
      res.json({
        success: true,
        message: 'Time entry approved successfully',
        entry,
      });
    } catch (error) {
      console.error('Approve time entry error:', error);
      res.status(500).json({ error: error.message || 'Failed to approve time entry' });
    }
  }
);

/**
 * POST /time-entries/:workspaceId/:entryId/reject
 * Reject time entry
 */
router.post('/:workspaceId/:entryId/reject',
  hasPermission('workspace', 'edit'),
  async (req, res) => {
    try {
      const { entryId, workspaceId } = req.params;
      const { reason } = req.body;
      
      const entry = await TimeEntry.findById(entryId);
      if (!entry) {
        return res.status(404).json({ error: 'Time entry not found' });
      }
      
      await entry.reject(req.user.id, reason);
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'time_entry_rejected',
        metadata: {
          timeEntryId: entry._id,
          userId: entry.user,
          reason,
        },
      });
      
      res.json({
        success: true,
        message: 'Time entry rejected',
        entry,
      });
    } catch (error) {
      console.error('Reject time entry error:', error);
      res.status(500).json({ error: error.message || 'Failed to reject time entry' });
    }
  }
);

/**
 * GET /time-entries/:workspaceId/reports/daily
 * Get daily time report
 */
router.get('/:workspaceId/reports/daily',
  async (req, res) => {
    try {
      const { date } = req.query;
      const reportDate = date ? new Date(date) : new Date();
      
      const report = await TimeEntry.getDailyReport(req.user.id, reportDate);
      
      res.json({
        success: true,
        report,
      });
    } catch (error) {
      console.error('Get daily report error:', error);
      res.status(500).json({ error: 'Failed to generate daily report' });
    }
  }
);

/**
 * GET /time-entries/:workspaceId/reports/summary
 * Get time summary for date range
 */
router.get('/:workspaceId/reports/summary',
  async (req, res) => {
    try {
      const { startDate, endDate, userId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date required' });
      }
      
      const targetUserId = userId || req.user.id;
      
      const totalHours = await TimeEntry.getTotalHours(
        targetUserId,
        startDate,
        endDate
      );
      
      const billableHours = await TimeEntry.getBillableHours(
        targetUserId,
        startDate,
        endDate
      );
      
      res.json({
        success: true,
        summary: {
          startDate,
          endDate,
          totalHours,
          billableHours,
          nonBillableHours: totalHours - billableHours,
        },
      });
    } catch (error) {
      console.error('Get summary error:', error);
      res.status(500).json({ error: 'Failed to generate summary' });
    }
  }
);

/**
 * GET /time-entries/:workspaceId/project/:projectId
 * Get time entries for project
 */
router.get('/:workspaceId/project/:projectId',
  hasPermission('workspace', 'view'),
  async (req, res) => {
    try {
      const { projectId } = req.params;
      const { userId } = req.query;
      
      const entries = await TimeEntry.findByProject(projectId, { user: userId });
      
      res.json({
        success: true,
        entries,
        total: entries.length,
      });
    } catch (error) {
      console.error('Get project time entries error:', error);
      res.status(500).json({ error: 'Failed to retrieve time entries' });
    }
  }
);

/**
 * GET /time-entries/:workspaceId/uninvoiced
 * Get uninvoiced billable entries
 */
router.get('/:workspaceId/uninvoiced',
  hasPermission('workspace', 'view'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { userId, projectId } = req.query;
      
      const entries = await TimeEntry.getUninvoicedEntries(workspaceId, {
        user: userId,
        projectId,
      });
      
      const totalCost = entries.reduce((sum, entry) => sum + (entry.cost || 0), 0);
      const totalHours = entries.reduce((sum, entry) => sum + entry.duration, 0) / 3600;
      
      res.json({
        success: true,
        entries,
        total: entries.length,
        totalCost,
        totalHours,
      });
    } catch (error) {
      console.error('Get uninvoiced entries error:', error);
      res.status(500).json({ error: 'Failed to retrieve uninvoiced entries' });
    }
  }
);

module.exports = router;
