/**
 * RAG Service - Retrieval-Augmented Generation
 * Combines vector search with LLM generation for context-aware responses
 * 
 * Features:
 * - Semantic document search
 * - Context-aware answer generation
 * - Multi-document synthesis
 * - Citation tracking
 * - Relevance scoring
 * - Hybrid search (semantic + keyword)
 * - Query expansion
 * - Re-ranking
 */

const { getVectorDatabaseService } = require('../vector/VectorDatabaseService');
const { MultiModelAI } = require('../../ai/MultiModelAI');
const { EventEmitter } = require('events');

class RAGService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      topK: config.topK || 5,
      minScore: config.minScore || 0.7,
      maxContextLength: config.maxContextLength || 4000,
      includeMetadata: config.includeMetadata !== false,
      includeCitations: config.includeCitations !== false,
      rerank: config.rerank !== false,
      expandQuery: config.expandQuery || false,
      hybridSearch: config.hybridSearch || false,
      model: config.model || 'gpt-4o-mini',
      temperature: config.temperature || 0.3,
      ...config
    };

    this.vectorDB = getVectorDatabaseService();
    this.ai = new MultiModelAI();

    this.stats = {
      totalQueries: 0,
      totalDocuments: 0,
      avgRetrievalTime: 0,
      avgGenerationTime: 0,
      avgRelevanceScore: 0,
      cacheHits: 0
    };

    // Response cache
    this.cache = new Map();
    this.cacheMaxSize = config.cacheMaxSize || 100;
    this.cacheTTL = config.cacheTTL || 3600000; // 1 hour
  }

  /**
   * Query RAG system
   */
  async query(question, options = {}) {
    const startTime = Date.now();

    try {
      // Check cache
      const cacheKey = this.getCacheKey(question, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.stats.cacheHits++;
        this.emit('query:cache-hit', { question });
        return cached;
      }

      this.emit('query:started', { question });

      // Step 1: Retrieve relevant documents
      const retrievalStart = Date.now();
      const documents = await this.retrieveDocuments(question, options);
      const retrievalTime = Date.now() - retrievalStart;

      if (documents.length === 0) {
        return {
          success: false,
          error: 'No relevant documents found',
          answer: 'I could not find any relevant information to answer your question.',
          confidence: 0,
          sources: []
        };
      }

      // Step 2: Prepare context
      const context = this.prepareContext(documents, options);

      // Step 3: Generate answer
      const generationStart = Date.now();
      const answer = await this.generateAnswer(question, context, options);
      const generationTime = Date.now() - generationStart;

      // Step 4: Extract citations
      const citations = this.extractCitations(documents, answer);

      const result = {
        success: true,
        answer: answer.text,
        confidence: answer.confidence,
        sources: documents.map(doc => ({
          id: doc.id,
          content: doc.content.substring(0, 200) + '...',
          score: doc.score,
          metadata: doc.metadata
        })),
        citations: this.config.includeCitations ? citations : undefined,
        metadata: {
          retrievalTime,
          generationTime,
          totalTime: Date.now() - startTime,
          documentsRetrieved: documents.length,
          model: answer.model
        }
      };

      // Update stats
      this.updateStatistics(retrievalTime, generationTime, documents, answer);

      // Cache result
      this.setInCache(cacheKey, result);

      this.emit('query:completed', { question, totalTime: result.metadata.totalTime });

      return result;

    } catch (error) {
      this.emit('query:error', { question, error: error.message });
      throw new Error(`RAG query failed: ${error.message}`);
    }
  }

  /**
   * Retrieve relevant documents
   */
  async retrieveDocuments(query, options = {}) {
    const namespace = options.namespace || 'default';
    const topK = options.topK || this.config.topK;
    const minScore = options.minScore || this.config.minScore;

    // Query expansion
    let queries = [query];
    if (this.config.expandQuery || options.expandQuery) {
      const expanded = await this.expandQuery(query);
      queries = queries.concat(expanded);
    }

    // Search for each query
    const allResults = [];
    for (const q of queries) {
      const results = await this.vectorDB.search(namespace, q, topK * 2);
      allResults.push(...results);
    }

    // Deduplicate and filter by score
    const uniqueResults = this.deduplicateResults(allResults);
    const filtered = uniqueResults.filter(doc => doc.score >= minScore);

    // Re-rank if enabled
    let finalResults = filtered;
    if (this.config.rerank || options.rerank) {
      finalResults = await this.rerankDocuments(query, filtered);
    }

    // Return top K
    return finalResults.slice(0, topK);
  }

  /**
   * Prepare context from documents
   */
  prepareContext(documents, options = {}) {
    const maxLength = options.maxContextLength || this.config.maxContextLength;
    let context = '';
    let currentLength = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const docText = `[Document ${i + 1}]\n${doc.content}\n\n`;
      
      if (currentLength + docText.length > maxLength) {
        // Truncate if necessary
        const remaining = maxLength - currentLength;
        if (remaining > 100) {
          context += docText.substring(0, remaining) + '...\n\n';
        }
        break;
      }

      context += docText;
      currentLength += docText.length;
    }

    return context;
  }

  /**
   * Generate answer using LLM
   */
  async generateAnswer(question, context, options = {}) {
    const prompt = this.buildPrompt(question, context, options);

    const response = await this.ai.processRequest({
      prompt,
      model: options.model || this.config.model,
      temperature: options.temperature || this.config.temperature,
      maxTokens: options.maxTokens || 1000,
      workspace: options.workspace
    });

    return {
      text: response.response,
      confidence: this.estimateConfidence(response, context),
      model: response.model,
      tokens: response.usage
    };
  }

  /**
   * Build prompt for LLM
   */
  buildPrompt(question, context, options = {}) {
    const systemPrompt = options.systemPrompt || `You are a helpful AI assistant that answers questions based on the provided context. 
Always base your answers on the given information. If the context doesn't contain enough information to answer the question, say so clearly.
If you reference information, indicate which document it came from using [Document N] notation.`;

    return `${systemPrompt}

Context:
${context}

Question: ${question}

Answer (be concise, accurate, and cite sources):`;
  }

  /**
   * Expand query with related terms
   */
  async expandQuery(query) {
    try {
      const prompt = `Generate 2-3 alternative phrasings or related queries for: "${query}"
Return only the queries, one per line, without numbering or explanation.`;

      const response = await this.ai.processRequest({
        prompt,
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 100
      });

      const expanded = response.response
        .split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 3);

      return expanded;

    } catch (error) {
      return []; // Fallback to original query only
    }
  }

  /**
   * Re-rank documents for relevance
   */
  async rerankDocuments(query, documents) {
    // Simple re-ranking based on keyword match
    // Can be enhanced with more sophisticated methods
    
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    const scored = documents.map(doc => {
      const content = doc.content.toLowerCase();
      let matchScore = 0;

      for (const term of queryTerms) {
        const count = (content.match(new RegExp(term, 'g')) || []).length;
        matchScore += count;
      }

      return {
        ...doc,
        rerankScore: doc.score * 0.7 + (matchScore / queryTerms.length) * 0.3
      };
    });

    return scored.sort((a, b) => b.rerankScore - a.rerankScore);
  }

  /**
   * Deduplicate search results
   */
  deduplicateResults(results) {
    const seen = new Set();
    const unique = [];

    for (const result of results) {
      if (!seen.has(result.id)) {
        seen.add(result.id);
        unique.push(result);
      }
    }

    // Sort by score
    return unique.sort((a, b) => b.score - a.score);
  }

  /**
   * Extract citations from answer
   */
  extractCitations(documents, answer) {
    const citations = [];
    const text = answer.text;

    for (let i = 0; i < documents.length; i++) {
      const docRef = `[Document ${i + 1}]`;
      if (text.includes(docRef)) {
        citations.push({
          docNumber: i + 1,
          documentId: documents[i].id,
          content: documents[i].content.substring(0, 150) + '...',
          metadata: documents[i].metadata
        });
      }
    }

    return citations;
  }

  /**
   * Estimate answer confidence
   */
  estimateConfidence(response, context) {
    // Estimate based on response characteristics
    let confidence = 0.8; // Base confidence

    // Lower confidence if answer indicates uncertainty
    const uncertainPhrases = [
      'i don\'t know',
      'not enough information',
      'cannot determine',
      'unclear from the context'
    ];

    const lowerText = response.response.toLowerCase();
    for (const phrase of uncertainPhrases) {
      if (lowerText.includes(phrase)) {
        confidence *= 0.5;
        break;
      }
    }

    // Higher confidence if context is substantial
    if (context.length > 1000) {
      confidence = Math.min(confidence * 1.1, 0.95);
    }

    return confidence;
  }

  /**
   * Multi-document synthesis
   */
  async synthesizeDocuments(documents, options = {}) {
    const context = this.prepareContext(documents, {
      maxContextLength: options.maxContextLength || 8000
    });

    const prompt = options.prompt || `Synthesize the key information from these documents into a coherent summary:

${context}

Provide a comprehensive synthesis that:
1. Identifies main themes
2. Highlights key points
3. Notes any contradictions
4. Draws connections between documents`;

    const response = await this.ai.processRequest({
      prompt,
      model: options.model || this.config.model,
      temperature: 0.4,
      maxTokens: options.maxTokens || 2000,
      workspace: options.workspace
    });

    return {
      success: true,
      synthesis: response.response,
      documentCount: documents.length,
      model: response.model
    };
  }

  /**
   * Answer with conversation history
   */
  async queryWithHistory(question, history, options = {}) {
    // Build conversation context
    let conversationContext = '';
    for (const turn of history) {
      conversationContext += `Q: ${turn.question}\nA: ${turn.answer}\n\n`;
    }

    // Retrieve documents
    const documents = await this.retrieveDocuments(question, options);
    const docContext = this.prepareContext(documents, options);

    // Build enhanced prompt
    const prompt = `Previous conversation:
${conversationContext}

Current context:
${docContext}

Current question: ${question}

Answer (considering the conversation history):`;

    const response = await this.ai.processRequest({
      prompt,
      model: options.model || this.config.model,
      temperature: options.temperature || this.config.temperature,
      maxTokens: options.maxTokens || 1000,
      workspace: options.workspace
    });

    return {
      success: true,
      answer: response.response,
      sources: documents,
      model: response.model
    };
  }

  /**
   * Cache management
   */
  getCacheKey(question, options) {
    const key = JSON.stringify({
      q: question.toLowerCase().trim(),
      opts: {
        model: options.model || this.config.model,
        topK: options.topK || this.config.topK,
        namespace: options.namespace
      }
    });
    return Buffer.from(key).toString('base64');
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  setInCache(key, data) {
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Update statistics
   */
  updateStatistics(retrievalTime, generationTime, documents, answer) {
    this.stats.totalQueries++;
    this.stats.totalDocuments += documents.length;

    const n = this.stats.totalQueries;
    this.stats.avgRetrievalTime = 
      (this.stats.avgRetrievalTime * (n - 1) + retrievalTime) / n;
    this.stats.avgGenerationTime = 
      (this.stats.avgGenerationTime * (n - 1) + generationTime) / n;
    this.stats.avgRelevanceScore = 
      (this.stats.avgRelevanceScore * (n - 1) + answer.confidence) / n;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      cacheHitRate: this.stats.totalQueries > 0
        ? (this.stats.cacheHits / this.stats.totalQueries) * 100
        : 0,
      avgDocumentsPerQuery: this.stats.totalQueries > 0
        ? this.stats.totalDocuments / this.stats.totalQueries
        : 0
    };
  }

  resetStatistics() {
    this.stats = {
      totalQueries: 0,
      totalDocuments: 0,
      avgRetrievalTime: 0,
      avgGenerationTime: 0,
      avgRelevanceScore: 0,
      cacheHits: 0
    };
  }
}

// Singleton
let ragServiceInstance = null;

function getRAGService(config = {}) {
  if (!ragServiceInstance) {
    ragServiceInstance = new RAGService(config);
  }
  return ragServiceInstance;
}

module.exports = {
  RAGService,
  getRAGService
};
