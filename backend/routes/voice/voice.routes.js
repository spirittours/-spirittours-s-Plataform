const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const VoiceService = require('../../services/voice/VoiceService');
const { authenticateToken } = require('../../middleware/auth');
const logger = require('../../config/logger');

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/audio');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
  fileFilter: (req, file, cb) => {
    const allowedFormats = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported format: ${ext}`));
    }
  },
});

/**
 * Voice API Routes
 * Audio transcription and voice analysis
 */

// Transcribe audio file
router.post('/transcribe', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided',
      });
    }
    
    const { language, prompt, responseFormat } = req.body;
    
    const result = await VoiceService.transcribe(req.file.path, {
      language,
      prompt,
      responseFormat,
    });
    
    // Clean up file
    await fs.unlink(req.file.path);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error in transcribe endpoint:', error);
    
    // Clean up file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Transcribe call recording
router.post('/transcribe-call', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided',
      });
    }
    
    const callMetadata = {
      contactId: req.body.contactId,
      dealId: req.body.dealId,
      callType: req.body.callType,
      callDate: req.body.callDate,
      duration: req.body.duration,
      participants: req.body.participants ? JSON.parse(req.body.participants) : [],
    };
    
    const result = await VoiceService.transcribeCallRecording(req.file.path, callMetadata);
    
    // Clean up file
    await fs.unlink(req.file.path);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error in transcribe-call endpoint:', error);
    
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Transcribe meeting
router.post('/transcribe-meeting', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided',
      });
    }
    
    const meetingMetadata = {
      meetingId: req.body.meetingId,
      title: req.body.title,
      meetingDate: req.body.meetingDate,
      duration: req.body.duration,
      attendees: req.body.attendees ? JSON.parse(req.body.attendees) : [],
      agenda: req.body.agenda,
    };
    
    const result = await VoiceService.transcribeMeeting(req.file.path, meetingMetadata);
    
    // Clean up file
    await fs.unlink(req.file.path);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error in transcribe-meeting endpoint:', error);
    
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Transcribe voice message
router.post('/transcribe-message', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided',
      });
    }
    
    const context = {
      senderId: req.body.senderId,
      recipientId: req.body.recipientId,
      timestamp: req.body.timestamp,
      channel: req.body.channel,
    };
    
    const result = await VoiceService.transcribeVoiceMessage(req.file.path, context);
    
    // Clean up file
    await fs.unlink(req.file.path);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error in transcribe-message endpoint:', error);
    
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Translate audio
router.post('/translate', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided',
      });
    }
    
    const { targetLanguage, prompt } = req.body;
    
    const result = await VoiceService.translateAudio(req.file.path, {
      targetLanguage,
      prompt,
    });
    
    // Clean up file
    await fs.unlink(req.file.path);
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('Error in translate endpoint:', error);
    
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Analyze sentiment from text
router.post('/analyze-sentiment', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'No text provided',
      });
    }
    
    const sentiment = await VoiceService.analyzeSentiment(text);
    
    res.json({
      success: true,
      sentiment,
    });
  } catch (error) {
    logger.error('Error in analyze-sentiment endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Extract action items from text
router.post('/extract-actions', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'No text provided',
      });
    }
    
    const actionItems = await VoiceService.extractActionItems(text);
    
    res.json({
      success: true,
      actionItems,
    });
  } catch (error) {
    logger.error('Error in extract-actions endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get service statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = VoiceService.getStats();
    
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error('Error getting voice stats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
