const { OpenAI } = require('openai');
const logger = require('../../config/logger');
const Contact = require('../../models/Contact');
const Lead = require('../../models/Lead');
const Deal = require('../../models/Deal');
const Activity = require('../../models/Activity');

/**
 * AgentOrchestrator
 * Multi-agent system for intelligent CRM automation
 * 
 * Inspired by LangChain's agent framework but customized for CRM
 * 
 * Agent Types:
 * - LeadQualificationAgent: Analyzes and scores leads
 * - DealAnalysisAgent: Predicts deal outcomes
 * - CustomerInsightsAgent: Generates customer intelligence
 * - RecommendationAgent: Suggests next best actions
 * - ResearchAgent: Gathers external information
 * - SummaryAgent: Creates concise summaries
 * - DecisionAgent: Makes strategic decisions
 */
class AgentOrchestrator {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.agents = {
      leadQualification: new LeadQualificationAgent(this.openai),
      dealAnalysis: new DealAnalysisAgent(this.openai),
      customerInsights: new CustomerInsightsAgent(this.openai),
      recommendation: new RecommendationAgent(this.openai),
      research: new ResearchAgent(this.openai),
      summary: new SummaryAgent(this.openai),
      decision: new DecisionAgent(this.openai),
    };
    
    this.taskHistory = [];
  }
  
  /**
   * Execute a task using the agent system
   */
  async executeTask(task, context = {}) {
    try {
      logger.info(`Executing task: ${task.type}`);
      
      const startTime = Date.now();
      
      // Route to appropriate agent(s)
      const result = await this.routeTask(task, context);
      
      const executionTime = Date.now() - startTime;
      
      // Record in history
      this.taskHistory.push({
        task,
        context,
        result,
        executionTime,
        timestamp: new Date(),
      });
      
      logger.info(`Task completed in ${executionTime}ms`);
      
      return result;
    } catch (error) {
      logger.error('Error executing task:', error);
      throw error;
    }
  }
  
  /**
   * Route task to appropriate agent(s)
   */
  async routeTask(task, context) {
    switch (task.type) {
      case 'qualify_lead':
        return await this.agents.leadQualification.execute(task.data, context);
      
      case 'analyze_deal':
        return await this.agents.dealAnalysis.execute(task.data, context);
      
      case 'customer_insights':
        return await this.agents.customerInsights.execute(task.data, context);
      
      case 'recommend_actions':
        return await this.agents.recommendation.execute(task.data, context);
      
      case 'research':
        return await this.agents.research.execute(task.data, context);
      
      case 'summarize':
        return await this.agents.summary.execute(task.data, context);
      
      case 'make_decision':
        return await this.agents.decision.execute(task.data, context);
      
      case 'multi_agent':
        return await this.executeMultiAgentTask(task, context);
      
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }
  
  /**
   * Execute complex multi-agent task
   */
  async executeMultiAgentTask(task, context) {
    const { workflow, data } = task;
    const results = {};
    
    for (const step of workflow) {
      const agent = this.agents[step.agent];
      if (!agent) {
        throw new Error(`Unknown agent: ${step.agent}`);
      }
      
      const stepContext = {
        ...context,
        previousResults: results,
      };
      
      results[step.name] = await agent.execute(
        step.input || data,
        stepContext
      );
    }
    
    return results;
  }
  
  /**
   * Get agent by name
   */
  getAgent(name) {
    return this.agents[name];
  }
  
  /**
   * Get task history
   */
  getHistory(limit = 10) {
    return this.taskHistory.slice(-limit);
  }
}

/**
 * Base Agent Class
 */
class BaseAgent {
  constructor(openai, name, systemPrompt) {
    this.openai = openai;
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.model = 'gpt-4o-mini';
  }
  
  async execute(data, context = {}) {
    try {
      const prompt = this.buildPrompt(data, context);
      
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      });
      
      const response = completion.choices[0].message.content;
      return this.parseResponse(response);
    } catch (error) {
      logger.error(`Error in ${this.name}:`, error);
      throw error;
    }
  }
  
  buildPrompt(data, context) {
    return JSON.stringify(data);
  }
  
  parseResponse(response) {
    try {
      return JSON.parse(response);
    } catch {
      return { response };
    }
  }
}

/**
 * Lead Qualification Agent
 */
class LeadQualificationAgent extends BaseAgent {
  constructor(openai) {
    super(
      openai,
      'LeadQualificationAgent',
      `You are an expert lead qualification specialist. Analyze leads and provide:
1. Quality score (0-100)
2. Key strengths and weaknesses
3. Recommended next actions
4. Urgency level
5. Potential deal size estimate

Respond in JSON format.`
    );
  }
  
  buildPrompt(lead, context) {
    return `Analyze this lead:

Name: ${lead.name}
Email: ${lead.email}
Company: ${lead.company || 'N/A'}
Source: ${lead.source}
Current Score: ${lead.score || 0}
Stage: ${lead.stage}
Notes: ${lead.notes || 'None'}

${context.workspace ? `Workspace: ${context.workspace}` : ''}

Provide a comprehensive qualification assessment.`;
  }
}

/**
 * Deal Analysis Agent
 */
class DealAnalysisAgent extends BaseAgent {
  constructor(openai) {
    super(
      openai,
      'DealAnalysisAgent',
      `You are an expert sales analyst. Analyze deals and provide:
1. Win probability (0-100%)
2. Risk factors
3. Success factors
4. Recommended strategies
5. Timeline assessment

Respond in JSON format.`
    );
  }
  
  buildPrompt(deal, context) {
    return `Analyze this deal:

Name: ${deal.name}
Value: $${deal.value}
Stage: ${deal.stage}
Probability: ${deal.probability || 'N/A'}%
Expected Close: ${deal.expectedCloseDate || 'Not set'}
Description: ${deal.description || 'None'}

${context.previousResults ? `Previous Analysis: ${JSON.stringify(context.previousResults)}` : ''}

Provide a comprehensive deal analysis.`;
  }
}

/**
 * Customer Insights Agent
 */
class CustomerInsightsAgent extends BaseAgent {
  constructor(openai) {
    super(
      openai,
      'CustomerInsightsAgent',
      `You are a customer intelligence expert. Generate insights including:
1. Customer profile summary
2. Engagement patterns
3. Preferences and needs
4. Growth opportunities
5. Retention risks

Respond in JSON format.`
    );
  }
  
  buildPrompt(customer, context) {
    return `Generate insights for this customer:

${JSON.stringify(customer, null, 2)}

${context.activities ? `Recent Activities: ${context.activities.length}` : ''}
${context.deals ? `Deals: ${context.deals.length}` : ''}

Provide comprehensive customer insights.`;
  }
}

/**
 * Recommendation Agent
 */
class RecommendationAgent extends BaseAgent {
  constructor(openai) {
    super(
      openai,
      'RecommendationAgent',
      `You are an AI sales assistant. Recommend next best actions including:
1. Immediate actions (within 24 hours)
2. Short-term actions (within 1 week)
3. Long-term strategies
4. Resource requirements
5. Expected outcomes

Respond in JSON format with prioritized recommendations.`
    );
  }
  
  buildPrompt(data, context) {
    return `Based on this information, recommend next best actions:

${JSON.stringify(data, null, 2)}

Context:
${JSON.stringify(context, null, 2)}

Provide actionable recommendations.`;
  }
}

/**
 * Research Agent
 */
class ResearchAgent extends BaseAgent {
  constructor(openai) {
    super(
      openai,
      'ResearchAgent',
      `You are a business research specialist. Gather and synthesize information about:
1. Company background
2. Industry trends
3. Competitive landscape
4. Decision makers
5. Potential pain points

Respond in JSON format with structured research findings.`
    );
  }
  
  buildPrompt(query, context) {
    return `Research the following:

Query: ${query}

${context.company ? `Company: ${context.company}` : ''}
${context.industry ? `Industry: ${context.industry}` : ''}

Provide comprehensive research findings. Note: Use your knowledge base and reasoning.`;
  }
}

/**
 * Summary Agent
 */
class SummaryAgent extends BaseAgent {
  constructor(openai) {
    super(
      openai,
      'SummaryAgent',
      `You are an expert at creating concise, actionable summaries. Provide:
1. Key points (3-5 bullets)
2. Critical insights
3. Action items
4. Risk factors
5. Opportunities

Respond in JSON format.`
    );
  }
  
  buildPrompt(data, context) {
    return `Create a summary of the following information:

${JSON.stringify(data, null, 2)}

${context.type ? `Type: ${context.type}` : ''}

Provide a concise, actionable summary.`;
  }
}

/**
 * Decision Agent
 */
class DecisionAgent extends BaseAgent {
  constructor(openai) {
    super(
      openai,
      'DecisionAgent',
      `You are a strategic decision-making AI. Evaluate options and provide:
1. Recommended decision
2. Confidence level (0-100%)
3. Supporting rationale
4. Alternative options
5. Risk assessment

Respond in JSON format.`
    );
  }
  
  buildPrompt(decision, context) {
    return `Make a decision on the following:

Question: ${decision.question}
Options: ${JSON.stringify(decision.options)}

Context:
${JSON.stringify(context, null, 2)}

Provide a well-reasoned decision with confidence level.`;
  }
}

module.exports = new AgentOrchestrator();
