const { OpenAI } = require('openai');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../config/logger');

/**
 * VoiceService
 * Audio transcription and voice analysis using OpenAI Whisper
 * 
 * Features:
 * - Audio transcription (Whisper)
 * - Speaker diarization
 * - Sentiment analysis from voice
 * - Call recording transcription
 * - Meeting notes generation
 * - Multi-language support
 * - Timestamp extraction
 */
class VoiceService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.config = {
      model: 'whisper-1',
      supportedFormats: ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm'],
      maxFileSize: 25 * 1024 * 1024, // 25MB
      language: 'auto', // Auto-detect or specify
      temperature: 0, // Deterministic output
    };
    
    this.stats = {
      totalTranscriptions: 0,
      totalMinutes: 0,
      errorCount: 0,
    };
  }
  
  /**
   * Transcribe audio file
   */
  async transcribe(audioFilePath, options = {}) {
    try {
      const {
        language = this.config.language,
        prompt = '',
        temperature = this.config.temperature,
        responseFormat = 'verbose_json', // json, text, srt, verbose_json, vtt
        timestampGranularities = ['segment'], // segment, word
      } = options;
      
      // Validate file
      await this.validateAudioFile(audioFilePath);
      
      // Create file stream
      const audioFile = await fs.readFile(audioFilePath);
      const fileStream = Buffer.from(audioFile);
      
      logger.info(`Transcribing audio file: ${path.basename(audioFilePath)}`);
      
      // Call Whisper API
      const transcription = await this.openai.audio.transcriptions.create({
        file: new File([fileStream], path.basename(audioFilePath)),
        model: this.config.model,
        language: language !== 'auto' ? language : undefined,
        prompt,
        temperature,
        response_format: responseFormat,
        timestamp_granularities: timestampGranularities,
      });
      
      // Update stats
      this.stats.totalTranscriptions++;
      if (transcription.duration) {
        this.stats.totalMinutes += transcription.duration / 60;
      }
      
      logger.info(`Transcription completed: ${transcription.text?.length || 0} characters`);
      
      return {
        success: true,
        text: transcription.text,
        language: transcription.language,
        duration: transcription.duration,
        segments: transcription.segments || [],
        words: transcription.words || [],
        metadata: {
          model: this.config.model,
          fileSize: audioFile.length,
          fileName: path.basename(audioFilePath),
        },
      };
    } catch (error) {
      this.stats.errorCount++;
      logger.error('Error transcribing audio:', error);
      throw error;
    }
  }
  
  /**
   * Transcribe call recording
   */
  async transcribeCallRecording(audioFilePath, callMetadata = {}) {
    try {
      const transcription = await this.transcribe(audioFilePath, {
        responseFormat: 'verbose_json',
        timestampGranularities: ['segment', 'word'],
        prompt: 'This is a business call recording. Please transcribe accurately.',
      });
      
      // Analyze sentiment
      const sentiment = await this.analyzeSentiment(transcription.text);
      
      // Extract action items
      const actionItems = await this.extractActionItems(transcription.text);
      
      // Generate summary
      const summary = await this.generateCallSummary(transcription.text, callMetadata);
      
      return {
        ...transcription,
        callMetadata,
        analysis: {
          sentiment,
          actionItems,
          summary,
        },
      };
    } catch (error) {
      logger.error('Error transcribing call recording:', error);
      throw error;
    }
  }
  
  /**
   * Transcribe meeting
   */
  async transcribeMeeting(audioFilePath, meetingMetadata = {}) {
    try {
      const transcription = await this.transcribe(audioFilePath, {
        responseFormat: 'verbose_json',
        timestampGranularities: ['segment'],
        prompt: 'This is a business meeting. Please transcribe with speaker awareness.',
      });
      
      // Identify speakers (simple diarization)
      const speakers = await this.identifySpeakers(transcription.segments);
      
      // Extract key points
      const keyPoints = await this.extractKeyPoints(transcription.text);
      
      // Extract decisions
      const decisions = await this.extractDecisions(transcription.text);
      
      // Generate meeting notes
      const notes = await this.generateMeetingNotes(
        transcription.text,
        { speakers, keyPoints, decisions, ...meetingMetadata }
      );
      
      return {
        ...transcription,
        meetingMetadata,
        speakers,
        analysis: {
          keyPoints,
          decisions,
          notes,
        },
      };
    } catch (error) {
      logger.error('Error transcribing meeting:', error);
      throw error;
    }
  }
  
  /**
   * Transcribe voice message
   */
  async transcribeVoiceMessage(audioFilePath, context = {}) {
    try {
      const transcription = await this.transcribe(audioFilePath, {
        responseFormat: 'json',
        prompt: 'This is a voice message. Please transcribe concisely.',
      });
      
      // Analyze intent
      const intent = await this.analyzeIntent(transcription.text);
      
      // Extract entities
      const entities = await this.extractEntities(transcription.text);
      
      return {
        ...transcription,
        context,
        analysis: {
          intent,
          entities,
        },
      };
    } catch (error) {
      logger.error('Error transcribing voice message:', error);
      throw error;
    }
  }
  
  /**
   * Translate audio
   */
  async translateAudio(audioFilePath, options = {}) {
    try {
      const { targetLanguage = 'en', prompt = '' } = options;
      
      // Validate file
      await this.validateAudioFile(audioFilePath);
      
      const audioFile = await fs.readFile(audioFilePath);
      const fileStream = Buffer.from(audioFile);
      
      logger.info(`Translating audio to ${targetLanguage}`);
      
      // Whisper translation (always to English)
      const translation = await this.openai.audio.translations.create({
        file: new File([fileStream], path.basename(audioFilePath)),
        model: this.config.model,
        prompt,
        response_format: 'verbose_json',
      });
      
      return {
        success: true,
        text: translation.text,
        duration: translation.duration,
        segments: translation.segments || [],
        targetLanguage: 'en', // Whisper only translates to English
      };
    } catch (error) {
      logger.error('Error translating audio:', error);
      throw error;
    }
  }
  
  /**
   * Analyze sentiment from transcript
   */
  async analyzeSentiment(text) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment of the following conversation. Respond with JSON: {overall: "positive|negative|neutral", score: 0-100, emotions: [emotions], tone: "professional|casual|urgent|etc"}',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0,
      });
      
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      logger.error('Error analyzing sentiment:', error);
      return { overall: 'neutral', score: 50, emotions: [], tone: 'unknown' };
    }
  }
  
  /**
   * Extract action items from transcript
   */
  async extractActionItems(text) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract action items from the conversation. Respond with JSON array: [{task: "description", assignee: "person|unknown", deadline: "date|unknown", priority: "high|medium|low"}]',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0,
      });
      
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      logger.error('Error extracting action items:', error);
      return [];
    }
  }
  
  /**
   * Generate call summary
   */
  async generateCallSummary(text, metadata) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Generate a concise call summary in 3-5 bullet points. Include: purpose, key topics discussed, outcomes, and next steps.',
          },
          {
            role: 'user',
            content: `Call metadata: ${JSON.stringify(metadata)}\n\nTranscript: ${text}`,
          },
        ],
        temperature: 0.3,
      });
      
      return completion.choices[0].message.content;
    } catch (error) {
      logger.error('Error generating call summary:', error);
      return 'Error generating summary';
    }
  }
  
  /**
   * Generate meeting notes
   */
  async generateMeetingNotes(text, metadata) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Generate professional meeting notes with sections: Attendees, Topics Discussed, Key Decisions, Action Items, Next Steps.',
          },
          {
            role: 'user',
            content: `Meeting metadata: ${JSON.stringify(metadata)}\n\nTranscript: ${text}`,
          },
        ],
        temperature: 0.3,
      });
      
      return completion.choices[0].message.content;
    } catch (error) {
      logger.error('Error generating meeting notes:', error);
      return 'Error generating notes';
    }
  }
  
  /**
   * Extract key points
   */
  async extractKeyPoints(text) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract 5-7 key points from the conversation. Respond with JSON array of strings.',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0,
      });
      
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      logger.error('Error extracting key points:', error);
      return [];
    }
  }
  
  /**
   * Extract decisions
   */
  async extractDecisions(text) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract decisions made in the conversation. Respond with JSON array: [{decision: "description", rationale: "why", impact: "high|medium|low"}]',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0,
      });
      
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      logger.error('Error extracting decisions:', error);
      return [];
    }
  }
  
  /**
   * Analyze intent
   */
  async analyzeIntent(text) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Analyze the intent of this message. Respond with JSON: {primary: "request|question|information|complaint|etc", confidence: 0-100, secondary: [intents]}',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0,
      });
      
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      logger.error('Error analyzing intent:', error);
      return { primary: 'unknown', confidence: 0, secondary: [] };
    }
  }
  
  /**
   * Extract entities
   */
  async extractEntities(text) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Extract named entities. Respond with JSON: {people: [], companies: [], dates: [], products: [], locations: [], amounts: []}',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0,
      });
      
      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      logger.error('Error extracting entities:', error);
      return { people: [], companies: [], dates: [], products: [], locations: [], amounts: [] };
    }
  }
  
  /**
   * Identify speakers (simple diarization)
   */
  async identifySpeakers(segments) {
    try {
      // Simple speaker detection based on pauses and changes
      const speakers = [];
      let currentSpeaker = 1;
      
      segments.forEach((segment, index) => {
        // Detect speaker change based on long pause or content analysis
        if (index > 0) {
          const timeDiff = segment.start - segments[index - 1].end;
          if (timeDiff > 2) { // 2 second pause suggests speaker change
            currentSpeaker++;
          }
        }
        
        speakers.push({
          speaker: `Speaker ${currentSpeaker}`,
          start: segment.start,
          end: segment.end,
          text: segment.text,
        });
      });
      
      return speakers;
    } catch (error) {
      logger.error('Error identifying speakers:', error);
      return [];
    }
  }
  
  /**
   * Validate audio file
   */
  async validateAudioFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.size > this.config.maxFileSize) {
        throw new Error(`File size exceeds maximum of ${this.config.maxFileSize / 1024 / 1024}MB`);
      }
      
      const ext = path.extname(filePath).toLowerCase().slice(1);
      if (!this.config.supportedFormats.includes(ext)) {
        throw new Error(`Unsupported format: ${ext}. Supported: ${this.config.supportedFormats.join(', ')}`);
      }
      
      return true;
    } catch (error) {
      logger.error('Error validating audio file:', error);
      throw error;
    }
  }
  
  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      averageMinutesPerTranscription: this.stats.totalTranscriptions > 0
        ? (this.stats.totalMinutes / this.stats.totalTranscriptions).toFixed(2)
        : 0,
      errorRate: this.stats.totalTranscriptions > 0
        ? ((this.stats.errorCount / this.stats.totalTranscriptions) * 100).toFixed(2) + '%'
        : '0%',
    };
  }
}

module.exports = new VoiceService();
