/**
 * Travel Preferences Agent
 * Analyzes booking history to predict traveler preferences
 * 
 * Features:
 * - Historical booking analysis
 * - Preference pattern detection
 * - Personalized recommendations
 * - Package customization
 * - Seasonal trends analysis
 * - Budget preference learning
 */

const { MultiModelAI } = require('../../ai/MultiModelAI');
const { EventEmitter } = require('events');

class TravelPreferencesAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      model: config.model || 'gpt-4o-mini',
      analysisDepth: config.analysisDepth || 'detailed',
      minBookings: config.minBookings || 2,
      ...config
    };

    this.ai = new MultiModelAI();
    
    this.preferenceCategories = [
      'destination_type',
      'accommodation_style',
      'activity_preferences',
      'budget_range',
      'travel_season',
      'group_size',
      'duration_preference',
      'booking_advance_time'
    ];
  }

  /**
   * Analyze customer booking history
   */
  async analyzeCustomerPreferences(customerId, bookings) {
    if (!bookings || bookings.length < this.config.minBookings) {
      return {
        success: false,
        message: 'Insufficient booking history',
        minimumRequired: this.config.minBookings
      };
    }

    this.emit('analysis:started', { customerId, bookingCount: bookings.length });

    try {
      // Extract patterns from bookings
      const patterns = this.extractPatterns(bookings);

      // Analyze with AI
      const analysis = await this.generateAIAnalysis(patterns, bookings);

      // Generate recommendations
      const recommendations = await this.generateRecommendations(analysis, patterns);

      const result = {
        success: true,
        customerId,
        analysisDate: new Date(),
        bookingCount: bookings.length,
        patterns,
        analysis,
        recommendations,
        confidence: this.calculateConfidence(bookings.length, patterns)
      };

      this.emit('analysis:completed', { customerId, patterns: Object.keys(patterns).length });

      return result;
    } catch (error) {
      this.emit('analysis:error', { customerId, error: error.message });
      throw error;
    }
  }

  /**
   * Extract patterns from booking history
   */
  extractPatterns(bookings) {
    const patterns = {
      destinations: {},
      accommodations: {},
      activities: [],
      budgetRanges: [],
      seasons: {},
      groupSizes: [],
      durations: [],
      bookingLeadTimes: []
    };

    for (const booking of bookings) {
      // Destination patterns
      const destType = this.categorizeDestination(booking.destination);
      patterns.destinations[destType] = (patterns.destinations[destType] || 0) + 1;

      // Accommodation patterns
      if (booking.accommodation) {
        const accType = booking.accommodation.type || 'hotel';
        patterns.accommodations[accType] = (patterns.accommodations[accType] || 0) + 1;
      }

      // Activity patterns
      if (booking.activities) {
        patterns.activities.push(...booking.activities);
      }

      // Budget patterns
      if (booking.totalAmount) {
        patterns.budgetRanges.push(booking.totalAmount);
      }

      // Season patterns
      const season = this.getSeason(new Date(booking.travelDate));
      patterns.seasons[season] = (patterns.seasons[season] || 0) + 1;

      // Group size
      if (booking.travelers) {
        patterns.groupSizes.push(booking.travelers.length);
      }

      // Duration
      if (booking.duration) {
        patterns.durations.push(booking.duration);
      }

      // Lead time (days before travel)
      if (booking.bookingDate && booking.travelDate) {
        const leadTime = Math.floor(
          (new Date(booking.travelDate) - new Date(booking.bookingDate)) / (1000 * 60 * 60 * 24)
        );
        patterns.bookingLeadTimes.push(leadTime);
      }
    }

    // Calculate statistics
    return {
      destinations: patterns.destinations,
      accommodations: patterns.accommodations,
      topActivities: this.getTopItems(patterns.activities, 5),
      averageBudget: this.average(patterns.budgetRanges),
      budgetRange: {
        min: Math.min(...patterns.budgetRanges),
        max: Math.max(...patterns.budgetRanges)
      },
      preferredSeasons: patterns.seasons,
      averageGroupSize: Math.round(this.average(patterns.groupSizes)),
      averageDuration: Math.round(this.average(patterns.durations)),
      averageLeadTime: Math.round(this.average(patterns.bookingLeadTimes))
    };
  }

  /**
   * Generate AI-powered analysis
   */
  async generateAIAnalysis(patterns, bookings) {
    const prompt = `Analyze this customer's travel patterns and provide insights:

Booking History Summary:
- Total bookings: ${bookings.length}
- Destinations: ${JSON.stringify(patterns.destinations)}
- Accommodations: ${JSON.stringify(patterns.accommodations)}
- Top activities: ${patterns.topActivities.join(', ')}
- Budget range: $${patterns.budgetRange.min} - $${patterns.budgetRange.max}
- Preferred seasons: ${JSON.stringify(patterns.preferredSeasons)}
- Average group size: ${patterns.averageGroupSize}
- Average trip duration: ${patterns.averageDuration} days
- Booking lead time: ${patterns.averageLeadTime} days

Provide:
1. Customer travel personality profile
2. Key preferences and patterns
3. Motivation factors (adventure, relaxation, culture, etc.)
4. Budget consciousness level
5. Planning style (spontaneous vs. planner)

Format as JSON with these fields: personality, preferences, motivations, budgetStyle, planningStyle`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.3,
      maxTokens: 800
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return {
        personality: response.response,
        preferences: [],
        motivations: [],
        budgetStyle: 'moderate',
        planningStyle: 'balanced'
      };
    }
  }

  /**
   * Generate personalized recommendations
   */
  async generateRecommendations(analysis, patterns) {
    const prompt = `Based on this travel profile, suggest 5 personalized travel packages:

Profile:
${JSON.stringify(analysis, null, 2)}

Patterns:
- Preferred destinations: ${Object.keys(patterns.destinations).join(', ')}
- Budget: $${patterns.averageBudget} average
- Duration: ${patterns.averageDuration} days
- Group size: ${patterns.averageGroupSize}

For each package provide: destination, description, highlights, estimated_cost, duration, best_season
Format as JSON array.`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.7,
      maxTokens: 1200
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return [];
    }
  }

  /**
   * Predict preferences for new customer
   */
  async predictPreferences(customerData) {
    const prompt = `Based on this customer information, predict their travel preferences:

Customer Data:
- Age: ${customerData.age || 'unknown'}
- Location: ${customerData.location || 'unknown'}
- Interests: ${customerData.interests?.join(', ') || 'none provided'}
- Budget indication: ${customerData.budgetIndication || 'not specified'}

Predict:
1. Likely destination types
2. Accommodation preferences
3. Activity interests
4. Budget range
5. Travel style

Format as JSON.`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.5,
      maxTokens: 600
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return { predictions: response.response };
    }
  }

  /**
   * Helper: Categorize destination
   */
  categorizeDestination(destination) {
    const categories = {
      beach: ['beach', 'coast', 'island', 'seaside'],
      mountain: ['mountain', 'alps', 'peak', 'ski'],
      city: ['city', 'urban', 'metro', 'capital'],
      nature: ['forest', 'park', 'wildlife', 'safari'],
      cultural: ['historic', 'museum', 'temple', 'heritage']
    };

    const destLower = destination.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => destLower.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Helper: Get season from date
   */
  getSeason(date) {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  /**
   * Helper: Get top items
   */
  getTopItems(items, count = 5) {
    const frequency = {};
    items.forEach(item => {
      frequency[item] = (frequency[item] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([item]) => item);
  }

  /**
   * Helper: Calculate average
   */
  average(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Helper: Calculate confidence
   */
  calculateConfidence(bookingCount, patterns) {
    let confidence = Math.min(bookingCount / 10, 1) * 100;
    
    // Adjust for pattern consistency
    const destVariety = Object.keys(patterns.destinations).length;
    if (destVariety < 3) confidence *= 1.1;
    
    return Math.min(confidence, 95);
  }
}

module.exports = TravelPreferencesAgent;
