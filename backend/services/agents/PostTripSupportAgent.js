/**
 * Post-Trip Support Agent
 * Automated post-trip customer engagement and feedback management
 * 
 * Features:
 * - Satisfaction survey automation
 * - Review collection and management
 * - Future visit information
 * - Post-trip recommendations
 * - Issue resolution tracking
 * - Loyalty program engagement
 */

const { MultiModelAI } = require('../../ai/MultiModelAI');
const { EventEmitter } = require('events');

class PostTripSupportAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      model: config.model || 'gpt-4o-mini',
      surveyDelay: config.surveyDelay || 24, // hours after trip
      followUpDelay: config.followUpDelay || 7, // days after trip
      reviewIncentive: config.reviewIncentive || true,
      ...config
    };

    this.ai = new MultiModelAI();
    
    this.surveyQuestions = [
      {
        id: 'overall_satisfaction',
        type: 'rating',
        question: '¿Cómo calificarías tu experiencia general?',
        scale: 10
      },
      {
        id: 'accommodation_quality',
        type: 'rating',
        question: '¿Qué tan satisfecho estás con el alojamiento?',
        scale: 5
      },
      {
        id: 'activity_satisfaction',
        type: 'rating',
        question: '¿Cómo valoras las actividades y tours?',
        scale: 5
      },
      {
        id: 'guide_service',
        type: 'rating',
        question: '¿Cómo fue el servicio de nuestros guías?',
        scale: 5
      },
      {
        id: 'value_for_money',
        type: 'rating',
        question: '¿El viaje valió la pena por el precio pagado?',
        scale: 5
      },
      {
        id: 'feedback',
        type: 'text',
        question: '¿Qué podemos mejorar para tu próximo viaje?'
      },
      {
        id: 'recommendation_likelihood',
        type: 'nps',
        question: '¿Qué tan probable es que nos recomiendes?',
        scale: 10
      }
    ];
  }

  /**
   * Process completed trip
   */
  async processCompletedTrip(tripData) {
    this.emit('trip:completed', { tripId: tripData.id, customerId: tripData.customerId });

    try {
      // Schedule satisfaction survey
      const surveySchedule = await this.scheduleSurvey(tripData);

      // Schedule follow-up communications
      const followUpSchedule = await this.scheduleFollowUp(tripData);

      // Generate personalized thank you message
      const thankYouMessage = await this.generateThankYouMessage(tripData);

      // Check for issues during trip
      const issueCheck = await this.checkForIssues(tripData);

      return {
        success: true,
        tripId: tripData.id,
        surveySchedule,
        followUpSchedule,
        thankYouMessage,
        issuesDetected: issueCheck.hasIssues,
        nextActions: this.getNextActions(tripData, issueCheck)
      };
    } catch (error) {
      this.emit('trip:processing_error', { tripId: tripData.id, error: error.message });
      throw error;
    }
  }

  /**
   * Generate and send satisfaction survey
   */
  async scheduleSurvey(tripData) {
    const surveyData = {
      tripId: tripData.id,
      customerId: tripData.customerId,
      destination: tripData.destination,
      completionDate: tripData.endDate,
      scheduledFor: new Date(Date.now() + this.config.surveyDelay * 60 * 60 * 1000),
      questions: this.surveyQuestions,
      incentive: this.config.reviewIncentive ? {
        type: 'discount',
        value: 10,
        description: '10% de descuento en tu próxima reserva'
      } : null
    };

    // Generate personalized survey intro
    const intro = await this.generateSurveyIntro(tripData);
    surveyData.introMessage = intro;

    this.emit('survey:scheduled', { tripId: tripData.id, scheduledFor: surveyData.scheduledFor });

    return surveyData;
  }

  /**
   * Process survey response
   */
  async processSurveyResponse(surveyResponse) {
    this.emit('survey:received', { tripId: surveyResponse.tripId, customerId: surveyResponse.customerId });

    try {
      // Analyze sentiment
      const sentiment = await this.analyzeSentiment(surveyResponse);

      // Calculate NPS score
      const nps = this.calculateNPS(surveyResponse.answers);

      // Identify issues
      const issues = this.identifyIssues(surveyResponse, sentiment);

      // Generate response strategy
      const responseStrategy = await this.generateResponseStrategy(surveyResponse, sentiment, issues);

      // Determine follow-up actions
      const followUpActions = this.determineFollowUpActions(sentiment, nps, issues);

      const analysis = {
        tripId: surveyResponse.tripId,
        customerId: surveyResponse.customerId,
        sentiment: sentiment.overall,
        nps,
        issues,
        responseStrategy,
        followUpActions,
        processedAt: new Date()
      };

      // If serious issues, trigger immediate response
      if (issues.length > 0 && sentiment.overall === 'negative') {
        await this.triggerImmediateResponse(surveyResponse, issues);
      }

      this.emit('survey:processed', { tripId: surveyResponse.tripId, sentiment: sentiment.overall });

      return analysis;
    } catch (error) {
      this.emit('survey:processing_error', { tripId: surveyResponse.tripId, error: error.message });
      throw error;
    }
  }

  /**
   * Manage review collection
   */
  async requestReview(tripData, platform = 'google') {
    const reviewRequest = await this.generateReviewRequest(tripData, platform);

    return {
      tripId: tripData.id,
      customerId: tripData.customerId,
      platform,
      requestMessage: reviewRequest,
      incentive: this.config.reviewIncentive,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
    };
  }

  /**
   * Process received review
   */
  async processReview(reviewData) {
    this.emit('review:received', { tripId: reviewData.tripId, rating: reviewData.rating });

    try {
      // Analyze review sentiment
      const sentiment = await this.analyzeReviewSentiment(reviewData);

      // Generate response
      const response = await this.generateReviewResponse(reviewData, sentiment);

      // Extract insights
      const insights = await this.extractReviewInsights(reviewData);

      // Determine if escalation needed
      const needsEscalation = this.checkReviewEscalation(reviewData, sentiment);

      return {
        reviewId: reviewData.id,
        tripId: reviewData.tripId,
        sentiment: sentiment.overall,
        rating: reviewData.rating,
        response,
        insights,
        needsEscalation,
        processedAt: new Date()
      };
    } catch (error) {
      this.emit('review:processing_error', { reviewId: reviewData.id, error: error.message });
      throw error;
    }
  }

  /**
   * Generate future visit information
   */
  async generateFutureVisitInfo(tripData, surveyResponse) {
    const prompt = `Based on this customer's trip experience, generate personalized future visit information:

Trip Details:
- Destination: ${tripData.destination}
- Activities: ${tripData.activities?.join(', ') || 'general tourism'}
- Duration: ${tripData.duration} days
- Season: ${this.getSeason(tripData.startDate)}

Survey Feedback:
- Overall satisfaction: ${surveyResponse.answers.overall_satisfaction}/10
- Favorite aspects: ${this.extractFavorites(surveyResponse)}
- Improvement suggestions: ${surveyResponse.answers.feedback || 'none provided'}

Generate:
1. Best times to visit again (seasonal recommendations)
2. New experiences they might enjoy based on their interests
3. Special events in the destination for next 12 months
4. Returning visitor benefits and loyalty rewards
5. Nearby destinations they might also love

Format as JSON with sections: seasonalTips, newExperiences, upcomingEvents, loyaltyBenefits, nearbyDestinations`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.7,
      maxTokens: 1000
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return { info: response.response };
    }
  }

  /**
   * Schedule follow-up communications
   */
  async scheduleFollowUp(tripData) {
    const schedule = [
      {
        type: 'thank_you',
        delay: 1, // 1 day after trip
        message: await this.generateThankYouMessage(tripData)
      },
      {
        type: 'survey',
        delay: this.config.surveyDelay / 24, // Convert hours to days
        action: 'send_survey'
      },
      {
        type: 'review_request',
        delay: 3, // 3 days after trip
        action: 'request_review'
      },
      {
        type: 'future_visit',
        delay: this.config.followUpDelay, // 7 days after trip
        action: 'send_future_info'
      },
      {
        type: 'loyalty_offer',
        delay: 30, // 1 month after trip
        action: 'send_loyalty_offer'
      }
    ];

    return schedule.map(item => ({
      ...item,
      scheduledFor: new Date(new Date(tripData.endDate).getTime() + item.delay * 24 * 60 * 60 * 1000),
      tripId: tripData.id,
      customerId: tripData.customerId
    }));
  }

  /**
   * Analyze sentiment from survey
   */
  async analyzeSentiment(surveyResponse) {
    const prompt = `Analyze the sentiment from this customer survey:

Ratings:
- Overall satisfaction: ${surveyResponse.answers.overall_satisfaction}/10
- Accommodation: ${surveyResponse.answers.accommodation_quality}/5
- Activities: ${surveyResponse.answers.activity_satisfaction}/5
- Guide service: ${surveyResponse.answers.guide_service}/5
- Value: ${surveyResponse.answers.value_for_money}/5
- NPS: ${surveyResponse.answers.recommendation_likelihood}/10

Feedback: "${surveyResponse.answers.feedback || 'no feedback provided'}"

Analyze:
1. Overall sentiment (positive/neutral/negative)
2. Key sentiment drivers
3. Emotional tone
4. Specific concerns or praises
5. Urgency level for response

Format as JSON with: overall, drivers, tone, concerns, praises, urgency`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.3,
      maxTokens: 500
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return {
        overall: surveyResponse.answers.overall_satisfaction > 7 ? 'positive' : 'negative',
        drivers: [],
        tone: 'neutral',
        concerns: [],
        praises: [],
        urgency: 'low'
      };
    }
  }

  /**
   * Generate personalized thank you message
   */
  async generateThankYouMessage(tripData) {
    const prompt = `Generate a warm, personalized thank you message for a customer who just completed this trip:

Destination: ${tripData.destination}
Duration: ${tripData.duration} days
Activities: ${tripData.activities?.join(', ') || 'various activities'}
Group: ${tripData.groupSize || 1} travelers

Make it:
- Personal and warm
- Reference specific aspects of their trip
- Express genuine appreciation
- Include subtle invitation for future trips
- Keep it under 150 words
- In Spanish (es)`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.8,
      maxTokens: 300
    });

    return response.response;
  }

  /**
   * Generate review request
   */
  async generateReviewRequest(tripData, platform) {
    const prompt = `Generate a friendly review request message for ${platform}:

Trip: ${tripData.destination} - ${tripData.duration} days
Customer: ${tripData.customerName || 'valued customer'}

Make it:
- Friendly and not pushy
- Explain how reviews help future travelers
- Make it easy (include direct link placeholder)
- Mention incentive if applicable
- Show appreciation
- In Spanish (es)`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.7,
      maxTokens: 250
    });

    return response.response;
  }

  /**
   * Generate review response
   */
  async generateReviewResponse(reviewData, sentiment) {
    const prompt = `Generate a professional response to this ${reviewData.rating}-star review:

Review: "${reviewData.text}"
Sentiment: ${sentiment.overall}
Trip: ${reviewData.tripDestination}

Guidelines:
- Thank them for the review
- Address specific points mentioned
- ${sentiment.overall === 'negative' ? 'Apologize for issues and offer solutions' : 'Show appreciation and invite them back'}
- Professional but warm tone
- Specific and personal, not generic
- In Spanish (es)`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.6,
      maxTokens: 300
    });

    return response.response;
  }

  /**
   * Helper: Calculate NPS
   */
  calculateNPS(answers) {
    const npsScore = answers.recommendation_likelihood || 0;
    
    if (npsScore >= 9) return { score: npsScore, category: 'promoter' };
    if (npsScore >= 7) return { score: npsScore, category: 'passive' };
    return { score: npsScore, category: 'detractor' };
  }

  /**
   * Helper: Identify issues from survey
   */
  identifyIssues(surveyResponse, sentiment) {
    const issues = [];
    const answers = surveyResponse.answers;

    if (answers.overall_satisfaction < 6) {
      issues.push({ severity: 'high', category: 'overall', description: 'Low overall satisfaction' });
    }

    if (answers.accommodation_quality < 3) {
      issues.push({ severity: 'medium', category: 'accommodation', description: 'Poor accommodation rating' });
    }

    if (answers.guide_service < 3) {
      issues.push({ severity: 'high', category: 'service', description: 'Poor guide service rating' });
    }

    if (answers.value_for_money < 3) {
      issues.push({ severity: 'medium', category: 'value', description: 'Poor value perception' });
    }

    // Check for negative keywords in feedback
    if (sentiment.concerns && sentiment.concerns.length > 0) {
      sentiment.concerns.forEach(concern => {
        issues.push({ severity: 'medium', category: 'feedback', description: concern });
      });
    }

    return issues;
  }

  /**
   * Helper: Determine follow-up actions
   */
  determineFollowUpActions(sentiment, nps, issues) {
    const actions = [];

    if (nps.category === 'promoter') {
      actions.push({ type: 'loyalty_reward', priority: 'high', description: 'Send loyalty discount' });
      actions.push({ type: 'referral_program', priority: 'medium', description: 'Invite to referral program' });
    }

    if (nps.category === 'detractor') {
      actions.push({ type: 'personal_contact', priority: 'urgent', description: 'Manager should contact personally' });
      actions.push({ type: 'recovery_offer', priority: 'high', description: 'Offer compensation/discount' });
    }

    if (issues.length > 0) {
      actions.push({ type: 'issue_resolution', priority: 'urgent', description: 'Resolve reported issues' });
    }

    if (sentiment.overall === 'positive') {
      actions.push({ type: 'request_review', priority: 'medium', description: 'Request public review' });
      actions.push({ type: 'upsell_opportunity', priority: 'low', description: 'Offer premium future packages' });
    }

    return actions;
  }

  /**
   * Helper: Check for issues during trip
   */
  async checkForIssues(tripData) {
    // Check if there were any reported issues during the trip
    const hasIssues = tripData.issues && tripData.issues.length > 0;

    return {
      hasIssues,
      issues: tripData.issues || [],
      requiresImmediateAttention: hasIssues && tripData.issues.some(i => i.severity === 'high')
    };
  }

  /**
   * Helper: Get next actions
   */
  getNextActions(tripData, issueCheck) {
    const actions = [];

    if (issueCheck.requiresImmediateAttention) {
      actions.push({ type: 'issue_follow_up', priority: 'urgent', deadline: '24 hours' });
    }

    actions.push({ type: 'send_survey', priority: 'high', deadline: `${this.config.surveyDelay} hours` });
    actions.push({ type: 'request_review', priority: 'medium', deadline: '3 days' });
    actions.push({ type: 'future_visit_info', priority: 'low', deadline: '7 days' });

    return actions;
  }

  /**
   * Helper: Trigger immediate response
   */
  async triggerImmediateResponse(surveyResponse, issues) {
    this.emit('immediate_response:required', {
      tripId: surveyResponse.tripId,
      customerId: surveyResponse.customerId,
      issues,
      priority: 'urgent'
    });

    // This would integrate with notification system
    return {
      notificationSent: true,
      assignedTo: 'customer_service_manager',
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  /**
   * Helper: Extract review insights
   */
  async extractReviewInsights(reviewData) {
    const prompt = `Extract key insights from this review:

"${reviewData.text}"

Identify:
1. Specific services mentioned
2. Staff members praised or criticized
3. Facilities/amenities feedback
4. Value perception
5. Comparison to competitors (if any)

Return as JSON array of insights.`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.3,
      maxTokens: 400
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return [];
    }
  }

  /**
   * Helper: Check if review needs escalation
   */
  checkReviewEscalation(reviewData, sentiment) {
    return (
      reviewData.rating <= 2 ||
      sentiment.overall === 'negative' ||
      (sentiment.urgency && sentiment.urgency === 'high')
    );
  }

  /**
   * Helper: Analyze review sentiment
   */
  async analyzeReviewSentiment(reviewData) {
    const prompt = `Analyze sentiment of this ${reviewData.rating}-star review:

"${reviewData.text}"

Provide:
- Overall sentiment
- Key themes
- Urgency level
- Response tone recommendation

Format as JSON.`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.2,
      maxTokens: 300
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return {
        overall: reviewData.rating >= 4 ? 'positive' : 'negative',
        themes: [],
        urgency: reviewData.rating <= 2 ? 'high' : 'low',
        responseTone: 'professional'
      };
    }
  }

  /**
   * Helper: Get season
   */
  getSeason(date) {
    const month = new Date(date).getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  /**
   * Helper: Extract favorites
   */
  extractFavorites(surveyResponse) {
    const answers = surveyResponse.answers;
    const favorites = [];

    if (answers.accommodation_quality >= 4) favorites.push('accommodation');
    if (answers.activity_satisfaction >= 4) favorites.push('activities');
    if (answers.guide_service >= 4) favorites.push('guide service');

    return favorites.join(', ') || 'general experience';
  }

  /**
   * Helper: Generate survey intro
   */
  async generateSurveyIntro(tripData) {
    const prompt = `Generate a brief, warm introduction for a post-trip survey:

Trip: ${tripData.destination} - ${tripData.duration} days
Customer: ${tripData.customerName || 'valued customer'}

Make it:
- Warm and appreciative
- Brief (2-3 sentences)
- Explain survey purpose
- Mention incentive if applicable
- In Spanish (es)`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.7,
      maxTokens: 150
    });

    return response.response;
  }

  /**
   * Generate response strategy
   */
  async generateResponseStrategy(surveyResponse, sentiment, issues) {
    const prompt = `Create a response strategy for this customer survey:

Sentiment: ${sentiment.overall}
NPS Category: ${this.calculateNPS(surveyResponse.answers).category}
Issues: ${issues.length > 0 ? JSON.stringify(issues) : 'none'}

Provide:
1. Response tone (apologetic/grateful/neutral)
2. Key points to address
3. Compensation needed (yes/no/maybe)
4. Follow-up priority (urgent/high/medium/low)
5. Suggested actions

Format as JSON.`;

    const response = await this.ai.processRequest({
      prompt,
      model: this.config.model,
      temperature: 0.4,
      maxTokens: 400
    });

    try {
      return JSON.parse(response.response);
    } catch (error) {
      return {
        tone: sentiment.overall === 'negative' ? 'apologetic' : 'grateful',
        keyPoints: [],
        compensation: issues.length > 0,
        priority: issues.length > 0 ? 'high' : 'medium',
        actions: []
      };
    }
  }
}

module.exports = PostTripSupportAgent;
