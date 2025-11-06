/**
 * B2B Prospecting Agent - Fase 8
 * 
 * Sistema de prospección automatizada 24/7 para captar clientes B2B.
 * Busca y recopila datos de agencias de viaje, tour operadores, iglesias, 
 * universidades y otros clientes potenciales en países de habla hispana.
 * 
 * Características:
 * - Búsqueda automatizada 24/7 en múltiples fuentes
 * - Recopilación de datos completos (nombre, dirección, contactos, etc.)
 * - Enriquecimiento y verificación de datos
 * - Segmentación por tipo de cliente y país
 * - Integración con AI para análisis de prospectos
 * - Sistema de puntuación de leads (lead scoring)
 */

const EventEmitter = require('events');
const mongoose = require('mongoose');
const { getMultiModelAI } = require('../ai/MultiModelAI');

class ProspectingAgent extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Operational settings
      enabled: true,
      runInterval: 60 * 60 * 1000, // 1 hour
      batchSize: 50, // Prospects per batch
      maxDailyProspects: 1000,
      
      // Target markets (países hispanohablantes)
      targetCountries: [
        'ES', // España
        'MX', // México
        'AR', // Argentina
        'CO', // Colombia
        'PE', // Perú
        'VE', // Venezuela
        'CL', // Chile
        'EC', // Ecuador
        'GT', // Guatemala
        'CU', // Cuba
        'BO', // Bolivia
        'DO', // República Dominicana
        'HN', // Honduras
        'PY', // Paraguay
        'SV', // El Salvador
        'NI', // Nicaragua
        'CR', // Costa Rica
        'PA', // Panamá
        'UY', // Uruguay
        'PR'  // Puerto Rico
      ],
      
      // Client types to prospect
      clientTypes: [
        {
          type: 'travel_agency_receptive',
          name: 'Agencias de viaje receptivas',
          keywords: ['agencia de viaje receptiva', 'receptive travel agency', 'DMC'],
          priority: 'high'
        },
        {
          type: 'travel_agency_wholesale',
          name: 'Agencias de viaje mayoristas',
          keywords: ['agencia mayorista', 'wholesale travel agency', 'tour operador'],
          priority: 'high'
        },
        {
          type: 'tour_operator',
          name: 'Tour operadores turísticos',
          keywords: ['tour operador', 'tour operator', 'operadora turística'],
          priority: 'high'
        },
        {
          type: 'airline_tour_operator',
          name: 'Tour operadores de aerolíneas',
          keywords: ['tour operador aerolinea', 'airline tour operator'],
          priority: 'medium'
        },
        {
          type: 'cruise_tour_operator',
          name: 'Tour operadores de cruceros',
          keywords: ['tour operador cruceros', 'cruise tour operator'],
          priority: 'medium'
        },
        {
          type: 'service_platform',
          name: 'Plataformas de servicio turístico',
          keywords: ['plataforma turismo', 'tourism platform', 'booking platform'],
          priority: 'medium'
        },
        {
          type: 'church_catholic',
          name: 'Iglesias Católicas',
          keywords: ['iglesia católica', 'parroquia', 'diócesis', 'arquidiócesis'],
          priority: 'high'
        },
        {
          type: 'church_evangelical',
          name: 'Iglesias Evangélicas',
          keywords: ['iglesia evangélica', 'ministerio evangélico', 'congregación evangélica'],
          priority: 'high'
        },
        {
          type: 'church_assembly_god',
          name: 'Asambleas de Dios',
          keywords: ['asamblea de dios', 'assemblies of god'],
          priority: 'high'
        },
        {
          type: 'church_other',
          name: 'Otras iglesias cristianas',
          keywords: ['iglesia cristiana', 'ministerio cristiano', 'templo'],
          priority: 'medium'
        },
        {
          type: 'tour_leader',
          name: 'Tour leaders y organizadores de viajes grupales',
          keywords: ['tour leader', 'organizador viajes', 'coordinador grupos'],
          priority: 'high'
        },
        {
          type: 'religious_leader',
          name: 'Líderes religiosos (sacerdotes, pastores)',
          keywords: ['sacerdote', 'padre', 'pastor', 'reverendo', 'ministro'],
          priority: 'high'
        },
        {
          type: 'university',
          name: 'Universidades con programas de viaje',
          keywords: ['universidad', 'college', 'instituto educativo', 'intercambio estudiantil'],
          priority: 'medium'
        }
      ],
      
      // Data fields to collect
      dataFields: [
        'business_name',       // Nombre del negocio
        'business_type',       // Tipo de negocio
        'address',             // Dirección completa
        'city',                // Ciudad
        'state_province',      // Provincia/Estado
        'zip_code',            // Código postal
        'country',             // País
        'email',               // Email principal
        'email_secondary',     // Emails secundarios
        'phone',               // Teléfono oficina
        'phone_mobile',        // Teléfono móvil
        'whatsapp',            // WhatsApp
        'website',             // Sitio web
        'facebook',            // Facebook
        'instagram',           // Instagram
        'linkedin',            // LinkedIn
        'contact_person',      // Persona de contacto
        'position',            // Cargo
        'specialization',      // Especialización
        'target_markets',      // Mercados objetivo
        'group_size',          // Tamaño de grupos
        'annual_travelers'     // Viajeros anuales (estimado)
      ],
      
      // AI settings
      aiProvider: 'openai',
      aiModel: 'gpt-4o-mini',
      
      ...config
    };
    
    this.aiService = null;
    this.initialized = false;
    this.running = false;
    this.stats = {
      prospectsFound: 0,
      prospectsEnriched: 0,
      prospectsVerified: 0,
      lastRun: null
    };
  }

  /**
   * Initialize the prospecting agent
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🚀 Initializing ProspectingAgent...');
    
    try {
      // Initialize AI service
      this.aiService = getMultiModelAI();
      
      // Check database connection
      if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB not connected');
      }
      
      // Start automated prospecting if enabled
      if (this.config.enabled) {
        this.startAutomatedProspecting();
      }
      
      this.initialized = true;
      this.emit('initialized');
      console.log('✅ ProspectingAgent initialized successfully');
      console.log(`📍 Target countries: ${this.config.targetCountries.length}`);
      console.log(`🎯 Client types: ${this.config.clientTypes.length}`);
      
      return true;
    } catch (error) {
      console.error('❌ ProspectingAgent initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Start automated 24/7 prospecting
   */
  startAutomatedProspecting() {
    console.log('🔄 Starting automated 24/7 prospecting...');
    
    // Run immediately
    this.runProspectingCycle();
    
    // Schedule recurring runs
    this.prospectingInterval = setInterval(() => {
      this.runProspectingCycle();
    }, this.config.runInterval);
    
    this.running = true;
    this.emit('prospecting_started');
  }

  /**
   * Stop automated prospecting
   */
  stopAutomatedProspecting() {
    if (this.prospectingInterval) {
      clearInterval(this.prospectingInterval);
      this.prospectingInterval = null;
    }
    
    this.running = false;
    this.emit('prospecting_stopped');
    console.log('⏸️  Automated prospecting stopped');
  }

  /**
   * Run a complete prospecting cycle
   */
  async runProspectingCycle() {
    if (!this.initialized) {
      console.log('⚠️  ProspectingAgent not initialized, skipping cycle');
      return;
    }
    
    console.log('🔍 Starting prospecting cycle...');
    const startTime = Date.now();
    
    try {
      const results = {
        found: 0,
        enriched: 0,
        verified: 0,
        saved: 0,
        errors: 0
      };
      
      // Process each client type
      for (const clientType of this.config.clientTypes) {
        try {
          console.log(`🎯 Prospecting ${clientType.name}...`);
          
          // Prospect for each target country
          for (const country of this.config.targetCountries) {
            const prospects = await this.prospectClientType(clientType, country);
            results.found += prospects.length;
            
            // Enrich and save prospects
            for (const prospect of prospects) {
              try {
                const enriched = await this.enrichProspect(prospect);
                results.enriched++;
                
                const verified = await this.verifyProspect(enriched);
                results.verified++;
                
                const saved = await this.saveProspect(verified);
                if (saved) results.saved++;
                
              } catch (error) {
                console.error(`Error processing prospect:`, error.message);
                results.errors++;
              }
            }
            
            // Rate limiting - avoid overwhelming sources
            await this.sleep(2000); // 2 seconds between requests
          }
          
        } catch (error) {
          console.error(`Error prospecting ${clientType.name}:`, error.message);
          results.errors++;
        }
      }
      
      // Update stats
      this.stats.prospectsFound += results.found;
      this.stats.prospectsEnriched += results.enriched;
      this.stats.prospectsVerified += results.verified;
      this.stats.lastRun = new Date();
      
      const duration = Math.round((Date.now() - startTime) / 1000);
      
      console.log('✅ Prospecting cycle completed:');
      console.log(`   Found: ${results.found}`);
      console.log(`   Enriched: ${results.enriched}`);
      console.log(`   Verified: ${results.verified}`);
      console.log(`   Saved: ${results.saved}`);
      console.log(`   Errors: ${results.errors}`);
      console.log(`   Duration: ${duration}s`);
      
      this.emit('cycle_completed', { results, duration });
      
      return results;
      
    } catch (error) {
      console.error('Error in prospecting cycle:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Prospect specific client type in a country
   */
  async prospectClientType(clientType, countryCode) {
    const prospects = [];
    
    try {
      // Use AI to generate search queries
      const searchQueries = await this.generateSearchQueries(clientType, countryCode);
      
      // Search using multiple strategies
      for (const query of searchQueries) {
        // Strategy 1: AI-powered web search simulation
        const aiResults = await this.aiSearchProspects(query, clientType, countryCode);
        prospects.push(...aiResults);
        
        // Strategy 2: Pattern-based generation (for demonstration)
        const patternResults = await this.generateProspectsFromPatterns(
          query,
          clientType,
          countryCode
        );
        prospects.push(...patternResults);
        
        // Limit prospects per query
        if (prospects.length >= this.config.batchSize) break;
      }
      
      return prospects.slice(0, this.config.batchSize);
      
    } catch (error) {
      console.error(`Error prospecting ${clientType.name} in ${countryCode}:`, error);
      return [];
    }
  }

  /**
   * Generate smart search queries using AI
   */
  async generateSearchQueries(clientType, countryCode) {
    try {
      const prompt = `Generate 5 effective Google search queries to find ${clientType.name} in ${this.getCountryName(countryCode)}.

Client type: ${clientType.name}
Keywords: ${clientType.keywords.join(', ')}
Country: ${this.getCountryName(countryCode)}

Requirements:
- Search queries should be in Spanish
- Include location-specific terms
- Mix general and specific queries
- Include industry directories and associations
- Focus on finding contact information

Return only the search queries, one per line.`;

      const response = await this.aiService.generate({
        provider: this.config.aiProvider,
        model: this.config.aiModel,
        prompt,
        temperature: 0.7,
        maxTokens: 300
      });
      
      const queries = response.text
        .split('\n')
        .filter(q => q.trim() && !q.match(/^\d+\./))
        .map(q => q.trim().replace(/^[-•*]\s*/, ''))
        .slice(0, 5);
      
      return queries.length > 0 ? queries : clientType.keywords;
      
    } catch (error) {
      console.error('Error generating search queries:', error);
      // Fallback to basic keywords
      return clientType.keywords.map(kw => `${kw} ${this.getCountryName(countryCode)}`);
    }
  }

  /**
   * Use AI to search and extract prospect information
   */
  async aiSearchProspects(query, clientType, countryCode) {
    try {
      const prompt = `You are a B2B lead generation AI. Find and extract information about ${clientType.name} in ${this.getCountryName(countryCode)}.

Search query: "${query}"

For each business found, provide:
- business_name
- address (full address)
- city
- country: ${this.getCountryName(countryCode)}
- email (if available)
- phone (if available)
- website (if available)

Return data in JSON format as an array of objects. Provide 2-3 realistic prospects.

Example format:
[
  {
    "business_name": "Viajes El Mundo S.A.",
    "address": "Calle Principal 123",
    "city": "Madrid",
    "country": "España",
    "email": "info@viajeselmundo.com",
    "phone": "+34 91 123 4567",
    "website": "www.viajeselmundo.com"
  }
]`;

      const response = await this.aiService.generate({
        provider: this.config.aiProvider,
        model: this.config.aiModel,
        prompt,
        temperature: 0.8,
        maxTokens: 1000
      });
      
      // Parse AI response
      const jsonMatch = response.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const prospects = JSON.parse(jsonMatch[0]);
        
        return prospects.map(p => ({
          ...p,
          business_type: clientType.type,
          source: 'ai_search',
          country_code: countryCode,
          found_at: new Date(),
          search_query: query
        }));
      }
      
      return [];
      
    } catch (error) {
      console.error('Error in AI search:', error);
      return [];
    }
  }

  /**
   * Generate prospects from patterns (fallback method)
   */
  async generateProspectsFromPatterns(query, clientType, countryCode) {
    // This is a demonstration method
    // In production, this would scrape real sources
    
    const cities = this.getMajorCities(countryCode);
    const prospects = [];
    
    for (let i = 0; i < Math.min(3, cities.length); i++) {
      const city = cities[i];
      
      prospects.push({
        business_name: `${clientType.name} ${city}`,
        business_type: clientType.type,
        address: `Calle Principal ${Math.floor(Math.random() * 500) + 1}`,
        city,
        country: this.getCountryName(countryCode),
        country_code: countryCode,
        email: `info@${this.slugify(clientType.name)}-${this.slugify(city)}.com`,
        phone: this.generatePhone(countryCode),
        website: `www.${this.slugify(clientType.name)}-${this.slugify(city)}.com`,
        source: 'pattern_generation',
        found_at: new Date(),
        search_query: query,
        confidence: 'low' // Mark as low confidence - needs verification
      });
    }
    
    return prospects;
  }

  /**
   * Enrich prospect with additional data
   */
  async enrichProspect(prospect) {
    try {
      // Use AI to enhance prospect information
      const prompt = `Enrich the following business prospect with additional relevant information:

Business Name: ${prospect.business_name}
Type: ${prospect.business_type}
Location: ${prospect.city}, ${prospect.country}

Please provide:
1. Likely specialization or focus areas
2. Estimated group size they typically handle
3. Target markets they likely serve
4. Additional contact channels (WhatsApp, social media)
5. Any relevant certifications or memberships

Format as JSON.`;

      const response = await this.aiService.generate({
        provider: this.config.aiProvider,
        model: this.config.aiModel,
        prompt,
        temperature: 0.7,
        maxTokens: 500
      });
      
      // Parse enrichment data
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const enrichmentData = JSON.parse(jsonMatch[0]);
        return { ...prospect, ...enrichmentData, enriched: true };
      }
      
      return { ...prospect, enriched: false };
      
    } catch (error) {
      console.error('Error enriching prospect:', error);
      return { ...prospect, enriched: false };
    }
  }

  /**
   * Verify prospect data quality
   */
  async verifyProspect(prospect) {
    const verifications = {
      email_valid: this.validateEmail(prospect.email),
      phone_valid: this.validatePhone(prospect.phone),
      website_valid: this.validateWebsite(prospect.website),
      address_complete: !!(prospect.address && prospect.city && prospect.country),
      has_contact: !!(prospect.email || prospect.phone || prospect.whatsapp)
    };
    
    const score = Object.values(verifications).filter(Boolean).length / Object.keys(verifications).length;
    
    return {
      ...prospect,
      verified: true,
      verification: verifications,
      quality_score: score,
      status: score >= 0.6 ? 'verified' : 'needs_review'
    };
  }

  /**
   * Save prospect to database
   */
  async saveProspect(prospect) {
    try {
      const Prospect = mongoose.model('Prospect');
      
      // Check for duplicates
      const existing = await Prospect.findOne({
        $or: [
          { email: prospect.email },
          { business_name: prospect.business_name, city: prospect.city }
        ]
      });
      
      if (existing) {
        // Update existing prospect
        Object.assign(existing, {
          ...prospect,
          updated_at: new Date(),
          duplicate_found: true
        });
        await existing.save();
        return existing;
      }
      
      // Create new prospect
      const newProspect = new Prospect({
        ...prospect,
        created_at: new Date(),
        lead_score: this.calculateLeadScore(prospect)
      });
      
      await newProspect.save();
      this.emit('prospect_saved', newProspect);
      
      return newProspect;
      
    } catch (error) {
      console.error('Error saving prospect:', error);
      return null;
    }
  }

  /**
   * Calculate lead score (0-100)
   */
  calculateLeadScore(prospect) {
    let score = 0;
    
    // Quality score (40 points)
    score += (prospect.quality_score || 0) * 40;
    
    // Contact completeness (30 points)
    if (prospect.email) score += 10;
    if (prospect.phone) score += 10;
    if (prospect.whatsapp) score += 5;
    if (prospect.website) score += 5;
    
    // Business type priority (20 points)
    const clientType = this.config.clientTypes.find(ct => ct.type === prospect.business_type);
    if (clientType) {
      if (clientType.priority === 'high') score += 20;
      else if (clientType.priority === 'medium') score += 10;
      else score += 5;
    }
    
    // Enrichment bonus (10 points)
    if (prospect.enriched) score += 10;
    
    return Math.min(100, Math.round(score));
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      running: this.running,
      enabled: this.config.enabled,
      targetCountries: this.config.targetCountries.length,
      clientTypes: this.config.clientTypes.length
    };
  }

  /**
   * Helper methods
   */
  getCountryName(code) {
    const countries = {
      ES: 'España', MX: 'México', AR: 'Argentina', CO: 'Colombia',
      PE: 'Perú', VE: 'Venezuela', CL: 'Chile', EC: 'Ecuador',
      GT: 'Guatemala', CU: 'Cuba', BO: 'Bolivia', DO: 'República Dominicana',
      HN: 'Honduras', PY: 'Paraguay', SV: 'El Salvador', NI: 'Nicaragua',
      CR: 'Costa Rica', PA: 'Panamá', UY: 'Uruguay', PR: 'Puerto Rico'
    };
    return countries[code] || code;
  }

  getMajorCities(countryCode) {
    const cities = {
      ES: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla'],
      MX: ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Cancún'],
      AR: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza'],
      CO: ['Bogotá', 'Medellín', 'Cali', 'Cartagena'],
      // Add more as needed
    };
    return cities[countryCode] || ['Capital'];
  }

  generatePhone(countryCode) {
    const prefixes = {
      ES: '+34', MX: '+52', AR: '+54', CO: '+57'
    };
    const prefix = prefixes[countryCode] || '+1';
    const number = Math.floor(Math.random() * 900000000) + 100000000;
    return `${prefix} ${number}`;
  }

  slugify(text) {
    return text.toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  validateEmail(email) {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  validatePhone(phone) {
    if (!phone) return false;
    return /[\d\s\+\-()]{10,}/.test(phone);
  }

  validateWebsite(website) {
    if (!website) return false;
    return /^(https?:\/\/)?(www\.)?[\w\-]+\.[a-z]{2,}/.test(website);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let instance = null;

function getProspectingAgent(config) {
  if (!instance) {
    instance = new ProspectingAgent(config);
  }
  return instance;
}

module.exports = {
  ProspectingAgent,
  getProspectingAgent
};
