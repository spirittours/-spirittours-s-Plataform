const express = require('express');
const router = express.Router();
const AgentOrchestrator = require('../../services/agents/AgentOrchestrator');
const { authenticateToken } = require('../../middleware/auth');
const logger = require('../../config/logger');
const Lead = require('../../models/Lead');
const Deal = require('../../models/Deal');
const Contact = require('../../models/Contact');

/**
 * Multi-Agent System Routes
 * LangChain-inspired agent orchestration for CRM automation
 */

// Execute task
router.post('/:workspaceId/execute', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { type, data, workflow } = req.body;
    
    const result = await AgentOrchestrator.executeTask(
      { type, data, workflow },
      { workspace: workspaceId, user: req.user }
    );
    
    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Error executing agent task:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Qualify lead
router.post('/:workspaceId/qualify-lead/:leadId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, leadId } = req.params;
    
    const lead = await Lead.findOne({ _id: leadId, workspace: workspaceId });
    if (!lead) {
      return res.status(404).json({
        success: false,
        error: 'Lead not found',
      });
    }
    
    const result = await AgentOrchestrator.executeTask(
      {
        type: 'qualify_lead',
        data: lead.toObject(),
      },
      { workspace: workspaceId }
    );
    
    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Error qualifying lead:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Analyze deal
router.post('/:workspaceId/analyze-deal/:dealId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, dealId } = req.params;
    
    const deal = await Deal.findOne({ _id: dealId, workspace: workspaceId });
    if (!deal) {
      return res.status(404).json({
        success: false,
        error: 'Deal not found',
      });
    }
    
    const result = await AgentOrchestrator.executeTask(
      {
        type: 'analyze_deal',
        data: deal.toObject(),
      },
      { workspace: workspaceId }
    );
    
    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Error analyzing deal:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Customer insights
router.post('/:workspaceId/customer-insights/:contactId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, contactId } = req.params;
    
    const contact = await Contact.findOne({ _id: contactId, workspace: workspaceId });
    if (!contact) {
      return res.status(404).json({
        success: false,
        error: 'Contact not found',
      });
    }
    
    const result = await AgentOrchestrator.executeTask(
      {
        type: 'customer_insights',
        data: contact.toObject(),
      },
      { workspace: workspaceId }
    );
    
    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Error generating customer insights:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get recommendations
router.post('/:workspaceId/recommend', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { data, context } = req.body;
    
    const result = await AgentOrchestrator.executeTask(
      {
        type: 'recommend_actions',
        data,
      },
      { workspace: workspaceId, ...context }
    );
    
    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Research
router.post('/:workspaceId/research', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { query, context } = req.body;
    
    const result = await AgentOrchestrator.executeTask(
      {
        type: 'research',
        data: query,
      },
      { workspace: workspaceId, ...context }
    );
    
    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Error performing research:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Summarize
router.post('/:workspaceId/summarize', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { data, type } = req.body;
    
    const result = await AgentOrchestrator.executeTask(
      {
        type: 'summarize',
        data,
      },
      { workspace: workspaceId, type }
    );
    
    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Error summarizing:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Make decision
router.post('/:workspaceId/decide', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { question, options, context } = req.body;
    
    const result = await AgentOrchestrator.executeTask(
      {
        type: 'make_decision',
        data: { question, options },
      },
      { workspace: workspaceId, ...context }
    );
    
    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Error making decision:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Multi-agent workflow
router.post('/:workspaceId/workflow', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { workflow, data, context } = req.body;
    
    const result = await AgentOrchestrator.executeTask(
      {
        type: 'multi_agent',
        workflow,
        data,
      },
      { workspace: workspaceId, ...context }
    );
    
    res.json({
      success: true,
      result,
    });
  } catch (error) {
    logger.error('Error executing workflow:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get task history
router.get('/:workspaceId/history', authenticateToken, async (req, res) => {
  try {
    const { limit } = req.query;
    
    const history = AgentOrchestrator.getHistory(parseInt(limit) || 10);
    
    res.json({
      success: true,
      history,
    });
  } catch (error) {
    logger.error('Error getting history:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get available agents
router.get('/agents/list', authenticateToken, async (req, res) => {
  try {
    const agents = [
      {
        name: 'leadQualification',
        description: 'Analyzes and scores leads',
        capabilities: ['scoring', 'analysis', 'recommendations'],
      },
      {
        name: 'dealAnalysis',
        description: 'Predicts deal outcomes',
        capabilities: ['prediction', 'risk_assessment', 'strategy'],
      },
      {
        name: 'customerInsights',
        description: 'Generates customer intelligence',
        capabilities: ['profiling', 'segmentation', 'behavior_analysis'],
      },
      {
        name: 'recommendation',
        description: 'Suggests next best actions',
        capabilities: ['action_planning', 'prioritization', 'resource_allocation'],
      },
      {
        name: 'research',
        description: 'Gathers external information',
        capabilities: ['research', 'competitive_analysis', 'market_intelligence'],
      },
      {
        name: 'summary',
        description: 'Creates concise summaries',
        capabilities: ['summarization', 'key_points', 'action_items'],
      },
      {
        name: 'decision',
        description: 'Makes strategic decisions',
        capabilities: ['decision_making', 'option_evaluation', 'risk_assessment'],
      },
    ];
    
    res.json({
      success: true,
      agents,
    });
  } catch (error) {
    logger.error('Error getting agents:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
