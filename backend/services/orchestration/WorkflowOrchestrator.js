const EventEmitter = require('events');
const { v4: uuidv4 } = require('uuid');
const AgentOrchestrator = require('../agents/AgentOrchestrator');
const AIProviderService = require('../ai/AIProviderService');

/**
 * WorkflowOrchestrator - Advanced multi-agent workflow orchestration
 * 
 * Features:
 * - Complex workflow execution with task decomposition
 * - Dynamic agent coordination and routing
 * - Parallel and sequential task execution
 * - Workflow state management and checkpointing
 * - Error handling and retry logic
 * - Performance monitoring and optimization
 */
class WorkflowOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.workflows = new Map(); // workflowId -> workflow state
    this.workflowTemplates = new Map(); // templateId -> workflow template
    this.config = {
      maxConcurrentWorkflows: 50,
      maxWorkflowDuration: 600000, // 10 minutes
      maxRetries: 3,
      retryDelay: 2000, // 2 seconds
      enableCheckpointing: true,
      checkpointInterval: 30000 // 30 seconds
    };

    this.stats = {
      totalWorkflowsExecuted: 0,
      activeWorkflows: 0,
      completedWorkflows: 0,
      failedWorkflows: 0,
      averageWorkflowDuration: 0,
      totalTasksExecuted: 0
    };

    // Initialize default workflow templates
    this.initializeDefaultTemplates();

    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupCompletedWorkflows();
    }, 60000);
  }

  /**
   * Initialize default workflow templates
   */
  initializeDefaultTemplates() {
    // Lead qualification workflow
    this.registerWorkflowTemplate({
      id: 'lead-qualification',
      name: 'Lead Qualification Workflow',
      description: 'Qualify leads using multiple AI agents',
      tasks: [
        {
          id: 'extract-info',
          type: 'agent',
          agent: 'LeadQualificationAgent',
          input: '${leadData}',
          output: 'leadAnalysis'
        },
        {
          id: 'research-company',
          type: 'agent',
          agent: 'ResearchAgent',
          input: '${leadAnalysis.company}',
          output: 'companyResearch',
          parallel: true
        },
        {
          id: 'assess-fit',
          type: 'agent',
          agent: 'DecisionAgent',
          input: 'Lead: ${leadAnalysis}, Research: ${companyResearch}',
          output: 'fitScore',
          dependsOn: ['extract-info', 'research-company']
        },
        {
          id: 'generate-summary',
          type: 'agent',
          agent: 'SummaryAgent',
          input: 'Analysis: ${leadAnalysis}, Score: ${fitScore}',
          output: 'summary',
          dependsOn: ['assess-fit']
        }
      ]
    });

    // Deal analysis workflow
    this.registerWorkflowTemplate({
      id: 'deal-analysis',
      name: 'Deal Analysis Workflow',
      description: 'Comprehensive deal analysis with insights',
      tasks: [
        {
          id: 'analyze-deal',
          type: 'agent',
          agent: 'DealAnalysisAgent',
          input: '${dealData}',
          output: 'dealAnalysis'
        },
        {
          id: 'customer-insights',
          type: 'agent',
          agent: 'CustomerInsightsAgent',
          input: '${dealData.customer}',
          output: 'customerInsights',
          parallel: true
        },
        {
          id: 'generate-recommendations',
          type: 'agent',
          agent: 'RecommendationAgent',
          input: 'Deal: ${dealAnalysis}, Customer: ${customerInsights}',
          output: 'recommendations',
          dependsOn: ['analyze-deal', 'customer-insights']
        },
        {
          id: 'risk-assessment',
          type: 'decision',
          condition: '${dealAnalysis.value} > 10000',
          trueBranch: [
            {
              id: 'detailed-research',
              type: 'agent',
              agent: 'ResearchAgent',
              input: '${dealData.customer.company}',
              output: 'detailedResearch'
            }
          ],
          falseBranch: []
        }
      ]
    });

    // Content generation workflow
    this.registerWorkflowTemplate({
      id: 'content-generation',
      name: 'AI Content Generation Workflow',
      description: 'Generate and refine content using multiple models',
      tasks: [
        {
          id: 'generate-draft',
          type: 'ai-completion',
          provider: 'openai',
          model: 'gpt-4o',
          prompt: 'Create ${contentType}: ${topic}',
          output: 'draft'
        },
        {
          id: 'improve-draft',
          type: 'ai-completion',
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          prompt: 'Improve this ${contentType}:\n\n${draft}',
          output: 'improved',
          dependsOn: ['generate-draft']
        },
        {
          id: 'summarize',
          type: 'agent',
          agent: 'SummaryAgent',
          input: '${improved}',
          output: 'summary',
          dependsOn: ['improve-draft']
        }
      ]
    });

    // Customer support workflow
    this.registerWorkflowTemplate({
      id: 'customer-support',
      name: 'Customer Support Workflow',
      description: 'Automated customer support with escalation',
      tasks: [
        {
          id: 'categorize-query',
          type: 'ai-completion',
          provider: 'openai',
          model: 'gpt-4o-mini',
          prompt: 'Categorize this support query: ${query}',
          output: 'category'
        },
        {
          id: 'check-knowledge-base',
          type: 'custom',
          function: 'searchKnowledgeBase',
          input: '${query}',
          output: 'kbResults',
          parallel: true
        },
        {
          id: 'generate-response',
          type: 'ai-completion',
          provider: 'openai',
          model: 'gpt-4o',
          prompt: 'Answer query: ${query}\nCategory: ${category}\nKB: ${kbResults}',
          output: 'response',
          dependsOn: ['categorize-query', 'check-knowledge-base']
        },
        {
          id: 'escalation-check',
          type: 'decision',
          condition: '${category} === "complex" || ${category} === "urgent"',
          trueBranch: [
            {
              id: 'escalate',
              type: 'custom',
              function: 'createEscalationTicket',
              input: '${query}, ${category}, ${response}',
              output: 'ticket'
            }
          ],
          falseBranch: []
        }
      ]
    });
  }

  /**
   * Register a workflow template
   */
  registerWorkflowTemplate(template) {
    this.validateWorkflowTemplate(template);
    this.workflowTemplates.set(template.id, template);
    console.log(`Workflow template registered: ${template.id}`);
    return template.id;
  }

  /**
   * Execute a workflow from template
   */
  async executeWorkflow(templateId, input, options = {}) {
    const template = this.workflowTemplates.get(templateId);
    
    if (!template) {
      throw new Error(`Workflow template not found: ${templateId}`);
    }

    const workflowId = uuidv4();
    const workflow = {
      id: workflowId,
      templateId,
      name: template.name,
      status: 'running',
      startTime: Date.now(),
      endTime: null,
      input,
      output: {},
      context: { ...input },
      tasks: template.tasks.map(t => ({
        ...t,
        status: 'pending',
        result: null,
        error: null,
        retries: 0,
        startTime: null,
        endTime: null
      })),
      checkpoints: [],
      errors: [],
      userId: options.userId,
      workspace: options.workspace
    };

    this.workflows.set(workflowId, workflow);
    this.stats.totalWorkflowsExecuted++;
    this.stats.activeWorkflows++;

    this.emit('workflow:started', { workflowId, templateId, input });

    try {
      // Execute workflow tasks
      await this.executeTasks(workflow);

      // Complete workflow
      workflow.status = 'completed';
      workflow.endTime = Date.now();
      this.stats.completedWorkflows++;
      this.stats.activeWorkflows--;

      const duration = workflow.endTime - workflow.startTime;
      this.updateAverageWorkflowDuration(duration);

      this.emit('workflow:completed', { 
        workflowId, 
        duration, 
        output: workflow.output 
      });

      return {
        success: true,
        workflowId,
        status: 'completed',
        output: workflow.output,
        duration
      };

    } catch (error) {
      console.error(`Workflow ${workflowId} failed:`, error);
      
      workflow.status = 'failed';
      workflow.endTime = Date.now();
      workflow.errors.push({
        message: error.message,
        timestamp: Date.now()
      });
      
      this.stats.failedWorkflows++;
      this.stats.activeWorkflows--;

      this.emit('workflow:failed', { workflowId, error: error.message });

      throw error;
    }
  }

  /**
   * Execute workflow tasks
   */
  async executeTasks(workflow) {
    const taskGraph = this.buildTaskGraph(workflow.tasks);
    const executionOrder = this.topologicalSort(taskGraph);

    for (const level of executionOrder) {
      // Execute tasks in parallel at each level
      const levelTasks = level.map(taskId => {
        const task = workflow.tasks.find(t => t.id === taskId);
        return this.executeTask(workflow, task);
      });

      await Promise.all(levelTasks);

      // Create checkpoint
      if (this.config.enableCheckpointing) {
        this.createCheckpoint(workflow);
      }
    }
  }

  /**
   * Execute a single task
   */
  async executeTask(workflow, task) {
    task.status = 'running';
    task.startTime = Date.now();

    this.emit('task:started', { 
      workflowId: workflow.id, 
      taskId: task.id 
    });

    let lastError = null;
    
    // Retry logic
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        let result;

        // Resolve input with context
        const resolvedInput = this.resolveVariables(task.input, workflow.context);

        // Execute based on task type
        switch (task.type) {
          case 'agent':
            result = await this.executeAgentTask(task.agent, resolvedInput);
            break;
          
          case 'ai-completion':
            result = await this.executeAITask(task, resolvedInput);
            break;
          
          case 'custom':
            result = await this.executeCustomTask(task.function, resolvedInput);
            break;
          
          case 'decision':
            result = await this.executeDecisionTask(workflow, task);
            break;
          
          default:
            throw new Error(`Unknown task type: ${task.type}`);
        }

        // Task successful
        task.status = 'completed';
        task.result = result;
        task.endTime = Date.now();
        
        // Update context with output
        if (task.output) {
          workflow.context[task.output] = result;
        }

        this.stats.totalTasksExecuted++;

        this.emit('task:completed', { 
          workflowId: workflow.id, 
          taskId: task.id,
          duration: task.endTime - task.startTime
        });

        return result;

      } catch (error) {
        lastError = error;
        task.retries = attempt + 1;

        console.error(`Task ${task.id} failed (attempt ${attempt + 1}):`, error);

        if (attempt < this.config.maxRetries) {
          // Wait before retry
          await this.sleep(this.config.retryDelay * (attempt + 1));
        }
      }
    }

    // All retries failed
    task.status = 'failed';
    task.error = lastError.message;
    task.endTime = Date.now();

    this.emit('task:failed', { 
      workflowId: workflow.id, 
      taskId: task.id,
      error: lastError.message
    });

    throw lastError;
  }

  /**
   * Execute agent task
   */
  async executeAgentTask(agentName, input) {
    const task = {
      type: agentName.replace('Agent', '').toLowerCase(),
      input
    };

    const result = await AgentOrchestrator.executeTask(task, {});
    return result;
  }

  /**
   * Execute AI completion task
   */
  async executeAITask(task, input) {
    const prompt = this.resolveVariables(task.prompt, { ...input });
    
    const result = await AIProviderService.generateCompletion(prompt, {
      provider: task.provider,
      model: task.model,
      temperature: task.temperature || 0.7,
      maxTokens: task.maxTokens || 1000
    });

    return result.text || result.content;
  }

  /**
   * Execute custom function task
   */
  async executeCustomTask(functionName, input) {
    // TODO: Implement custom function registry
    console.log(`Executing custom function: ${functionName}`);
    
    // Placeholder implementation
    return {
      success: true,
      functionName,
      input,
      result: `Custom function ${functionName} executed`
    };
  }

  /**
   * Execute decision/conditional task
   */
  async executeDecisionTask(workflow, task) {
    const condition = this.resolveVariables(task.condition, workflow.context);
    const conditionMet = this.evaluateCondition(condition);

    if (conditionMet && task.trueBranch) {
      // Execute true branch
      for (const branchTask of task.trueBranch) {
        await this.executeTask(workflow, branchTask);
      }
      return { branch: 'true', condition };
    } else if (!conditionMet && task.falseBranch) {
      // Execute false branch
      for (const branchTask of task.falseBranch) {
        await this.executeTask(workflow, branchTask);
      }
      return { branch: 'false', condition };
    }

    return { branch: conditionMet ? 'true' : 'false', condition };
  }

  /**
   * Build task dependency graph
   */
  buildTaskGraph(tasks) {
    const graph = new Map();

    tasks.forEach(task => {
      const dependencies = task.dependsOn || [];
      graph.set(task.id, {
        task,
        dependencies,
        parallel: task.parallel || false
      });
    });

    return graph;
  }

  /**
   * Topological sort for task execution order
   */
  topologicalSort(graph) {
    const visited = new Set();
    const levels = [];
    let currentLevel = [];

    // Find tasks with no dependencies (level 0)
    for (const [taskId, node] of graph.entries()) {
      if (node.dependencies.length === 0) {
        currentLevel.push(taskId);
      }
    }

    while (currentLevel.length > 0) {
      levels.push([...currentLevel]);
      visited.add(...currentLevel);
      
      const nextLevel = [];

      // Find tasks whose dependencies are all visited
      for (const [taskId, node] of graph.entries()) {
        if (!visited.has(taskId)) {
          const allDependenciesMet = node.dependencies.every(dep => visited.has(dep));
          if (allDependenciesMet) {
            nextLevel.push(taskId);
          }
        }
      }

      currentLevel = nextLevel;
    }

    return levels;
  }

  /**
   * Resolve variable references in strings
   */
  resolveVariables(template, context) {
    if (typeof template !== 'string') {
      return template;
    }

    return template.replace(/\$\{([^}]+)\}/g, (match, path) => {
      const value = this.getNestedValue(context, path);
      return value !== undefined ? value : match;
    });
  }

  /**
   * Get nested value from object by path
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current?.[key];
    }, obj);
  }

  /**
   * Evaluate condition string
   */
  evaluateCondition(condition) {
    try {
      // Simple evaluation - in production, use a safe expression evaluator
      // This is a placeholder implementation
      return eval(condition);
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  /**
   * Create workflow checkpoint
   */
  createCheckpoint(workflow) {
    const checkpoint = {
      timestamp: Date.now(),
      context: { ...workflow.context },
      completedTasks: workflow.tasks
        .filter(t => t.status === 'completed')
        .map(t => t.id)
    };

    workflow.checkpoints.push(checkpoint);
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(workflowId) {
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      return null;
    }

    return {
      id: workflow.id,
      name: workflow.name,
      status: workflow.status,
      startTime: workflow.startTime,
      endTime: workflow.endTime,
      duration: workflow.endTime ? 
        workflow.endTime - workflow.startTime : 
        Date.now() - workflow.startTime,
      tasks: workflow.tasks.map(t => ({
        id: t.id,
        type: t.type,
        status: t.status,
        retries: t.retries,
        duration: t.endTime ? t.endTime - t.startTime : null
      })),
      progress: this.calculateProgress(workflow),
      errors: workflow.errors
    };
  }

  /**
   * Calculate workflow progress
   */
  calculateProgress(workflow) {
    const total = workflow.tasks.length;
    const completed = workflow.tasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / total) * 100);
  }

  /**
   * Cancel workflow
   */
  cancelWorkflow(workflowId) {
    const workflow = this.workflows.get(workflowId);
    
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    if (workflow.status === 'completed' || workflow.status === 'failed') {
      throw new Error('Cannot cancel completed or failed workflow');
    }

    workflow.status = 'cancelled';
    workflow.endTime = Date.now();
    this.stats.activeWorkflows--;

    this.emit('workflow:cancelled', { workflowId });

    return true;
  }

  /**
   * List available workflow templates
   */
  listTemplates() {
    return Array.from(this.workflowTemplates.values()).map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      taskCount: t.tasks.length
    }));
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeWorkflows: this.stats.activeWorkflows,
      templateCount: this.workflowTemplates.size
    };
  }

  // ===== HELPER METHODS =====

  validateWorkflowTemplate(template) {
    if (!template.id || !template.name || !template.tasks) {
      throw new Error('Invalid workflow template: missing required fields');
    }

    if (!Array.isArray(template.tasks) || template.tasks.length === 0) {
      throw new Error('Workflow must have at least one task');
    }

    // Validate task dependencies
    const taskIds = new Set(template.tasks.map(t => t.id));
    
    for (const task of template.tasks) {
      if (task.dependsOn) {
        for (const depId of task.dependsOn) {
          if (!taskIds.has(depId)) {
            throw new Error(`Task ${task.id} depends on non-existent task: ${depId}`);
          }
        }
      }
    }
  }

  updateAverageWorkflowDuration(duration) {
    const totalCompleted = this.stats.completedWorkflows;
    const currentAverage = this.stats.averageWorkflowDuration;
    
    this.stats.averageWorkflowDuration = 
      (currentAverage * (totalCompleted - 1) + duration) / totalCompleted;
  }

  cleanupCompletedWorkflows() {
    const now = Date.now();
    const toDelete = [];

    for (const [workflowId, workflow] of this.workflows.entries()) {
      if (workflow.status === 'completed' || workflow.status === 'failed') {
        const age = now - workflow.endTime;
        if (age > 3600000) { // 1 hour
          toDelete.push(workflowId);
        }
      }
    }

    toDelete.forEach(id => this.workflows.delete(id));
    
    if (toDelete.length > 0) {
      console.log(`Cleaned up ${toDelete.length} completed workflows`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown orchestrator
   */
  shutdown() {
    console.log('Shutting down WorkflowOrchestrator...');
    
    // Clear interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Cancel active workflows
    for (const [workflowId, workflow] of this.workflows.entries()) {
      if (workflow.status === 'running') {
        this.cancelWorkflow(workflowId);
      }
    }

    console.log('WorkflowOrchestrator shutdown complete');
  }
}

module.exports = new WorkflowOrchestrator();
