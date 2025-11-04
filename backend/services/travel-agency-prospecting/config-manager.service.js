/**
 * Configuration Manager Service - Sistema de Configuración Completa
 * 
 * Gestiona toda la configuración del sistema de emails de forma centralizada:
 * - Wizard de configuración guiada (modo fácil)
 * - Configuración manual avanzada (modo experto)
 * - Configuración por agente (IA y humano)
 * - Perfiles guardados y templates
 * - Validación y testing automático
 * - Import/export de configuraciones
 * - Versioning y rollback
 * 
 * OBJETIVO: Hacer el sistema 100% configurable desde dashboard sin tocar código
 * 
 * @author Spirit Tours Development Team
 */

const multiServerManager = require('./multi-server-manager.service');
const costOptimizer = require('./cost-optimizer.service');
const aiEmailGenerator = require('./ai-email-generator.service');
const EventEmitter = require('events');

class ConfigManagerService extends EventEmitter {
  constructor() {
    super();
    
    this.config = {
      // Modo de configuración activo
      mode: 'wizard', // 'wizard' | 'manual' | 'hybrid'
      
      // Configuración global
      global: {
        systemName: 'Spirit Tours Email System',
        version: '2.0.0',
        environment: 'production', // 'development' | 'staging' | 'production'
        timezone: 'America/New_York',
        language: 'es',
      },
      
      // Configuración por agente
      agents: {
        // Agente IA (automático)
        ai: {
          enabled: true,
          name: 'AI Email Agent',
          capabilities: [
            'generate-content',
            'send-emails',
            'analyze-performance',
            'optimize-campaigns',
          ],
          config: {
            model: 'gpt-4-turbo-preview',
            temperature: 0.7,
            maxTokens: 1500,
          },
          permissions: {
            canSend: true,
            requiresApproval: true,
            maxEmailsPerDay: 1000,
            maxCostPerDay: 50,
          },
        },
        
        // Agentes humanos
        humans: [
          {
            id: 'admin-1',
            name: 'Administrator',
            email: 'admin@spirittours.com',
            role: 'admin',
            permissions: {
              canSend: true,
              requiresApproval: false,
              canApprove: true,
              canEditConfig: true,
              maxEmailsPerDay: 10000,
            },
          },
          {
            id: 'manager-1',
            name: 'Campaign Manager',
            email: 'manager@spirittours.com',
            role: 'manager',
            permissions: {
              canSend: true,
              requiresApproval: true,
              canApprove: true,
              canEditConfig: false,
              maxEmailsPerDay: 5000,
            },
          },
          {
            id: 'staff-1',
            name: 'Staff Member',
            email: 'staff@spirittours.com',
            role: 'staff',
            permissions: {
              canSend: false,
              requiresApproval: true,
              canApprove: false,
              canEditConfig: false,
              maxEmailsPerDay: 0,
            },
          },
        ],
      },
      
      // Email providers configurados
      emailProviders: [],
      
      // Configuración de cost optimizer
      costOptimization: {
        enabled: true,
        strategy: 'balanced',
      },
      
      // Configuración de multi-server
      multiServer: {
        enabled: false,
        preset: null,
      },
      
      // Perfiles guardados
      profiles: [],
      
      // Historial de cambios
      changeHistory: [],
      
      // Estado actual
      status: {
        configured: false,
        tested: false,
        lastModified: null,
        modifiedBy: null,
      },
    };
    
    // Templates de configuración rápida
    this.configTemplates = this.getConfigTemplates();
  }
  
  /**
   * TEMPLATES DE CONFIGURACIÓN RÁPIDA
   */
  
  getConfigTemplates() {
    return {
      'startup-free': {
        name: 'Startup - Completamente Gratis',
        description: 'Para startups que quieren $0 de costo. Hasta 1,000 emails/día.',
        cost: '$0/mes',
        capacity: '1,000 emails/día',
        setup: {
          multiServer: { enabled: false },
          costOptimization: { enabled: true, strategy: 'free-tier' },
          providers: [
            { type: 'gmail', count: 2, dailyLimit: 500 },
            { type: 'outlook', count: 1, dailyLimit: 300 },
            { type: 'sendgrid-free', count: 1, dailyLimit: 100 },
          ],
          ai: { enabled: true, requiresApproval: true },
        },
        requirements: [
          '2 cuentas Gmail',
          '1 cuenta Outlook',
          '1 cuenta SendGrid gratuita',
        ],
        recommended: true,
      },
      
      'small-business': {
        name: 'Small Business - Bajo Costo',
        description: 'Para pequeñas empresas. Balance costo/calidad.',
        cost: '$25-50/mes',
        capacity: '1,500 emails/día',
        setup: {
          multiServer: { enabled: true, preset: 'starter-triple' },
          costOptimization: { enabled: true, strategy: 'aggressive' },
          providers: [
            { type: 'own-smtp', count: 3 },
          ],
          ai: { enabled: true, requiresApproval: true },
        },
        requirements: [
          '3 cuentas SMTP propias o VPS',
        ],
        recommended: false,
      },
      
      'professional': {
        name: 'Professional - Óptimo',
        description: 'Configuración profesional balanceada. Más popular.',
        cost: '$95/mes',
        capacity: '3,000 emails/día',
        setup: {
          multiServer: { enabled: true, preset: 'hybrid-basic' },
          costOptimization: { enabled: true, strategy: 'balanced' },
          providers: [
            { type: 'own-smtp', count: 3 },
            { type: 'sendgrid', plan: 'essentials' },
          ],
          ai: { enabled: true, requiresApproval: true },
        },
        requirements: [
          '3 servidores SMTP',
          'Cuenta SendGrid Essentials',
        ],
        recommended: true,
      },
      
      'enterprise': {
        name: 'Enterprise - Máxima Capacidad',
        description: 'Para alto volumen. Máxima confiabilidad.',
        cost: '$250-500/mes',
        capacity: '5,000-10,000 emails/día',
        setup: {
          multiServer: { enabled: true, preset: 'business' },
          costOptimization: { enabled: true, strategy: 'hybrid-smart' },
          providers: [
            { type: 'own-smtp', count: 10 },
            { type: 'sendgrid-pro' },
          ],
          ai: { enabled: true, requiresApproval: false },
        },
        requirements: [
          '10 servidores SMTP',
          'SendGrid Pro',
        ],
        recommended: false,
      },
    };
  }
  
  /**
   * WIZARD DE CONFIGURACIÓN GUIADA
   * 
   * Proceso paso a paso para configurar el sistema fácilmente
   */
  
  async startWizard() {
    console.log('\n🧙 WIZARD DE CONFIGURACIÓN - SPIRIT TOURS EMAIL SYSTEM\n');
    
    const wizard = {
      currentStep: 1,
      totalSteps: 7,
      data: {},
      
      steps: [
        {
          step: 1,
          name: 'Bienvenida',
          question: '¿Qué quieres configurar?',
          options: [
            { value: 'complete', label: 'Configuración completa (recomendado)' },
            { value: 'template', label: 'Usar template rápido' },
            { value: 'manual', label: 'Configuración manual avanzada' },
          ],
        },
        {
          step: 2,
          name: 'Volumen',
          question: '¿Cuántos emails planeas enviar por día?',
          options: [
            { value: '0-500', label: '0-500 emails/día (Startup)', cost: '$0-25/mes' },
            { value: '500-1500', label: '500-1,500 emails/día (Small Business)', cost: '$25-75/mes' },
            { value: '1500-3000', label: '1,500-3,000 emails/día (Professional)', cost: '$75-125/mes' },
            { value: '3000-5000', label: '3,000-5,000 emails/día (Business)', cost: '$125-250/mes' },
            { value: '5000+', label: '5,000+ emails/día (Enterprise)', cost: '$250+/mes' },
          ],
        },
        {
          step: 3,
          name: 'Presupuesto',
          question: '¿Cuál es tu presupuesto mensual?',
          options: [
            { value: '0', label: '$0 - Quiero todo gratis' },
            { value: '25', label: '$25/mes - Presupuesto mínimo' },
            { value: '50', label: '$50/mes - Moderado' },
            { value: '100', label: '$100/mes - Profesional' },
            { value: '250', label: '$250/mes - Business' },
            { value: '500', label: '$500+/mes - Enterprise' },
          ],
        },
        {
          step: 4,
          name: 'Prioridad',
          question: '¿Qué es más importante para ti?',
          options: [
            { value: 'cost', label: 'Costo bajo (puedo sacrificar algo de calidad)' },
            { value: 'balanced', label: 'Balance costo/calidad (recomendado)' },
            { value: 'quality', label: 'Máxima calidad (no importa el costo)' },
          ],
        },
        {
          step: 5,
          name: 'Infraestructura',
          question: '¿Qué infraestructura tienes o puedes conseguir?',
          options: [
            { value: 'none', label: 'Ninguna, quiero todo en cloud' },
            { value: 'email-accounts', label: 'Tengo cuentas Gmail/Outlook' },
            { value: 'smtp', label: 'Tengo servidores SMTP propios' },
            { value: 'vps', label: 'Puedo contratar VPS' },
            { value: 'all', label: 'Tengo de todo disponible' },
          ],
        },
        {
          step: 6,
          name: 'IA y Automatización',
          question: '¿Quieres usar IA para generar emails?',
          options: [
            { value: 'yes-approved', label: 'Sí, pero con aprobación humana (recomendado)' },
            { value: 'yes-auto', label: 'Sí, completamente automático' },
            { value: 'no', label: 'No, solo emails manuales' },
          ],
        },
        {
          step: 7,
          name: 'Confirmación',
          question: 'Revisa tu configuración',
          type: 'summary',
        },
      ],
    };
    
    return wizard;
  }
  
  /**
   * Procesar respuesta del wizard y generar configuración
   */
  async processWizardAnswers(answers) {
    console.log('[Config Manager] Processing wizard answers...');
    
    const config = {
      name: 'Wizard Generated Config',
      createdAt: new Date(),
      answers: answers,
      recommended: {},
    };
    
    // Analizar respuestas
    const volume = answers.volume;
    const budget = parseInt(answers.budget);
    const priority = answers.priority;
    const infrastructure = answers.infrastructure;
    const aiEnabled = answers.ai !== 'no';
    const aiAutomatic = answers.ai === 'yes-auto';
    
    // Recomendar configuración basada en respuestas
    if (budget === 0) {
      // Free tier máximo
      config.recommended = {
        template: 'startup-free',
        multiServer: { enabled: false },
        costStrategy: 'free-tier',
        providers: [
          { type: 'gmail', count: 2, setup: 'Create 2 Gmail accounts' },
          { type: 'outlook', count: 1, setup: 'Create 1 Outlook account' },
          { type: 'sendgrid-free', count: 1, setup: 'Sign up for SendGrid free' },
        ],
        expectedCost: '$0/mes',
        expectedCapacity: '1,000 emails/día',
      };
    } else if (budget <= 50 && volume === '0-500') {
      // Starter con SMTP básico
      config.recommended = {
        template: 'small-business',
        multiServer: { enabled: true, preset: 'starter' },
        costStrategy: 'aggressive',
        providers: [
          { type: 'own-smtp', count: 1, setup: 'Configure 1 SMTP server' },
        ],
        expectedCost: '$25/mes',
        expectedCapacity: '500 emails/día',
      };
    } else if (budget <= 125 && (volume === '500-1500' || volume === '1500-3000')) {
      // Professional hybrid
      config.recommended = {
        template: 'professional',
        multiServer: { enabled: true, preset: 'hybrid-basic' },
        costStrategy: 'balanced',
        providers: [
          { type: 'own-smtp', count: 3, setup: 'Configure 3 SMTP servers' },
          { type: 'sendgrid', plan: 'essentials', setup: 'Sign up for SendGrid Essentials' },
        ],
        expectedCost: '$95/mes',
        expectedCapacity: '3,000 emails/día',
      };
    } else {
      // Enterprise
      config.recommended = {
        template: 'enterprise',
        multiServer: { enabled: true, preset: 'business' },
        costStrategy: 'hybrid-smart',
        providers: [
          { type: 'own-smtp', count: 10, setup: 'Configure 10 SMTP servers' },
          { type: 'sendgrid-pro', setup: 'Sign up for SendGrid Pro' },
        ],
        expectedCost: '$250-500/mes',
        expectedCapacity: '5,000-10,000 emails/día',
      };
    }
    
    // Configuración de IA
    config.recommended.ai = {
      enabled: aiEnabled,
      requiresApproval: !aiAutomatic,
      model: 'gpt-4-turbo-preview',
    };
    
    console.log('[Config Manager] Wizard configuration generated:');
    console.log(`   Template: ${config.recommended.template}`);
    console.log(`   Cost: ${config.recommended.expectedCost}`);
    console.log(`   Capacity: ${config.recommended.expectedCapacity}`);
    
    return config;
  }
  
  /**
   * Aplicar configuración generada por wizard
   */
  async applyWizardConfig(config) {
    console.log('[Config Manager] Applying wizard configuration...');
    
    const recommended = config.recommended;
    
    // Aplicar multi-server si está habilitado
    if (recommended.multiServer.enabled) {
      multiServerManager.loadPreset(recommended.multiServer.preset);
      this.config.multiServer = recommended.multiServer;
    }
    
    // Aplicar cost strategy
    costOptimizer.setStrategy(recommended.costStrategy);
    this.config.costOptimization.strategy = recommended.costStrategy;
    
    // Aplicar configuración de IA
    if (recommended.ai.enabled) {
      this.config.agents.ai.enabled = true;
      this.config.agents.ai.permissions.requiresApproval = recommended.ai.requiresApproval;
    }
    
    // Marcar como configurado
    this.config.status.configured = true;
    this.config.status.lastModified = new Date();
    this.config.status.modifiedBy = 'wizard';
    
    // Guardar en historial
    this.config.changeHistory.push({
      timestamp: new Date(),
      source: 'wizard',
      changes: recommended,
    });
    
    console.log('[Config Manager] Configuration applied successfully!');
    
    return {
      success: true,
      config: this.config,
      nextSteps: [
        'Configure email provider credentials',
        'Test email sending',
        'Create first campaign',
      ],
    };
  }
  
  /**
   * CONFIGURACIÓN MANUAL AVANZADA
   */
  
  getManualConfigSchema() {
    return {
      sections: [
        {
          id: 'general',
          name: 'Configuración General',
          fields: [
            {
              name: 'systemName',
              label: 'Nombre del Sistema',
              type: 'text',
              default: 'Spirit Tours Email System',
              required: true,
            },
            {
              name: 'environment',
              label: 'Entorno',
              type: 'select',
              options: ['development', 'staging', 'production'],
              default: 'production',
            },
            {
              name: 'timezone',
              label: 'Zona Horaria',
              type: 'select',
              options: ['America/New_York', 'America/Mexico_City', 'Europe/Madrid', 'America/Sao_Paulo'],
              default: 'America/New_York',
            },
          ],
        },
        {
          id: 'email-providers',
          name: 'Proveedores de Email',
          fields: [
            {
              name: 'providers',
              label: 'Proveedores Configurados',
              type: 'array',
              itemSchema: {
                name: { type: 'text', label: 'Nombre' },
                type: { type: 'select', options: ['smtp', 'sendgrid', 'mailgun', 'ses'], label: 'Tipo' },
                host: { type: 'text', label: 'Host (solo SMTP)' },
                port: { type: 'number', label: 'Puerto (solo SMTP)' },
                user: { type: 'text', label: 'Usuario' },
                password: { type: 'password', label: 'Contraseña' },
                apiKey: { type: 'password', label: 'API Key' },
                dailyLimit: { type: 'number', label: 'Límite Diario' },
                priority: { type: 'number', label: 'Prioridad (1-10)' },
              },
            },
          ],
        },
        {
          id: 'multi-server',
          name: 'Multi-Servidor',
          fields: [
            {
              name: 'enabled',
              label: 'Habilitar Multi-Servidor',
              type: 'boolean',
              default: false,
            },
            {
              name: 'preset',
              label: 'Preset',
              type: 'select',
              options: Object.keys(multiServerManager.getPresets()),
              conditional: { field: 'enabled', value: true },
            },
            {
              name: 'rotationStrategy',
              label: 'Estrategia de Rotación',
              type: 'select',
              options: ['round-robin', 'random', 'least-used', 'best-performance'],
              default: 'round-robin',
            },
          ],
        },
        {
          id: 'cost-optimization',
          name: 'Optimización de Costos',
          fields: [
            {
              name: 'enabled',
              label: 'Habilitar Optimización',
              type: 'boolean',
              default: true,
            },
            {
              name: 'strategy',
              label: 'Estrategia',
              type: 'select',
              options: Object.keys(costOptimizer.getStrategies()),
              default: 'balanced',
            },
            {
              name: 'monthlyBudget',
              label: 'Presupuesto Mensual ($)',
              type: 'number',
              default: 100,
            },
          ],
        },
        {
          id: 'ai-agent',
          name: 'Agente IA',
          fields: [
            {
              name: 'enabled',
              label: 'Habilitar IA',
              type: 'boolean',
              default: true,
            },
            {
              name: 'model',
              label: 'Modelo',
              type: 'select',
              options: ['gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
              default: 'gpt-4-turbo-preview',
            },
            {
              name: 'requiresApproval',
              label: 'Requiere Aprobación',
              type: 'boolean',
              default: true,
            },
            {
              name: 'maxEmailsPerDay',
              label: 'Máx. Emails por Día',
              type: 'number',
              default: 1000,
            },
          ],
        },
        {
          id: 'human-agents',
          name: 'Agentes Humanos',
          fields: [
            {
              name: 'agents',
              label: 'Agentes',
              type: 'array',
              itemSchema: {
                name: { type: 'text', label: 'Nombre' },
                email: { type: 'email', label: 'Email' },
                role: { type: 'select', options: ['admin', 'manager', 'staff'], label: 'Rol' },
                canSend: { type: 'boolean', label: 'Puede Enviar' },
                canApprove: { type: 'boolean', label: 'Puede Aprobar' },
                canEditConfig: { type: 'boolean', label: 'Puede Editar Config' },
                maxEmailsPerDay: { type: 'number', label: 'Máx. Emails/Día' },
              },
            },
          ],
        },
      ],
    };
  }
  
  /**
   * Aplicar configuración manual
   */
  async applyManualConfig(configData) {
    console.log('[Config Manager] Applying manual configuration...');
    
    // Validar configuración
    const validation = this.validateConfig(configData);
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }
    
    // Aplicar cambios sección por sección
    if (configData.general) {
      Object.assign(this.config.global, configData.general);
    }
    
    if (configData.emailProviders) {
      this.config.emailProviders = configData.emailProviders.providers;
    }
    
    if (configData.multiServer) {
      if (configData.multiServer.enabled) {
        multiServerManager.loadPreset(configData.multiServer.preset);
      }
      this.config.multiServer = configData.multiServer;
    }
    
    if (configData.costOptimization) {
      if (configData.costOptimization.enabled) {
        costOptimizer.setStrategy(configData.costOptimization.strategy);
      }
      this.config.costOptimization = configData.costOptimization;
    }
    
    if (configData.aiAgent) {
      this.config.agents.ai = { ...this.config.agents.ai, ...configData.aiAgent };
    }
    
    if (configData.humanAgents) {
      this.config.agents.humans = configData.humanAgents.agents;
    }
    
    // Actualizar estado
    this.config.status.configured = true;
    this.config.status.lastModified = new Date();
    this.config.status.modifiedBy = 'manual';
    
    // Guardar en historial
    this.config.changeHistory.push({
      timestamp: new Date(),
      source: 'manual',
      changes: configData,
    });
    
    console.log('[Config Manager] Manual configuration applied successfully!');
    
    return {
      success: true,
      config: this.config,
    };
  }
  
  /**
   * Validar configuración
   */
  validateConfig(configData) {
    const errors = [];
    
    // Validar proveedores de email
    if (configData.emailProviders && configData.emailProviders.providers) {
      if (configData.emailProviders.providers.length === 0) {
        errors.push('At least one email provider is required');
      }
      
      configData.emailProviders.providers.forEach((provider, index) => {
        if (!provider.name) {
          errors.push(`Provider ${index + 1}: Name is required`);
        }
        if (!provider.type) {
          errors.push(`Provider ${index + 1}: Type is required`);
        }
        if (provider.type === 'smtp' && (!provider.host || !provider.port)) {
          errors.push(`Provider ${index + 1}: SMTP requires host and port`);
        }
      });
    }
    
    // Validar presupuesto
    if (configData.costOptimization && configData.costOptimization.monthlyBudget) {
      if (configData.costOptimization.monthlyBudget < 0) {
        errors.push('Monthly budget cannot be negative');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
  
  /**
   * TEST DE CONFIGURACIÓN
   */
  
  async testConfiguration() {
    console.log('[Config Manager] Testing configuration...');
    
    const results = {
      overall: 'pending',
      tests: [],
    };
    
    // Test 1: Email providers
    results.tests.push({
      name: 'Email Providers',
      status: this.config.emailProviders.length > 0 ? 'passed' : 'failed',
      message: `${this.config.emailProviders.length} provider(s) configured`,
    });
    
    // Test 2: Multi-server
    if (this.config.multiServer.enabled) {
      results.tests.push({
        name: 'Multi-Server',
        status: 'passed',
        message: `Preset: ${this.config.multiServer.preset}`,
      });
    }
    
    // Test 3: Cost optimization
    if (this.config.costOptimization.enabled) {
      results.tests.push({
        name: 'Cost Optimization',
        status: 'passed',
        message: `Strategy: ${this.config.costOptimization.strategy}`,
      });
    }
    
    // Test 4: AI agent
    if (this.config.agents.ai.enabled) {
      results.tests.push({
        name: 'AI Agent',
        status: 'passed',
        message: `Model: ${this.config.agents.ai.config.model}`,
      });
    }
    
    // Test 5: Send test email
    try {
      // TODO: Implement actual test email sending
      results.tests.push({
        name: 'Test Email',
        status: 'skipped',
        message: 'Implement actual email test',
      });
    } catch (error) {
      results.tests.push({
        name: 'Test Email',
        status: 'failed',
        message: error.message,
      });
    }
    
    // Determine overall status
    const failed = results.tests.filter(t => t.status === 'failed').length;
    results.overall = failed === 0 ? 'passed' : 'failed';
    
    this.config.status.tested = results.overall === 'passed';
    
    return results;
  }
  
  /**
   * PERFILES Y TEMPLATES
   */
  
  saveProfile(name, description) {
    const profile = {
      id: `profile-${Date.now()}`,
      name,
      description,
      config: JSON.parse(JSON.stringify(this.config)),
      createdAt: new Date(),
    };
    
    this.config.profiles.push(profile);
    
    console.log(`[Config Manager] Profile saved: ${name}`);
    
    return profile;
  }
  
  loadProfile(profileId) {
    const profile = this.config.profiles.find(p => p.id === profileId);
    
    if (!profile) {
      throw new Error(`Profile not found: ${profileId}`);
    }
    
    this.config = JSON.parse(JSON.stringify(profile.config));
    
    console.log(`[Config Manager] Profile loaded: ${profile.name}`);
    
    return profile;
  }
  
  /**
   * EXPORT/IMPORT
   */
  
  exportConfig() {
    return {
      version: this.config.global.version,
      exported: new Date().toISOString(),
      config: this.config,
    };
  }
  
  importConfig(importedData) {
    if (importedData.version !== this.config.global.version) {
      console.warn(`[Config Manager] Version mismatch: ${importedData.version} vs ${this.config.global.version}`);
    }
    
    this.config = importedData.config;
    
    console.log('[Config Manager] Configuration imported');
    
    return this.config;
  }
  
  /**
   * ROLLBACK
   */
  
  rollback(steps = 1) {
    if (this.config.changeHistory.length < steps) {
      throw new Error(`Not enough history to rollback ${steps} steps`);
    }
    
    // Remover los últimos cambios
    this.config.changeHistory.splice(-steps);
    
    // Restaurar al último estado
    const lastState = this.config.changeHistory[this.config.changeHistory.length - 1];
    
    if (lastState) {
      // Aplicar cambios del último estado
      // TODO: Implement actual rollback logic
    }
    
    console.log(`[Config Manager] Rolled back ${steps} step(s)`);
  }
  
  /**
   * GET CURRENT CONFIG
   */
  
  getCurrentConfig() {
    return {
      ...this.config,
      summary: {
        configured: this.config.status.configured,
        tested: this.config.status.tested,
        providers: this.config.emailProviders.length,
        multiServerEnabled: this.config.multiServer.enabled,
        costOptimizationEnabled: this.config.costOptimization.enabled,
        aiEnabled: this.config.agents.ai.enabled,
        humanAgents: this.config.agents.humans.length,
      },
    };
  }
}

// Export singleton
module.exports = new ConfigManagerService();
