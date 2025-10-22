/**
 * Spirit Tours - Admin Email Templates Management
 * 
 * Dashboard endpoints for managing email templates by department
 */

const express = require('express');
const router = express.Router();
const { nodemailerService } = require('../../services/nodemailer_service');
const logger = require('../../utils/logger');

// Department configuration
const DEPARTMENTS = {
  reservations: {
    name: 'Reservaciones',
    icon: '📅',
    description: 'Emails relacionados con reservas y confirmaciones',
    defaultTemplates: ['booking_confirmation', 'booking_reminder', 'booking_cancellation']
  },
  payments: {
    name: 'Pagos',
    icon: '💳',
    description: 'Emails de pagos, facturas y recibos',
    defaultTemplates: ['payment_confirmation', 'payment_reminder', 'invoice']
  },
  marketing: {
    name: 'Marketing',
    icon: '📢',
    description: 'Newsletters, promociones y campañas',
    defaultTemplates: ['newsletter', 'promotion', 'special_offer']
  },
  support: {
    name: 'Soporte',
    icon: '🎧',
    description: 'Emails de soporte y atención al cliente',
    defaultTemplates: ['support_ticket', 'support_resolved', 'feedback_request']
  },
  notifications: {
    name: 'Notificaciones',
    icon: '🔔',
    description: 'Notificaciones automáticas del sistema',
    defaultTemplates: ['system_notification', 'alert', 'reminder']
  },
  authentication: {
    name: 'Autenticación',
    icon: '🔐',
    description: 'Emails de registro, login y seguridad',
    defaultTemplates: ['welcome', 'password_reset', 'email_verification']
  },
  tours: {
    name: 'Tours',
    icon: '🌍',
    description: 'Información de tours y experiencias',
    defaultTemplates: ['tour_info', 'tour_reminder', 'tour_review_request']
  },
  admin: {
    name: 'Administración',
    icon: '⚙️',
    description: 'Emails administrativos internos',
    defaultTemplates: ['admin_alert', 'report', 'staff_notification']
  }
};

// Middleware for admin authentication
const requireAdmin = (req, res, next) => {
  const userRole = req.user?.role || req.headers['x-user-role'];
  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return res.status(403).json({ 
      error: 'Se requieren permisos de administrador' 
    });
  }
  next();
};

/**
 * @route   GET /api/admin/email-templates/departments
 * @desc    Get all departments with their configuration
 * @access  Admin
 */
router.get('/departments', requireAdmin, (req, res) => {
  try {
    const departments = Object.entries(DEPARTMENTS).map(([key, dept]) => ({
      id: key,
      ...dept,
      templateCount: nodemailerService.listTemplates().filter(
        t => t.metadata?.department === key
      ).length
    }));

    res.json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (error) {
    logger.error('Error getting departments:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/admin/email-templates
 * @desc    Get all email templates with filtering
 * @access  Admin
 */
router.get('/', requireAdmin, (req, res) => {
  try {
    const { department, category, search } = req.query;
    
    let templates = nodemailerService.listTemplates(category);

    // Filter by department
    if (department) {
      templates = templates.filter(t => t.metadata?.department === department);
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.subject.toLowerCase().includes(searchLower) ||
        (t.metadata?.description || '').toLowerCase().includes(searchLower)
      );
    }

    // Add additional info
    const enrichedTemplates = templates.map(t => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
      category: t.category,
      department: t.metadata?.department || 'general',
      departmentName: DEPARTMENTS[t.metadata?.department]?.name || 'General',
      description: t.metadata?.description || '',
      variables: t.metadata?.variables || [],
      lastUsed: t.metadata?.lastUsed || null,
      usageCount: t.metadata?.usageCount || 0,
      createdAt: new Date(t.createdAt).toISOString(),
      updatedAt: new Date(t.updatedAt).toISOString()
    }));

    res.json({
      success: true,
      count: enrichedTemplates.length,
      filters: { department, category, search },
      data: enrichedTemplates
    });
  } catch (error) {
    logger.error('Error getting templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/admin/email-templates/:templateId
 * @desc    Get template by ID with full details
 * @access  Admin
 */
router.get('/:templateId', requireAdmin, (req, res) => {
  try {
    const { templateId } = req.params;
    const template = nodemailerService.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    res.json({
      success: true,
      data: {
        id: template.id,
        name: template.name,
        subject: template.subject,
        html: template.html,
        text: template.text,
        category: template.category,
        department: template.metadata?.department || 'general',
        description: template.metadata?.description || '',
        variables: template.metadata?.variables || [],
        createdAt: new Date(template.createdAt).toISOString(),
        updatedAt: new Date(template.updatedAt).toISOString()
      }
    });
  } catch (error) {
    logger.error('Error getting template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/admin/email-templates
 * @desc    Create new email template
 * @access  Admin
 */
router.post('/', requireAdmin, (req, res) => {
  try {
    const { 
      name, subject, html, text, category, department,
      description, variables 
    } = req.body;

    // Validation
    if (!name || !subject || !html) {
      return res.status(400).json({ 
        error: 'Campos requeridos faltantes',
        required: ['name', 'subject', 'html']
      });
    }

    // Validate department
    if (department && !DEPARTMENTS[department]) {
      return res.status(400).json({ 
        error: 'Departamento inválido',
        validDepartments: Object.keys(DEPARTMENTS)
      });
    }

    // Create template with metadata
    const templateId = nodemailerService.addTemplate({
      name,
      subject,
      html,
      text: text || '',
      category: category || 'general',
      metadata: {
        department: department || 'general',
        description: description || '',
        variables: variables || [],
        createdBy: req.user?.email || 'admin',
        usageCount: 0
      }
    });

    const template = nodemailerService.getTemplate(templateId);

    logger.info(`Admin created email template: ${name}`, {
      admin: req.user?.email || 'unknown',
      templateId,
      department
    });

    res.status(201).json({
      success: true,
      message: 'Plantilla creada exitosamente',
      templateId,
      data: {
        id: template.id,
        name: template.name,
        subject: template.subject,
        category: template.category,
        department: template.metadata?.department
      }
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   PUT /api/admin/email-templates/:templateId
 * @desc    Update email template
 * @access  Admin
 */
router.put('/:templateId', requireAdmin, (req, res) => {
  try {
    const { templateId } = req.params;
    const updates = req.body;

    const template = nodemailerService.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    // Validate department if provided
    if (updates.department && !DEPARTMENTS[updates.department]) {
      return res.status(400).json({ 
        error: 'Departamento inválido',
        validDepartments: Object.keys(DEPARTMENTS)
      });
    }

    // Update metadata if provided
    if (updates.description || updates.variables || updates.department) {
      updates.metadata = {
        ...template.metadata,
        ...(updates.description && { description: updates.description }),
        ...(updates.variables && { variables: updates.variables }),
        ...(updates.department && { department: updates.department }),
        updatedBy: req.user?.email || 'admin',
        lastUpdated: Date.now()
      };

      // Remove from main updates
      delete updates.description;
      delete updates.variables;
      delete updates.department;
    }

    // Update template
    const updatedTemplate = nodemailerService.updateTemplate(templateId, updates);

    logger.info(`Admin updated email template: ${updatedTemplate.name}`, {
      admin: req.user?.email || 'unknown',
      templateId
    });

    res.json({
      success: true,
      message: 'Plantilla actualizada exitosamente',
      data: {
        id: updatedTemplate.id,
        name: updatedTemplate.name,
        subject: updatedTemplate.subject,
        updatedAt: new Date(updatedTemplate.updatedAt).toISOString()
      }
    });
  } catch (error) {
    logger.error('Error updating template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   DELETE /api/admin/email-templates/:templateId
 * @desc    Delete email template
 * @access  Admin
 */
router.delete('/:templateId', requireAdmin, (req, res) => {
  try {
    const { templateId } = req.params;
    const template = nodemailerService.getTemplate(templateId);

    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    const templateName = template.name;
    const deleted = nodemailerService.deleteTemplate(templateId);

    if (!deleted) {
      return res.status(500).json({ error: 'Error al eliminar plantilla' });
    }

    logger.warn(`Admin deleted email template: ${templateName}`, {
      admin: req.user?.email || 'unknown',
      templateId
    });

    res.json({
      success: true,
      message: 'Plantilla eliminada exitosamente'
    });
  } catch (error) {
    logger.error('Error deleting template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/admin/email-templates/:templateId/preview
 * @desc    Preview template with sample data
 * @access  Admin
 */
router.post('/:templateId/preview', requireAdmin, (req, res) => {
  try {
    const { templateId } = req.params;
    const { variables } = req.body;

    const template = nodemailerService.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    // Use provided variables or sample data
    const sampleVariables = variables || {
      name: 'Juan Pérez',
      email: 'juan@example.com',
      company_name: 'Spirit Tours',
      booking_id: 'BK-12345',
      tour_name: 'Tour Ciudad de México',
      date: '2024-12-01',
      amount: '$1,500.00',
      unsubscribe_url: 'https://spirittours.com/unsubscribe?email=juan@example.com'
    };

    // Render template
    const rendered = template.render(sampleVariables);

    res.json({
      success: true,
      data: {
        templateId: template.id,
        name: template.name,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        variables: sampleVariables
      }
    });
  } catch (error) {
    logger.error('Error previewing template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/admin/email-templates/:templateId/test-send
 * @desc    Send test email with template
 * @access  Admin
 */
router.post('/:templateId/test-send', requireAdmin, async (req, res) => {
  try {
    const { templateId } = req.params;
    const { testEmail, variables } = req.body;

    if (!testEmail) {
      return res.status(400).json({ error: 'testEmail requerido' });
    }

    const template = nodemailerService.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Plantilla no encontrada' });
    }

    // Use provided variables or sample data
    const testVariables = variables || {
      name: 'Test User',
      email: testEmail,
      company_name: 'Spirit Tours',
      unsubscribe_url: 'https://spirittours.com/unsubscribe'
    };

    // Render template
    const rendered = template.render(testVariables);

    // Send test email
    const success = await nodemailerService.sendEmailNow({
      to: testEmail,
      from: process.env.DEFAULT_FROM_EMAIL || 'noreply@spirittours.com',
      subject: '[TEST] ' + rendered.subject,
      html: rendered.html,
      text: rendered.text
    });

    logger.info(`Admin sent test email with template: ${template.name}`, {
      admin: req.user?.email || 'unknown',
      templateId,
      testEmail
    });

    res.json({
      success,
      message: success ? 
        'Email de prueba enviado exitosamente' : 
        'Error al enviar email de prueba',
      to: testEmail
    });
  } catch (error) {
    logger.error('Error sending test email:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/admin/email-templates/import
 * @desc    Import multiple templates at once
 * @access  Admin
 */
router.post('/import', requireAdmin, (req, res) => {
  try {
    const { templates } = req.body;

    if (!Array.isArray(templates) || templates.length === 0) {
      return res.status(400).json({ 
        error: 'Se requiere un array de plantillas' 
      });
    }

    const results = {
      imported: [],
      failed: []
    };

    templates.forEach((templateData, index) => {
      try {
        const templateId = nodemailerService.addTemplate({
          name: templateData.name,
          subject: templateData.subject,
          html: templateData.html,
          text: templateData.text || '',
          category: templateData.category || 'general',
          metadata: {
            department: templateData.department || 'general',
            description: templateData.description || '',
            variables: templateData.variables || [],
            imported: true,
            importedBy: req.user?.email || 'admin'
          }
        });

        results.imported.push({
          index,
          name: templateData.name,
          templateId
        });
      } catch (error) {
        results.failed.push({
          index,
          name: templateData.name || `Template ${index}`,
          error: error.message
        });
      }
    });

    logger.info(`Admin imported templates`, {
      admin: req.user?.email || 'unknown',
      imported: results.imported.length,
      failed: results.failed.length
    });

    res.json({
      success: results.failed.length === 0,
      message: `${results.imported.length} plantillas importadas, ${results.failed.length} fallidas`,
      results
    });
  } catch (error) {
    logger.error('Error importing templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   GET /api/admin/email-templates/export/:department
 * @desc    Export all templates from a department
 * @access  Admin
 */
router.get('/export/:department', requireAdmin, (req, res) => {
  try {
    const { department } = req.params;

    if (department !== 'all' && !DEPARTMENTS[department]) {
      return res.status(400).json({ 
        error: 'Departamento inválido',
        validDepartments: ['all', ...Object.keys(DEPARTMENTS)]
      });
    }

    let templates = nodemailerService.listTemplates();

    if (department !== 'all') {
      templates = templates.filter(t => t.metadata?.department === department);
    }

    const exportData = templates.map(t => ({
      name: t.name,
      subject: t.subject,
      html: t.html,
      text: t.text,
      category: t.category,
      department: t.metadata?.department || 'general',
      description: t.metadata?.description || '',
      variables: t.metadata?.variables || []
    }));

    res.json({
      success: true,
      department,
      count: exportData.length,
      exportDate: new Date().toISOString(),
      data: exportData
    });
  } catch (error) {
    logger.error('Error exporting templates:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
