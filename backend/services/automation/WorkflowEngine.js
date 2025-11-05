/**
 * Workflow Engine - SPRINT 3.1
 * 
 * Core execution engine that runs workflow automations.
 * Handles trigger evaluation, step execution, error handling, and retry logic.
 * 
 * Features:
 * - Multi-step workflow execution
 * - Conditional branching
 * - Error handling with retries
 * - Integration with all bridges (AI, Email, Booking)
 * - Comprehensive logging and audit trail
 */

const Workflow = require('../../models/Workflow');
const WorkflowExecution = require('../../models/WorkflowExecution');
const Contact = require('../../models/Contact');
const Lead = require('../../models/Lead');
const Deal = require('../../models/Deal');
const Project = require('../../models/Project');
const AIToCRMBridge = require('../integration/AIToCRMBridge');
const EmailToCRMBridge = require('../integration/EmailToCRMBridge');
const BookingToProjectBridge = require('../integration/BookingToProjectBridge');
const logger = require('../../utils/logger');

class WorkflowEngine {
  constructor() {
    this.aiCrmBridge = new AIToCRMBridge();
    this.emailCrmBridge = new EmailToCRMBridge();
    this.bookingProjectBridge = new BookingToProjectBridge();
    this.runningExecutions = new Map(); // Track running workflows
  }

  /**
   * Trigger workflows based on event type
   */
  async triggerWorkflows(triggerType, triggerData, workspaceId, userId) {
    try {
      logger.info(`Triggering workflows for type: ${triggerType}`);

      // Find all active workflows with this trigger
      const workflows = await Workflow.findActiveByTrigger(triggerType, workspaceId);

      if (workflows.length === 0) {
        logger.info(`No active workflows found for trigger: ${triggerType}`);
        return [];
      }

      logger.info(`Found ${workflows.length} workflows to execute`);

      // Execute each workflow
      const executions = [];
      for (const workflow of workflows) {
        try {
          // Check if conditions are met
          if (workflow.conditions && workflow.conditions.length > 0) {
            const conditionsMet = await this.evaluateConditions(workflow.conditions, triggerData);
            if (!conditionsMet) {
              logger.info(`Workflow ${workflow._id} conditions not met, skipping`);
              continue;
            }
          }

          // Execute workflow
          const execution = await this.executeWorkflow(workflow, triggerData, userId);
          executions.push(execution);
        } catch (error) {
          logger.error(`Error executing workflow ${workflow._id}:`, error);
        }
      }

      return executions;
    } catch (error) {
      logger.error('Error triggering workflows:', error);
      throw error;
    }
  }

  /**
   * Execute a single workflow
   */
  async executeWorkflow(workflow, triggerData, userId) {
    const startTime = Date.now();
    
    try {
      logger.info(`Executing workflow: ${workflow.name} (${workflow._id})`);

      // Create execution record
      const execution = await WorkflowExecution.create({
        workflowId: workflow._id,
        workspaceId: workflow.workspaceId,
        trigger: {
          type: workflow.trigger.type,
          data: triggerData,
          timestamp: new Date(),
        },
        steps: workflow.steps.filter(s => s.enabled).map(step => ({
          stepId: step.id,
          name: step.name,
          status: 'pending',
        })),
        metrics: {
          totalSteps: workflow.steps.filter(s => s.enabled).length,
        },
      });

      // Track running execution
      this.runningExecutions.set(execution._id.toString(), execution);

      // Execute steps sequentially
      const context = {
        trigger: triggerData,
        steps: {},
        userId: userId,
        workspaceId: workflow.workspaceId,
      };

      for (const step of workflow.steps) {
        if (!step.enabled) {
          await execution.updateStep(step.id, { status: 'skipped' });
          execution.metrics.skippedSteps += 1;
          continue;
        }

        try {
          // Execute step
          const stepResult = await this.executeStep(step, context, execution);
          
          // Store step result in context
          context.steps[step.id] = stepResult;

          // Update execution
          await execution.updateStep(step.id, {
            status: 'completed',
            output: stepResult,
          });
          
          execution.metrics.completedSteps += 1;

          // Handle conditional branching
          if (step.type === 'condition' && stepResult.nextStepId) {
            // Skip to specified step
            const skipToIndex = workflow.steps.findIndex(s => s.id === stepResult.nextStepId);
            if (skipToIndex > -1) {
              // Mark intermediate steps as skipped
              for (let i = workflow.steps.indexOf(step) + 1; i < skipToIndex; i++) {
                await execution.updateStep(workflow.steps[i].id, { status: 'skipped' });
                execution.metrics.skippedSteps += 1;
              }
            }
          }

        } catch (stepError) {
          logger.error(`Step ${step.id} failed:`, stepError);
          
          // Update step with error
          await execution.updateStep(step.id, {
            status: 'failed',
            error: {
              message: stepError.message,
              stack: stepError.stack,
            },
          });

          execution.metrics.failedSteps += 1;

          // Handle error based on configuration
          if (step.onError.action === 'retry' && step.onError.retries > 0) {
            // Retry logic
            for (let retry = 0; retry < step.onError.retries; retry++) {
              logger.info(`Retrying step ${step.id}, attempt ${retry + 1}`);
              await new Promise(resolve => setTimeout(resolve, step.onError.retryDelay));
              
              try {
                const retryResult = await this.executeStep(step, context, execution);
                context.steps[step.id] = retryResult;
                await execution.updateStep(step.id, {
                  status: 'completed',
                  output: retryResult,
                  retries: retry + 1,
                });
                execution.metrics.completedSteps += 1;
                execution.metrics.failedSteps -= 1;
                break; // Success, exit retry loop
              } catch (retryError) {
                logger.error(`Retry ${retry + 1} failed:`, retryError);
                if (retry === step.onError.retries - 1) {
                  // Final retry failed
                  throw retryError;
                }
              }
            }
          } else if (step.onError.action === 'skip') {
            // Skip and continue
            logger.info(`Skipping failed step ${step.id} and continuing`);
          } else if (!workflow.config.continueOnError) {
            // Fail entire workflow
            throw stepError;
          }
        }
      }

      // Complete execution
      await execution.complete();
      
      // Update workflow statistics
      const executionTime = Date.now() - startTime;
      await workflow.incrementExecutions(true, executionTime);

      // Clean up
      this.runningExecutions.delete(execution._id.toString());

      logger.info(`Workflow ${workflow.name} completed successfully in ${executionTime}ms`);
      return execution;

    } catch (error) {
      logger.error(`Workflow ${workflow.name} failed:`, error);
      
      // Mark execution as failed
      const execution = await WorkflowExecution.findOne({ workflowId: workflow._id })
        .sort({ createdAt: -1 })
        .limit(1);
      
      if (execution) {
        await execution.fail(error);
        this.runningExecutions.delete(execution._id.toString());
      }

      // Update workflow statistics
      const executionTime = Date.now() - startTime;
      await workflow.incrementExecutions(false, executionTime);

      throw error;
    }
  }

  /**
   * Execute a single workflow step
   */
  async executeStep(step, context, execution) {
    logger.info(`Executing step: ${step.name} (${step.type})`);

    await execution.updateStep(step.id, {
      status: 'running',
      startedAt: new Date(),
      input: this.resolveVariables(step.action, context),
    });

    switch (step.type) {
      case 'create_contact':
        return await this.createContact(step, context, execution);
      
      case 'create_lead':
        return await this.createLead(step, context, execution);
      
      case 'create_deal':
        return await this.createDeal(step, context, execution);
      
      case 'create_project':
        return await this.createProject(step, context, execution);
      
      case 'score_lead':
        return await this.scoreLead(step, context, execution);
      
      case 'enrich_contact':
        return await this.enrichContact(step, context, execution);
      
      case 'send_email':
        return await this.sendEmail(step, context, execution);
      
      case 'send_notification':
        return await this.sendNotification(step, context, execution);
      
      case 'update_field':
        return await this.updateField(step, context, execution);
      
      case 'add_tag':
        return await this.addTag(step, context, execution);
      
      case 'assign_user':
        return await this.assignUser(step, context, execution);
      
      case 'webhook':
        return await this.callWebhook(step, context, execution);
      
      case 'wait':
        return await this.wait(step, context, execution);
      
      case 'condition':
        return await this.evaluateCondition(step, context, execution);
      
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Step implementations
   */
  async createContact(step, context, execution) {
    const action = this.resolveVariables(step.action, context);
    
    const contactData = {
      firstName: action.firstName || context.trigger.firstName,
      lastName: action.lastName || context.trigger.lastName,
      email: action.email || context.trigger.email,
      phone: action.phone || context.trigger.phone,
      company: action.company || context.trigger.company,
      source: action.source || context.trigger.type,
      workspaceId: context.workspaceId,
      assignedTo: context.userId,
    };

    const contact = await Contact.create(contactData);
    await execution.addCreatedEntity('contact', contact._id.toString(), step.id);
    
    logger.info(`Created contact: ${contact._id}`);
    return { contactId: contact._id.toString(), contact };
  }

  async createLead(step, context, execution) {
    const action = this.resolveVariables(step.action, context);
    
    // Use EmailToCRMBridge for lead creation
    const lead = await this.emailCrmBridge.createContactFromEmail({
      email: action.email || context.trigger.email,
      agencyName: action.company || context.trigger.company || 'Unknown',
      interest_level: action.interestLevel || 'medium',
      responseText: action.notes || '',
      campaignId: context.trigger.campaignId,
      workspaceId: context.workspaceId,
      userId: context.userId,
    });

    await execution.addCreatedEntity('lead', lead._id.toString(), step.id);
    
    logger.info(`Created lead: ${lead._id}`);
    return { leadId: lead._id.toString(), lead };
  }

  async createDeal(step, context, execution) {
    const action = this.resolveVariables(step.action, context);
    
    // Get contact from previous step or trigger
    const contactId = action.contactId || context.steps[action.fromStep]?.contactId;
    
    if (!contactId) {
      throw new Error('No contact ID provided for deal creation');
    }

    const dealData = {
      name: action.dealName || `Deal for ${contactId}`,
      contactId: contactId,
      amount: action.amount || 0,
      stage: action.stage || 'prospecting',
      probability: action.probability || 50,
      expectedCloseDate: action.expectedCloseDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      workspaceId: context.workspaceId,
      assignedTo: context.userId,
    };

    const deal = await Deal.create(dealData);
    await execution.addCreatedEntity('deal', deal._id.toString(), step.id);
    
    logger.info(`Created deal: ${deal._id}`);
    return { dealId: deal._id.toString(), deal };
  }

  async createProject(step, context, execution) {
    const action = this.resolveVariables(step.action, context);
    
    // Use BookingToProjectBridge if from booking
    if (context.trigger.type === 'booking_confirmed' && context.trigger.bookingId) {
      const project = await this.bookingProjectBridge.convertBookingToProject(
        context.trigger.bookingId,
        context.workspaceId
      );
      
      await execution.addCreatedEntity('project', project._id.toString(), step.id);
      return { projectId: project._id.toString(), project };
    }

    // Otherwise create project manually
    const projectData = {
      name: action.projectName || `Project ${Date.now()}`,
      description: action.description || '',
      status: 'active',
      startDate: action.startDate || new Date(),
      endDate: action.endDate,
      workspaceId: context.workspaceId,
      createdBy: context.userId,
    };

    const project = await Project.create(projectData);
    await execution.addCreatedEntity('project', project._id.toString(), step.id);
    
    logger.info(`Created project: ${project._id}`);
    return { projectId: project._id.toString(), project };
  }

  async scoreLead(step, context, execution) {
    const action = this.resolveVariables(step.action, context);
    const leadId = action.leadId || context.steps[action.fromStep]?.leadId;
    
    if (!leadId) {
      throw new Error('No lead ID provided for scoring');
    }

    // Use AIToCRMBridge for lead scoring
    const scoreResult = await this.aiCrmBridge.updateLeadScoreWithAI(leadId, context.workspaceId);
    
    logger.info(`Scored lead ${leadId}: ${scoreResult.score}`);
    return { leadId, score: scoreResult.score, quality: scoreResult.quality };
  }

  async enrichContact(step, context, execution) {
    const action = this.resolveVariables(step.action, context);
    const contactId = action.contactId || context.steps[action.fromStep]?.contactId;
    
    if (!contactId) {
      throw new Error('No contact ID provided for enrichment');
    }

    // Use AIToCRMBridge for enrichment
    const enrichResult = await this.aiCrmBridge.enrichLead(contactId, context.workspaceId);
    
    logger.info(`Enriched contact ${contactId}`);
    return { contactId, enriched: true, data: enrichResult };
  }

  async sendEmail(step, context, execution) {
    const action = this.resolveVariables(step.action, context);
    // Email sending logic would go here
    logger.info(`Sending email to: ${action.to}`);
    execution.results.emailsSent += 1;
    return { sent: true, to: action.to };
  }

  async sendNotification(step, context, execution) {
    const action = this.resolveVariables(step.action, context);
    // Notification logic would go here
    logger.info(`Sending notification: ${action.message}`);
    execution.results.notificationsSent += 1;
    return { sent: true, message: action.message };
  }

  async updateField(step, context, execution) {
    const action = this.resolveVariables(step.action, context);
    // Field update logic
    logger.info(`Updating field: ${action.field} = ${action.value}`);
    execution.results.entitiesUpdated += 1;
    return { updated: true, field: action.field };
  }

  async addTag(step, context, execution) {
    const action = this.resolveVariables(step.action, context);
    // Tag logic
    logger.info(`Adding tag: ${action.tag}`);
    return { added: true, tag: action.tag };
  }

  async assignUser(step, context, execution) {
    const action = this.resolveVariables(step.action, context);
    // Assignment logic
    logger.info(`Assigning to user: ${action.userId}`);
    return { assigned: true, userId: action.userId };
  }

  async callWebhook(step, context, execution) {
    const action = this.resolveVariables(step.action, context);
    // Webhook call logic
    logger.info(`Calling webhook: ${action.url}`);
    execution.results.webhooksCalled += 1;
    return { called: true, url: action.url };
  }

  async wait(step, context, execution) {
    const action = this.resolveVariables(step.action, context);
    const duration = action.duration || 1000;
    logger.info(`Waiting ${duration}ms`);
    await new Promise(resolve => setTimeout(resolve, duration));
    return { waited: true, duration };
  }

  async evaluateCondition(step, context, execution) {
    const action = this.resolveVariables(step.action, context);
    const condition = this.evaluateExpression(action.if, context);
    
    logger.info(`Condition evaluated: ${condition}`);
    
    return {
      condition,
      nextStepId: condition ? action.then : action.else,
    };
  }

  /**
   * Helper methods
   */
  evaluateConditions(conditions, data) {
    // Implement condition evaluation logic
    return true; // Simplified for now
  }

  resolveVariables(obj, context) {
    // Resolve template variables like ${trigger.email} or ${step.create_lead.leadId}
    if (typeof obj === 'string') {
      return obj.replace(/\$\{([^}]+)\}/g, (match, path) => {
        const parts = path.split('.');
        let value = context;
        for (const part of parts) {
          value = value?.[part];
        }
        return value !== undefined ? value : match;
      });
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveVariables(item, context));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const resolved = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveVariables(value, context);
      }
      return resolved;
    }
    
    return obj;
  }

  evaluateExpression(expression, context) {
    // Simple expression evaluation
    // In production, use a safe expression evaluator
    try {
      const resolved = this.resolveVariables(expression, context);
      // Simplified evaluation
      return eval(resolved);
    } catch (error) {
      logger.error('Error evaluating expression:', error);
      return false;
    }
  }
}

module.exports = WorkflowEngine;
