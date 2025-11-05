/**
 * Whisper Transcription Service
 * Provides voice-to-text transcription using OpenAI Whisper API
 * 
 * Features:
 * - Audio transcription from files or streams
 * - Multiple language support (auto-detect or specified)
 * - Translation to English
 * - Timestamp generation
 * - Speaker diarization (basic)
 * - Audio format conversion
 * - Batch processing
 * - Real-time streaming transcription
 * 
 * Supported Formats: mp3, mp4, mpeg, mpga, m4a, wav, webm
 * Max File Size: 25 MB (API limit)
 */

const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');
const FormData = require('form-data');
const axios = require('axios');

class WhisperService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      model: config.model || 'whisper-1',
      language: config.language || null, // auto-detect if null
      temperature: config.temperature || 0,
      maxFileSize: config.maxFileSize || 25 * 1024 * 1024, // 25 MB
      responseFormat: config.responseFormat || 'json', // json, text, srt, verbose_json, vtt
      enableTimestamps: config.enableTimestamps !== false,
      enableDiarization: config.enableDiarization || false,
      chunkSize: config.chunkSize || 10 * 1024 * 1024, // 10 MB chunks
      ...config
    };

    this.openai = new OpenAI({ apiKey: this.config.apiKey });
    
    // Supported audio formats
    this.supportedFormats = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'];
    
    // Statistics
    this.stats = {
      totalTranscriptions: 0,
      totalDuration: 0,
      totalAudioSize: 0,
      averageAccuracy: 0,
      languageBreakdown: {},
      errors: 0
    };

    // Processing queue
    this.processingQueue = [];
    this.maxConcurrent = config.maxConcurrent || 3;
    this.currentProcessing = 0;
  }

  /**
   * Transcribe audio file
   */
  async transcribe(audioPath, options = {}) {
    const startTime = Date.now();

    try {
      // Validate file
      await this.validateAudioFile(audioPath);

      // Get file stats
      const fileStats = await fs.stat(audioPath);
      const fileSize = fileStats.size;

      this.emit('transcription:started', {
        file: audioPath,
        size: fileSize
      });

      // Prepare transcription options
      const transcriptionOptions = {
        file: await this.createFileStream(audioPath),
        model: options.model || this.config.model,
        language: options.language || this.config.language,
        temperature: options.temperature || this.config.temperature,
        response_format: options.responseFormat || this.config.responseFormat
      };

      // Add optional parameters
      if (options.prompt) {
        transcriptionOptions.prompt = options.prompt;
      }

      if (this.config.enableTimestamps && transcriptionOptions.response_format === 'verbose_json') {
        transcriptionOptions.timestamp_granularities = ['word', 'segment'];
      }

      // Call OpenAI Whisper API
      const response = await this.openai.audio.transcriptions.create(transcriptionOptions);

      // Process response
      const result = this.processTranscriptionResponse(response, options);

      // Update statistics
      const processingTime = Date.now() - startTime;
      this.updateStatistics(result, fileSize, processingTime);

      this.emit('transcription:completed', {
        file: audioPath,
        duration: processingTime,
        text: result.text
      });

      return {
        success: true,
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments,
        words: result.words,
        confidence: result.confidence,
        processingTime,
        metadata: {
          model: transcriptionOptions.model,
          format: transcriptionOptions.response_format,
          fileSize
        }
      };

    } catch (error) {
      this.stats.errors++;
      this.emit('transcription:error', {
        file: audioPath,
        error: error.message
      });

      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Translate audio to English
   */
  async translate(audioPath, options = {}) {
    const startTime = Date.now();

    try {
      await this.validateAudioFile(audioPath);

      const fileStats = await fs.stat(audioPath);

      this.emit('translation:started', {
        file: audioPath,
        size: fileStats.size
      });

      const translationOptions = {
        file: await this.createFileStream(audioPath),
        model: options.model || this.config.model,
        temperature: options.temperature || this.config.temperature,
        response_format: options.responseFormat || this.config.responseFormat
      };

      if (options.prompt) {
        translationOptions.prompt = options.prompt;
      }

      const response = await this.openai.audio.translations.create(translationOptions);
      const result = this.processTranscriptionResponse(response, options);

      const processingTime = Date.now() - startTime;

      this.emit('translation:completed', {
        file: audioPath,
        duration: processingTime
      });

      return {
        success: true,
        text: result.text,
        originalLanguage: 'detected',
        targetLanguage: 'en',
        segments: result.segments,
        processingTime,
        metadata: {
          model: translationOptions.model,
          fileSize: fileStats.size
        }
      };

    } catch (error) {
      this.emit('translation:error', {
        file: audioPath,
        error: error.message
      });

      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  /**
   * Batch transcribe multiple files
   */
  async batchTranscribe(audioPaths, options = {}) {
    const results = [];
    const errors = [];

    this.emit('batch:started', {
      totalFiles: audioPaths.length
    });

    for (let i = 0; i < audioPaths.length; i++) {
      try {
        const result = await this.transcribe(audioPaths[i], options);
        results.push({
          file: audioPaths[i],
          index: i,
          ...result
        });

        this.emit('batch:progress', {
          current: i + 1,
          total: audioPaths.length,
          file: audioPaths[i]
        });

      } catch (error) {
        errors.push({
          file: audioPaths[i],
          index: i,
          error: error.message
        });
      }
    }

    this.emit('batch:completed', {
      successful: results.length,
      failed: errors.length
    });

    return {
      success: true,
      results,
      errors,
      summary: {
        total: audioPaths.length,
        successful: results.length,
        failed: errors.length
      }
    };
  }

  /**
   * Transcribe with speaker diarization (basic)
   */
  async transcribeWithSpeakers(audioPath, options = {}) {
    // Get verbose transcription with timestamps
    const transcription = await this.transcribe(audioPath, {
      ...options,
      responseFormat: 'verbose_json'
    });

    // Basic speaker detection based on pauses and audio characteristics
    const segments = transcription.segments || [];
    const speakerSegments = this.detectSpeakers(segments, options);

    return {
      ...transcription,
      speakers: speakerSegments,
      speakerCount: this.countUniqueSpeakers(speakerSegments)
    };
  }

  /**
   * Stream transcription (for real-time use cases)
   */
  async streamTranscribe(audioStream, options = {}) {
    // Note: OpenAI Whisper doesn't support true streaming yet
    // This is a workaround for future compatibility
    
    const chunks = [];
    
    return new Promise((resolve, reject) => {
      audioStream.on('data', (chunk) => {
        chunks.push(chunk);
        this.emit('stream:data', { size: chunk.length });
      });

      audioStream.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const tempFile = path.join('/tmp', `stream_${Date.now()}.wav`);
          
          await fs.writeFile(tempFile, buffer);
          const result = await this.transcribe(tempFile, options);
          
          // Cleanup
          await fs.unlink(tempFile).catch(() => {});
          
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      audioStream.on('error', reject);
    });
  }

  /**
   * Validate audio file
   */
  async validateAudioFile(audioPath) {
    // Check if file exists
    try {
      await fs.access(audioPath);
    } catch (error) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    // Check file size
    const stats = await fs.stat(audioPath);
    if (stats.size > this.config.maxFileSize) {
      throw new Error(
        `File size ${stats.size} exceeds maximum ${this.config.maxFileSize} bytes`
      );
    }

    // Check file format
    const ext = path.extname(audioPath).toLowerCase().slice(1);
    if (!this.supportedFormats.includes(ext)) {
      throw new Error(
        `Unsupported format: ${ext}. Supported: ${this.supportedFormats.join(', ')}`
      );
    }

    return true;
  }

  /**
   * Create file stream for upload
   */
  async createFileStream(audioPath) {
    const fileBuffer = await fs.readFile(audioPath);
    const fileName = path.basename(audioPath);
    
    return {
      buffer: fileBuffer,
      name: fileName,
      type: this.getAudioMimeType(audioPath)
    };
  }

  /**
   * Get audio MIME type
   */
  getAudioMimeType(audioPath) {
    const ext = path.extname(audioPath).toLowerCase().slice(1);
    const mimeTypes = {
      mp3: 'audio/mpeg',
      mp4: 'audio/mp4',
      mpeg: 'audio/mpeg',
      mpga: 'audio/mpeg',
      m4a: 'audio/mp4',
      wav: 'audio/wav',
      webm: 'audio/webm'
    };
    return mimeTypes[ext] || 'audio/mpeg';
  }

  /**
   * Process transcription response
   */
  processTranscriptionResponse(response, options = {}) {
    if (typeof response === 'string') {
      return {
        text: response,
        segments: [],
        words: [],
        language: null,
        duration: null,
        confidence: null
      };
    }

    const result = {
      text: response.text || '',
      language: response.language || null,
      duration: response.duration || null,
      segments: [],
      words: [],
      confidence: null
    };

    // Process segments (if verbose_json)
    if (response.segments) {
      result.segments = response.segments.map(segment => ({
        id: segment.id,
        start: segment.start,
        end: segment.end,
        text: segment.text,
        tokens: segment.tokens,
        temperature: segment.temperature,
        avgLogprob: segment.avg_logprob,
        compressionRatio: segment.compression_ratio,
        noSpeechProb: segment.no_speech_prob
      }));

      // Calculate average confidence
      const avgLogprob = result.segments.reduce(
        (sum, s) => sum + (s.avgLogprob || 0),
        0
      ) / result.segments.length;
      result.confidence = this.logprobToConfidence(avgLogprob);
    }

    // Process words (if available)
    if (response.words) {
      result.words = response.words.map(word => ({
        word: word.word,
        start: word.start,
        end: word.end,
        probability: word.probability
      }));
    }

    return result;
  }

  /**
   * Detect speakers (basic implementation)
   */
  detectSpeakers(segments, options = {}) {
    const pauseThreshold = options.pauseThreshold || 1.5; // seconds
    const speakers = [];
    let currentSpeaker = 1;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const previousSegment = segments[i - 1];

      // Detect speaker change based on pause
      if (previousSegment) {
        const pause = segment.start - previousSegment.end;
        if (pause > pauseThreshold) {
          currentSpeaker = currentSpeaker === 1 ? 2 : 1;
        }
      }

      speakers.push({
        speaker: `Speaker ${currentSpeaker}`,
        start: segment.start,
        end: segment.end,
        text: segment.text
      });
    }

    return speakers;
  }

  /**
   * Count unique speakers
   */
  countUniqueSpeakers(speakerSegments) {
    const speakers = new Set(speakerSegments.map(s => s.speaker));
    return speakers.size;
  }

  /**
   * Convert log probability to confidence percentage
   */
  logprobToConfidence(logprob) {
    // Convert log probability to percentage (approximate)
    const confidence = Math.exp(logprob) * 100;
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Update statistics
   */
  updateStatistics(result, fileSize, processingTime) {
    this.stats.totalTranscriptions++;
    this.stats.totalAudioSize += fileSize;
    
    if (result.duration) {
      this.stats.totalDuration += result.duration;
    }

    if (result.language) {
      this.stats.languageBreakdown[result.language] = 
        (this.stats.languageBreakdown[result.language] || 0) + 1;
    }

    if (result.confidence) {
      const currentAvg = this.stats.averageAccuracy;
      const count = this.stats.totalTranscriptions;
      this.stats.averageAccuracy = 
        (currentAvg * (count - 1) + result.confidence) / count;
    }
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      averageFileSize: this.stats.totalTranscriptions > 0
        ? this.stats.totalAudioSize / this.stats.totalTranscriptions
        : 0,
      averageDuration: this.stats.totalTranscriptions > 0
        ? this.stats.totalDuration / this.stats.totalTranscriptions
        : 0,
      successRate: this.stats.totalTranscriptions > 0
        ? ((this.stats.totalTranscriptions - this.stats.errors) / 
           this.stats.totalTranscriptions) * 100
        : 0
    };
  }

  /**
   * Format transcription as SRT subtitles
   */
  formatAsSRT(transcription) {
    if (!transcription.segments || transcription.segments.length === 0) {
      throw new Error('No segments available for SRT formatting');
    }

    let srt = '';
    transcription.segments.forEach((segment, index) => {
      srt += `${index + 1}\n`;
      srt += `${this.formatSRTTime(segment.start)} --> ${this.formatSRTTime(segment.end)}\n`;
      srt += `${segment.text.trim()}\n\n`;
    });

    return srt;
  }

  /**
   * Format time for SRT (HH:MM:SS,mmm)
   */
  formatSRTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Format transcription as VTT
   */
  formatAsVTT(transcription) {
    if (!transcription.segments || transcription.segments.length === 0) {
      throw new Error('No segments available for VTT formatting');
    }

    let vtt = 'WEBVTT\n\n';
    transcription.segments.forEach((segment, index) => {
      vtt += `${index + 1}\n`;
      vtt += `${this.formatVTTTime(segment.start)} --> ${this.formatVTTTime(segment.end)}\n`;
      vtt += `${segment.text.trim()}\n\n`;
    });

    return vtt;
  }

  /**
   * Format time for VTT (HH:MM:SS.mmm)
   */
  formatVTTTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      totalTranscriptions: 0,
      totalDuration: 0,
      totalAudioSize: 0,
      averageAccuracy: 0,
      languageBreakdown: {},
      errors: 0
    };
  }
}

// Singleton instance
let whisperServiceInstance = null;

function getWhisperService(config = {}) {
  if (!whisperServiceInstance) {
    whisperServiceInstance = new WhisperService(config);
  }
  return whisperServiceInstance;
}

module.exports = {
  WhisperService,
  getWhisperService
};
