/**
 * AI Email Content Generation Service for Travel Agency Prospecting
 * 
 * This service uses OpenAI GPT-4 to generate personalized email content
 * for travel agency campaigns. It learns from approved emails and adapts
 * content based on agency data, products, and campaign types.
 * 
 * Features:
 * - AI-powered subject lines and body content generation
 * - Personalization based on agency data and location
 * - Product-aware content (Spirit Tours packages)
 * - Multi-language support (Spanish/English)
 * - Learning from approved emails
 * - A/B testing variations
 * - Template-based generation with dynamic variables
 * 
 * Integration: Works with email-sender.service.js and approval workflow
 */

const OpenAI = require('openai');
const mongoose = require('mongoose');

// Models
const EmailTemplate = require('../../models/EmailTemplate');
const EmailLog = require('../../models/EmailLog');
const TravelAgency = require('../../models/TravelAgency');
const Product = require('../../models/Product');

class AIEmailGeneratorService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.config = {
      model: 'gpt-4-turbo-preview', // Latest GPT-4 model
      temperature: 0.7, // Balance creativity and consistency
      maxTokens: 1500, // ~1000 words max per email
      presencePenalty: 0.6, // Encourage diverse content
      frequencyPenalty: 0.3, // Reduce repetition
    };
    
    // Campaign type definitions
    this.campaignTypes = {
      prospect_intro: {
        goal: 'Introduce Spirit Tours to new prospect agencies',
        tone: 'professional, friendly, value-focused',
        cta: 'schedule call, request partnership info',
      },
      prospect_followup: {
        goal: 'Follow up with prospects who didn\'t respond',
        tone: 'persistent but respectful, helpful',
        cta: 'respond with questions, schedule demo',
      },
      client_update: {
        goal: 'Keep existing clients informed of new products/promotions',
        tone: 'familiar, appreciative, insider information',
        cta: 'view new packages, update preferences',
      },
      client_promotion: {
        goal: 'Announce special offers to existing clients',
        tone: 'exciting, exclusive, urgent (without being pushy)',
        cta: 'book now, reserve allocation',
      },
      client_newsletter: {
        goal: 'Regular update with industry insights and Spirit Tours news',
        tone: 'informative, thought leadership, relationship building',
        cta: 'read more, share feedback',
      },
      seasonal_campaign: {
        goal: 'Promote seasonal destinations and packages',
        tone: 'inspiring, descriptive, seasonal urgency',
        cta: 'explore destinations, request availability',
      },
    };
    
    // Learning storage
    this.learningCache = {
      successful_subjects: [],
      successful_content_patterns: [],
      high_performing_ctas: [],
      lastUpdated: null,
    };
    
    // Initialize learning from historical data
    this.initializeLearning();
  }
  
  /**
   * Initialize learning by analyzing successful historical emails
   */
  async initializeLearning() {
    try {
      // Find emails with high open rates (>30%) and click rates (>5%)
      const successfulEmails = await EmailLog.find({
        status: 'delivered',
        'analytics.openRate': { $gte: 30 },
        'analytics.clickRate': { $gte: 5 },
        approved: true,
      })
      .sort({ 'analytics.openRate': -1 })
      .limit(50);
      
      if (successfulEmails.length > 0) {
        this.learningCache.successful_subjects = successfulEmails.map(e => e.subject);
        this.learningCache.successful_content_patterns = successfulEmails.map(e => ({
          structure: this.analyzeEmailStructure(e.html),
          keyPhrases: this.extractKeyPhrases(e.html),
          wordCount: this.countWords(e.text),
        }));
        this.learningCache.lastUpdated = new Date();
        
        console.log(`[AI Email Generator] Learning initialized with ${successfulEmails.length} successful emails`);
      }
    } catch (error) {
      console.error('[AI Email Generator] Failed to initialize learning:', error);
    }
  }
  
  /**
   * Generate complete email content using AI
   * 
   * @param {Object} options - Generation options
   * @param {Object} options.agency - Travel agency data
   * @param {String} options.campaignType - Type of campaign (prospect_intro, client_update, etc.)
   * @param {String} options.language - 'es' or 'en'
   * @param {Array} options.products - Spirit Tours products to highlight
   * @param {Object} options.customContext - Additional context for generation
   * @param {Number} options.variations - Number of A/B test variations (default: 1)
   * @returns {Promise<Object|Array>} Generated email content (single or array for variations)
   */
  async generateEmail(options) {
    const {
      agency,
      campaignType = 'prospect_intro',
      language = 'es',
      products = [],
      customContext = {},
      variations = 1,
    } = options;
    
    // Validate inputs
    if (!agency || !agency.name) {
      throw new Error('Agency data is required with at least a name');
    }
    
    if (!this.campaignTypes[campaignType]) {
      throw new Error(`Invalid campaign type: ${campaignType}. Valid types: ${Object.keys(this.campaignTypes).join(', ')}`);
    }
    
    // Fetch products if not provided
    let selectedProducts = products;
    if (selectedProducts.length === 0) {
      selectedProducts = await this.selectRelevantProducts(agency, campaignType);
    }
    
    // Determine if agency is client or prospect
    const isClient = agency.clientStatus?.isClient || false;
    
    // Build comprehensive context for AI
    const context = this.buildContext({
      agency,
      campaignType,
      language,
      products: selectedProducts,
      isClient,
      customContext,
    });
    
    // Generate variations
    if (variations > 1) {
      const generatedVariations = [];
      for (let i = 0; i < variations; i++) {
        const variant = await this.generateSingleEmail(context, i);
        generatedVariations.push(variant);
      }
      return generatedVariations;
    } else {
      return await this.generateSingleEmail(context, 0);
    }
  }
  
  /**
   * Build context object for AI prompt
   */
  buildContext(options) {
    const { agency, campaignType, language, products, isClient, customContext } = options;
    
    const campaignDef = this.campaignTypes[campaignType];
    
    return {
      // Agency information
      agency: {
        name: agency.name,
        city: agency.address?.city || 'Unknown',
        country: agency.address?.country || 'Unknown',
        specialties: agency.specialties || [],
        website: agency.website || null,
        isClient: isClient,
        clientSince: agency.clientStatus?.clientSince || null,
        leadScore: agency.prospecting?.leadScore || 0,
      },
      
      // Campaign details
      campaign: {
        type: campaignType,
        goal: campaignDef.goal,
        tone: campaignDef.tone,
        cta: campaignDef.cta,
      },
      
      // Products to feature
      products: products.map(p => ({
        name: p.name,
        destination: p.destination,
        duration: p.duration,
        price: p.price,
        highlights: p.highlights || [],
        seasonality: p.seasonality || 'year-round',
      })),
      
      // Spirit Tours brand info
      brand: {
        name: 'Spirit Tours',
        tagline: 'Your Partner in Unforgettable Journeys',
        values: ['Authentic Experiences', 'Local Expertise', 'Sustainable Travel', 'Customer Excellence'],
        differentiators: [
          'Exclusive B2B partner benefits',
          'Dedicated account management',
          'Competitive commission structure',
          'Marketing support and materials',
          '24/7 travel support',
        ],
      },
      
      // Language
      language: language,
      languageName: language === 'es' ? 'Spanish' : 'English',
      
      // Learning from successful emails
      learning: {
        topSubjects: this.learningCache.successful_subjects.slice(0, 5),
        avgWordCount: this.calculateAverageWordCount(),
        effectivePatterns: this.learningCache.successful_content_patterns.slice(0, 3),
      },
      
      // Custom context
      custom: customContext,
      
      // Current season/timing
      timing: {
        season: this.getCurrentSeason(),
        month: new Date().toLocaleString(language === 'es' ? 'es-ES' : 'en-US', { month: 'long' }),
        year: new Date().getFullYear(),
      },
    };
  }
  
  /**
   * Generate a single email using OpenAI
   */
  async generateSingleEmail(context, variationIndex) {
    const prompt = this.buildPrompt(context, variationIndex);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt(context.language),
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        presence_penalty: this.config.presencePenalty,
        frequency_penalty: this.config.frequencyPenalty,
      });
      
      const generatedContent = response.choices[0].message.content;
      
      // Parse the generated content
      const parsed = this.parseGeneratedContent(generatedContent);
      
      // Add metadata
      parsed.metadata = {
        generatedAt: new Date(),
        model: this.config.model,
        campaignType: context.campaign.type,
        language: context.language,
        variationIndex: variationIndex,
        tokens: response.usage.total_tokens,
        cost: this.calculateCost(response.usage),
      };
      
      // Add personalization variables
      parsed.variables = this.extractVariables(context);
      
      return parsed;
      
    } catch (error) {
      console.error('[AI Email Generator] OpenAI API error:', error);
      throw new Error(`Failed to generate email content: ${error.message}`);
    }
  }
  
  /**
   * Build the AI prompt for email generation
   */
  buildPrompt(context, variationIndex) {
    const { agency, campaign, products, brand, language, learning, timing, custom } = context;
    
    let prompt = `Generate a professional email for a travel agency B2B email campaign.

**RECIPIENT AGENCY:**
- Name: ${agency.name}
- Location: ${agency.city}, ${agency.country}
- Status: ${agency.isClient ? `Existing client since ${agency.clientSince}` : `Prospect (Lead Score: ${agency.leadScore}/100)`}
${agency.specialties.length > 0 ? `- Specialties: ${agency.specialties.join(', ')}` : ''}

**CAMPAIGN TYPE: ${campaign.type.toUpperCase()}**
- Goal: ${campaign.goal}
- Tone: ${campaign.tone}
- Call to Action: ${campaign.cta}

**SENDER: ${brand.name}**
- Tagline: ${brand.tagline}
- Values: ${brand.values.join(', ')}
- Key Differentiators:
${brand.differentiators.map(d => `  * ${d}`).join('\n')}

**PRODUCTS TO FEATURE:**
${products.length > 0 ? products.map((p, i) => `
${i + 1}. ${p.name}
   - Destination: ${p.destination}
   - Duration: ${p.duration}
   - Price: ${p.price}
   - Highlights: ${p.highlights.join(', ')}
   - Best Season: ${p.seasonality}
`).join('\n') : 'No specific products - focus on partnership benefits'}

**CONTEXT:**
- Current Season: ${timing.season}
- Month: ${timing.month} ${timing.year}
${custom.specialOffer ? `- Special Offer: ${custom.specialOffer}` : ''}
${custom.deadline ? `- Deadline: ${custom.deadline}` : ''}

**LEARNING FROM SUCCESSFUL EMAILS:**
${learning.topSubjects.length > 0 ? `- Effective Subject Lines:\n${learning.topSubjects.map(s => `  * "${s}"`).join('\n')}` : ''}
- Average Word Count: ${learning.avgWordCount} words
${learning.effectivePatterns.length > 0 ? `- Successful Patterns: Clear value proposition, specific benefits, strong CTA` : ''}

**REQUIREMENTS:**
1. Write in ${context.languageName} (${language})
2. Subject line: 50-70 characters, compelling, specific
3. Preheader text: 40-100 characters, complements subject
4. Email body: ${learning.avgWordCount > 0 ? `${learning.avgWordCount - 50}-${learning.avgWordCount + 50}` : '250-400'} words
5. Personalize with agency name and location
6. Include 1-2 specific product highlights if applicable
7. Clear call-to-action (${campaign.cta})
8. Professional signature from Spirit Tours team
9. ${agency.isClient ? 'Acknowledge existing relationship, use familiar tone' : 'Introduce value proposition, build credibility'}
10. ${variationIndex > 0 ? `VARIATION ${variationIndex + 1}: Use different angle/hook than previous versions` : 'PRIMARY VERSION: Most direct and impactful approach'}

**OUTPUT FORMAT:**
Provide the email in this exact structure:

SUBJECT: [Your subject line here]

PREHEADER: [Your preheader text here]

BODY:
[Your email body in HTML format - use simple HTML tags: <p>, <h2>, <ul>, <li>, <strong>, <a>]

PLAIN_TEXT:
[Plain text version of the email body]

CTA_TEXT: [Primary call-to-action button text]

CTA_URL: [URL for the CTA - use placeholder like {{cta_url}}]

---

Generate the email now:`;

    return prompt;
  }
  
  /**
   * System prompt for OpenAI
   */
  getSystemPrompt(language) {
    const prompts = {
      es: `Eres un experto en marketing B2B para la industria de viajes y turismo, especializado en crear correos electrónicos persuasivos para agencias de viajes. Tu objetivo es generar contenido que construya relaciones, demuestre valor y genere conversiones.

Principios clave:
- Enfócate en beneficios para la agencia (comisiones, soporte, productos exclusivos)
- Usa un tono profesional pero cercano
- Sé específico con datos y ofertas
- Crea urgencia sin ser agresivo
- Personaliza con información de la agencia
- Incluye prueba social cuando sea relevante
- Llamadas a la acción claras y únicas
- Cumple con leyes de email marketing (CAN-SPAM, GDPR)`,
      
      en: `You are a B2B marketing expert for the travel and tourism industry, specializing in creating persuasive emails for travel agencies. Your goal is to generate content that builds relationships, demonstrates value, and drives conversions.

Key principles:
- Focus on benefits for the agency (commissions, support, exclusive products)
- Use a professional yet friendly tone
- Be specific with data and offers
- Create urgency without being pushy
- Personalize with agency information
- Include social proof when relevant
- Clear and single call-to-action
- Comply with email marketing laws (CAN-SPAM, GDPR)`,
    };
    
    return prompts[language] || prompts.en;
  }
  
  /**
   * Parse generated content from OpenAI response
   */
  parseGeneratedContent(content) {
    const lines = content.split('\n');
    const parsed = {
      subject: '',
      preheader: '',
      html: '',
      text: '',
      ctaText: '',
      ctaUrl: '',
    };
    
    let currentSection = null;
    let bodyLines = [];
    let plainTextLines = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('SUBJECT:')) {
        parsed.subject = trimmed.replace('SUBJECT:', '').trim();
      } else if (trimmed.startsWith('PREHEADER:')) {
        parsed.preheader = trimmed.replace('PREHEADER:', '').trim();
      } else if (trimmed === 'BODY:') {
        currentSection = 'body';
      } else if (trimmed === 'PLAIN_TEXT:') {
        currentSection = 'plainText';
      } else if (trimmed.startsWith('CTA_TEXT:')) {
        parsed.ctaText = trimmed.replace('CTA_TEXT:', '').trim();
        currentSection = null;
      } else if (trimmed.startsWith('CTA_URL:')) {
        parsed.ctaUrl = trimmed.replace('CTA_URL:', '').trim();
        currentSection = null;
      } else if (trimmed === '---') {
        // End of content
        break;
      } else if (currentSection === 'body' && trimmed) {
        bodyLines.push(line);
      } else if (currentSection === 'plainText' && trimmed) {
        plainTextLines.push(trimmed);
      }
    }
    
    parsed.html = this.wrapInEmailTemplate(bodyLines.join('\n'));
    parsed.text = plainTextLines.join('\n\n');
    
    // Fallback: if parsing failed, use entire content as body
    if (!parsed.subject || !parsed.html) {
      console.warn('[AI Email Generator] Parsing failed, using raw content');
      parsed.subject = 'Spirit Tours - Partnership Opportunity';
      parsed.html = this.wrapInEmailTemplate(content);
      parsed.text = content.replace(/<[^>]*>/g, ''); // Strip HTML
    }
    
    return parsed;
  }
  
  /**
   * Wrap email content in HTML template
   */
  wrapInEmailTemplate(content) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spirit Tours</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
    .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .cta-button:hover { background: #764ba2; }
    .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
    .footer a { color: #667eea; text-decoration: none; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Spirit Tours</h1>
      <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Your Partner in Unforgettable Journeys</p>
    </div>
    
    <div class="content">
      ${content}
      
      {{cta_button}}
    </div>
    
    <div class="footer">
      <p><strong>Spirit Tours</strong> | B2B Travel Solutions</p>
      <p>Email: partnerships@spirittours.com | Phone: +1 (555) 123-4567</p>
      <p>
        <a href="{{unsubscribe_url}}">Unsubscribe</a> | 
        <a href="{{preferences_url}}">Email Preferences</a> | 
        <a href="{{view_online_url}}">View Online</a>
      </p>
      <p style="margin-top: 15px; font-size: 11px; color: #999;">
        This email was sent to {{agency_email}} because you are registered as a travel agency partner.
        <br>Spirit Tours Inc. | 123 Travel Street, Tourism City, TC 12345
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
  
  /**
   * Extract personalization variables from context
   */
  extractVariables(context) {
    return {
      agency_name: context.agency.name,
      agency_city: context.agency.city,
      agency_country: context.agency.country,
      agency_email: '{{agency_email}}', // Placeholder
      contact_name: '{{contact_name}}', // Placeholder
      account_manager: '{{account_manager}}', // Placeholder
      unsubscribe_url: '{{unsubscribe_url}}',
      preferences_url: '{{preferences_url}}',
      view_online_url: '{{view_online_url}}',
      cta_url: '{{cta_url}}',
    };
  }
  
  /**
   * Select relevant products for the agency based on their profile
   */
  async selectRelevantProducts(agency, campaignType) {
    try {
      const query = {};
      
      // Filter by seasonality
      const currentSeason = this.getCurrentSeason();
      query.$or = [
        { seasonality: currentSeason },
        { seasonality: 'year-round' },
      ];
      
      // Filter by agency specialties if available
      if (agency.specialties && agency.specialties.length > 0) {
        query.categories = { $in: agency.specialties };
      }
      
      // Get top-performing products for client campaigns
      if (campaignType.startsWith('client_')) {
        query.featured = true;
      }
      
      const products = await Product.find(query)
        .sort({ popularity: -1, rating: -1 })
        .limit(3);
      
      return products;
    } catch (error) {
      console.error('[AI Email Generator] Failed to select products:', error);
      return [];
    }
  }
  
  /**
   * Analyze email structure for learning
   */
  analyzeEmailStructure(html) {
    return {
      hasCTA: html.includes('cta-button') || html.includes('href='),
      hasProductList: html.includes('<ul>') || html.includes('<li>'),
      hasImages: html.includes('<img'),
      paragraphCount: (html.match(/<p>/g) || []).length,
      linkCount: (html.match(/<a /g) || []).length,
    };
  }
  
  /**
   * Extract key phrases from text
   */
  extractKeyPhrases(html) {
    const text = html.replace(/<[^>]*>/g, ' ').toLowerCase();
    const phrases = [];
    
    // Common B2B travel phrases
    const patterns = [
      /exclusive.*?offer/g,
      /limited.*?time/g,
      /partner.*?benefit/g,
      /commission/g,
      /booking.*?support/g,
      /dedicated.*?account/g,
    ];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        phrases.push(...matches);
      }
    });
    
    return phrases.slice(0, 5);
  }
  
  /**
   * Count words in text
   */
  countWords(text) {
    return text.trim().split(/\s+/).length;
  }
  
  /**
   * Calculate average word count from learning cache
   */
  calculateAverageWordCount() {
    if (this.learningCache.successful_content_patterns.length === 0) {
      return 350; // Default
    }
    
    const total = this.learningCache.successful_content_patterns.reduce(
      (sum, pattern) => sum + pattern.wordCount,
      0
    );
    
    return Math.round(total / this.learningCache.successful_content_patterns.length);
  }
  
  /**
   * Get current season based on month
   */
  getCurrentSeason() {
    const month = new Date().getMonth() + 1; // 1-12
    
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'fall';
    return 'winter';
  }
  
  /**
   * Calculate cost of OpenAI API call
   */
  calculateCost(usage) {
    // GPT-4 Turbo pricing (as of 2024)
    const inputCostPer1k = 0.01; // $0.01 per 1K input tokens
    const outputCostPer1k = 0.03; // $0.03 per 1K output tokens
    
    const inputCost = (usage.prompt_tokens / 1000) * inputCostPer1k;
    const outputCost = (usage.completion_tokens / 1000) * outputCostPer1k;
    
    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost,
      tokens: usage.total_tokens,
    };
  }
  
  /**
   * Generate subject line variations for A/B testing
   */
  async generateSubjectLineVariations(context, count = 3) {
    const prompt = `Generate ${count} different subject line variations for this email campaign:

Campaign Type: ${context.campaign.type}
Agency: ${context.agency.name} (${context.agency.city}, ${context.agency.country})
Language: ${context.languageName}
Is Client: ${context.agency.isClient}

Requirements:
- 50-70 characters each
- Test different angles: urgency, curiosity, value, personalization
- All in ${context.languageName}
- No emojis
- Professional tone

Format: Just list the subject lines, one per line, numbered.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: this.getSystemPrompt(context.language) },
          { role: 'user', content: prompt },
        ],
        temperature: 0.9, // Higher creativity for variations
        max_tokens: 300,
      });
      
      const content = response.choices[0].message.content;
      const subjects = content
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^\d+\.\s*/, '').trim());
      
      return subjects;
    } catch (error) {
      console.error('[AI Email Generator] Failed to generate subject variations:', error);
      return [];
    }
  }
  
  /**
   * Improve email content based on feedback
   */
  async improveContent(originalContent, feedback) {
    const prompt = `Improve this email content based on the following feedback:

ORIGINAL SUBJECT: ${originalContent.subject}

ORIGINAL BODY:
${originalContent.text}

FEEDBACK:
${feedback}

Generate an improved version that addresses the feedback while maintaining the core message and brand voice.

Use the same output format as before (SUBJECT, PREHEADER, BODY, etc.)`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: this.getSystemPrompt(originalContent.metadata.language) },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6, // Lower temperature for refinement
        max_tokens: this.config.maxTokens,
      });
      
      const generatedContent = response.choices[0].message.content;
      const parsed = this.parseGeneratedContent(generatedContent);
      
      parsed.metadata = {
        ...originalContent.metadata,
        improvedAt: new Date(),
        feedback: feedback,
        tokens: response.usage.total_tokens,
        cost: this.calculateCost(response.usage),
      };
      
      return parsed;
    } catch (error) {
      console.error('[AI Email Generator] Failed to improve content:', error);
      throw error;
    }
  }
  
  /**
   * Generate email from template with AI enhancement
   */
  async generateFromTemplate(templateId, agencyData, customizations = {}) {
    try {
      const template = await EmailTemplate.findById(templateId);
      
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }
      
      // Use AI to enhance template with agency-specific details
      const prompt = `Enhance this email template with specific details for the recipient agency:

TEMPLATE:
Subject: ${template.subject}
Body: ${template.body}

AGENCY:
${JSON.stringify(agencyData, null, 2)}

CUSTOMIZATIONS:
${JSON.stringify(customizations, null, 2)}

Instructions:
1. Replace all {{variables}} with appropriate content
2. Add agency-specific personalization
3. Maintain the template structure and tone
4. Enhance with relevant details about the agency's location or specialties
5. Keep the same language as the template

Output the enhanced email in the standard format.`;

      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: 'You are an email personalization expert.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.5, // Lower creativity for template-based generation
        max_tokens: 1200,
      });
      
      const generatedContent = response.choices[0].message.content;
      const parsed = this.parseGeneratedContent(generatedContent);
      
      parsed.metadata = {
        generatedAt: new Date(),
        model: this.config.model,
        templateId: templateId,
        templateName: template.name,
        tokens: response.usage.total_tokens,
        cost: this.calculateCost(response.usage),
      };
      
      return parsed;
    } catch (error) {
      console.error('[AI Email Generator] Failed to generate from template:', error);
      throw error;
    }
  }
  
  /**
   * Batch generate emails for multiple agencies
   */
  async batchGenerate(agencies, campaignType, options = {}) {
    const {
      language = 'es',
      products = [],
      maxConcurrent = 5,
    } = options;
    
    const results = [];
    
    // Process in batches to avoid rate limits
    for (let i = 0; i < agencies.length; i += maxConcurrent) {
      const batch = agencies.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(agency => 
        this.generateEmail({
          agency,
          campaignType,
          language,
          products,
        }).catch(error => ({
          error: error.message,
          agency: agency.name,
        }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + maxConcurrent < agencies.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[AI Email Generator] Configuration updated:', this.config);
  }
  
  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      model: this.config.model,
      temperature: this.config.temperature,
      learningCache: {
        successfulEmails: this.learningCache.successful_subjects.length,
        patterns: this.learningCache.successful_content_patterns.length,
        lastUpdated: this.learningCache.lastUpdated,
      },
      campaignTypes: Object.keys(this.campaignTypes),
    };
  }
}

// Export singleton instance
module.exports = new AIEmailGeneratorService();
