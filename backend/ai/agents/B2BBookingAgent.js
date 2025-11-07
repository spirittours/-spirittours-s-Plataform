/**
 * B2B Booking Agent
 * AI Agent for intelligent B2B booking management
 * 
 * Features:
 * - Automatic operator selection based on criteria
 * - Price comparison across operators
 * - Intelligent booking recommendations
 * - Commission optimization
 * - Error handling and fallback strategies
 */

const EventEmitter = require('events');
const { getB2BBookingSync } = require('../../services/integration/B2BBookingSync');
const { getTourOperatorAdapter } = require('../../services/integration/TourOperatorAdapter');
const TourOperator = require('../../models/TourOperator');

class B2BBookingAgent extends EventEmitter {
  constructor() {
    super();
    this.name = 'B2B Booking Agent';
    this.description = 'Agente inteligente para gestión automatizada de reservas B2B';
    this.capabilities = [
      'operator_selection',
      'price_comparison',
      'booking_optimization',
      'commission_calculation',
      'error_recovery'
    ];
  }

  /**
   * Select best operator for a booking request
   */
  async selectBestOperator(searchCriteria, preferences = {}) {
    try {
      console.log('🤖 B2B Agent: Selecting best operator...', searchCriteria);

      // Get all active operators
      const operators = await TourOperator.find({
        status: 'active',
        'integrationStatus.isActive': true,
        'integrationStatus.healthStatus': { $in: ['healthy', 'warning'] }
      });

      if (operators.length === 0) {
        throw new Error('No hay operadores activos disponibles');
      }

      // Score operators based on criteria
      const scoredOperators = await Promise.all(
        operators.map(async (operator) => {
          const score = await this.calculateOperatorScore(operator, searchCriteria, preferences);
          return { operator, score };
        })
      );

      // Sort by score (highest first)
      scoredOperators.sort((a, b) => b.score - a.score);

      console.log('✅ B2B Agent: Operator selection complete', {
        bestOperator: scoredOperators[0].operator.name,
        score: scoredOperators[0].score,
        totalOperators: scoredOperators.length
      });

      return {
        bestOperator: scoredOperators[0].operator,
        alternatives: scoredOperators.slice(1, 3).map(s => s.operator),
        scores: scoredOperators.map(s => ({
          operatorId: s.operator._id,
          operatorName: s.operator.name,
          score: s.score
        }))
      };

    } catch (error) {
      console.error('❌ B2B Agent: Error selecting operator:', error);
      throw error;
    }
  }

  /**
   * Calculate operator score based on multiple factors
   */
  async calculateOperatorScore(operator, searchCriteria, preferences) {
    let score = 100; // Base score

    // Factor 1: Health status (30 points)
    if (operator.integrationStatus.healthStatus === 'healthy') {
      score += 30;
    } else if (operator.integrationStatus.healthStatus === 'warning') {
      score += 15;
    }

    // Factor 2: Commission rate (20 points)
    if (operator.businessTerms.defaultCommission.type === 'percentage') {
      const commissionRate = operator.businessTerms.defaultCommission.value;
      if (commissionRate >= 15) score += 20;
      else if (commissionRate >= 10) score += 15;
      else if (commissionRate >= 5) score += 10;
    }

    // Factor 3: Historical performance (25 points)
    const stats = operator.integrationStatus.syncStats || {};
    if (stats.totalBookings > 0) {
      const successRate = (stats.successfulBookings / stats.totalBookings) * 100;
      if (successRate >= 95) score += 25;
      else if (successRate >= 90) score += 20;
      else if (successRate >= 80) score += 15;
      else if (successRate >= 70) score += 10;
    }

    // Factor 4: Destination match (15 points)
    // TODO: Check if operator specializes in the requested destination
    score += 10;

    // Factor 5: User preferences (10 points)
    if (preferences.preferredOperators && preferences.preferredOperators.includes(operator._id.toString())) {
      score += 10;
    }

    return score;
  }

  /**
   * Compare prices across multiple operators
   */
  async comparePrices(searchCriteria) {
    try {
      console.log('🤖 B2B Agent: Comparing prices across operators...');

      const sync = getB2BBookingSync();
      const operators = await TourOperator.find({
        status: 'active',
        'integrationStatus.isActive': true
      });

      const results = await Promise.allSettled(
        operators.map(async (operator) => {
          const availability = await sync.searchExternalAvailability(operator._id, {
            searchType: 'hotel',
            ...searchCriteria
          });
          return {
            operatorId: operator._id,
            operatorName: operator.name,
            results: availability,
            commission: operator.businessTerms.defaultCommission
          };
        })
      );

      const successfulResults = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

      // Find best prices
      const bestDeals = this.findBestDeals(successfulResults);

      console.log('✅ B2B Agent: Price comparison complete', {
        operatorsChecked: operators.length,
        resultsFound: successfulResults.length,
        bestDeals: bestDeals.length
      });

      return {
        comparisons: successfulResults,
        bestDeals,
        summary: {
          operatorsChecked: operators.length,
          resultsFound: successfulResults.length,
          lowestPrice: bestDeals[0]?.netPrice,
          highestCommission: Math.max(...successfulResults.map(r => r.commission.value))
        }
      };

    } catch (error) {
      console.error('❌ B2B Agent: Error comparing prices:', error);
      throw error;
    }
  }

  /**
   * Find best deals from price comparison
   */
  findBestDeals(results) {
    const allOffers = [];

    results.forEach(result => {
      result.results.forEach(hotel => {
        hotel.rooms?.forEach(room => {
          allOffers.push({
            operatorId: result.operatorId,
            operatorName: result.operatorName,
            hotelCode: hotel.hotelCode,
            hotelName: hotel.hotelName,
            roomType: room.roomType,
            ratePlanCode: room.ratePlanCode,
            price: room.price,
            commission: result.commission,
            netPrice: this.calculateNetPrice(room.price, result.commission)
          });
        });
      });
    });

    // Sort by net price (lowest first)
    allOffers.sort((a, b) => a.netPrice - b.netPrice);

    return allOffers.slice(0, 10); // Top 10 deals
  }

  /**
   * Calculate net price after commission
   */
  calculateNetPrice(price, commission) {
    if (commission.type === 'percentage') {
      return price * (1 - commission.value / 100);
    } else if (commission.type === 'fixed') {
      return price - commission.value;
    }
    return price;
  }

  /**
   * Create intelligent booking with automatic operator selection
   */
  async createIntelligentBooking(bookingData, preferences = {}) {
    try {
      console.log('🤖 B2B Agent: Creating intelligent booking...');

      // Step 1: Select best operator
      const { bestOperator, alternatives } = await this.selectBestOperator(
        bookingData.searchCriteria,
        preferences
      );

      // Step 2: Try to book with best operator
      const sync = getB2BBookingSync();
      let booking;
      let usedOperator = bestOperator;

      try {
        booking = await sync.createExternalBooking({
          operatorId: bestOperator._id,
          ratePlanCode: bookingData.ratePlanCode,
          passengers: bookingData.passengers,
          contact: bookingData.contact,
          internalData: bookingData.internalData
        });
      } catch (error) {
        console.warn('⚠️ B2B Agent: Primary operator failed, trying alternatives...', error.message);

        // Step 3: Fallback to alternatives
        for (const altOperator of alternatives) {
          try {
            booking = await sync.createExternalBooking({
              operatorId: altOperator._id,
              ratePlanCode: bookingData.ratePlanCode,
              passengers: bookingData.passengers,
              contact: bookingData.contact,
              internalData: bookingData.internalData
            });
            usedOperator = altOperator;
            console.log('✅ B2B Agent: Booking successful with alternative operator', altOperator.name);
            break;
          } catch (altError) {
            console.warn(`⚠️ Alternative operator ${altOperator.name} also failed:`, altError.message);
          }
        }

        if (!booking) {
          throw new Error('No se pudo crear la reserva con ningún operador disponible');
        }
      }

      console.log('✅ B2B Agent: Intelligent booking created', {
        bookingId: booking.booking._id,
        operator: usedOperator.name,
        locator: booking.externalLocator
      });

      return {
        booking: booking.booking,
        operator: usedOperator,
        externalLocator: booking.externalLocator,
        commission: this.calculateCommission(bookingData.price, usedOperator),
        alternatives: alternatives.map(op => ({
          id: op._id,
          name: op.name,
          commission: op.businessTerms.defaultCommission
        }))
      };

    } catch (error) {
      console.error('❌ B2B Agent: Error creating intelligent booking:', error);
      throw error;
    }
  }

  /**
   * Calculate commission for a booking
   */
  calculateCommission(price, operator) {
    const commission = operator.businessTerms.defaultCommission;
    
    if (commission.type === 'percentage') {
      return {
        type: 'percentage',
        rate: commission.value,
        amount: (price * commission.value) / 100,
        currency: operator.businessTerms.currency
      };
    } else if (commission.type === 'fixed') {
      return {
        type: 'fixed',
        amount: commission.value,
        currency: operator.businessTerms.currency
      };
    }

    return null;
  }

  /**
   * Optimize booking workflow
   */
  async optimizeBookingWorkflow(bookingRequests) {
    try {
      console.log('🤖 B2B Agent: Optimizing booking workflow for', bookingRequests.length, 'requests');

      // Group requests by destination
      const groupedByDestination = {};
      bookingRequests.forEach(request => {
        const dest = request.destination;
        if (!groupedByDestination[dest]) {
          groupedByDestination[dest] = [];
        }
        groupedByDestination[dest].push(request);
      });

      // For each destination, find the best operator
      const optimizedPlan = {};
      for (const [destination, requests] of Object.entries(groupedByDestination)) {
        const { bestOperator } = await this.selectBestOperator({
          destination,
          checkIn: requests[0].checkIn,
          checkOut: requests[0].checkOut
        });

        optimizedPlan[destination] = {
          operator: bestOperator,
          requests: requests,
          estimatedCommission: requests.reduce((sum, r) => {
            return sum + this.calculateNetPrice(r.price || 0, bestOperator.businessTerms.defaultCommission);
          }, 0)
        };
      }

      console.log('✅ B2B Agent: Workflow optimization complete');

      return {
        plan: optimizedPlan,
        summary: {
          totalRequests: bookingRequests.length,
          destinations: Object.keys(groupedByDestination).length,
          operators: Object.values(optimizedPlan).map(p => p.operator.name),
          totalEstimatedCommission: Object.values(optimizedPlan).reduce((sum, p) => sum + p.estimatedCommission, 0)
        }
      };

    } catch (error) {
      console.error('❌ B2B Agent: Error optimizing workflow:', error);
      throw error;
    }
  }

  /**
   * Get agent analytics
   */
  async getAnalytics(startDate, endDate) {
    try {
      // TODO: Implement analytics queries
      return {
        totalBookings: 0,
        successRate: 0,
        averageResponseTime: 0,
        topOperators: [],
        commissionGenerated: 0
      };
    } catch (error) {
      console.error('❌ B2B Agent: Error getting analytics:', error);
      throw error;
    }
  }
}

module.exports = B2BBookingAgent;
