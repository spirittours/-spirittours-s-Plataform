/**
 * Voice Transcription Routes
 * API endpoints for Whisper transcription service
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { getWhisperService } = require('../../services/voice/WhisperService');
const VoiceTranscription = require('../../models/VoiceTranscription');
const { authenticate } = require('../../middleware/auth');

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../../uploads/audio');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `audio-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedFormats = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/m4a'];
    const allowedExts = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedFormats.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Supported: mp3, mp4, wav, webm, m4a'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/voice/transcribe
 * Transcribe audio file
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    const {
      entityType = 'general',
      entityId,
      language,
      enableTimestamps = true,
      enableSpeakers = false,
      tags,
      metadata
    } = req.body;

    const whisperService = getWhisperService();
    const startTime = Date.now();

    // Transcribe audio
    const options = {
      language: language || null,
      responseFormat: enableTimestamps ? 'verbose_json' : 'json',
      enableDiarization: enableSpeakers === 'true'
    };

    let transcriptionResult;
    if (enableSpeakers === 'true') {
      transcriptionResult = await whisperService.transcribeWithSpeakers(
        req.file.path,
        options
      );
    } else {
      transcriptionResult = await whisperService.transcribe(
        req.file.path,
        options
      );
    }

    // Store in database
    const transcription = await VoiceTranscription.createTranscription({
      entityType,
      entityId: entityId || null,
      audioFile: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size,
        duration: transcriptionResult.duration,
        format: path.extname(req.file.originalname).slice(1)
      },
      text: transcriptionResult.text,
      language: transcriptionResult.language,
      confidence: transcriptionResult.confidence,
      model: transcriptionResult.metadata.model,
      responseFormat: transcriptionResult.metadata.format,
      segments: transcriptionResult.segments,
      words: transcriptionResult.words,
      speakers: transcriptionResult.speakers ? {
        enabled: true,
        count: transcriptionResult.speakerCount,
        segments: transcriptionResult.speakers
      } : { enabled: false },
      workspace: req.user.workspace,
      createdBy: req.user._id,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : [],
      metadata: metadata ? JSON.parse(metadata) : {},
      startedAt: new Date(startTime),
      completedAt: new Date(),
      processingTime: Date.now() - startTime
    });

    res.json({
      success: true,
      transcription: {
        id: transcription._id,
        text: transcription.transcription.text,
        language: transcription.transcription.language,
        confidence: transcription.transcription.confidence,
        duration: transcription.formattedDuration,
        segments: transcription.segments.length,
        words: transcription.words.length,
        speakers: transcription.speakers,
        processingTime: transcription.processing.duration,
        createdAt: transcription.createdAt
      }
    });

  } catch (error) {
    console.error('Transcription error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/voice/translate
 * Translate audio to English
 */
router.post('/translate', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }

    const { entityType = 'general', entityId, tags, metadata } = req.body;

    const whisperService = getWhisperService();
    const startTime = Date.now();

    const translationResult = await whisperService.translate(req.file.path, {
      responseFormat: 'verbose_json'
    });

    // Store in database
    const transcription = await VoiceTranscription.createTranscription({
      entityType,
      entityId: entityId || null,
      audioFile: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        mimeType: req.file.mimetype,
        size: req.file.size,
        format: path.extname(req.file.originalname).slice(1)
      },
      text: translationResult.text,
      language: 'en',
      model: translationResult.metadata.model,
      segments: translationResult.segments,
      translation: {
        enabled: true,
        originalLanguage: translationResult.originalLanguage,
        targetLanguage: translationResult.targetLanguage,
        text: translationResult.text,
        model: translationResult.metadata.model
      },
      workspace: req.user.workspace,
      createdBy: req.user._id,
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : [],
      metadata: metadata ? JSON.parse(metadata) : {},
      startedAt: new Date(startTime),
      completedAt: new Date(),
      processingTime: translationResult.processingTime
    });

    res.json({
      success: true,
      translation: {
        id: transcription._id,
        text: transcription.transcription.text,
        originalLanguage: transcription.translation.originalLanguage,
        targetLanguage: transcription.translation.targetLanguage,
        processingTime: transcription.processing.duration,
        createdAt: transcription.createdAt
      }
    });

  } catch (error) {
    console.error('Translation error:', error);
    
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/voice/batch-transcribe
 * Batch transcribe multiple files
 */
router.post('/batch-transcribe', upload.array('audio', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No audio files provided'
      });
    }

    const { entityType = 'general', language, tags } = req.body;
    const whisperService = getWhisperService();
    
    const audioPaths = req.files.map(file => file.path);
    const batchResult = await whisperService.batchTranscribe(audioPaths, {
      language,
      responseFormat: 'json'
    });

    // Store successful transcriptions
    const transcriptions = [];
    for (const result of batchResult.results) {
      const file = req.files[result.index];
      
      const transcription = await VoiceTranscription.createTranscription({
        entityType,
        audioFile: {
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          mimeType: file.mimetype,
          size: file.size,
          format: path.extname(file.originalname).slice(1)
        },
        text: result.text,
        language: result.language,
        confidence: result.confidence,
        model: result.metadata.model,
        workspace: req.user.workspace,
        createdBy: req.user._id,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : [],
        startedAt: new Date(),
        completedAt: new Date(),
        processingTime: result.processingTime
      });

      transcriptions.push(transcription);
    }

    res.json({
      success: true,
      summary: batchResult.summary,
      transcriptions: transcriptions.map(t => ({
        id: t._id,
        text: t.transcription.text.substring(0, 100) + '...',
        language: t.transcription.language
      })),
      errors: batchResult.errors
    });

  } catch (error) {
    console.error('Batch transcription error:', error);
    
    // Clean up uploaded files
    if (req.files) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(() => {});
      }
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/voice/transcriptions
 * List transcriptions
 */
router.get('/transcriptions', async (req, res) => {
  try {
    const {
      query,
      entityType,
      entityId,
      language,
      dateFrom,
      dateTo,
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    const options = {
      entityType,
      entityId,
      language,
      dateFrom,
      dateTo,
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      sort: { [sort]: order === 'desc' ? -1 : 1 }
    };

    const result = await VoiceTranscription.searchTranscriptions(
      req.user.workspace,
      query,
      options
    );

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('List transcriptions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/voice/transcriptions/:id
 * Get transcription by ID
 */
router.get('/transcriptions/:id', async (req, res) => {
  try {
    const transcription = await VoiceTranscription.findOne({
      _id: req.params.id,
      workspace: req.user.workspace
    }).populate('createdBy', 'name email');

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    res.json({
      success: true,
      transcription
    });

  } catch (error) {
    console.error('Get transcription error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/voice/transcriptions/:id/export
 * Export transcription (SRT, VTT, TXT)
 */
router.get('/transcriptions/:id/export', async (req, res) => {
  try {
    const { format = 'txt' } = req.query;

    const transcription = await VoiceTranscription.findOne({
      _id: req.params.id,
      workspace: req.user.workspace
    });

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    const whisperService = getWhisperService();
    let content;
    let contentType;
    let extension;

    switch (format.toLowerCase()) {
      case 'srt':
        content = whisperService.formatAsSRT(transcription);
        contentType = 'application/x-subrip';
        extension = 'srt';
        break;
      
      case 'vtt':
        content = whisperService.formatAsVTT(transcription);
        contentType = 'text/vtt';
        extension = 'vtt';
        break;
      
      case 'json':
        content = JSON.stringify(transcription, null, 2);
        contentType = 'application/json';
        extension = 'json';
        break;
      
      case 'txt':
      default:
        content = transcription.transcription.text;
        contentType = 'text/plain';
        extension = 'txt';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="transcription-${transcription._id}.${extension}"`
    );
    res.send(content);

  } catch (error) {
    console.error('Export transcription error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/voice/transcriptions/:id
 * Update transcription
 */
router.patch('/transcriptions/:id', async (req, res) => {
  try {
    const { tags, category, priority, metadata } = req.body;

    const transcription = await VoiceTranscription.findOne({
      _id: req.params.id,
      workspace: req.user.workspace
    });

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    if (tags !== undefined) transcription.tags = tags;
    if (category !== undefined) transcription.category = category;
    if (priority !== undefined) transcription.priority = priority;
    if (metadata !== undefined) {
      transcription.metadata = { ...transcription.metadata, ...metadata };
    }

    await transcription.save();

    res.json({
      success: true,
      transcription
    });

  } catch (error) {
    console.error('Update transcription error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/voice/transcriptions/:id
 * Delete transcription
 */
router.delete('/transcriptions/:id', async (req, res) => {
  try {
    const transcription = await VoiceTranscription.findOne({
      _id: req.params.id,
      workspace: req.user.workspace
    });

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    // Delete audio file
    if (transcription.audioFile.path) {
      await fs.unlink(transcription.audioFile.path).catch(() => {});
    }

    await transcription.deleteOne();

    res.json({
      success: true,
      message: 'Transcription deleted'
    });

  } catch (error) {
    console.error('Delete transcription error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/voice/transcriptions/:id/favorite
 * Toggle favorite status
 */
router.post('/transcriptions/:id/favorite', async (req, res) => {
  try {
    const transcription = await VoiceTranscription.findOne({
      _id: req.params.id,
      workspace: req.user.workspace
    });

    if (!transcription) {
      return res.status(404).json({
        success: false,
        error: 'Transcription not found'
      });
    }

    await transcription.toggleFavorite();

    res.json({
      success: true,
      isFavorite: transcription.isFavorite
    });

  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/voice/statistics
 * Get transcription statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const stats = await VoiceTranscription.getStatistics(req.user.workspace, {
      dateFrom,
      dateTo
    });

    const serviceStats = getWhisperService().getStatistics();

    res.json({
      success: true,
      database: stats,
      service: serviceStats
    });

  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/voice/recent
 * Get recent transcriptions
 */
router.get('/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const transcriptions = await VoiceTranscription.getRecent(
      req.user.workspace,
      parseInt(limit)
    );

    res.json({
      success: true,
      transcriptions
    });

  } catch (error) {
    console.error('Get recent transcriptions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
