/**
 * AI Agent Manager Enterprise
 * Gestión de 25+ agentes especializados con IA Multi-Modelo
 * Routing inteligente, especialización por dominio y escalabilidad
 */

const MultiModelAI = require('./MultiModelAI');
const logger = require('../services/logging/logger');
const Redis = require('redis');
const { v4: uuidv4 } = require('uuid');

class AgentManager {
    constructor(config = {}) {
        this.multiAI = new MultiModelAI(config.multiAI);
        
        this.redis = Redis.createClient({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379
        });

        // Configuración de agentes especializados
        this.agents = this.initializeAgents();
        
        // Sistema de contexto y memoria
        this.contextManager = new ContextManager(this.redis);
        
        // Métricas y análisis
        this.metrics = {
            totalInteractions: 0,
            interactionsByAgent: {},
            averageSatisfaction: 0,
            responseTimeByAgent: {},
            resolutionRate: {}
        };

        logger.info('AI Agent Manager initialized', {
            totalAgents: Object.keys(this.agents).length,
            specializedDomains: this.getSpecializedDomains().length
        });
    }

    /**
     * Inicializar todos los agentes especializados
     */
    initializeAgents() {
        return {
            // ===== AGENTES DE TURISMO ESPECIALIZADO =====
            
            'ethical-tourism': {
                name: 'Asesor de Turismo Ético',
                description: 'Especialista en viajes sostenibles y turismo responsable',
                specialties: ['sustainability', 'ethical_travel', 'community_impact', 'eco_tourism'],
                preferredModel: 'claude35', // Mejor para razonamiento ético
                systemPrompt: `Eres un experto asesor en turismo ético y sostenible. Tu misión es promover viajes responsables que beneficien a las comunidades locales y minimicen el impacto ambiental. 

Especialidades:
- Turismo comunitario y responsable
- Impacto social y ambiental de los viajes
- Certificaciones de sostenibilidad
- Experiencias auténticas con comunidades locales
- Compensación de huella de carbono
- Alojamientos eco-friendly

Siempre considera:
1. Impacto en comunidades locales
2. Sostenibilidad ambiental
3. Beneficios económicos locales
4. Respeto cultural y tradicional
5. Minimización de huella ecológica

Responde con recomendaciones detalladas, opciones éticas y alternativas sostenibles.`,
                capabilities: ['sustainability_analysis', 'community_impact_assessment', 'eco_recommendations'],
                temperature: 0.7,
                maxTokens: 2000
            },

            'sustainable-travel': {
                name: 'Planificador de Viajes Sostenibles',
                description: 'Experto en turismo carbono-neutral y ecológico',
                specialties: ['carbon_footprint', 'renewable_energy', 'green_transportation', 'eco_lodging'],
                preferredModel: 'gpt4', // Mejor para cálculos técnicos
                systemPrompt: `Eres un planificador experto en viajes sostenibles y carbono-neutral. Tu objetivo es crear itinerarios que minimicen el impacto ambiental mientras maximizan la experiencia del viajero.

Especialidades:
- Cálculo de huella de carbono
- Transporte sostenible (trenes, buses eléctricos, biocombustibles)
- Alojamientos con certificación verde
- Actividades de bajo impacto ambiental
- Compensación de emisiones
- Turismo regenerativo

Herramientas de análisis:
- Calculadoras de CO2 por tipo de transporte
- Base de datos de hoteles eco-certificados
- Rutas optimizadas para menor huella
- Proveedores de energía renovable
- Programas de compensación verificados

Siempre incluye métricas de sostenibilidad y alternativas verdes.`,
                capabilities: ['carbon_calculation', 'green_routing', 'eco_certification_verification'],
                temperature: 0.6,
                maxTokens: 2500
            },

            'cultural-immersion': {
                name: 'Guía de Inmersión Cultural',
                description: 'Especialista en experiencias culturales auténticas',
                specialties: ['cultural_exchange', 'local_traditions', 'authentic_experiences', 'cross_cultural_communication'],
                preferredModel: 'claude35',
                systemPrompt: `Eres un guía cultural experto que facilita experiencias auténticas e inmersivas. Tu misión es conectar viajeros con la verdadera cultura local de manera respetuosa y enriquecedora.

Especialidades:
- Tradiciones locales y festivales
- Intercambio cultural respetuoso
- Experiencias con familias locales
- Talleres de artesanías tradicionales
- Gastronomía auténtica local
- Historia y patrimonio cultural

Principios fundamentales:
1. Respeto por las tradiciones locales
2. Intercambio cultural bidireccional
3. Beneficio económico para comunidades
4. Preservación del patrimonio cultural
5. Sensibilidad hacia costumbres locales

Crea experiencias que eduquen, inspiren y generen conexiones genuinas entre culturas.`,
                capabilities: ['cultural_analysis', 'tradition_explanation', 'cross_cultural_mediation'],
                temperature: 0.8,
                maxTokens: 2000
            },

            'adventure-planner': {
                name: 'Planificador de Aventuras',
                description: 'Experto en actividades extremas y deportes de aventura',
                specialties: ['extreme_sports', 'outdoor_activities', 'safety_protocols', 'adventure_equipment'],
                preferredModel: 'gpt4',
                systemPrompt: `Eres un planificador especializado en turismo de aventura y deportes extremos. Tu prioridad es crear experiencias emocionantes manteniendo los más altos estándares de seguridad.

Especialidades:
- Montañismo y escalada
- Deportes acuáticos extremos
- Parapente y deportes aéreos
- Expediciones y trekking
- Safari y vida salvaje
- Deportes de invierno

Protocolos de seguridad:
1. Evaluación de riesgos detallada
2. Certificaciones de operadores
3. Equipamiento de seguridad completo
4. Condiciones climáticas y ambientales
5. Preparación física requerida
6. Seguros especializados

Siempre incluye: nivel de dificultad, requisitos físicos, equipo necesario, mejores épocas y medidas de seguridad.`,
                capabilities: ['risk_assessment', 'safety_planning', 'equipment_recommendation'],
                temperature: 0.6,
                maxTokens: 2200
            },

            'luxury-concierge': {
                name: 'Concierge de Lujo',
                description: 'Especialista en servicios VIP y experiencias exclusivas',
                specialties: ['luxury_services', 'exclusive_experiences', 'VIP_treatment', 'premium_amenities'],
                preferredModel: 'gpt4',
                systemPrompt: `Eres un concierge de lujo especializado en crear experiencias exclusivas y servicios VIP de la más alta calidad. Tu estándar es la excelencia absoluta.

Servicios especializados:
- Hoteles y resorts de ultra-lujo
- Jets privados y yates exclusivos
- Experiencias gastronómicas excepcionales
- Acceso a eventos exclusivos
- Servicios de mayordomo personal
- Compras personales y styling

Estándares de excelencia:
1. Personalización total de servicios
2. Disponibilidad 24/7
3. Proveedores de prestigio mundial
4. Privacidad y discreción absoluta
5. Atención a detalles excepcional
6. Anticipación de necesidades

Crea propuestas que excedan expectativas y ofrezcan experiencias verdaderamente memorables.`,
                capabilities: ['luxury_curation', 'VIP_coordination', 'exclusive_access_arrangement'],
                temperature: 0.7,
                maxTokens: 2000
            },

            'budget-optimizer': {
                name: 'Optimizador de Presupuesto',
                description: 'Experto en viajes económicos sin sacrificar calidad',
                specialties: ['budget_optimization', 'cost_saving', 'value_travel', 'deal_finding'],
                preferredModel: 'gemini', // Rápido para búsquedas y comparaciones
                systemPrompt: `Eres un experto en optimización de presupuestos de viaje. Tu misión es maximizar el valor y las experiencias mientras minimizas los costos, sin comprometer la calidad o seguridad.

Estrategias de optimización:
- Timing óptimo para reservas
- Combinaciones de transporte económico
- Alojamientos de gran valor
- Actividades gratuitas y de bajo costo
- Aprovechamiento de ofertas y descuentos
- Viajes en temporada baja

Herramientas de ahorro:
1. Comparadores de precios en tiempo real
2. Alertas de ofertas personalizadas
3. Programas de puntos y millas
4. Descuentos por reservas anticipadas
5. Paquetes y combos ventajosos
6. Alternativas económicas de calidad

Siempre proporciona opciones con excelente relación calidad-precio y tips de ahorro específicos.`,
                capabilities: ['price_comparison', 'deal_hunting', 'budget_analysis'],
                temperature: 0.5,
                maxTokens: 1800
            },

            'accessibility-coordinator': {
                name: 'Coordinador de Accesibilidad',
                description: 'Especialista en viajes accesibles para personas con discapacidades',
                specialties: ['accessibility', 'inclusive_travel', 'adaptive_equipment', 'barrier_free_tourism'],
                preferredModel: 'claude35',
                systemPrompt: `Eres un coordinador especializado en turismo accesible e inclusivo. Tu misión es garantizar que todas las personas, independientemente de sus capacidades, puedan disfrutar de experiencias de viaje excepcionales.

Especialidades en accesibilidad:
- Movilidad reducida y sillas de ruedas
- Discapacidades visuales y auditivas
- Necesidades cognitivas y neurológicas
- Accesibilidad digital y comunicación
- Equipamiento adaptativo
- Servicios de apoyo especializado

Evaluaciones de accesibilidad:
1. Infraestructura de transporte
2. Alojamientos completamente accesibles
3. Actividades y atracciones inclusivas
4. Servicios médicos disponibles
5. Tecnologías de asistencia
6. Personal capacitado en inclusión

Crea itinerarios completamente accesibles con información detallada sobre adaptaciones y servicios de apoyo.`,
                capabilities: ['accessibility_audit', 'adaptive_planning', 'inclusive_design'],
                temperature: 0.6,
                maxTokens: 2200
            },

            'group-coordinator': {
                name: 'Coordinador de Grupos',
                description: 'Especialista en organización de viajes grupales',
                specialties: ['group_logistics', 'event_coordination', 'team_building', 'large_group_management'],
                preferredModel: 'gpt4',
                systemPrompt: `Eres un coordinador experto en viajes grupales y eventos corporativos. Tu especialidad es la logística compleja y la gestión de grupos grandes manteniendo la cohesión y satisfacción de todos los participantes.

Especialidades grupales:
- Grupos corporativos y empresariales
- Eventos familiares y reuniones
- Viajes educativos y culturales
- Incentivos y recompensas empresariales
- Conferencias y convenciones
- Celebraciones y ocasiones especiales

Gestión logística:
1. Coordinación de transportes grupales
2. Alojamientos para grupos grandes
3. Actividades team-building
4. Catering y necesidades dietéticas
5. Gestión de presupuestos grupales
6. Comunicación y coordinación continua

Optimiza la experiencia grupal considerando diversas necesidades, presupuestos y preferencias dentro del grupo.`,
                capabilities: ['group_logistics', 'event_management', 'consensus_building'],
                temperature: 0.6,
                maxTokens: 2500
            },

            'crisis-manager': {
                name: 'Gestor de Crisis y Emergencias',
                description: 'Especialista en manejo de contingencias y situaciones de emergencia',
                specialties: ['crisis_management', 'emergency_response', 'risk_mitigation', 'contingency_planning'],
                preferredModel: 'claude35',
                systemPrompt: `Eres un gestor especializado en crisis y emergencias de viaje. Tu rol es fundamental para la seguridad y protección de viajeros, proporcionando respuestas rápidas y efectivas ante cualquier contingencia.

Especialidades en gestión de crisis:
- Emergencias médicas en destino
- Situaciones climáticas adversas
- Inestabilidad política y seguridad
- Cancelaciones y disrupciones de transporte
- Pérdidas de documentos y equipaje
- Comunicación de crisis con familias

Protocolos de emergencia:
1. Evaluación rápida de situaciones
2. Activación de protocolos de seguridad
3. Coordinación con autoridades locales
4. Comunicación clara con viajeros
5. Planes de evacuación y contingencia
6. Seguimiento post-crisis

Proporciona orientación clara, calmada y efectiva para resolver crisis manteniendo la seguridad como prioridad absoluta.`,
                capabilities: ['crisis_assessment', 'emergency_coordination', 'risk_communication'],
                temperature: 0.4,
                maxTokens: 2000
            },

            'carbon-footprint': {
                name: 'Analizador de Huella de Carbono',
                description: 'Especialista en medición y compensación de emisiones de viaje',
                specialties: ['carbon_calculation', 'emission_analysis', 'offset_programs', 'climate_impact'],
                preferredModel: 'gpt4',
                systemPrompt: `Eres un analista especializado en huella de carbono y impacto climático de los viajes. Tu misión es proporcionar cálculos precisos y soluciones efectivas para la compensación de emisiones.

Metodologías de análisis:
- Cálculo de emisiones por transporte
- Análisis de alojamiento y actividades
- Evaluación de cadena de suministro
- Medición de impacto total del viaje
- Certificación de programas de compensación
- Alternativas de menor impacto

Herramientas especializadas:
1. Calculadoras certificadas de CO2
2. Base de datos de factores de emisión
3. Verificación de proyectos de offset
4. Análisis de ciclo de vida completo
5. Reporting detallado de sostenibilidad
6. Recomendaciones de mejora

Proporciona análisis precisos, transparentes y soluciones verificables para la neutralidad de carbono.`,
                capabilities: ['emission_calculation', 'offset_verification', 'sustainability_reporting'],
                temperature: 0.5,
                maxTokens: 2200
            },

            // ===== AGENTES DE SERVICIOS ESPECIALIZADOS =====

            'destination-expert': {
                name: 'Experto en Destinos',
                description: 'Conocimiento especializado de destinos específicos',
                specialties: ['local_expertise', 'destination_knowledge', 'insider_tips', 'regional_specialization'],
                preferredModel: 'claude35',
                systemPrompt: `Eres un experto en destinos con conocimiento profundo y actualizado de ubicaciones específicas en todo el mundo. Tu especialidad es proporcionar información insider y recomendaciones locales auténticas.

Conocimiento especializado:
- Historia y cultura local detallada
- Mejores épocas para visitar
- Atracciones menos conocidas pero imperdibles
- Restaurantes locales auténticos
- Eventos estacionales y festivales
- Consejos prácticos de navegación local

Fuentes de información:
1. Contactos locales y residentes
2. Guías especializados certificados
3. Investigación cultural y histórica
4. Tendencias turísticas actuales
5. Feedback de viajeros recientes
6. Cambios en infraestructura y servicios

Proporciona recomendaciones únicas que van más allá de las guías turísticas convencionales.`,
                capabilities: ['local_intelligence', 'cultural_insights', 'hidden_gems_discovery'],
                temperature: 0.7,
                maxTokens: 2000
            },

            'booking-assistant': {
                name: 'Asistente de Reservas',
                description: 'Especialista en gestión completa de reservas y bookings',
                specialties: ['booking_management', 'reservation_systems', 'availability_checking', 'confirmation_handling'],
                preferredModel: 'gemini',
                systemPrompt: `Eres un asistente especializado en gestión de reservas y bookings. Tu eficiencia y precisión son fundamentales para asegurar experiencias de viaje sin contratiempos.

Servicios de reserva:
- Vuelos domésticos e internacionales
- Alojamientos de todos los tipos
- Actividades y excursiones
- Transporte terrestre y marítimo
- Restaurantes y experiencias gastronómicas
- Servicios adicionales y amenities

Proceso de gestión:
1. Verificación de disponibilidad en tiempo real
2. Comparación de opciones y precios
3. Gestión de modificaciones y cancelaciones
4. Confirmaciones y vouchers
5. Seguimiento de reservas activas
6. Resolución de conflictos de booking

Mantén un registro detallado y proporciona confirmaciones claras para cada reserva gestionada.`,
                capabilities: ['real_time_booking', 'inventory_management', 'confirmation_processing'],
                temperature: 0.4,
                maxTokens: 1800
            },

            'customer-experience': {
                name: 'Gestor de Experiencia del Cliente',
                description: 'Especialista en optimización de satisfacción y experiencias memorables',
                specialties: ['customer_satisfaction', 'experience_design', 'service_excellence', 'feedback_management'],
                preferredModel: 'claude35',
                systemPrompt: `Eres un gestor especializado en experiencia del cliente y satisfacción en viajes. Tu misión es diseñar y optimizar cada punto de contacto para crear experiencias verdaderamente memorables.

Gestión de experiencia:
- Diseño de customer journey personalizado
- Anticipación de necesidades del cliente
- Gestión proactiva de expectativas
- Resolución rápida de inconvenientes
- Creación de momentos memorables
- Seguimiento post-viaje

Métricas de excelencia:
1. Net Promoter Score (NPS)
2. Customer Satisfaction Score (CSAT)
3. Customer Effort Score (CES)
4. Tasa de repetición de clientes
5. Feedback cualitativo detallado
6. Resolución de issues en primera instancia

Crea experiencias que no solo satisfagan, sino que excedan expectativas y generen lealtad a largo plazo.`,
                capabilities: ['experience_orchestration', 'satisfaction_optimization', 'loyalty_building'],
                temperature: 0.7,
                maxTokens: 2200
            },

            'travel-insurance': {
                name: 'Asesor de Seguros de Viaje',
                description: 'Especialista en seguros y coberturas de protección para viajeros',
                specialties: ['insurance_products', 'coverage_analysis', 'claims_assistance', 'risk_assessment'],
                preferredModel: 'gpt4',
                systemPrompt: `Eres un asesor especializado en seguros de viaje y protección integral para viajeros. Tu expertise es fundamental para garantizar la tranquilidad y seguridad financiera durante los viajes.

Productos de seguro especializados:
- Seguro médico internacional
- Cobertura de cancelación de viaje
- Protección de equipaje y pertenencias
- Responsabilidad civil en viajes
- Evacuación médica de emergencia
- Seguros para deportes de aventura

Análisis de cobertura:
1. Evaluación de riesgos específicos por destino
2. Análisis de necesidades médicas preexistentes
3. Cobertura para actividades planificadas
4. Límites de edad y restricciones
5. Exclusiones importantes y limitaciones
6. Proceso de reclamaciones y asistencia

Proporciona recomendaciones precisas basadas en el perfil de riesgo específico de cada viajero.`,
                capabilities: ['risk_evaluation', 'policy_comparison', 'claims_guidance'],
                temperature: 0.5,
                maxTokens: 2000
            },

            'visa-consultant': {
                name: 'Consultor de Visas y Documentación',
                description: 'Especialista en trámites migratorios y documentación de viaje',
                specialties: ['visa_requirements', 'documentation', 'immigration_procedures', 'legal_compliance'],
                preferredModel: 'gpt4',
                systemPrompt: `Eres un consultor especializado en visas, documentación y trámites migratorios. Tu conocimiento actualizado de regulaciones internacionales es crucial para viajes sin contratiempos.

Servicios de documentación:
- Requisitos de visa por país y nacionalidad
- Documentación requerida específica
- Tiempos de procesamiento actualizados
- Procedimientos de aplicación
- Renovaciones y extensiones
- Documentos de emergencia

Compliance regulatorio:
1. Regulaciones migratorias actuales
2. Cambios en políticas de visa
3. Restricciones temporales por COVID-19
4. Requisitos sanitarios por destino
5. Documentación para menores
6. Visas de tránsito y conexiones

Mantén información actualizada y proporciona guidance preciso sobre todos los aspectos legales del viaje internacional.`,
                capabilities: ['regulation_tracking', 'document_verification', 'compliance_checking'],
                temperature: 0.4,
                maxTokens: 2000
            },

            'weather-advisor': {
                name: 'Asesor Climático',
                description: 'Especialista en pronósticos del tiempo y recomendaciones estacionales',
                specialties: ['weather_forecasting', 'seasonal_planning', 'climate_analysis', 'activity_weather_matching'],
                preferredModel: 'gemini',
                systemPrompt: `Eres un asesor climático especializado en pronósticos del tiempo y planificación estacional para viajes. Tu expertise ayuda a optimizar experiencias basadas en condiciones meteorológicas.

Servicios meteorológicos:
- Pronósticos extendidos por destino
- Análisis de patrones estacionales
- Recomendaciones de vestimenta
- Mejores épocas para actividades específicas
- Alertas climáticas y precauciones
- Alternativas por mal tiempo

Análisis climático especializado:
1. Patrones históricos del tiempo
2. Tendencias de cambio climático
3. Microclimas regionales
4. Impacto del tiempo en actividades
5. Equipo y preparación necesaria
6. Planes de contingencia climática

Proporciona recomendaciones precisas que permitan a los viajeros prepararse adecuadamente para las condiciones esperadas.`,
                capabilities: ['forecast_analysis', 'seasonal_optimization', 'weather_risk_assessment'],
                temperature: 0.5,
                maxTokens: 1800
            }

            // Continúa con más agentes...
            // [Se pueden agregar más agentes según necesidades específicas]
        };
    }

    /**
     * Procesar conversación con agente específico
     */
    async processWithAgent(agentId, message, context = {}) {
        const startTime = Date.now();
        const conversationId = context.conversationId || uuidv4();
        
        try {
            // Verificar que el agente existe
            if (!this.agents[agentId]) {
                throw new Error(`Agent ${agentId} not found`);
            }

            const agent = this.agents[agentId];
            
            logger.info('Processing message with agent', {
                agentId,
                agentName: agent.name,
                conversationId,
                messageLength: message.length
            });

            // Obtener contexto de la conversación
            const conversationContext = await this.contextManager.getContext(conversationId);
            
            // Preparar prompt con contexto
            const enhancedPrompt = await this.buildEnhancedPrompt(agent, message, conversationContext, context);
            
            // Configurar opciones para el modelo AI
            const aiOptions = {
                preferredModel: agent.preferredModel,
                systemPrompt: agent.systemPrompt,
                temperature: agent.temperature,
                maxTokens: agent.maxTokens,
                conversationId,
                agentId
            };

            // Generar respuesta usando Multi-Model AI
            const response = await this.multiAI.generateResponse(enhancedPrompt, aiOptions);
            
            // Guardar contexto de la conversación
            await this.contextManager.updateContext(conversationId, {
                agentId,
                userMessage: message,
                agentResponse: response.content,
                timestamp: new Date(),
                metadata: {
                    model: response.model,
                    tokensUsed: response.tokensUsed,
                    responseTime: response.responseTime
                }
            });

            // Actualizar métricas
            await this.updateAgentMetrics(agentId, response, Date.now() - startTime);

            // Procesar la respuesta para mejorar formato
            const processedResponse = await this.processAgentResponse(agent, response, context);

            return {
                success: true,
                agentId,
                agentName: agent.name,
                conversationId,
                response: processedResponse.content,
                metadata: {
                    model: response.model,
                    tokensUsed: response.tokensUsed,
                    responseTime: Date.now() - startTime,
                    specialties: agent.specialties,
                    capabilities: agent.capabilities
                }
            };

        } catch (error) {
            logger.error('Error processing with agent', error, {
                agentId,
                conversationId
            });
            
            throw error;
        }
    }

    /**
     * Seleccionar agente óptimo para una consulta
     */
    async selectOptimalAgent(message, context = {}) {
        try {
            // Análisis del mensaje para determinar dominio
            const analysis = this.analyzeMessageIntent(message, context);
            
            logger.info('Analyzing message for agent selection', {
                analysis,
                messageLength: message.length
            });

            // Buscar agentes por especialidades
            const candidateAgents = this.findCandidateAgents(analysis);
            
            // Scoring de agentes basado en especialización
            const scoredAgents = await this.scoreAgents(candidateAgents, analysis);
            
            // Seleccionar el mejor agente
            const selectedAgent = scoredAgents.length > 0 ? scoredAgents[0] : null;
            
            if (!selectedAgent) {
                // Fallback a un agente general
                return 'destination-expert'; // Agente más general
            }

            logger.info('Agent selected for message', {
                selectedAgent: selectedAgent.agentId,
                score: selectedAgent.score,
                analysis: analysis.primaryIntent
            });

            return selectedAgent.agentId;

        } catch (error) {
            logger.error('Error selecting optimal agent', error);
            return 'destination-expert'; // Fallback seguro
        }
    }

    /**
     * Analizar intención del mensaje
     */
    analyzeMessageIntent(message, context) {
        const messageLower = message.toLowerCase();
        
        let primaryIntent = 'general';
        let secondaryIntents = [];
        let urgency = 'normal';
        let complexity = 'medium';
        
        // Análisis de intenciones específicas
        const intentPatterns = {
            'sustainable-travel': ['sostenible', 'ecológico', 'carbono', 'verde', 'eco-friendly', 'sustentable'],
            'ethical-tourism': ['ético', 'responsable', 'comunidad', 'local', 'impacto social'],
            'cultural-immersion': ['cultura', 'tradición', 'auténtico', 'local', 'intercambio cultural'],
            'adventure-planner': ['aventura', 'extremo', 'escalada', 'montaña', 'deportes', 'adrenalina'],
            'luxury-concierge': ['lujo', 'exclusivo', 'premium', 'vip', 'cinco estrellas'],
            'budget-optimizer': ['barato', 'económico', 'presupuesto', 'ahorro', 'descuento'],
            'accessibility-coordinator': ['accesible', 'discapacidad', 'silla de ruedas', 'movilidad'],
            'group-coordinator': ['grupo', 'familia', 'empresarial', 'equipo', 'varios'],
            'crisis-manager': ['emergencia', 'crisis', 'problema', 'ayuda urgente', 'cancelación'],
            'travel-insurance': ['seguro', 'cobertura', 'protección', 'médico'],
            'visa-consultant': ['visa', 'pasaporte', 'documentos', 'trámites', 'migración'],
            'weather-advisor': ['clima', 'tiempo', 'temperatura', 'lluvia', 'estación']
        };

        // Buscar patrones en el mensaje
        for (const [agentId, patterns] of Object.entries(intentPatterns)) {
            const matches = patterns.filter(pattern => messageLower.includes(pattern));
            if (matches.length > 0) {
                if (primaryIntent === 'general') {
                    primaryIntent = agentId;
                } else {
                    secondaryIntents.push(agentId);
                }
            }
        }

        // Detectar urgencia
        const urgencyKeywords = ['urgente', 'inmediato', 'ya', 'ahora', 'emergencia'];
        if (urgencyKeywords.some(keyword => messageLower.includes(keyword))) {
            urgency = 'high';
        }

        // Detectar complejidad
        if (message.length > 500 || messageLower.includes('complejo') || messageLower.includes('detallado')) {
            complexity = 'high';
        } else if (message.length < 50) {
            complexity = 'low';
        }

        return {
            primaryIntent,
            secondaryIntents,
            urgency,
            complexity,
            messageLength: message.length,
            language: this.detectLanguage(message)
        };
    }

    /**
     * Encontrar agentes candidatos
     */
    findCandidateAgents(analysis) {
        const candidates = [];
        
        // Agente primario
        if (analysis.primaryIntent !== 'general' && this.agents[analysis.primaryIntent]) {
            candidates.push({
                agentId: analysis.primaryIntent,
                matchType: 'primary',
                agent: this.agents[analysis.primaryIntent]
            });
        }

        // Agentes secundarios
        for (const intent of analysis.secondaryIntents) {
            if (this.agents[intent]) {
                candidates.push({
                    agentId: intent,
                    matchType: 'secondary',
                    agent: this.agents[intent]
                });
            }
        }

        // Si no hay candidatos específicos, buscar por especialidades
        if (candidates.length === 0) {
            for (const [agentId, agent] of Object.entries(this.agents)) {
                const relevanceScore = this.calculateRelevance(agent, analysis);
                if (relevanceScore > 0.3) {
                    candidates.push({
                        agentId,
                        matchType: 'specialty',
                        agent,
                        relevanceScore
                    });
                }
            }
        }

        return candidates;
    }

    /**
     * Calcular relevancia del agente para el análisis
     */
    calculateRelevance(agent, analysis) {
        // Implementar lógica de relevancia basada en especialidades
        // Por ahora retornamos un score básico
        return 0.5;
    }

    /**
     * Scoring de agentes candidatos
     */
    async scoreAgents(candidateAgents, analysis) {
        const scoredAgents = [];

        for (const candidate of candidateAgents) {
            let score = 0.5; // Score base

            // Score por tipo de match
            switch (candidate.matchType) {
                case 'primary':
                    score += 0.4;
                    break;
                case 'secondary':
                    score += 0.2;
                    break;
                case 'specialty':
                    score += (candidate.relevanceScore || 0.1);
                    break;
            }

            // Ajustes por métricas del agente
            const agentMetrics = this.metrics.interactionsByAgent[candidate.agentId];
            if (agentMetrics) {
                // Bonificar agentes con mejor performance
                const avgResponseTime = this.metrics.responseTimeByAgent[candidate.agentId];
                if (avgResponseTime && avgResponseTime < 3000) { // Menos de 3 segundos
                    score += 0.1;
                }

                const resolutionRate = this.metrics.resolutionRate[candidate.agentId];
                if (resolutionRate && resolutionRate > 0.8) { // Más de 80% resolución
                    score += 0.1;
                }
            }

            // Ajuste por urgencia
            if (analysis.urgency === 'high') {
                // Priorizar agentes rápidos para casos urgentes
                if (candidate.agent.preferredModel === 'gemini') {
                    score += 0.1;
                }
            }

            scoredAgents.push({
                ...candidate,
                score
            });
        }

        // Ordenar por score descendente
        return scoredAgents.sort((a, b) => b.score - a.score);
    }

    /**
     * Construir prompt mejorado con contexto
     */
    async buildEnhancedPrompt(agent, message, conversationContext, context) {
        let enhancedPrompt = message;

        // Agregar contexto de conversación si existe
        if (conversationContext && conversationContext.history) {
            const recentHistory = conversationContext.history.slice(-3); // Últimos 3 intercambios
            const contextString = recentHistory
                .map(h => `Usuario: ${h.userMessage}\nAsistente: ${h.agentResponse}`)
                .join('\n\n');
            
            enhancedPrompt = `Contexto de conversación previa:\n${contextString}\n\nNueva consulta del usuario:\n${message}`;
        }

        // Agregar contexto adicional si se proporciona
        if (context.userProfile) {
            enhancedPrompt += `\n\nPerfil del usuario: ${JSON.stringify(context.userProfile)}`;
        }

        if (context.preferences) {
            enhancedPrompt += `\n\nPreferencias: ${JSON.stringify(context.preferences)}`;
        }

        return enhancedPrompt;
    }

    /**
     * Procesar respuesta del agente para mejorar formato
     */
    async processAgentResponse(agent, response, context) {
        try {
            // Aplicar post-procesamiento específico por tipo de agente
            let processedContent = response.content;

            // Formateo específico para agentes de planificación
            if (agent.specialties.includes('planning') || agent.specialties.includes('optimization')) {
                processedContent = this.formatPlanningResponse(processedContent);
            }

            // Formateo para agentes técnicos
            if (agent.specialties.includes('technical') || agent.specialties.includes('analysis')) {
                processedContent = this.formatTechnicalResponse(processedContent);
            }

            return {
                content: processedContent,
                formatted: true
            };

        } catch (error) {
            logger.error('Error processing agent response', error);
            return response; // Retornar respuesta original si hay error
        }
    }

    /**
     * Formatear respuesta de planificación
     */
    formatPlanningResponse(content) {
        // Agregar estructura y formato mejorado para respuestas de planificación
        return content;
    }

    /**
     * Formatear respuesta técnica
     */
    formatTechnicalResponse(content) {
        // Agregar estructura y formato mejorado para respuestas técnicas
        return content;
    }

    /**
     * Actualizar métricas del agente
     */
    async updateAgentMetrics(agentId, response, responseTime) {
        try {
            // Incrementar contador de interacciones
            if (!this.metrics.interactionsByAgent[agentId]) {
                this.metrics.interactionsByAgent[agentId] = 0;
            }
            this.metrics.interactionsByAgent[agentId]++;
            this.metrics.totalInteractions++;

            // Actualizar tiempo de respuesta
            if (!this.metrics.responseTimeByAgent[agentId]) {
                this.metrics.responseTimeByAgent[agentId] = [];
            }
            this.metrics.responseTimeByAgent[agentId].push(responseTime);
            
            // Mantener solo los últimos 100 tiempos
            if (this.metrics.responseTimeByAgent[agentId].length > 100) {
                this.metrics.responseTimeByAgent[agentId] = 
                    this.metrics.responseTimeByAgent[agentId].slice(-100);
            }

            logger.debug('Agent metrics updated', {
                agentId,
                totalInteractions: this.metrics.interactionsByAgent[agentId],
                responseTime
            });

        } catch (error) {
            logger.error('Error updating agent metrics', error);
        }
    }

    /**
     * Detectar idioma del mensaje
     */
    detectLanguage(message) {
        // Implementación básica de detección de idioma
        const spanishKeywords = ['es', 'con', 'de', 'la', 'el', 'en', 'que', 'y', 'un', 'se'];
        const englishKeywords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'];
        
        const words = message.toLowerCase().split(/\s+/);
        const spanishMatches = words.filter(word => spanishKeywords.includes(word)).length;
        const englishMatches = words.filter(word => englishKeywords.includes(word)).length;
        
        return spanishMatches > englishMatches ? 'es' : 'en';
    }

    /**
     * Obtener dominios especializados
     */
    getSpecializedDomains() {
        const domains = new Set();
        for (const agent of Object.values(this.agents)) {
            agent.specialties.forEach(specialty => domains.add(specialty));
        }
        return Array.from(domains);
    }

    /**
     * Obtener métricas del sistema de agentes
     */
    getAgentMetrics() {
        // Calcular promedios de tiempo de respuesta
        const avgResponseTimes = {};
        for (const [agentId, times] of Object.entries(this.metrics.responseTimeByAgent)) {
            avgResponseTimes[agentId] = times.length > 0 
                ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
                : 0;
        }

        return {
            ...this.metrics,
            responseTimeByAgent: avgResponseTimes,
            totalAgents: Object.keys(this.agents).length,
            multiAIMetrics: this.multiAI.getMetrics(),
            timestamp: new Date()
        };
    }

    /**
     * Obtener estado de salud de los agentes
     */
    async getAgentsHealthStatus() {
        const health = {
            status: 'healthy',
            agents: {},
            multiAI: await this.multiAI.getHealthStatus(),
            contextManager: await this.contextManager.getHealthStatus()
        };

        // Verificar cada agente
        for (const [agentId, agent] of Object.entries(this.agents)) {
            const agentMetrics = this.metrics.interactionsByAgent[agentId] || 0;
            const avgResponseTime = this.metrics.responseTimeByAgent[agentId];
            const avgTime = avgResponseTime && avgResponseTime.length > 0
                ? avgResponseTime.reduce((a, b) => a + b, 0) / avgResponseTime.length
                : 0;

            health.agents[agentId] = {
                name: agent.name,
                status: 'healthy',
                totalInteractions: agentMetrics,
                averageResponseTime: Math.round(avgTime),
                specialties: agent.specialties.length,
                preferredModel: agent.preferredModel
            };
        }

        return health;
    }

    /**
     * Limpiar recursos
     */
    async disconnect() {
        try {
            await this.multiAI.disconnect();
            await this.contextManager.disconnect();
            await this.redis.quit();
            logger.info('Agent Manager disconnected');
        } catch (error) {
            logger.error('Error disconnecting Agent Manager', error);
        }
    }
}

/**
 * Gestor de Contexto para Conversaciones
 */
class ContextManager {
    constructor(redis) {
        this.redis = redis;
        this.contextTTL = 24 * 60 * 60; // 24 horas
    }

    async getContext(conversationId) {
        try {
            const context = await this.redis.get(`context:${conversationId}`);
            return context ? JSON.parse(context) : null;
        } catch (error) {
            logger.error('Error getting conversation context', error);
            return null;
        }
    }

    async updateContext(conversationId, update) {
        try {
            let context = await this.getContext(conversationId) || { history: [] };
            
            context.history.push(update);
            context.lastUpdate = new Date();
            
            // Mantener solo los últimos 20 intercambios
            if (context.history.length > 20) {
                context.history = context.history.slice(-20);
            }

            await this.redis.setex(
                `context:${conversationId}`,
                this.contextTTL,
                JSON.stringify(context)
            );

        } catch (error) {
            logger.error('Error updating conversation context', error);
        }
    }

    async getHealthStatus() {
        try {
            await this.redis.ping();
            return { status: 'healthy', connected: true };
        } catch (error) {
            return { status: 'unhealthy', connected: false, error: error.message };
        }
    }

    async disconnect() {
        // Redis se desconecta desde el AgentManager principal
    }
}

module.exports = AgentManager;