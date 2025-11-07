/**
 * Comment Routes
 * 
 * API endpoints for universal comment system with @mentions and threading.
 * Supports comments on any entity type (Deal, Contact, Project, Task, Document).
 */

const express = require('express');
const router = express.Router();
const Comment = require('../../models/Comment');
const Activity = require('../../models/Activity');
const AuditLog = require('../../models/AuditLog');
const { authenticate } = require('../../middleware/auth');
const { hasPermission } = require('../../middleware/permissions');

// All routes require authentication
router.use(authenticate);

/**
 * GET /comments/:workspaceId/:entityType/:entityId
 * Get all comments for an entity
 */
router.get('/:workspaceId/:entityType/:entityId',
  hasPermission('workspace', 'view'),
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const { includeReplies, resolved } = req.query;
      
      const comments = await Comment.findByEntity(entityType, entityId, {
        includeReplies: includeReplies === 'true',
        resolved: resolved ? resolved === 'true' : undefined,
      });
      
      res.json({
        success: true,
        comments,
        total: comments.length,
      });
    } catch (error) {
      console.error('Get comments error:', error);
      res.status(500).json({ error: 'Failed to retrieve comments' });
    }
  }
);

/**
 * GET /comments/:workspaceId/comment/:commentId/replies
 * Get replies for a comment
 */
router.get('/:workspaceId/comment/:commentId/replies',
  hasPermission('workspace', 'view'),
  async (req, res) => {
    try {
      const { commentId } = req.params;
      
      const replies = await Comment.findReplies(commentId);
      
      res.json({
        success: true,
        replies,
        total: replies.length,
      });
    } catch (error) {
      console.error('Get replies error:', error);
      res.status(500).json({ error: 'Failed to retrieve replies' });
    }
  }
);

/**
 * POST /comments/:workspaceId
 * Create new comment
 */
router.post('/:workspaceId',
  hasPermission('workspace', 'view'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const {
        entityType,
        entityId,
        content,
        mentions,
        parentComment,
        attachments,
      } = req.body;
      
      if (!content || !entityType || !entityId) {
        return res.status(400).json({
          error: 'Content, entityType, and entityId are required',
        });
      }
      
      const comment = new Comment({
        workspace: workspaceId,
        author: req.user.id,
        relatedTo: {
          entityType,
          entityId,
        },
        content,
        mentions: mentions || [],
        parentComment,
        attachments: attachments || [],
      });
      
      await comment.save();
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'comment_added',
        metadata: {
          commentId: comment._id,
          entityType,
          entityId,
          hasParent: !!parentComment,
        },
      });
      
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'create',
        resourceType: 'Comment',
        resourceId: comment._id,
        severity: 'info',
      });
      
      // Populate before returning
      await comment.populate('author', 'firstName lastName email avatar');
      await comment.populate('mentions', 'firstName lastName email');
      
      res.status(201).json({
        success: true,
        message: 'Comment created successfully',
        comment,
      });
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({ error: 'Failed to create comment' });
    }
  }
);

/**
 * PUT /comments/:workspaceId/:commentId
 * Edit comment
 */
router.put('/:workspaceId/:commentId',
  async (req, res) => {
    try {
      const { commentId, workspaceId } = req.params;
      const { content, mentions } = req.body;
      
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      // Only author can edit
      if (comment.author.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Can only edit your own comments' });
      }
      
      const before = comment.toObject();
      await comment.edit(content, mentions);
      
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'update',
        resourceType: 'Comment',
        resourceId: comment._id,
        changes: { before, after: comment.toObject() },
        severity: 'info',
      });
      
      await comment.populate('author', 'firstName lastName email avatar');
      await comment.populate('mentions', 'firstName lastName email');
      
      res.json({
        success: true,
        message: 'Comment updated successfully',
        comment,
      });
    } catch (error) {
      console.error('Edit comment error:', error);
      res.status(500).json({ error: 'Failed to edit comment' });
    }
  }
);

/**
 * DELETE /comments/:workspaceId/:commentId
 * Soft delete comment
 */
router.delete('/:workspaceId/:commentId',
  async (req, res) => {
    try {
      const { commentId, workspaceId } = req.params;
      
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      // Only author can delete
      if (comment.author.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Can only delete your own comments' });
      }
      
      await comment.softDelete(req.user.id);
      
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'delete',
        resourceType: 'Comment',
        resourceId: comment._id,
        severity: 'info',
      });
      
      res.json({
        success: true,
        message: 'Comment deleted successfully',
      });
    } catch (error) {
      console.error('Delete comment error:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  }
);

/**
 * POST /comments/:workspaceId/:commentId/reaction
 * Add reaction to comment
 */
router.post('/:workspaceId/:commentId/reaction',
  async (req, res) => {
    try {
      const { commentId } = req.params;
      const { emoji } = req.body;
      
      if (!emoji) {
        return res.status(400).json({ error: 'Emoji required' });
      }
      
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      await comment.addReaction(req.user.id, emoji);
      
      res.json({
        success: true,
        message: 'Reaction added successfully',
        comment,
      });
    } catch (error) {
      console.error('Add reaction error:', error);
      res.status(500).json({ error: 'Failed to add reaction' });
    }
  }
);

/**
 * DELETE /comments/:workspaceId/:commentId/reaction/:emoji
 * Remove reaction from comment
 */
router.delete('/:workspaceId/:commentId/reaction/:emoji',
  async (req, res) => {
    try {
      const { commentId, emoji } = req.params;
      
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      await comment.removeReaction(req.user.id, decodeURIComponent(emoji));
      
      res.json({
        success: true,
        message: 'Reaction removed successfully',
        comment,
      });
    } catch (error) {
      console.error('Remove reaction error:', error);
      res.status(500).json({ error: 'Failed to remove reaction' });
    }
  }
);

/**
 * POST /comments/:workspaceId/:commentId/resolve
 * Resolve comment/thread
 */
router.post('/:workspaceId/:commentId/resolve',
  hasPermission('workspace', 'edit'),
  async (req, res) => {
    try {
      const { commentId, workspaceId } = req.params;
      
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      await comment.resolve(req.user.id);
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'comment_resolved',
        metadata: {
          commentId: comment._id,
        },
      });
      
      res.json({
        success: true,
        message: 'Comment resolved successfully',
        comment,
      });
    } catch (error) {
      console.error('Resolve comment error:', error);
      res.status(500).json({ error: 'Failed to resolve comment' });
    }
  }
);

/**
 * POST /comments/:workspaceId/:commentId/unresolve
 * Unresolve comment/thread
 */
router.post('/:workspaceId/:commentId/unresolve',
  hasPermission('workspace', 'edit'),
  async (req, res) => {
    try {
      const { commentId } = req.params;
      
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      await comment.unresolve();
      
      res.json({
        success: true,
        message: 'Comment unresolved successfully',
        comment,
      });
    } catch (error) {
      console.error('Unresolve comment error:', error);
      res.status(500).json({ error: 'Failed to unresolve comment' });
    }
  }
);

/**
 * POST /comments/:workspaceId/:commentId/pin
 * Pin comment
 */
router.post('/:workspaceId/:commentId/pin',
  hasPermission('workspace', 'edit'),
  async (req, res) => {
    try {
      const { commentId } = req.params;
      
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      await comment.pin();
      
      res.json({
        success: true,
        message: 'Comment pinned successfully',
        comment,
      });
    } catch (error) {
      console.error('Pin comment error:', error);
      res.status(500).json({ error: 'Failed to pin comment' });
    }
  }
);

/**
 * POST /comments/:workspaceId/:commentId/unpin
 * Unpin comment
 */
router.post('/:workspaceId/:commentId/unpin',
  hasPermission('workspace', 'edit'),
  async (req, res) => {
    try {
      const { commentId } = req.params;
      
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
      
      await comment.unpin();
      
      res.json({
        success: true,
        message: 'Comment unpinned successfully',
        comment,
      });
    } catch (error) {
      console.error('Unpin comment error:', error);
      res.status(500).json({ error: 'Failed to unpin comment' });
    }
  }
);

/**
 * GET /comments/:workspaceId/mentions
 * Get comments where user is mentioned
 */
router.get('/:workspaceId/mentions',
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { unreadOnly, limit } = req.query;
      
      const mentions = await Comment.findMentions(req.user.id, {
        workspace: workspaceId,
        unreadOnly: unreadOnly === 'true',
        limit: limit ? parseInt(limit) : 50,
      });
      
      res.json({
        success: true,
        mentions,
        total: mentions.length,
      });
    } catch (error) {
      console.error('Get mentions error:', error);
      res.status(500).json({ error: 'Failed to retrieve mentions' });
    }
  }
);

/**
 * GET /comments/:workspaceId/activity-feed
 * Get activity feed of comments
 */
router.get('/:workspaceId/activity-feed',
  hasPermission('workspace', 'view'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { entityType, entityId, author, limit } = req.query;
      
      const feed = await Comment.getActivityFeed(workspaceId, {
        entityType,
        entityId,
        author,
        limit: limit ? parseInt(limit) : 50,
      });
      
      res.json({
        success: true,
        feed,
        total: feed.length,
      });
    } catch (error) {
      console.error('Get activity feed error:', error);
      res.status(500).json({ error: 'Failed to retrieve activity feed' });
    }
  }
);

/**
 * GET /comments/:workspaceId/search
 * Search comments
 */
router.get('/:workspaceId/search',
  hasPermission('workspace', 'view'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { q, entityType, author, limit } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: 'Search query required' });
      }
      
      const comments = await Comment.search(workspaceId, q, {
        entityType,
        author,
        limit: limit ? parseInt(limit) : 20,
      });
      
      res.json({
        success: true,
        comments,
        total: comments.length,
        query: q,
      });
    } catch (error) {
      console.error('Search comments error:', error);
      res.status(500).json({ error: 'Failed to search comments' });
    }
  }
);

/**
 * GET /comments/:workspaceId/stats
 * Get comment statistics for user
 */
router.get('/:workspaceId/stats',
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { userId } = req.query;
      
      const targetUserId = userId || req.user.id;
      
      const stats = await Comment.getUserStats(targetUserId, workspaceId);
      
      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error('Get comment stats error:', error);
      res.status(500).json({ error: 'Failed to retrieve statistics' });
    }
  }
);

module.exports = router;
