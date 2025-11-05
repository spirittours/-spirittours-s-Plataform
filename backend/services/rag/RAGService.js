const { OpenAI } = require('openai');
const VectorDatabaseService = require('../vector/VectorDatabaseService');
const RedisCacheService = require('../cache/RedisCacheService');
const logger = require('../../config/logger');

/**
 * RAGService
 * Retrieval-Augmented Generation for context-aware AI responses
 * 
 * Features:
 * - Semantic document retrieval
 * - Context-aware generation
 * - Multi-source knowledge integration
 * - Citation tracking
 * - Answer grounding
 * - Conversational context management
 * - Hybrid retrieval (vector + keyword)
 */
class RAGService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.vectorDB = VectorDatabaseService;
    this.cache = RedisCacheService;
    
    this.config = {
      retrievalModel: 'text-embedding-3-small',
      generationModel: 'gpt-4o-mini',
      topK: 5, // Number of documents to retrieve
      minSimilarity: 0.7,
      maxContextLength: 8000, // tokens
      temperature: 0.3,
      enableCaching: true,
      cacheeTTL: 3600, // 1 hour
    };
    
    this.stats = {
      totalQueries: 0,
      cacheHits: 0,
      retrievalCount: 0,
      generationCount: 0,
    };
  }
  
  /**
   * Query with RAG (Retrieval-Augmented Generation)
   */
  async query(question, options = {}) {
    try {
      const {
        workspace,
        entityTypes = ['contact', 'lead', 'deal', 'activity', 'document'],
        topK = this.config.topK,
        minSimilarity = this.config.minSimilarity,
        model = this.config.generationModel,
        temperature = this.config.temperature,
        conversationHistory = [],
        systemPrompt = null,
      } = options;
      
      this.stats.totalQueries++;
      
      // Check cache
      if (this.config.enableCaching) {
        const cacheKey = this.cache.generateKey(workspace, 'rag', this.hashQuery(question));
        const cached = await this.cache.get(cacheKey);
        
        if (cached) {
          this.stats.cacheHits++;
          logger.info('RAG query served from cache');
          return {
            ...cached,
            fromCache: true,
          };
        }
      }
      
      // Step 1: Retrieve relevant documents
      logger.info(`Retrieving documents for query: ${question.substring(0, 50)}...`);
      
      const retrievedDocs = await this.retrieve(question, {
        workspace,
        entityTypes,
        topK,
        minSimilarity,
      });
      
      this.stats.retrievalCount++;
      
      if (retrievedDocs.length === 0) {
        logger.warn('No relevant documents found');
        return {
          answer: 'I could not find relevant information to answer your question.',
          confidence: 0,
          sources: [],
          retrievedDocuments: [],
        };
      }
      
      // Step 2: Build context from retrieved documents
      const context = this.buildContext(retrievedDocs);
      
      // Step 3: Generate answer with context
      logger.info(`Generating answer with ${retrievedDocs.length} retrieved documents`);
      
      const answer = await this.generate(question, context, {
        model,
        temperature,
        conversationHistory,
        systemPrompt,
      });
      
      this.stats.generationCount++;
      
      // Step 4: Extract citations
      const citations = this.extractCitations(retrievedDocs, answer);
      
      const result = {
        answer: answer.text,
        confidence: this.calculateConfidence(retrievedDocs, answer),
        sources: citations,
        retrievedDocuments: retrievedDocs.map(doc => ({
          id: doc.id,
          type: doc.metadata.entityType,
          score: doc.score,
          snippet: doc.metadata.textContent,
        })),
        tokensUsed: answer.usage,
        fromCache: false,
      };
      
      // Cache result
      if (this.config.enableCaching) {
        const cacheKey = this.cache.generateKey(workspace, 'rag', this.hashQuery(question));
        await this.cache.set(cacheKey, result, { ttl: this.config.cacheTTL });
      }
      
      return result;
    } catch (error) {
      logger.error('Error in RAG query:', error);
      throw error;
    }
  }
  
  /**
   * Retrieve relevant documents
   */
  async retrieve(query, options = {}) {
    try {
      const {
        workspace,
        entityTypes,
        topK,
        minSimilarity,
        useHybrid = true,
      } = options;
      
      if (useHybrid) {
        // Hybrid retrieval: vector + keyword
        const result = await this.vectorDB.hybridSearch(query, {
          workspace,
          entityTypes,
          topK,
          vectorWeight: 0.7,
        });
        
        return result.results.filter(r => r.finalScore >= minSimilarity);
      } else {
        // Pure vector retrieval
        const result = await this.vectorDB.search(query, {
          workspace,
          entityTypes,
          topK,
          minScore: minSimilarity,
        });
        
        return result.results;
      }
    } catch (error) {
      logger.error('Error retrieving documents:', error);
      return [];
    }
  }
  
  /**
   * Generate answer with context
   */
  async generate(question, context, options = {}) {
    try {
      const {
        model,
        temperature,
        conversationHistory = [],
        systemPrompt,
      } = options;
      
      const defaultSystemPrompt = `You are a helpful AI assistant with access to a knowledge base. 
Answer questions based on the provided context. 
If the context doesn't contain enough information, say so clearly.
Always cite your sources when making claims.
Be concise but comprehensive.`;
      
      const messages = [
        {
          role: 'system',
          content: systemPrompt || defaultSystemPrompt,
        },
      ];
      
      // Add conversation history
      conversationHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      });
      
      // Add current query with context
      messages.push({
        role: 'user',
        content: `Context from knowledge base:\n\n${context}\n\nQuestion: ${question}\n\nPlease answer based on the context provided above.`,
      });
      
      const completion = await this.openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: 1500,
      });
      
      return {
        text: completion.choices[0].message.content,
        usage: completion.usage,
        model,
      };
    } catch (error) {
      logger.error('Error generating answer:', error);
      throw error;
    }
  }
  
  /**
   * Build context from retrieved documents
   */
  buildContext(documents) {
    let context = '';
    let tokenCount = 0;
    
    documents.forEach((doc, index) => {
      const docText = `[Document ${index + 1}] (${doc.metadata.entityType})\n${doc.metadata.textContent}\n\n`;
      
      // Rough token estimation (1 token ≈ 4 characters)
      const estimatedTokens = docText.length / 4;
      
      if (tokenCount + estimatedTokens < this.config.maxContextLength) {
        context += docText;
        tokenCount += estimatedTokens;
      }
    });
    
    return context;
  }
  
  /**
   * Extract citations from answer
   */
  extractCitations(documents, answer) {
    const citations = [];
    
    documents.forEach((doc, index) => {
      // Check if document is referenced in answer
      const docNumber = index + 1;
      if (answer.text.includes(`[Document ${docNumber}]`) || 
          answer.text.includes(`Document ${docNumber}`) ||
          this.contentOverlap(doc.metadata.textContent, answer.text) > 0.3) {
        
        citations.push({
          documentNumber: docNumber,
          entityType: doc.metadata.entityType,
          entityId: doc.metadata.entityId,
          relevanceScore: doc.score,
          snippet: doc.metadata.textContent.substring(0, 200),
        });
      }
    });
    
    return citations;
  }
  
  /**
   * Calculate answer confidence
   */
  calculateConfidence(documents, answer) {
    if (documents.length === 0) return 0;
    
    // Base confidence on retrieval scores
    const avgScore = documents.reduce((sum, doc) => sum + doc.score, 0) / documents.length;
    
    // Adjust for answer length (longer answers often indicate more comprehensive responses)
    const lengthFactor = Math.min(answer.text.length / 500, 1);
    
    // Combine factors
    const confidence = (avgScore * 0.7 + lengthFactor * 0.3) * 100;
    
    return Math.round(Math.min(confidence, 100));
  }
  
  /**
   * Conversational RAG (maintains context)
   */
  async conversationalQuery(question, conversationId, options = {}) {
    try {
      const { workspace } = options;
      
      // Retrieve conversation history
      const historyKey = this.cache.generateKey(workspace, 'conversation', conversationId);
      let history = await this.cache.get(historyKey) || [];
      
      // Query with history
      const result = await this.query(question, {
        ...options,
        conversationHistory: history,
      });
      
      // Update history
      history.push(
        { role: 'user', content: question },
        { role: 'assistant', content: result.answer }
      );
      
      // Keep only last 10 exchanges
      if (history.length > 20) {
        history = history.slice(-20);
      }
      
      // Cache updated history
      await this.cache.set(historyKey, history, { ttl: 3600 });
      
      return {
        ...result,
        conversationId,
      };
    } catch (error) {
      logger.error('Error in conversational query:', error);
      throw error;
    }
  }
  
  /**
   * Multi-turn RAG conversation
   */
  async continueConversation(conversationId, question, workspace) {
    return await this.conversationalQuery(question, conversationId, { workspace });
  }
  
  /**
   * Clear conversation history
   */
  async clearConversation(conversationId, workspace) {
    const historyKey = this.cache.generateKey(workspace, 'conversation', conversationId);
    await this.cache.delete(historyKey);
    return { success: true };
  }
  
  /**
   * Summarize conversation
   */
  async summarizeConversation(conversationId, workspace) {
    try {
      const historyKey = this.cache.generateKey(workspace, 'conversation', conversationId);
      const history = await this.cache.get(historyKey) || [];
      
      if (history.length === 0) {
        return { summary: 'No conversation to summarize' };
      }
      
      const conversationText = history
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Summarize the following conversation in 3-5 key points.',
          },
          {
            role: 'user',
            content: conversationText,
          },
        ],
        temperature: 0.3,
      });
      
      return {
        summary: completion.choices[0].message.content,
        messageCount: history.length,
      };
    } catch (error) {
      logger.error('Error summarizing conversation:', error);
      throw error;
    }
  }
  
  // ========================================
  // Helper methods
  // ========================================
  
  hashQuery(query) {
    let hash = 0;
    for (let i = 0; i < query.length; i++) {
      const char = query.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
  
  contentOverlap(text1, text2) {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    let overlap = 0;
    words1.forEach(word => {
      if (words2.has(word)) overlap++;
    });
    
    return overlap / Math.min(words1.size, words2.size);
  }
  
  getStats() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.totalQueries > 0
        ? ((this.stats.cacheHits / this.stats.totalQueries) * 100).toFixed(2) + '%'
        : '0%',
      avgRetrievalPerQuery: this.stats.totalQueries > 0
        ? (this.stats.retrievalCount / this.stats.totalQueries).toFixed(2)
        : 0,
    };
  }
}

module.exports = new RAGService();
