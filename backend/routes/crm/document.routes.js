/**
 * Document Routes
 * 
 * API endpoints for document management with versioning and permissions.
 * File upload, sharing, approval workflows, and collaboration.
 */

const express = require('express');
const router = express.Router();
const Document = require('../../models/Document');
const Activity = require('../../models/Activity');
const AuditLog = require('../../models/AuditLog');
const { authenticate } = require('../../middleware/auth');
const { hasPermission } = require('../../middleware/permissions');

// All routes require authentication
router.use(authenticate);

/**
 * GET /documents/:workspaceId
 * Get all documents in workspace
 */
router.get('/:workspaceId',
  hasPermission('workspace', 'view'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { type, status, folder } = req.query;
      
      const documents = await Document.findByWorkspace(workspaceId, {
        type,
        status,
        folder,
      });
      
      res.json({
        success: true,
        documents,
        total: documents.length,
      });
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ error: 'Failed to retrieve documents' });
    }
  }
);

/**
 * GET /documents/:workspaceId/:documentId
 * Get single document
 */
router.get('/:workspaceId/:documentId',
  async (req, res) => {
    try {
      const { documentId, workspaceId } = req.params;
      
      const document = await Document.findById(documentId)
        .populate('owner', 'firstName lastName email avatar')
        .populate('permissions.sharedWith.user', 'firstName lastName email avatar')
        .populate('comments.user', 'firstName lastName email avatar')
        .populate('approvalWorkflow.approvers.user', 'firstName lastName email');
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check access
      if (!document.canUserAccess(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      // Record view
      await document.recordView(req.user.id);
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'document_viewed',
        metadata: {
          documentId: document._id,
          documentName: document.name,
        },
      });
      
      res.json({ success: true, document });
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({ error: 'Failed to retrieve document' });
    }
  }
);

/**
 * POST /documents/:workspaceId
 * Upload new document
 */
router.post('/:workspaceId',
  hasPermission('workspace', 'edit'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const documentData = req.body;
      
      // Initialize first version
      const firstVersion = {
        versionNumber: 1,
        fileUrl: documentData.fileUrl,
        fileName: documentData.fileName,
        fileSize: documentData.fileSize,
        mimeType: documentData.mimeType,
        uploadedBy: req.user.id,
      };
      
      const document = new Document({
        ...documentData,
        workspace: workspaceId,
        owner: req.user.id,
        versions: [firstVersion],
        currentVersion: 1,
      });
      
      await document.save();
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'document_uploaded',
        metadata: {
          documentId: document._id,
          documentName: document.name,
          fileSize: document.fileSize,
        },
      });
      
      await AuditLog.log({
        workspace: workspaceId,
        user: req.user.id,
        action: 'create',
        resourceType: 'Document',
        resourceId: document._id,
        severity: 'info',
      });
      
      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        document,
      });
    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }
);

/**
 * POST /documents/:workspaceId/:documentId/versions
 * Upload new version
 */
router.post('/:workspaceId/:documentId/versions',
  async (req, res) => {
    try {
      const { documentId, workspaceId } = req.params;
      const versionData = req.body;
      
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Check edit permission
      if (!document.canUserAccess(req.user.id, 'edit')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      await document.addVersion({
        ...versionData,
        uploadedBy: req.user.id,
      });
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'document_version_added',
        metadata: {
          documentId: document._id,
          versionNumber: document.currentVersion,
        },
      });
      
      res.json({
        success: true,
        message: 'New version uploaded',
        document,
      });
    } catch (error) {
      console.error('Upload version error:', error);
      res.status(500).json({ error: 'Failed to upload version' });
    }
  }
);

/**
 * POST /documents/:workspaceId/:documentId/share
 * Share document with user
 */
router.post('/:workspaceId/:documentId/share',
  async (req, res) => {
    try {
      const { documentId, workspaceId } = req.params;
      const { userId, accessLevel } = req.body;
      
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      // Only owner or admin can share
      if (!document.canUserAccess(req.user.id, 'admin')) {
        return res.status(403).json({ error: 'Only document owner can share' });
      }
      
      await document.shareWith(userId, accessLevel, req.user.id);
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'document_shared',
        metadata: {
          documentId: document._id,
          sharedWithUserId: userId,
          accessLevel,
        },
      });
      
      res.json({
        success: true,
        message: 'Document shared successfully',
        document,
      });
    } catch (error) {
      console.error('Share document error:', error);
      res.status(500).json({ error: 'Failed to share document' });
    }
  }
);

/**
 * DELETE /documents/:workspaceId/:documentId/share/:userId
 * Revoke document access
 */
router.delete('/:workspaceId/:documentId/share/:userId',
  async (req, res) => {
    try {
      const { documentId, userId } = req.params;
      
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      if (!document.canUserAccess(req.user.id, 'admin')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      await document.revokeAccess(userId);
      
      res.json({
        success: true,
        message: 'Access revoked successfully',
        document,
      });
    } catch (error) {
      console.error('Revoke access error:', error);
      res.status(500).json({ error: 'Failed to revoke access' });
    }
  }
);

/**
 * POST /documents/:workspaceId/:documentId/comments
 * Add comment
 */
router.post('/:workspaceId/:documentId/comments',
  async (req, res) => {
    try {
      const { documentId, workspaceId } = req.params;
      const { content, mentions } = req.body;
      
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      if (!document.canUserAccess(req.user.id, 'comment')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      await document.addComment(req.user.id, content, mentions);
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'document_commented',
        metadata: {
          documentId: document._id,
        },
      });
      
      res.json({
        success: true,
        message: 'Comment added successfully',
        document,
      });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ error: 'Failed to add comment' });
    }
  }
);

/**
 * POST /documents/:workspaceId/:documentId/approval
 * Request approval
 */
router.post('/:workspaceId/:documentId/approval',
  async (req, res) => {
    try {
      const { documentId, workspaceId } = req.params;
      const { approvers } = req.body;
      
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      if (document.owner.toString() !== req.user.id) {
        return res.status(403).json({ error: 'Only owner can request approval' });
      }
      
      await document.requestApproval(approvers);
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'document_approval_requested',
        metadata: {
          documentId: document._id,
          approversCount: approvers.length,
        },
      });
      
      res.json({
        success: true,
        message: 'Approval requested successfully',
        document,
      });
    } catch (error) {
      console.error('Request approval error:', error);
      res.status(500).json({ error: 'Failed to request approval' });
    }
  }
);

/**
 * POST /documents/:workspaceId/:documentId/approve
 * Approve document
 */
router.post('/:workspaceId/:documentId/approve',
  async (req, res) => {
    try {
      const { documentId, workspaceId } = req.params;
      const { comments } = req.body;
      
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      await document.approve(req.user.id, comments);
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'document_approved',
        metadata: {
          documentId: document._id,
        },
      });
      
      res.json({
        success: true,
        message: 'Document approved successfully',
        document,
      });
    } catch (error) {
      console.error('Approve document error:', error);
      res.status(500).json({ error: error.message || 'Failed to approve document' });
    }
  }
);

/**
 * POST /documents/:workspaceId/:documentId/reject
 * Reject document
 */
router.post('/:workspaceId/:documentId/reject',
  async (req, res) => {
    try {
      const { documentId, workspaceId } = req.params;
      const { comments } = req.body;
      
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      await document.reject(req.user.id, comments);
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'document_rejected',
        metadata: {
          documentId: document._id,
        },
      });
      
      res.json({
        success: true,
        message: 'Document rejected',
        document,
      });
    } catch (error) {
      console.error('Reject document error:', error);
      res.status(500).json({ error: error.message || 'Failed to reject document' });
    }
  }
);

/**
 * POST /documents/:workspaceId/:documentId/lock
 * Lock document for editing
 */
router.post('/:workspaceId/:documentId/lock',
  async (req, res) => {
    try {
      const { documentId } = req.params;
      
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      if (!document.canUserAccess(req.user.id, 'edit')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      await document.lock(req.user.id);
      
      res.json({
        success: true,
        message: 'Document locked successfully',
        document,
      });
    } catch (error) {
      console.error('Lock document error:', error);
      res.status(500).json({ error: error.message || 'Failed to lock document' });
    }
  }
);

/**
 * POST /documents/:workspaceId/:documentId/unlock
 * Unlock document
 */
router.post('/:workspaceId/:documentId/unlock',
  async (req, res) => {
    try {
      const { documentId } = req.params;
      
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      await document.unlock(req.user.id);
      
      res.json({
        success: true,
        message: 'Document unlocked successfully',
        document,
      });
    } catch (error) {
      console.error('Unlock document error:', error);
      res.status(500).json({ error: error.message || 'Failed to unlock document' });
    }
  }
);

/**
 * GET /documents/:workspaceId/:documentId/download
 * Download document
 */
router.get('/:workspaceId/:documentId/download',
  async (req, res) => {
    try {
      const { documentId, workspaceId } = req.params;
      const { version } = req.query;
      
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      if (!document.canUserAccess(req.user.id)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      if (!document.permissions.allowDownload) {
        return res.status(403).json({ error: 'Downloads not allowed for this document' });
      }
      
      // Record download
      await document.recordDownload(req.user.id);
      
      await Activity.logActivity({
        workspace: workspaceId,
        user: req.user.id,
        type: 'document_downloaded',
        metadata: {
          documentId: document._id,
          version: version || document.currentVersion,
        },
      });
      
      // Get file URL based on version
      let fileUrl = document.fileUrl;
      if (version) {
        const versionDoc = document.versions.find(v => v.versionNumber === parseInt(version));
        if (versionDoc) {
          fileUrl = versionDoc.fileUrl;
        }
      }
      
      res.json({
        success: true,
        downloadUrl: fileUrl,
        fileName: document.fileName,
      });
    } catch (error) {
      console.error('Download document error:', error);
      res.status(500).json({ error: 'Failed to download document' });
    }
  }
);

/**
 * GET /documents/:workspaceId/search
 * Search documents
 */
router.get('/:workspaceId/search',
  hasPermission('workspace', 'view'),
  async (req, res) => {
    try {
      const { workspaceId } = req.params;
      const { q, limit } = req.query;
      
      if (!q) {
        return res.status(400).json({ error: 'Search query required' });
      }
      
      const documents = await Document.search(workspaceId, q, {
        limit: limit ? parseInt(limit) : 20,
      });
      
      res.json({
        success: true,
        documents,
        total: documents.length,
        query: q,
      });
    } catch (error) {
      console.error('Search documents error:', error);
      res.status(500).json({ error: 'Failed to search documents' });
    }
  }
);

module.exports = router;
