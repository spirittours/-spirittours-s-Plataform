/**
 * RAG API Routes - Retrieval-Augmented Generation
 */

const express = require('express');
const router = express.Router();
const { getRAGService } = require('../../services/rag/RAGService');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);

// POST /api/rag/query - Ask a question with context retrieval
router.post('/query', async (req, res) => {
  try {
    const { question, namespace, topK, minScore, model, rerank, expandQuery } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, error: 'Question is required' });
    }

    const ragService = getRAGService();
    const result = await ragService.query(question, {
      namespace: namespace || req.user.workspace.toString(),
      topK, minScore, model, rerank, expandQuery,
      workspace: req.user.workspace
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/rag/query-with-history - Query with conversation context
router.post('/query-with-history', async (req, res) => {
  try {
    const { question, history, namespace, model } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, error: 'Question is required' });
    }

    if (!Array.isArray(history)) {
      return res.status(400).json({ success: false, error: 'History must be an array' });
    }

    const ragService = getRAGService();
    const result = await ragService.queryWithHistory(question, history, {
      namespace: namespace || req.user.workspace.toString(),
      model,
      workspace: req.user.workspace
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/rag/synthesize - Synthesize information from documents
router.post('/synthesize', async (req, res) => {
  try {
    const { documentIds, prompt, model, maxContextLength } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Document IDs required' });
    }

    const ragService = getRAGService();
    const vectorDB = ragService.vectorDB;

    // Retrieve documents by ID
    const documents = [];
    for (const id of documentIds) {
      const doc = await vectorDB.getById(req.user.workspace.toString(), id);
      if (doc) documents.push(doc);
    }

    if (documents.length === 0) {
      return res.status(404).json({ success: false, error: 'No documents found' });
    }

    const result = await ragService.synthesizeDocuments(documents, {
      prompt, model, maxContextLength,
      workspace: req.user.workspace
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/rag/statistics - Get RAG service statistics
router.get('/statistics', async (req, res) => {
  try {
    const ragService = getRAGService();
    const stats = ragService.getStatistics();

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/rag/cache/clear - Clear response cache
router.post('/cache/clear', async (req, res) => {
  try {
    const ragService = getRAGService();
    ragService.clearCache();

    res.json({
      success: true,
      message: 'Cache cleared'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
