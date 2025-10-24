/**
 * Booking & Payment API Router
 * 
 * Endpoints for booking management and payment processing:
 * - Availability checking
 * - Booking creation and management
 * - Payment processing (Stripe/PayPal)
 * - Cancellation and refunds
 * - Invoice generation
 * - Discount code management
 */

const express = require('express');
const router = express.Router();

/**
 * Initialize router with booking system
 */
function initBookingRouter(bookingSystem) {
  
  // ============================================
  // AVAILABILITY ENDPOINTS
  // ============================================
  
  /**
   * Check tour availability
   * GET /api/bookings/availability/check
   */
  router.get('/availability/check', async (req, res) => {
    try {
      const { tourId, date, time, passengers } = req.query;
      
      if (!tourId || !date || !time || !passengers) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: tourId, date, time, passengers',
        });
      }
      
      const availability = await bookingSystem.checkAvailability(
        tourId,
        date,
        time,
        parseInt(passengers)
      );
      
      res.json({ success: true, ...availability });
      
    } catch (error) {
      console.error('Error checking availability:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Get available dates for a tour
   * GET /api/bookings/availability/dates
   */
  router.get('/availability/dates', async (req, res) => {
    try {
      const { tourId, month, year } = req.query;
      
      const result = await bookingSystem.pgPool.query(
        `SELECT DISTINCT date, COUNT(*) as slots_available
        FROM tour_availability
        WHERE tour_id = $1 
          AND EXTRACT(MONTH FROM date) = $2
          AND EXTRACT(YEAR FROM date) = $3
          AND status = 'available'
          AND available_capacity > 0
        GROUP BY date
        ORDER BY date`,
        [tourId, month, year]
      );
      
      res.json({
        success: true,
        dates: result.rows,
      });
      
    } catch (error) {
      console.error('Error getting available dates:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Get available time slots for a specific date
   * GET /api/bookings/availability/times
   */
  router.get('/availability/times', async (req, res) => {
    try {
      const { tourId, date } = req.query;
      
      const result = await bookingSystem.pgPool.query(
        `SELECT time, available_capacity, max_capacity, base_price
        FROM tour_availability
        WHERE tour_id = $1 AND date = $2 AND status = 'available' AND available_capacity > 0
        ORDER BY time`,
        [tourId, date]
      );
      
      res.json({
        success: true,
        times: result.rows,
      });
      
    } catch (error) {
      console.error('Error getting available times:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // PRICING ENDPOINTS
  // ============================================
  
  /**
   * Calculate pricing for a booking
   * POST /api/bookings/pricing/calculate
   */
  router.post('/pricing/calculate', async (req, res) => {
    try {
      const { tourId, date, time, passengers, discountCode, currency } = req.body;
      
      if (!tourId || !date || !time || !passengers) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters',
        });
      }
      
      const pricing = await bookingSystem.calculatePricing(
        tourId,
        date,
        time,
        parseInt(passengers),
        { discountCode }
      );
      
      // Convert currency if needed
      if (currency && currency !== 'USD') {
        const rate = bookingSystem.currencyRates[currency];
        if (rate) {
          pricing.finalPrice = pricing.finalPrice / rate;
          pricing.currency = currency;
        }
      }
      
      res.json({ success: true, ...pricing });
      
    } catch (error) {
      console.error('Error calculating pricing:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // BOOKING ENDPOINTS
  // ============================================
  
  /**
   * Create a new booking
   * POST /api/bookings/create
   */
  router.post('/create', async (req, res) => {
    try {
      const bookingData = req.body;
      
      const result = await bookingSystem.createBooking(bookingData);
      
      res.json(result);
      
    } catch (error) {
      console.error('Error creating booking:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Get booking by ID
   * GET /api/bookings/:bookingId
   */
  router.get('/:bookingId', async (req, res) => {
    try {
      const { bookingId } = req.params;
      
      const booking = await bookingSystem.getBooking(bookingId);
      
      res.json({ success: true, booking });
      
    } catch (error) {
      console.error('Error getting booking:', error);
      res.status(404).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Get user bookings
   * GET /api/bookings/user/:userId
   */
  router.get('/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { status, limit = 50, offset = 0 } = req.query;
      
      let query = 'SELECT * FROM bookings WHERE user_id = $1';
      const params = [userId];
      
      if (status) {
        query += ' AND status = $2';
        params.push(status);
      }
      
      query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      params.push(parseInt(limit), parseInt(offset));
      
      const result = await bookingSystem.pgPool.query(query, params);
      
      res.json({
        success: true,
        bookings: result.rows,
        total: result.rows.length,
      });
      
    } catch (error) {
      console.error('Error getting user bookings:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Cancel a booking
   * POST /api/bookings/:bookingId/cancel
   */
  router.post('/:bookingId/cancel', async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { cancelledBy, reason, processRefund = true } = req.body;
      
      const result = await bookingSystem.cancelBooking(
        bookingId,
        cancelledBy,
        reason,
        processRefund
      );
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error cancelling booking:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // PAYMENT ENDPOINTS
  // ============================================
  
  /**
   * Process Stripe payment
   * POST /api/bookings/:bookingId/pay/stripe
   */
  router.post('/:bookingId/pay/stripe', async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { paymentMethodId } = req.body;
      
      if (!paymentMethodId) {
        return res.status(400).json({
          success: false,
          error: 'Payment method ID is required',
        });
      }
      
      const result = await bookingSystem.processStripePayment(bookingId, paymentMethodId);
      
      res.json(result);
      
    } catch (error) {
      console.error('Error processing Stripe payment:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Process PayPal payment
   * POST /api/bookings/:bookingId/pay/paypal
   */
  router.post('/:bookingId/pay/paypal', async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { paypalOrderId } = req.body;
      
      if (!paypalOrderId) {
        return res.status(400).json({
          success: false,
          error: 'PayPal order ID is required',
        });
      }
      
      const result = await bookingSystem.processPayPalPayment(bookingId, paypalOrderId);
      
      res.json(result);
      
    } catch (error) {
      console.error('Error processing PayPal payment:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Create Stripe Payment Intent
   * POST /api/bookings/:bookingId/stripe/intent
   */
  router.post('/:bookingId/stripe/intent', async (req, res) => {
    try {
      const { bookingId } = req.params;
      
      const booking = await bookingSystem.getBooking(bookingId);
      
      const paymentIntent = await bookingSystem.stripe.paymentIntents.create({
        amount: Math.round(parseFloat(booking.final_price) * 100),
        currency: booking.currency.toLowerCase(),
        metadata: {
          bookingId,
          tourId: booking.tour_id,
          userId: booking.user_id,
        },
      });
      
      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
      
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Create PayPal Order
   * POST /api/bookings/:bookingId/paypal/order
   */
  router.post('/:bookingId/paypal/order', async (req, res) => {
    try {
      const { bookingId } = req.params;
      
      const booking = await bookingSystem.getBooking(bookingId);
      
      const request = new bookingSystem.paypalClient.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: bookingId,
          description: `Spirit Tours - Booking ${bookingId}`,
          amount: {
            currency_code: booking.currency,
            value: parseFloat(booking.final_price).toFixed(2),
          },
        }],
      });
      
      const order = await bookingSystem.paypalClient.execute(request);
      
      res.json({
        success: true,
        orderId: order.result.id,
        approveUrl: order.result.links.find(link => link.rel === 'approve').href,
      });
      
    } catch (error) {
      console.error('Error creating PayPal order:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Stripe webhook handler
   * POST /api/bookings/webhooks/stripe
   */
  router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const sig = req.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      let event;
      try {
        event = bookingSystem.stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
      
      // Handle the event
      switch (event.type) {
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          console.log('Payment succeeded:', paymentIntent.id);
          // Additional handling if needed
          break;
          
        case 'payment_intent.payment_failed':
          const failedIntent = event.data.object;
          console.log('Payment failed:', failedIntent.id);
          // Handle failed payment
          break;
          
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      res.json({ received: true });
      
    } catch (error) {
      console.error('Error handling Stripe webhook:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // DISCOUNT CODE ENDPOINTS
  // ============================================
  
  /**
   * Validate discount code
   * POST /api/bookings/discount/validate
   */
  router.post('/discount/validate', async (req, res) => {
    try {
      const { code, amount } = req.body;
      
      if (!code || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Code and amount are required',
        });
      }
      
      const result = await bookingSystem.validateDiscountCode(code, parseFloat(amount));
      
      res.json({ success: true, ...result });
      
    } catch (error) {
      console.error('Error validating discount code:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Create discount code (admin only)
   * POST /api/bookings/discount/create
   */
  router.post('/discount/create', async (req, res) => {
    try {
      const {
        code,
        description,
        discountType,
        discountValue,
        currency,
        minPurchaseAmount,
        maxDiscountAmount,
        maxUses,
        validFrom,
        validUntil,
        applicableTours,
        applicableRoutes,
        createdBy,
      } = req.body;
      
      const result = await bookingSystem.pgPool.query(
        `INSERT INTO discount_codes 
        (code, description, discount_type, discount_value, currency,
         min_purchase_amount, max_discount_amount, max_uses, valid_from, valid_until,
         applicable_tours, applicable_routes, created_by, active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
        RETURNING *`,
        [
          code, description, discountType, discountValue, currency,
          minPurchaseAmount, maxDiscountAmount, maxUses, validFrom, validUntil,
          JSON.stringify(applicableTours), JSON.stringify(applicableRoutes), createdBy
        ]
      );
      
      res.json({
        success: true,
        discountCode: result.rows[0],
      });
      
    } catch (error) {
      console.error('Error creating discount code:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // INVOICE ENDPOINTS
  // ============================================
  
  /**
   * Get invoice for booking
   * GET /api/bookings/:bookingId/invoice
   */
  router.get('/:bookingId/invoice', async (req, res) => {
    try {
      const { bookingId } = req.params;
      
      const result = await bookingSystem.pgPool.query(
        'SELECT * FROM invoices WHERE booking_id = $1',
        [bookingId]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }
      
      res.json({
        success: true,
        invoice: result.rows[0],
      });
      
    } catch (error) {
      console.error('Error getting invoice:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // STATISTICS ENDPOINTS
  // ============================================
  
  /**
   * Get booking statistics
   * GET /api/bookings/stats
   */
  router.get('/stats', async (req, res) => {
    try {
      const stats = await bookingSystem.getStatistics();
      
      res.json({ success: true, stats });
      
    } catch (error) {
      console.error('Error getting statistics:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  /**
   * Get revenue report
   * GET /api/bookings/reports/revenue
   */
  router.get('/reports/revenue', async (req, res) => {
    try {
      const { startDate, endDate, groupBy = 'day' } = req.query;
      
      let dateGrouping;
      if (groupBy === 'day') {
        dateGrouping = 'DATE(paid_at)';
      } else if (groupBy === 'week') {
        dateGrouping = "DATE_TRUNC('week', paid_at)";
      } else if (groupBy === 'month') {
        dateGrouping = "DATE_TRUNC('month', paid_at)";
      }
      
      const result = await bookingSystem.pgPool.query(
        `SELECT 
          ${dateGrouping} as period,
          COUNT(*) as bookings_count,
          SUM(final_price) as total_revenue,
          AVG(final_price) as avg_booking_value,
          SUM(passengers_count) as total_passengers
        FROM bookings
        WHERE payment_status = 'completed'
          AND paid_at >= $1
          AND paid_at <= $2
        GROUP BY period
        ORDER BY period`,
        [startDate || '2024-01-01', endDate || new Date().toISOString()]
      );
      
      res.json({
        success: true,
        report: result.rows,
        groupBy,
      });
      
    } catch (error) {
      console.error('Error generating revenue report:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  return router;
}

module.exports = initBookingRouter;
