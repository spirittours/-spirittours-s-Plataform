/**
 * Contact API Routes
 * 
 * Complete CRUD operations for contact management.
 * Handles leads, customers, partners, and activity tracking.
 */

const express = require('express');
const router = express.Router();
const Contact = require('../../models/Contact');
const Workspace = require('../../models/Workspace');
const authenticate = require('../../middleware/auth');

// Middleware to check contact access
const checkContactAccess = async (req, res, next) => {
  try {
    const contactId = req.params.contactId || req.params.id;
    const userId = req.user.id;
    
    const contact = await Contact.findById(contactId);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    if (contact.isArchived) {
      return res.status(410).json({ error: 'Contact is archived' });
    }
    
    // Check workspace access
    const workspace = await Workspace.findById(contact.workspace);
    if (!workspace || !workspace.canUserAccess(userId)) {
      return res.status(403).json({ error: 'Access denied to this contact' });
    }
    
    // Check if contact is private
    if (contact.isPrivate && contact.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Access denied to this private contact' });
    }
    
    req.contact = contact;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Middleware to check workspace access
const checkWorkspaceAccess = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.query.workspace;
    const userId = req.user.id;
    
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found' });
    }
    
    if (!workspace.canUserAccess(userId)) {
      return res.status(403).json({ error: 'Access denied to this workspace' });
    }
    
    req.workspace = workspace;
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ============================================
// CONTACT CRUD
// ============================================

/**
 * GET /api/crm/contacts?workspace=:workspaceId
 * Get all contacts for a workspace
 */
router.get('/', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspaceId = req.workspace._id;
    const {
      type,
      status,
      owner,
      company,
      leadQuality,
      includeArchived,
      search,
      sortBy,
      sortOrder,
      limit,
      skip,
    } = req.query;
    
    const query = { workspace: workspaceId };
    
    if (type) query.type = type;
    if (status) query.status = status;
    if (owner) query.owner = owner;
    if (company) query.company = company;
    if (leadQuality) query.leadQuality = leadQuality;
    
    if (includeArchived !== 'true') {
      query.isArchived = false;
    }
    
    // Search in name, email, phone
    if (search) {
      query.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    
    const sortOptions = {};
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
      sortOptions.createdAt = -1;
    }
    
    let contactsQuery = Contact.find(query)
      .populate('owner', 'first_name last_name email')
      .populate('company', 'agency_name contact_email contact_phone')
      .sort(sortOptions);
    
    if (limit) {
      contactsQuery = contactsQuery.limit(parseInt(limit));
    }
    
    if (skip) {
      contactsQuery = contactsQuery.skip(parseInt(skip));
    }
    
    const contacts = await contactsQuery;
    const total = await Contact.countDocuments(query);
    
    res.json({
      success: true,
      count: contacts.length,
      total,
      data: contacts,
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/contacts/hot-leads?workspace=:workspaceId
 * Get hot leads
 */
router.get('/hot-leads', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const workspaceId = req.workspace._id;
    
    const contacts = await Contact.findHotLeads(workspaceId)
      .populate('owner', 'first_name last_name email')
      .populate('company', 'agency_name');
    
    res.json({
      success: true,
      count: contacts.length,
      data: contacts,
    });
  } catch (error) {
    console.error('Error fetching hot leads:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/crm/contacts/:id
 * Get contact by ID
 */
router.get('/:id', authenticate, checkContactAccess, async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id)
      .populate('owner', 'first_name last_name email')
      .populate('company', 'agency_name contact_email contact_phone address')
      .populate('workspace', 'name slug')
      .populate({
        path: 'deals',
        select: 'title value status stage',
        populate: { path: 'pipeline', select: 'name' },
      });
    
    res.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/contacts
 * Create a new contact
 */
router.post('/', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const workspaceId = req.workspace._id;
    
    const {
      first_name,
      last_name,
      email,
      phone,
      mobile,
      company,
      jobTitle,
      department,
      whatsapp,
      linkedin,
      facebook,
      instagram,
      twitter,
      website,
      address,
      type,
      status,
      leadSource,
      leadSourceDetails,
      leadScore,
      leadQuality,
      tags,
      notes,
      customFields,
      emailOptIn,
      smsOptIn,
      whatsappOptIn,
      gdprConsent,
      isPrivate,
    } = req.body;
    
    // Validation
    if (!first_name) {
      return res.status(400).json({ error: 'First name is required' });
    }
    
    // Check if email exists in workspace
    if (email) {
      const existingContact = await Contact.findOne({
        workspace: workspaceId,
        email: email.toLowerCase(),
        isArchived: false,
      });
      
      if (existingContact) {
        return res.status(400).json({ error: 'Contact with this email already exists' });
      }
    }
    
    // Create contact
    const contact = new Contact({
      first_name,
      last_name,
      email,
      phone,
      mobile,
      workspace: workspaceId,
      owner: userId,
      company,
      jobTitle,
      department,
      whatsapp,
      linkedin,
      facebook,
      instagram,
      twitter,
      website,
      address: address || {},
      type: type || 'lead',
      status: status || 'active',
      leadSource: leadSource || 'manual',
      leadSourceDetails,
      leadScore: leadScore || 0,
      leadQuality: leadQuality || 'warm',
      tags: tags || [],
      notes,
      customFields: customFields || {},
      emailOptIn: emailOptIn || false,
      smsOptIn: smsOptIn || false,
      whatsappOptIn: whatsappOptIn || false,
      gdprConsent: gdprConsent || false,
      gdprConsentDate: gdprConsent ? new Date() : undefined,
      isPrivate: isPrivate || false,
    });
    
    await contact.save();
    
    await contact.populate([
      { path: 'owner', select: 'first_name last_name email' },
      { path: 'company', select: 'agency_name' },
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Contact created successfully',
      data: contact,
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/contacts/:id
 * Update contact
 */
router.put('/:id', authenticate, checkContactAccess, async (req, res) => {
  try {
    const contact = req.contact;
    const userId = req.user.id;
    
    // Check if user can edit (owner or workspace admin)
    if (contact.owner.toString() !== userId.toString()) {
      const workspace = await Workspace.findById(contact.workspace);
      const member = workspace.members.find(m => m.user.toString() === userId.toString());
      
      if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
        return res.status(403).json({ error: 'Insufficient permissions to edit contact' });
      }
    }
    
    const {
      first_name,
      last_name,
      email,
      phone,
      mobile,
      company,
      jobTitle,
      department,
      whatsapp,
      linkedin,
      facebook,
      instagram,
      twitter,
      website,
      address,
      type,
      status,
      leadSource,
      leadSourceDetails,
      leadScore,
      leadQuality,
      tags,
      notes,
      customFields,
      emailOptIn,
      smsOptIn,
      whatsappOptIn,
      gdprConsent,
      isPrivate,
    } = req.body;
    
    // Update fields
    if (first_name) contact.first_name = first_name;
    if (last_name !== undefined) contact.last_name = last_name;
    if (email !== undefined) contact.email = email;
    if (phone !== undefined) contact.phone = phone;
    if (mobile !== undefined) contact.mobile = mobile;
    if (company !== undefined) contact.company = company;
    if (jobTitle !== undefined) contact.jobTitle = jobTitle;
    if (department !== undefined) contact.department = department;
    if (whatsapp !== undefined) contact.whatsapp = whatsapp;
    if (linkedin !== undefined) contact.linkedin = linkedin;
    if (facebook !== undefined) contact.facebook = facebook;
    if (instagram !== undefined) contact.instagram = instagram;
    if (twitter !== undefined) contact.twitter = twitter;
    if (website !== undefined) contact.website = website;
    if (address) contact.address = { ...contact.address, ...address };
    if (type) contact.type = type;
    if (status) contact.status = status;
    if (leadSource) contact.leadSource = leadSource;
    if (leadSourceDetails !== undefined) contact.leadSourceDetails = leadSourceDetails;
    if (leadScore !== undefined) await contact.updateLeadScore(leadScore);
    if (leadQuality) contact.leadQuality = leadQuality;
    if (tags) contact.tags = tags;
    if (notes !== undefined) contact.notes = notes;
    if (customFields) contact.customFields = { ...contact.customFields, ...customFields };
    if (emailOptIn !== undefined) contact.emailOptIn = emailOptIn;
    if (smsOptIn !== undefined) contact.smsOptIn = smsOptIn;
    if (whatsappOptIn !== undefined) contact.whatsappOptIn = whatsappOptIn;
    if (gdprConsent !== undefined) {
      contact.gdprConsent = gdprConsent;
      if (gdprConsent && !contact.gdprConsentDate) {
        contact.gdprConsentDate = new Date();
      }
    }
    if (isPrivate !== undefined) contact.isPrivate = isPrivate;
    
    await contact.save();
    
    res.json({
      success: true,
      message: 'Contact updated successfully',
      data: contact,
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/contacts/:id
 * Archive contact (soft delete)
 */
router.delete('/:id', authenticate, checkContactAccess, async (req, res) => {
  try {
    const contact = req.contact;
    const userId = req.user.id;
    
    // Only owner can delete
    if (contact.owner.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only contact owner can delete' });
    }
    
    contact.isArchived = true;
    contact.archivedAt = new Date();
    contact.archivedBy = userId;
    
    await contact.save();
    
    res.json({
      success: true,
      message: 'Contact archived successfully',
    });
  } catch (error) {
    console.error('Error archiving contact:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ACTIVITY TRACKING
// ============================================

/**
 * POST /api/crm/contacts/:id/activity
 * Record activity on contact
 */
router.post('/:id/activity', authenticate, checkContactAccess, async (req, res) => {
  try {
    const contact = req.contact;
    const { type } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: 'Activity type is required' });
    }
    
    const validTypes = ['email', 'call', 'meeting', 'whatsapp'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Activity type must be one of: ${validTypes.join(', ')}` });
    }
    
    await contact.recordActivity(type);
    
    res.json({
      success: true,
      message: 'Activity recorded',
      data: {
        interactions: contact.interactions,
        engagementScore: contact.engagementScore,
        lastActivityAt: contact.lastActivityAt,
      },
    });
  } catch (error) {
    console.error('Error recording activity:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/crm/contacts/:id/lead-score
 * Update lead score
 */
router.put('/:id/lead-score', authenticate, checkContactAccess, async (req, res) => {
  try {
    const contact = req.contact;
    const { score } = req.body;
    
    if (score === undefined || score === null) {
      return res.status(400).json({ error: 'Score is required' });
    }
    
    await contact.updateLeadScore(score);
    
    res.json({
      success: true,
      message: 'Lead score updated',
      data: {
        leadScore: contact.leadScore,
        leadQuality: contact.leadQuality,
      },
    });
  } catch (error) {
    console.error('Error updating lead score:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/contacts/:id/convert
 * Convert lead to customer
 */
router.post('/:id/convert', authenticate, checkContactAccess, async (req, res) => {
  try {
    const contact = req.contact;
    
    if (contact.type !== 'lead') {
      return res.status(400).json({ error: 'Only leads can be converted' });
    }
    
    contact.type = 'customer';
    contact.status = 'converted';
    await contact.save();
    
    res.json({
      success: true,
      message: 'Lead converted to customer',
      data: contact,
    });
  } catch (error) {
    console.error('Error converting lead:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * POST /api/crm/contacts/bulk-import
 * Bulk import contacts
 */
router.post('/bulk-import', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const workspaceId = req.workspace._id;
    const { contacts } = req.body;
    
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'Contacts array is required' });
    }
    
    const results = {
      imported: 0,
      skipped: 0,
      errors: [],
    };
    
    for (const contactData of contacts) {
      try {
        // Check if email exists
        if (contactData.email) {
          const exists = await Contact.findOne({
            workspace: workspaceId,
            email: contactData.email.toLowerCase(),
            isArchived: false,
          });
          
          if (exists) {
            results.skipped++;
            continue;
          }
        }
        
        const contact = new Contact({
          ...contactData,
          workspace: workspaceId,
          owner: userId,
        });
        
        await contact.save();
        results.imported++;
      } catch (error) {
        results.errors.push({
          contact: contactData,
          error: error.message,
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Bulk import completed',
      data: results,
    });
  } catch (error) {
    console.error('Error bulk importing contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/crm/contacts/bulk-update
 * Bulk update contacts
 */
router.post('/bulk-update', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const { contactIds, updates } = req.body;
    
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'Contact IDs array is required' });
    }
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Updates object is required' });
    }
    
    const result = await Contact.updateMany(
      {
        _id: { $in: contactIds },
        workspace: req.workspace._id,
      },
      { $set: updates }
    );
    
    res.json({
      success: true,
      message: 'Bulk update completed',
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error('Error bulk updating contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/crm/contacts/bulk-delete
 * Bulk archive contacts
 */
router.delete('/bulk-delete', authenticate, checkWorkspaceAccess, async (req, res) => {
  try {
    const userId = req.user.id;
    const { contactIds } = req.body;
    
    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'Contact IDs array is required' });
    }
    
    const result = await Contact.updateMany(
      {
        _id: { $in: contactIds },
        workspace: req.workspace._id,
      },
      {
        $set: {
          isArchived: true,
          archivedAt: new Date(),
          archivedBy: userId,
        },
      }
    );
    
    res.json({
      success: true,
      message: 'Bulk delete completed',
      data: {
        archived: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error('Error bulk deleting contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
