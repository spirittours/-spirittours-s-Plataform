/**
 * Hybrid Agent System Service
 * 
 * Sistema híbrido que combina agentes IA con agentes humanos para
 * maximizar eficiencia y calidad en campañas de email.
 * 
 * Características:
 * - Asignación inteligente de tareas (IA vs Humano)
 * - Workflow de aprobación flexible
 * - Escalamiento automático según carga
 * - Sistema de prioridades
 * - Tracking de rendimiento por tipo de agente
 * 
 * @author Spirit Tours Development Team
 */

const EventEmitter = require('events');

class HybridAgentSystemService extends EventEmitter {
  constructor() {
    super();
    
    this.config = {
      // Modo operativo (configurable desde dashboard)
      mode: 'hybrid', // 'ai-only' | 'human-only' | 'hybrid' | 'smart-auto'
      
      // Configuración de asignación
      assignment: {
        // Qué tareas asignar a IA
        aiTasks: [
          'email-generation',      // Generar contenido de email
          'simple-replies',        // Respuestas simples
          'data-enrichment',       // Enriquecer datos de agencias
          'scheduling',            // Programar envíos
          'basic-analytics',       // Análisis básico
        ],
        
        // Qué tareas asignar a humanos
        humanTasks: [
          'complex-replies',       // Respuestas complejas
          'negotiation',           // Negociaciones
          'quality-review',        // Revisión de calidad
          'strategy-planning',     // Planificación estratégica
          'high-value-clients',    // Clientes de alto valor
        ],
        
        // Tareas que pueden ser ambas (decide según contexto)
        flexibleTasks: [
          'email-approval',        // Aprobar emails
          'campaign-creation',     // Crear campañas
          'followup',              // Seguimientos
          'content-optimization',  // Optimizar contenido
        ],
      },
      
      // Criterios de asignación inteligente
      intelligentAssignment: {
        // Asignar a humano si:
        assignToHumanIf: {
          clientValue: 'high',                    // Cliente de alto valor
          emailImportance: 'critical',            // Email crítico
          complexity: 'high',                     // Alta complejidad
          requiresNegotiation: true,              // Requiere negociación
          previousAttemptFailed: true,            // Intento previo falló
          customerRequestedHuman: true,           // Cliente pidió humano
          regulatoryCompliance: true,             // Cumplimiento regulatorio
        },
        
        // Asignar a IA si:
        assignToAIIf: {
          taskType: 'routine',                    // Tarea rutinaria
          volume: 'high',                         // Alto volumen
          timeConstraint: 'urgent',               // Urgente
          similarToSuccessful: true,              // Similar a emails exitosos
          dataAvailable: true,                    // Datos completos disponibles
          lowRisk: true,                          // Bajo riesgo
        },
      },
      
      // Agentes IA disponibles
      aiAgents: [
        {
          id: 'ai-agent-1',
          name: 'GPT-4 Email Generator',
          type: 'email-generation',
          status: 'active',
          capacity: 1000,  // Emails por día
          currentLoad: 0,
          performance: {
            successRate: 0,
            averageTime: 0,
            qualityScore: 0,
          },
        },
        {
          id: 'ai-agent-2',
          name: 'GPT-3.5 Quick Responder',
          type: 'simple-replies',
          status: 'active',
          capacity: 2000,
          currentLoad: 0,
          performance: {
            successRate: 0,
            averageTime: 0,
            qualityScore: 0,
          },
        },
      ],
      
      // Agentes humanos disponibles
      humanAgents: [
        {
          id: 'human-agent-1',
          name: 'María García',
          email: 'maria@spirittours.com',
          role: 'Email Marketing Specialist',
          status: 'available', // 'available' | 'busy' | 'offline'
          capacity: 50,  // Emails por día
          currentLoad: 0,
          specialties: ['email-approval', 'campaign-creation', 'quality-review'],
          performance: {
            successRate: 0,
            averageTime: 0,
            qualityScore: 0,
          },
        },
        {
          id: 'human-agent-2',
          name: 'Carlos Rodríguez',
          email: 'carlos@spirittours.com',
          role: 'Senior Account Manager',
          status: 'available',
          capacity: 30,
          currentLoad: 0,
          specialties: ['negotiation', 'high-value-clients', 'complex-replies'],
          performance: {
            successRate: 0,
            averageTime: 0,
            qualityScore: 0,
          },
        },
      ],
      
      // Cola de tareas
      taskQueue: [],
      
      // Estadísticas
      statistics: {
        tasksAssignedToAI: 0,
        tasksAssignedToHuman: 0,
        tasksCompleted: 0,
        averageAITime: 0,
        averageHumanTime: 0,
        aiSuccessRate: 0,
        humanSuccessRate: 0,
      },
    };
  }
  
  /**
   * ASIGNACIÓN INTELIGENTE DE TAREAS
   */
  
  async assignTask(task) {
    const {
      type,              // Tipo de tarea
      priority,          // 'low' | 'medium' | 'high' | 'critical'
      data,              // Datos de la tarea
      deadline,          // Deadline opcional
      context,           // Contexto adicional
    } = task;
    
    // Determinar asignación según modo
    if (this.config.mode === 'ai-only') {
      return this.assignToAI(task);
    }
    
    if (this.config.mode === 'human-only') {
      return this.assignToHuman(task);
    }
    
    if (this.config.mode === 'hybrid' || this.config.mode === 'smart-auto') {
      return this.assignIntelligently(task);
    }
    
    throw new Error(`Invalid mode: ${this.config.mode}`);
  }
  
  /**
   * Asignación inteligente (decide según contexto)
   */
  async assignIntelligently(task) {
    const score = this.calculateAssignmentScore(task);
    
    console.log(`[Hybrid Agent] Task assignment score - AI: ${score.ai}, Human: ${score.human}`);
    
    // Decidir basado en puntajes
    if (score.ai > score.human) {
      return this.assignToAI(task);
    } else if (score.human > score.ai) {
      return this.assignToHuman(task);
    } else {
      // Empate - decidir por disponibilidad
      const aiAvailable = this.getAvailableAIAgent(task.type);
      const humanAvailable = this.getAvailableHumanAgent(task.type);
      
      if (aiAvailable && !humanAvailable) {
        return this.assignToAI(task);
      } else if (humanAvailable && !aiAvailable) {
        return this.assignToHuman(task);
      } else {
        // Ambos disponibles - preferir IA para eficiencia
        return this.assignToAI(task);
      }
    }
  }
  
  /**
   * Calcular puntaje de asignación
   */
  calculateAssignmentScore(task) {
    let aiScore = 0;
    let humanScore = 0;
    
    const { type, priority, data, context } = task;
    
    // Factor 1: Tipo de tarea
    if (this.config.assignment.aiTasks.includes(type)) {
      aiScore += 50;
    }
    
    if (this.config.assignment.humanTasks.includes(type)) {
      humanScore += 50;
    }
    
    if (this.config.assignment.flexibleTasks.includes(type)) {
      aiScore += 25;
      humanScore += 25;
    }
    
    // Factor 2: Prioridad
    if (priority === 'critical') {
      humanScore += 30; // Humano para tareas críticas
    } else if (priority === 'low') {
      aiScore += 20; // IA para tareas de baja prioridad
    }
    
    // Factor 3: Complejidad
    if (data?.complexity === 'high') {
      humanScore += 25;
    } else if (data?.complexity === 'low') {
      aiScore += 25;
    }
    
    // Factor 4: Valor del cliente
    if (data?.clientValue === 'high' || data?.clientValue === 'vip') {
      humanScore += 40;
    } else if (data?.clientValue === 'low') {
      aiScore += 20;
    }
    
    // Factor 5: Volumen
    if (context?.batchSize > 100) {
      aiScore += 30; // IA mejor para alto volumen
    }
    
    // Factor 6: Urgencia
    if (context?.urgent) {
      aiScore += 20; // IA más rápida
    }
    
    // Factor 7: Requiere creatividad/negociación
    if (data?.requiresNegotiation || data?.requiresCreativity) {
      humanScore += 35;
    }
    
    // Factor 8: Disponibilidad
    const aiAvailable = this.getAvailableAIAgent(type);
    const humanAvailable = this.getAvailableHumanAgent(type);
    
    if (aiAvailable) {
      aiScore += 15;
    }
    
    if (humanAvailable) {
      humanScore += 15;
    }
    
    // Factor 9: Performance histórico
    const aiPerf = this.getAverageAIPerformance(type);
    const humanPerf = this.getAverageHumanPerformance(type);
    
    aiScore += aiPerf * 10;
    humanScore += humanPerf * 10;
    
    return { ai: aiScore, human: humanScore };
  }
  
  /**
   * Asignar a agente IA
   */
  async assignToAI(task) {
    const agent = this.getAvailableAIAgent(task.type);
    
    if (!agent) {
      // No hay agente IA disponible, poner en cola
      this.config.taskQueue.push({
        ...task,
        assignedTo: 'ai',
        queuedAt: new Date(),
      });
      
      return {
        success: false,
        queued: true,
        message: 'No AI agent available, task queued',
      };
    }
    
    // Asignar tarea
    agent.currentLoad += 1;
    this.config.statistics.tasksAssignedToAI += 1;
    
    console.log(`[Hybrid Agent] Task assigned to AI: ${agent.name}`);
    
    this.emit('task-assigned', {
      taskId: task.id || Date.now(),
      taskType: task.type,
      assignedTo: 'ai',
      agentId: agent.id,
      agentName: agent.name,
    });
    
    return {
      success: true,
      assignedTo: 'ai',
      agent: {
        id: agent.id,
        name: agent.name,
        type: agent.type,
      },
    };
  }
  
  /**
   * Asignar a agente humano
   */
  async assignToHuman(task) {
    const agent = this.getAvailableHumanAgent(task.type);
    
    if (!agent) {
      // No hay agente humano disponible, poner en cola
      this.config.taskQueue.push({
        ...task,
        assignedTo: 'human',
        queuedAt: new Date(),
      });
      
      return {
        success: false,
        queued: true,
        message: 'No human agent available, task queued',
      };
    }
    
    // Asignar tarea
    agent.currentLoad += 1;
    this.config.statistics.tasksAssignedToHuman += 1;
    
    console.log(`[Hybrid Agent] Task assigned to Human: ${agent.name}`);
    
    // Notificar al agente humano
    this.notifyHumanAgent(agent, task);
    
    this.emit('task-assigned', {
      taskId: task.id || Date.now(),
      taskType: task.type,
      assignedTo: 'human',
      agentId: agent.id,
      agentName: agent.name,
      agentEmail: agent.email,
    });
    
    return {
      success: true,
      assignedTo: 'human',
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agent.role,
      },
    };
  }
  
  /**
   * GESTIÓN DE AGENTES
   */
  
  getAvailableAIAgent(taskType) {
    return this.config.aiAgents.find(agent => 
      agent.status === 'active' &&
      agent.currentLoad < agent.capacity &&
      (agent.type === taskType || taskType === 'general')
    );
  }
  
  getAvailableHumanAgent(taskType) {
    return this.config.humanAgents.find(agent =>
      agent.status === 'available' &&
      agent.currentLoad < agent.capacity &&
      (agent.specialties.includes(taskType) || taskType === 'general')
    );
  }
  
  getAverageAIPerformance(taskType) {
    const relevantAgents = this.config.aiAgents.filter(a => a.type === taskType);
    
    if (relevantAgents.length === 0) return 5; // Default
    
    const avgSuccess = relevantAgents.reduce((sum, a) => sum + a.performance.successRate, 0) / relevantAgents.length;
    
    return avgSuccess / 10; // Normalize to 0-10
  }
  
  getAverageHumanPerformance(taskType) {
    const relevantAgents = this.config.humanAgents.filter(a => a.specialties.includes(taskType));
    
    if (relevantAgents.length === 0) return 7; // Default (humans slightly better)
    
    const avgSuccess = relevantAgents.reduce((sum, a) => sum + a.performance.successRate, 0) / relevantAgents.length;
    
    return avgSuccess / 10; // Normalize to 0-10
  }
  
  /**
   * Agregar agente humano
   */
  addHumanAgent(agentData) {
    const {
      name,
      email,
      role,
      capacity,
      specialties,
    } = agentData;
    
    const agent = {
      id: `human-agent-${this.config.humanAgents.length + 1}`,
      name,
      email,
      role,
      status: 'available',
      capacity: capacity || 50,
      currentLoad: 0,
      specialties: specialties || [],
      performance: {
        successRate: 0,
        averageTime: 0,
        qualityScore: 0,
      },
    };
    
    this.config.humanAgents.push(agent);
    
    console.log(`[Hybrid Agent] Human agent added: ${name}`);
    
    return agent;
  }
  
  /**
   * Actualizar estado de agente humano
   */
  updateHumanAgentStatus(agentId, status) {
    const agent = this.config.humanAgents.find(a => a.id === agentId);
    
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    agent.status = status;
    
    console.log(`[Hybrid Agent] ${agent.name} status updated to: ${status}`);
    
    return agent;
  }
  
  /**
   * Completar tarea
   */
  completeTask(taskId, result) {
    const { success, agentId, timeTaken, qualityScore } = result;
    
    // Actualizar estadísticas del agente
    const aiAgent = this.config.aiAgents.find(a => a.id === agentId);
    const humanAgent = this.config.humanAgents.find(a => a.id === agentId);
    
    const agent = aiAgent || humanAgent;
    const isAI = !!aiAgent;
    
    if (agent) {
      agent.currentLoad = Math.max(0, agent.currentLoad - 1);
      
      // Actualizar performance
      const perf = agent.performance;
      const totalTasks = this.config.statistics.tasksCompleted + 1;
      
      perf.successRate = ((perf.successRate * (totalTasks - 1)) + (success ? 100 : 0)) / totalTasks;
      perf.averageTime = ((perf.averageTime * (totalTasks - 1)) + timeTaken) / totalTasks;
      perf.qualityScore = ((perf.qualityScore * (totalTasks - 1)) + (qualityScore || 0)) / totalTasks;
      
      if (isAI) {
        this.config.statistics.averageAITime = ((this.config.statistics.averageAITime * (this.config.statistics.tasksAssignedToAI - 1)) + timeTaken) / this.config.statistics.tasksAssignedToAI;
        this.config.statistics.aiSuccessRate = ((this.config.statistics.aiSuccessRate * (this.config.statistics.tasksAssignedToAI - 1)) + (success ? 100 : 0)) / this.config.statistics.tasksAssignedToAI;
      } else {
        this.config.statistics.averageHumanTime = ((this.config.statistics.averageHumanTime * (this.config.statistics.tasksAssignedToHuman - 1)) + timeTaken) / this.config.statistics.tasksAssignedToHuman;
        this.config.statistics.humanSuccessRate = ((this.config.statistics.humanSuccessRate * (this.config.statistics.tasksAssignedToHuman - 1)) + (success ? 100 : 0)) / this.config.statistics.tasksAssignedToHuman;
      }
    }
    
    this.config.statistics.tasksCompleted += 1;
    
    // Procesar siguiente tarea en cola
    this.processQueue();
  }
  
  /**
   * Procesar cola de tareas
   */
  async processQueue() {
    if (this.config.taskQueue.length === 0) return;
    
    const task = this.config.taskQueue[0];
    
    // Intentar asignar
    const result = await this.assignTask(task);
    
    if (result.success) {
      // Remover de cola
      this.config.taskQueue.shift();
    }
  }
  
  /**
   * Notificar agente humano
   */
  notifyHumanAgent(agent, task) {
    // TODO: Implementar notificación (email, push, etc.)
    console.log(`[Hybrid Agent] Notifying ${agent.name} (${agent.email}) about new task: ${task.type}`);
    
    // Placeholder para integración futura
    this.emit('human-agent-notification', {
      agentId: agent.id,
      agentEmail: agent.email,
      taskType: task.type,
      taskPriority: task.priority,
      taskData: task.data,
    });
  }
  
  /**
   * CONFIGURACIÓN Y ESTADÍSTICAS
   */
  
  changeMode(newMode) {
    const validModes = ['ai-only', 'human-only', 'hybrid', 'smart-auto'];
    
    if (!validModes.includes(newMode)) {
      throw new Error(`Invalid mode: ${newMode}. Valid: ${validModes.join(', ')}`);
    }
    
    const oldMode = this.config.mode;
    this.config.mode = newMode;
    
    console.log(`[Hybrid Agent] Mode changed from ${oldMode} to ${newMode}`);
    
    return {
      oldMode,
      newMode,
    };
  }
  
  getStatistics() {
    return {
      mode: this.config.mode,
      agents: {
        ai: {
          total: this.config.aiAgents.length,
          active: this.config.aiAgents.filter(a => a.status === 'active').length,
          totalCapacity: this.config.aiAgents.reduce((sum, a) => sum + a.capacity, 0),
          currentLoad: this.config.aiAgents.reduce((sum, a) => sum + a.currentLoad, 0),
        },
        human: {
          total: this.config.humanAgents.length,
          available: this.config.humanAgents.filter(a => a.status === 'available').length,
          totalCapacity: this.config.humanAgents.reduce((sum, a) => sum + a.capacity, 0),
          currentLoad: this.config.humanAgents.reduce((sum, a) => sum + a.currentLoad, 0),
        },
      },
      tasks: {
        assignedToAI: this.config.statistics.tasksAssignedToAI,
        assignedToHuman: this.config.statistics.tasksAssignedToHuman,
        completed: this.config.statistics.tasksCompleted,
        queued: this.config.taskQueue.length,
      },
      performance: {
        ai: {
          averageTime: this.config.statistics.averageAITime,
          successRate: this.config.statistics.aiSuccessRate,
        },
        human: {
          averageTime: this.config.statistics.averageHumanTime,
          successRate: this.config.statistics.humanSuccessRate,
        },
      },
    };
  }
  
  getRecommendations() {
    const stats = this.getStatistics();
    const recommendations = [];
    
    // Check if humans are overloaded
    const humanUtilization = (stats.agents.human.currentLoad / stats.agents.human.totalCapacity) * 100;
    
    if (humanUtilization > 80) {
      recommendations.push({
        priority: 'high',
        message: `Agentes humanos con ${humanUtilization.toFixed(0)}% de carga. Considera cambiar a modo 'hybrid' o agregar más agentes.`,
        action: 'add_human_agents',
      });
    }
    
    // Check AI performance
    if (stats.performance.ai.successRate < 70) {
      recommendations.push({
        priority: 'medium',
        message: `Tasa de éxito de IA baja (${stats.performance.ai.successRate.toFixed(0)}%). Revisa configuración o asigna más tareas a humanos.`,
        action: 'adjust_ai_config',
      });
    }
    
    // Check queue
    if (stats.tasks.queued > 50) {
      recommendations.push({
        priority: 'high',
        message: `${stats.tasks.queued} tareas en cola. Aumenta capacidad de agentes.`,
        action: 'increase_capacity',
      });
    }
    
    // Suggest mode optimization
    if (this.config.mode === 'human-only' && stats.performance.ai.successRate > 85) {
      recommendations.push({
        priority: 'low',
        message: 'IA con buen rendimiento. Considera cambiar a modo "hybrid" para reducir carga humana.',
        action: 'change_to_hybrid',
      });
    }
    
    return recommendations;
  }
}

// Export singleton
module.exports = new HybridAgentSystemService();
