/**
 * Booking to Project Integration Routes
 * 
 * API endpoints for Bookings → CRM Projects Bridge
 * Sprint 1.3 - Booking to Project Integration
 */

const express = require('express');
const router = express.Router();
const BookingToProjectBridge = require('../../services/integration/BookingToProjectBridge');
const { authenticate } = require('../../middleware/auth');
const { hasPermission } = require('../../middleware/permissions');
const { logActivity } = require('../../middleware/auditLogger');

const bridge = new BookingToProjectBridge();

/**
 * @route   POST /api/integration/booking-to-project/convert/:bookingId
 * @desc    Convert confirmed booking to CRM project
 * @access  Private (requires projects_manage permission)
 */
router.post(
  '/convert/:bookingId',
  authenticate,
  hasPermission('projects_manage'),
  logActivity('booking_to_project_conversion'),
  async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { workspaceId } = req.body;

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required field: workspaceId'
        });
      }

      const result = await bridge.convertBookingToProject(bookingId, workspaceId);

      res.json({
        success: true,
        message: result.message || 'Booking converted to project successfully',
        data: result
      });

    } catch (error) {
      console.error('Error converting booking to project:', error);
      res.status(500).json({
        success: false,
        message: 'Error converting booking',
        error: error.message
      });
    }
  }
);

/**
 * @route   POST /api/integration/booking-to-project/webhook/confirmed
 * @desc    Webhook endpoint for confirmed bookings (auto-create project)
 * @access  Public (with API key validation)
 */
router.post(
  '/webhook/confirmed',
  async (req, res) => {
    try {
      // Validate API key
      const apiKey = req.headers['x-api-key'];
      const validApiKey = process.env.BOOKING_WEBHOOK_API_KEY;

      if (!apiKey || apiKey !== validApiKey) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or missing API key'
        });
      }

      const { bookingData, workspaceId } = req.body;

      if (!bookingData || !workspaceId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: bookingData, workspaceId'
        });
      }

      // Process webhook asynchronously
      bridge.handleBookingConfirmedWebhook(bookingData, workspaceId)
        .then(result => {
          console.log('Booking webhook processed:', result);
        })
        .catch(error => {
          console.error('Booking webhook error:', error);
        });

      // Return immediately
      res.json({
        success: true,
        message: 'Booking received and queued for processing'
      });

    } catch (error) {
      console.error('Error in booking webhook:', error);
      res.status(500).json({
        success: false,
        message: 'Webhook processing error',
        error: error.message
      });
    }
  }
);

/**
 * @route   GET /api/integration/booking-to-project/project-from-booking/:bookingId
 * @desc    Get project associated with booking
 * @access  Private (requires projects_view permission)
 */
router.get(
  '/project-from-booking/:bookingId',
  authenticate,
  hasPermission('projects_view'),
  async (req, res) => {
    try {
      const { bookingId } = req.params;

      const result = await bridge.getProjectFromBooking(bookingId);

      res.json({
        success: result.success,
        message: result.message,
        data: result.project || null
      });

    } catch (error) {
      console.error('Error getting project from booking:', error);
      res.status(500).json({
        success: false,
        message: 'Error retrieving project',
        error: error.message
      });
    }
  }
);

module.exports = router;
