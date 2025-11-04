/**
 * Multi-Server Email Manager Service
 * 
 * Advanced email sending system with multiple SMTP servers and IP rotation.
 * Prevents blacklisting by distributing load across multiple IPs and servers.
 * 
 * Features:
 * - Multiple SMTP server pools with automatic rotation
 * - IP-based load balancing and health monitoring
 * - Predefined configurations (15+ options)
 * - Custom configuration builder
 * - Automatic IP warm-up management
 * - Blacklist detection and failover
 * - Per-IP statistics and reputation tracking
 * - Smart routing based on recipient domain
 * 
 * @author Spirit Tours Development Team
 * @version 2.0.0
 */

const nodemailer = require('nodemailer');
const EventEmitter = require('events');

class MultiServerManagerService extends EventEmitter {
  constructor() {
    super();
    
    this.config = {
      // Active configuration preset
      activePreset: 'starter', // Can be changed from dashboard
      
      // Custom configuration (overrides preset if set)
      customConfig: null,
      
      // Server pools
      serverPools: [],
      
      // Global settings
      globalSettings: {
        enableRotation: true,
        enableHealthCheck: true,
        enableWarmup: true,
        enableBlacklistDetection: true,
        healthCheckInterval: 300000, // 5 minutes
        blacklistCheckInterval: 3600000, // 1 hour
        rotationStrategy: 'round-robin', // 'round-robin', 'random', 'least-used', 'best-performance'
      },
      
      // Tracking
      statistics: {
        totalServers: 0,
        activeServers: 0,
        totalIPs: 0,
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        averageReputation: 0,
      },
    };
    
    // Active connections
    this.transporters = new Map();
    
    // Server health status
    this.serverHealth = new Map();
    
    // IP warm-up status
    this.warmupStatus = new Map();
    
    // Rotation state
    this.rotationState = {
      currentIndex: 0,
      usageCount: new Map(),
      lastUsed: new Map(),
    };
    
    // Performance tracking
    this.performanceMetrics = new Map();
    
    // Initialize with default preset
    this.loadPreset(this.config.activePreset);
    
    // Start background tasks
    this.startHealthChecking();
    this.startBlacklistMonitoring();
  }
  
  /**
   * PREDEFINED CONFIGURATIONS
   * 
   * Each preset is optimized for different scenarios and budgets.
   * Includes recommended server counts, IPs, and rate limits.
   */
  
  getPresets() {
    return {
      // ============================================
      // TIER 1: STARTER OPTIONS (1-3 servers)
      // ============================================
      
      'starter': {
        name: 'Starter - Single Server',
        description: 'Perfect para empezar. Un servidor SMTP con IP dedicada.',
        recommended: true,
        tier: 'starter',
        cost: {
          monthly: 25,
          setup: 0,
          perEmail: 0,
        },
        capacity: {
          emailsPerDay: 500,
          emailsPerMonth: 15000,
          concurrentConnections: 5,
        },
        servers: [
          {
            name: 'Primary SMTP',
            host: process.env.SMTP_HOST || 'smtp.yourserver.com',
            port: 587,
            secure: false,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            },
            ipAddress: process.env.SMTP_IP || 'auto-detect',
            maxConnections: 5,
            maxMessages: 100,
            rateLimit: 5, // per second
            dailyLimit: 500,
            warmup: {
              enabled: true,
              currentDay: 1,
              schedule: [50, 100, 200, 300, 400, 500], // Daily progression
            },
          },
        ],
        rateLimiting: {
          perMinute: 10,
          perHour: 50,
          perDay: 500,
          delayBetweenEmails: 6000,
        },
      },
      
      'basic-dual': {
        name: 'Basic Dual - Two Servers',
        description: 'Dos servidores SMTP para mayor capacidad y redundancia.',
        recommended: false,
        tier: 'starter',
        cost: {
          monthly: 50,
          setup: 0,
          perEmail: 0,
        },
        capacity: {
          emailsPerDay: 1000,
          emailsPerMonth: 30000,
          concurrentConnections: 10,
        },
        servers: [
          {
            name: 'SMTP Server 1',
            host: process.env.SMTP_HOST_1 || 'smtp1.yourserver.com',
            port: 587,
            secure: false,
            auth: {
              user: process.env.SMTP_USER_1,
              pass: process.env.SMTP_PASSWORD_1,
            },
            ipAddress: process.env.SMTP_IP_1 || 'auto-detect',
            maxConnections: 5,
            maxMessages: 100,
            rateLimit: 5,
            dailyLimit: 500,
            warmup: { enabled: true, currentDay: 1, schedule: [50, 100, 200, 300, 400, 500] },
          },
          {
            name: 'SMTP Server 2',
            host: process.env.SMTP_HOST_2 || 'smtp2.yourserver.com',
            port: 587,
            secure: false,
            auth: {
              user: process.env.SMTP_USER_2,
              pass: process.env.SMTP_PASSWORD_2,
            },
            ipAddress: process.env.SMTP_IP_2 || 'auto-detect',
            maxConnections: 5,
            maxMessages: 100,
            rateLimit: 5,
            dailyLimit: 500,
            warmup: { enabled: true, currentDay: 1, schedule: [50, 100, 200, 300, 400, 500] },
          },
        ],
        rateLimiting: {
          perMinute: 20,
          perHour: 100,
          perDay: 1000,
          delayBetweenEmails: 3000,
        },
      },
      
      'starter-triple': {
        name: 'Starter Triple - Three Servers',
        description: 'Tres servidores para mejor distribución de carga.',
        recommended: false,
        tier: 'starter',
        cost: {
          monthly: 75,
          setup: 0,
          perEmail: 0,
        },
        capacity: {
          emailsPerDay: 1500,
          emailsPerMonth: 45000,
          concurrentConnections: 15,
        },
        servers: this.generateServerConfig(3, 'smtp', 500),
        rateLimiting: {
          perMinute: 30,
          perHour: 150,
          perDay: 1500,
          delayBetweenEmails: 2000,
        },
      },
      
      // ============================================
      // TIER 2: PROFESSIONAL OPTIONS (4-7 servers)
      // ============================================
      
      'professional': {
        name: 'Professional - Five Servers',
        description: 'Configuración profesional con 5 IPs dedicadas.',
        recommended: true,
        tier: 'professional',
        cost: {
          monthly: 125,
          setup: 50,
          perEmail: 0,
        },
        capacity: {
          emailsPerDay: 2500,
          emailsPerMonth: 75000,
          concurrentConnections: 25,
        },
        servers: this.generateServerConfig(5, 'smtp', 500),
        rateLimiting: {
          perMinute: 50,
          perHour: 250,
          perDay: 2500,
          delayBetweenEmails: 1200,
        },
      },
      
      'professional-plus': {
        name: 'Professional Plus - Seven Servers',
        description: 'Mayor capacidad con 7 servidores distribuidos.',
        recommended: false,
        tier: 'professional',
        cost: {
          monthly: 175,
          setup: 70,
          perEmail: 0,
        },
        capacity: {
          emailsPerDay: 3500,
          emailsPerMonth: 105000,
          concurrentConnections: 35,
        },
        servers: this.generateServerConfig(7, 'smtp', 500),
        rateLimiting: {
          perMinute: 70,
          perHour: 350,
          perDay: 3500,
          delayBetweenEmails: 850,
        },
      },
      
      // ============================================
      // TIER 3: BUSINESS OPTIONS (8-12 servers)
      // ============================================
      
      'business': {
        name: 'Business - Ten Servers',
        description: 'Solución empresarial con 10 IPs dedicadas.',
        recommended: true,
        tier: 'business',
        cost: {
          monthly: 250,
          setup: 100,
          perEmail: 0,
        },
        capacity: {
          emailsPerDay: 5000,
          emailsPerMonth: 150000,
          concurrentConnections: 50,
        },
        servers: this.generateServerConfig(10, 'smtp', 500),
        rateLimiting: {
          perMinute: 100,
          perHour: 500,
          perDay: 5000,
          delayBetweenEmails: 600,
        },
      },
      
      'business-advanced': {
        name: 'Business Advanced - Twelve Servers',
        description: 'Alta capacidad con 12 servidores y rotación avanzada.',
        recommended: false,
        tier: 'business',
        cost: {
          monthly: 300,
          setup: 120,
          perEmail: 0,
        },
        capacity: {
          emailsPerDay: 6000,
          emailsPerMonth: 180000,
          concurrentConnections: 60,
        },
        servers: this.generateServerConfig(12, 'smtp', 500),
        rateLimiting: {
          perMinute: 120,
          perHour: 600,
          perDay: 6000,
          delayBetweenEmails: 500,
        },
      },
      
      // ============================================
      // TIER 4: ENTERPRISE OPTIONS (15-25 servers)
      // ============================================
      
      'enterprise': {
        name: 'Enterprise - Fifteen Servers',
        description: 'Configuración enterprise con 15 IPs y alta disponibilidad.',
        recommended: true,
        tier: 'enterprise',
        cost: {
          monthly: 375,
          setup: 150,
          perEmail: 0,
        },
        capacity: {
          emailsPerDay: 7500,
          emailsPerMonth: 225000,
          concurrentConnections: 75,
        },
        servers: this.generateServerConfig(15, 'smtp', 500),
        rateLimiting: {
          perMinute: 150,
          perHour: 750,
          perDay: 7500,
          delayBetweenEmails: 400,
        },
      },
      
      'enterprise-plus': {
        name: 'Enterprise Plus - Twenty Servers',
        description: 'Máxima capacidad con 20 IPs dedicadas.',
        recommended: false,
        tier: 'enterprise',
        cost: {
          monthly: 500,
          setup: 200,
          perEmail: 0,
        },
        capacity: {
          emailsPerDay: 10000,
          emailsPerMonth: 300000,
          concurrentConnections: 100,
        },
        servers: this.generateServerConfig(20, 'smtp', 500),
        rateLimiting: {
          perMinute: 200,
          perHour: 1000,
          perDay: 10000,
          delayBetweenEmails: 300,
        },
      },
      
      'enterprise-ultimate': {
        name: 'Enterprise Ultimate - Twenty-Five Servers',
        description: 'Configuración máxima para volumen masivo.',
        recommended: false,
        tier: 'enterprise',
        cost: {
          monthly: 625,
          setup: 250,
          perEmail: 0,
        },
        capacity: {
          emailsPerDay: 12500,
          emailsPerMonth: 375000,
          concurrentConnections: 125,
        },
        servers: this.generateServerConfig(25, 'smtp', 500),
        rateLimiting: {
          perMinute: 250,
          perHour: 1250,
          perDay: 12500,
          delayBetweenEmails: 240,
        },
      },
      
      // ============================================
      // HYBRID OPTIONS (SMTP + SendGrid)
      // ============================================
      
      'hybrid-basic': {
        name: 'Hybrid Basic - SMTP + SendGrid',
        description: 'Combina 3 SMTP propios + SendGrid para picos de demanda.',
        recommended: true,
        tier: 'hybrid',
        cost: {
          monthly: 95, // 75 SMTP + 20 SendGrid
          setup: 0,
          perEmail: 0,
        },
        capacity: {
          emailsPerDay: 3000, // 1500 SMTP + 1500 SendGrid
          emailsPerMonth: 90000,
          concurrentConnections: 30,
        },
        servers: [
          ...this.generateServerConfig(3, 'smtp', 500),
          {
            name: 'SendGrid Cloud',
            type: 'sendgrid',
            apiKey: process.env.SENDGRID_API_KEY,
            dailyLimit: 1500,
            priority: 2, // Lower priority, use as overflow
          },
        ],
        rateLimiting: {
          perMinute: 50,
          perHour: 300,
          perDay: 3000,
          delayBetweenEmails: 1200,
        },
      },
      
      'hybrid-professional': {
        name: 'Hybrid Professional - Multi-SMTP + SendGrid Pro',
        description: 'Combina 5 SMTP propios + SendGrid Pro para máxima flexibilidad.',
        recommended: false,
        tier: 'hybrid',
        cost: {
          monthly: 215, // 125 SMTP + 90 SendGrid Pro
          setup: 50,
          perEmail: 0,
        },
        capacity: {
          emailsPerDay: 6000, // 2500 SMTP + 3500 SendGrid
          emailsPerMonth: 180000,
          concurrentConnections: 60,
        },
        servers: [
          ...this.generateServerConfig(5, 'smtp', 500),
          {
            name: 'SendGrid Pro',
            type: 'sendgrid',
            apiKey: process.env.SENDGRID_API_KEY,
            dailyLimit: 3500,
            priority: 2,
          },
        ],
        rateLimiting: {
          perMinute: 100,
          perHour: 600,
          perDay: 6000,
          delayBetweenEmails: 600,
        },
      },
      
      // ============================================
      // SPECIALIZED OPTIONS
      // ============================================
      
      'geographic-distributed': {
        name: 'Geographic Distributed - Global Servers',
        description: 'Servidores distribuidos geográficamente (US, EU, LATAM).',
        recommended: false,
        tier: 'specialized',
        cost: {
          monthly: 300,
          setup: 150,
          perEmail: 0,
        },
        capacity: {
          emailsPerDay: 6000,
          emailsPerMonth: 180000,
          concurrentConnections: 60,
        },
        servers: [
          ...this.generateServerConfig(4, 'smtp-us', 500, 'US East'),
          ...this.generateServerConfig(4, 'smtp-eu', 500, 'EU West'),
          ...this.generateServerConfig(4, 'smtp-latam', 500, 'LATAM'),
        ],
        rateLimiting: {
          perMinute: 100,
          perHour: 600,
          perDay: 6000,
          delayBetweenEmails: 600,
        },
        routingRules: {
          '.com': 'US East',
          '.eu': 'EU West',
          '.es': 'EU West',
          '.mx': 'LATAM',
          '.br': 'LATAM',
          '.ar': 'LATAM',
        },
      },
      
      'high-volume-burst': {
        name: 'High Volume Burst - Peak Capacity',
        description: 'Optimizado para envíos masivos en períodos cortos.',
        recommended: false,
        tier: 'specialized',
        cost: {
          monthly: 450,
          setup: 200,
          perEmail: 0,
        },
        capacity: {
          emailsPerDay: 20000,
          emailsPerMonth: 600000,
          concurrentConnections: 150,
        },
        servers: [
          ...this.generateServerConfig(15, 'smtp', 800), // Higher daily limit per server
          {
            name: 'SendGrid Pro Burst',
            type: 'sendgrid',
            apiKey: process.env.SENDGRID_API_KEY,
            dailyLimit: 8000,
            priority: 2,
          },
        ],
        rateLimiting: {
          perMinute: 300,
          perHour: 2000,
          perDay: 20000,
          delayBetweenEmails: 200,
        },
      },
      
      'ultra-secure': {
        name: 'Ultra Secure - Maximum Deliverability',
        description: 'Máxima entregabilidad con warm-up extendido y rotación lenta.',
        recommended: false,
        tier: 'specialized',
        cost: {
          monthly: 400,
          setup: 150,
          perEmail: 0,
        },
        capacity: {
          emailsPerDay: 4000,
          emailsPerMonth: 120000,
          concurrentConnections: 40,
        },
        servers: this.generateServerConfig(20, 'smtp', 200), // Lower limit per server, more servers
        rateLimiting: {
          perMinute: 30,
          perHour: 200,
          perDay: 4000,
          delayBetweenEmails: 2000, // Slower sending
        },
        warmup: {
          extended: true,
          schedule: [20, 40, 60, 80, 100, 120, 140, 160, 180, 200], // 10-day warmup
        },
      },
    };
  }
  
  /**
   * Generate server configuration array
   */
  generateServerConfig(count, prefix, dailyLimit, region = null) {
    const servers = [];
    
    for (let i = 1; i <= count; i++) {
      servers.push({
        name: `${prefix.toUpperCase()} Server ${i}${region ? ` (${region})` : ''}`,
        host: process.env[`SMTP_HOST_${i}`] || `${prefix}${i}.yourserver.com`,
        port: 587,
        secure: false,
        auth: {
          user: process.env[`SMTP_USER_${i}`] || `user${i}@domain.com`,
          pass: process.env[`SMTP_PASSWORD_${i}`] || 'password',
        },
        ipAddress: process.env[`SMTP_IP_${i}`] || `auto-detect-${i}`,
        region: region,
        maxConnections: 5,
        maxMessages: 100,
        rateLimit: 5,
        dailyLimit: dailyLimit,
        priority: 1, // Default priority
        warmup: {
          enabled: true,
          currentDay: 1,
          schedule: [50, 100, 200, 300, 400, dailyLimit],
        },
      });
    }
    
    return servers;
  }
  
  /**
   * Load a preset configuration
   */
  loadPreset(presetName) {
    const presets = this.getPresets();
    const preset = presets[presetName];
    
    if (!preset) {
      throw new Error(`Preset not found: ${presetName}. Available: ${Object.keys(presets).join(', ')}`);
    }
    
    console.log(`[Multi-Server Manager] Loading preset: ${preset.name}`);
    
    this.config.activePreset = presetName;
    this.config.serverPools = preset.servers;
    this.config.statistics.totalServers = preset.servers.length;
    this.config.statistics.totalIPs = preset.servers.filter(s => s.type !== 'sendgrid').length;
    
    // Initialize transporters for each server
    this.initializeTransporters();
    
    console.log(`[Multi-Server Manager] Preset loaded: ${preset.servers.length} servers configured`);
    
    return preset;
  }
  
  /**
   * Create custom configuration
   */
  createCustomConfig(options) {
    const {
      name = 'Custom Configuration',
      serverCount = 5,
      dailyLimitPerServer = 500,
      includeSendGrid = false,
      sendGridDailyLimit = 1500,
      regions = null, // ['US', 'EU', 'LATAM']
      warmupEnabled = true,
    } = options;
    
    console.log(`[Multi-Server Manager] Creating custom config: ${name}`);
    
    const servers = [];
    
    // Generate SMTP servers
    if (regions && regions.length > 0) {
      const serversPerRegion = Math.ceil(serverCount / regions.length);
      regions.forEach(region => {
        servers.push(...this.generateServerConfig(serversPerRegion, 'smtp', dailyLimitPerServer, region));
      });
    } else {
      servers.push(...this.generateServerConfig(serverCount, 'smtp', dailyLimitPerServer));
    }
    
    // Add SendGrid if requested
    if (includeSendGrid) {
      servers.push({
        name: 'SendGrid Cloud',
        type: 'sendgrid',
        apiKey: process.env.SENDGRID_API_KEY,
        dailyLimit: sendGridDailyLimit,
        priority: 2,
      });
    }
    
    // Calculate total capacity
    const totalDailyLimit = servers.reduce((sum, s) => sum + (s.dailyLimit || 0), 0);
    
    const customConfig = {
      name: name,
      description: 'Configuración personalizada',
      tier: 'custom',
      cost: {
        monthly: serverCount * 25 + (includeSendGrid ? 20 : 0),
        setup: serverCount * 10,
        perEmail: 0,
      },
      capacity: {
        emailsPerDay: totalDailyLimit,
        emailsPerMonth: totalDailyLimit * 30,
        concurrentConnections: serverCount * 5,
      },
      servers: servers,
      rateLimiting: {
        perMinute: Math.floor(totalDailyLimit / 60),
        perHour: Math.floor(totalDailyLimit / 10),
        perDay: totalDailyLimit,
        delayBetweenEmails: Math.ceil(60000 / (totalDailyLimit / 60)),
      },
    };
    
    this.config.customConfig = customConfig;
    this.config.serverPools = servers;
    this.config.statistics.totalServers = servers.length;
    this.config.statistics.totalIPs = servers.filter(s => s.type !== 'sendgrid').length;
    
    this.initializeTransporters();
    
    console.log(`[Multi-Server Manager] Custom config created: ${servers.length} servers, ${totalDailyLimit} emails/day`);
    
    return customConfig;
  }
  
  /**
   * Initialize nodemailer transporters for all SMTP servers
   */
  initializeTransporters() {
    this.transporters.clear();
    
    for (const server of this.config.serverPools) {
      if (server.type === 'sendgrid') {
        // SendGrid uses API, not transporter
        continue;
      }
      
      try {
        const transporter = nodemailer.createTransport({
          host: server.host,
          port: server.port,
          secure: server.secure,
          auth: server.auth,
          pool: true,
          maxConnections: server.maxConnections,
          maxMessages: server.maxMessages,
          rateDelta: 1000,
          rateLimit: server.rateLimit,
        });
        
        this.transporters.set(server.name, transporter);
        
        // Initialize health status
        this.serverHealth.set(server.name, {
          status: 'unknown',
          lastCheck: null,
          consecutiveFailures: 0,
          lastError: null,
        });
        
        // Initialize warmup status
        if (server.warmup && server.warmup.enabled) {
          this.warmupStatus.set(server.name, {
            currentDay: server.warmup.currentDay || 1,
            sentToday: 0,
            dailyLimit: server.warmup.schedule[0],
            schedule: server.warmup.schedule,
          });
        }
        
        // Initialize usage tracking
        this.rotationState.usageCount.set(server.name, 0);
        this.rotationState.lastUsed.set(server.name, null);
        
        // Initialize performance metrics
        this.performanceMetrics.set(server.name, {
          totalSent: 0,
          totalDelivered: 0,
          totalFailed: 0,
          totalBounced: 0,
          averageResponseTime: 0,
          reputation: 100,
        });
        
        console.log(`[Multi-Server Manager] Transporter initialized: ${server.name}`);
        
      } catch (error) {
        console.error(`[Multi-Server Manager] Failed to initialize ${server.name}:`, error.message);
      }
    }
    
    this.config.statistics.activeServers = this.transporters.size;
  }
  
  /**
   * Select next server based on rotation strategy
   */
  selectNextServer(options = {}) {
    const {
      recipientDomain = null,
      priority = 1,
      excludeServers = [],
    } = options;
    
    // Filter available servers
    let availableServers = this.config.serverPools.filter(server => {
      // Exclude specific servers
      if (excludeServers.includes(server.name)) return false;
      
      // Check priority
      if (server.priority && server.priority !== priority) return false;
      
      // Check health
      const health = this.serverHealth.get(server.name);
      if (health && health.status === 'down') return false;
      
      // Check warmup limits
      if (server.warmup && server.warmup.enabled) {
        const warmup = this.warmupStatus.get(server.name);
        if (warmup && warmup.sentToday >= warmup.dailyLimit) return false;
      }
      
      // Check daily limits
      const metrics = this.performanceMetrics.get(server.name);
      if (metrics && metrics.totalSent >= server.dailyLimit) return false;
      
      return true;
    });
    
    if (availableServers.length === 0) {
      throw new Error('No available servers. All servers are down, warming up, or at daily limit.');
    }
    
    // Apply geographic routing if configured
    if (recipientDomain) {
      const preset = this.getPresets()[this.config.activePreset];
      if (preset && preset.routingRules) {
        const tld = '.' + recipientDomain.split('.').pop();
        const preferredRegion = preset.routingRules[tld];
        
        if (preferredRegion) {
          const regionalServers = availableServers.filter(s => s.region === preferredRegion);
          if (regionalServers.length > 0) {
            availableServers = regionalServers;
          }
        }
      }
    }
    
    // Select based on strategy
    let selectedServer;
    
    switch (this.config.globalSettings.rotationStrategy) {
      case 'round-robin':
        // Simple round-robin rotation
        this.rotationState.currentIndex = (this.rotationState.currentIndex + 1) % availableServers.length;
        selectedServer = availableServers[this.rotationState.currentIndex];
        break;
        
      case 'random':
        // Random selection
        selectedServer = availableServers[Math.floor(Math.random() * availableServers.length)];
        break;
        
      case 'least-used':
        // Select server with least usage
        selectedServer = availableServers.reduce((least, current) => {
          const leastUsage = this.rotationState.usageCount.get(least.name) || 0;
          const currentUsage = this.rotationState.usageCount.get(current.name) || 0;
          return currentUsage < leastUsage ? current : least;
        });
        break;
        
      case 'best-performance':
        // Select server with best reputation/performance
        selectedServer = availableServers.reduce((best, current) => {
          const bestMetrics = this.performanceMetrics.get(best.name);
          const currentMetrics = this.performanceMetrics.get(current.name);
          
          if (!bestMetrics) return current;
          if (!currentMetrics) return best;
          
          return currentMetrics.reputation > bestMetrics.reputation ? current : best;
        });
        break;
        
      default:
        selectedServer = availableServers[0];
    }
    
    // Update usage tracking
    this.rotationState.usageCount.set(
      selectedServer.name,
      (this.rotationState.usageCount.get(selectedServer.name) || 0) + 1
    );
    this.rotationState.lastUsed.set(selectedServer.name, new Date());
    
    return selectedServer;
  }
  
  /**
   * Send email using multi-server rotation
   */
  async sendEmail(emailData) {
    const {
      to,
      subject,
      html,
      text,
      from,
      replyTo,
    } = emailData;
    
    // Extract recipient domain for routing
    const recipientDomain = to.split('@')[1];
    
    // Select server
    const server = this.selectNextServer({ recipientDomain });
    
    console.log(`[Multi-Server Manager] Sending via: ${server.name}`);
    
    try {
      let result;
      
      if (server.type === 'sendgrid') {
        // Send via SendGrid API
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(server.apiKey);
        
        result = await sgMail.send({
          to,
          from: from || 'partnerships@spirittours.com',
          replyTo,
          subject,
          text,
          html,
        });
        
      } else {
        // Send via SMTP
        const transporter = this.transporters.get(server.name);
        
        if (!transporter) {
          throw new Error(`Transporter not found for ${server.name}`);
        }
        
        result = await transporter.sendMail({
          from: from || 'partnerships@spirittours.com',
          to,
          replyTo,
          subject,
          text,
          html,
        });
      }
      
      // Update metrics
      this.updateMetrics(server.name, 'sent', result);
      
      // Update warmup status
      if (server.warmup && server.warmup.enabled) {
        const warmup = this.warmupStatus.get(server.name);
        if (warmup) {
          warmup.sentToday += 1;
        }
      }
      
      return {
        success: true,
        server: server.name,
        messageId: result.messageId || result[0]?.headers['x-message-id'],
        ipAddress: server.ipAddress,
      };
      
    } catch (error) {
      console.error(`[Multi-Server Manager] Send failed via ${server.name}:`, error.message);
      
      // Update metrics
      this.updateMetrics(server.name, 'failed', error);
      
      // Update health status
      const health = this.serverHealth.get(server.name);
      if (health) {
        health.consecutiveFailures += 1;
        health.lastError = error.message;
        
        // Mark as down after 3 consecutive failures
        if (health.consecutiveFailures >= 3) {
          health.status = 'down';
          this.emit('server-down', { server: server.name, error: error.message });
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Update server metrics
   */
  updateMetrics(serverName, event, data) {
    const metrics = this.performanceMetrics.get(serverName);
    
    if (!metrics) return;
    
    switch (event) {
      case 'sent':
        metrics.totalSent += 1;
        this.config.statistics.totalSent += 1;
        break;
        
      case 'delivered':
        metrics.totalDelivered += 1;
        this.config.statistics.totalDelivered += 1;
        break;
        
      case 'failed':
        metrics.totalFailed += 1;
        this.config.statistics.totalFailed += 1;
        // Decrease reputation on failures
        metrics.reputation = Math.max(0, metrics.reputation - 2);
        break;
        
      case 'bounced':
        metrics.totalBounced += 1;
        // Decrease reputation more on bounces
        metrics.reputation = Math.max(0, metrics.reputation - 5);
        break;
    }
    
    // Calculate delivery rate and reputation
    const deliveryRate = metrics.totalSent > 0
      ? (metrics.totalDelivered / metrics.totalSent) * 100
      : 0;
    
    // Increase reputation on good delivery
    if (deliveryRate > 95) {
      metrics.reputation = Math.min(100, metrics.reputation + 0.5);
    }
  }
  
  /**
   * Health check for all servers
   */
  async checkServerHealth(serverName) {
    const server = this.config.serverPools.find(s => s.name === serverName);
    const transporter = this.transporters.get(serverName);
    
    if (!server || !transporter) return;
    
    try {
      await transporter.verify();
      
      const health = this.serverHealth.get(serverName);
      if (health) {
        health.status = 'up';
        health.lastCheck = new Date();
        health.consecutiveFailures = 0;
        health.lastError = null;
      }
      
      console.log(`[Multi-Server Manager] Health check passed: ${serverName}`);
      
    } catch (error) {
      const health = this.serverHealth.get(serverName);
      if (health) {
        health.status = 'down';
        health.lastCheck = new Date();
        health.consecutiveFailures += 1;
        health.lastError = error.message;
      }
      
      console.error(`[Multi-Server Manager] Health check failed: ${serverName}`, error.message);
      
      this.emit('health-check-failed', { server: serverName, error: error.message });
    }
  }
  
  /**
   * Start background health checking
   */
  startHealthChecking() {
    if (!this.config.globalSettings.enableHealthCheck) return;
    
    setInterval(() => {
      for (const [serverName] of this.transporters) {
        this.checkServerHealth(serverName);
      }
    }, this.config.globalSettings.healthCheckInterval);
    
    console.log(`[Multi-Server Manager] Health checking enabled (${this.config.globalSettings.healthCheckInterval}ms)`);
  }
  
  /**
   * Check for blacklists (placeholder - integrate with actual blacklist APIs)
   */
  async checkBlacklists() {
    if (!this.config.globalSettings.enableBlacklistDetection) return;
    
    // TODO: Integrate with blacklist checking APIs:
    // - Spamhaus
    // - SpamCop
    // - SURBL
    // - etc.
    
    console.log('[Multi-Server Manager] Blacklist check (not yet implemented)');
  }
  
  /**
   * Start background blacklist monitoring
   */
  startBlacklistMonitoring() {
    if (!this.config.globalSettings.enableBlacklistDetection) return;
    
    setInterval(() => {
      this.checkBlacklists();
    }, this.config.globalSettings.blacklistCheckInterval);
    
    console.log(`[Multi-Server Manager] Blacklist monitoring enabled (${this.config.globalSettings.blacklistCheckInterval}ms)`);
  }
  
  /**
   * Advance warmup day for a server
   */
  advanceWarmupDay(serverName) {
    const warmup = this.warmupStatus.get(serverName);
    
    if (!warmup) return;
    
    warmup.currentDay += 1;
    warmup.sentToday = 0;
    
    if (warmup.currentDay <= warmup.schedule.length) {
      warmup.dailyLimit = warmup.schedule[warmup.currentDay - 1];
      console.log(`[Multi-Server Manager] ${serverName} warmup day ${warmup.currentDay}: ${warmup.dailyLimit} emails`);
    } else {
      console.log(`[Multi-Server Manager] ${serverName} warmup complete!`);
    }
  }
  
  /**
   * Get comprehensive statistics
   */
  getStatistics() {
    // Calculate average reputation
    let totalReputation = 0;
    let count = 0;
    
    for (const [serverName, metrics] of this.performanceMetrics) {
      totalReputation += metrics.reputation;
      count++;
    }
    
    this.config.statistics.averageReputation = count > 0
      ? (totalReputation / count).toFixed(2)
      : 0;
    
    return {
      global: this.config.statistics,
      servers: Array.from(this.performanceMetrics.entries()).map(([name, metrics]) => {
        const health = this.serverHealth.get(name);
        const warmup = this.warmupStatus.get(name);
        
        return {
          name,
          ...metrics,
          health: health?.status || 'unknown',
          warmup: warmup ? {
            day: warmup.currentDay,
            sentToday: warmup.sentToday,
            dailyLimit: warmup.dailyLimit,
          } : null,
        };
      }),
    };
  }
  
  /**
   * Get recommendations based on current configuration
   */
  getRecommendations() {
    const stats = this.getStatistics();
    const recommendations = [];
    
    // Check average reputation
    if (stats.global.averageReputation < 80) {
      recommendations.push({
        level: 'warning',
        message: 'La reputación promedio de los servidores está por debajo del 80%. Considera reducir la velocidad de envío.',
      });
    }
    
    // Check server health
    const downServers = stats.servers.filter(s => s.health === 'down').length;
    if (downServers > 0) {
      recommendations.push({
        level: 'critical',
        message: `${downServers} servidor(es) están caídos. Revisa la configuración SMTP o las credenciales.`,
      });
    }
    
    // Check warmup progress
    const warmingUp = stats.servers.filter(s => s.warmup && s.warmup.day <= 7).length;
    if (warmingUp > 0) {
      recommendations.push({
        level: 'info',
        message: `${warmingUp} servidor(es) están en período de warmup. La capacidad completa estará disponible pronto.`,
      });
    }
    
    // Check capacity utilization
    const utilizationRate = stats.global.totalSent > 0
      ? (stats.global.totalSent / this.getTotalDailyCapacity()) * 100
      : 0;
    
    if (utilizationRate > 80) {
      recommendations.push({
        level: 'warning',
        message: 'Estás utilizando más del 80% de la capacidad diaria. Considera agregar más servidores o cambiar a un preset superior.',
      });
    } else if (utilizationRate < 20) {
      recommendations.push({
        level: 'info',
        message: 'Estás utilizando menos del 20% de la capacidad. Podrías considerar un preset más económico.',
      });
    }
    
    return recommendations;
  }
  
  /**
   * Get total daily capacity
   */
  getTotalDailyCapacity() {
    return this.config.serverPools.reduce((sum, server) => sum + (server.dailyLimit || 0), 0);
  }
  
  /**
   * Change configuration (preset or custom)
   */
  changeConfiguration(type, config) {
    if (type === 'preset') {
      return this.loadPreset(config);
    } else if (type === 'custom') {
      return this.createCustomConfig(config);
    } else {
      throw new Error(`Invalid configuration type: ${type}. Use 'preset' or 'custom'.`);
    }
  }
}

// Export singleton instance
module.exports = new MultiServerManagerService();
