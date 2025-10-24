/**
 * Audio TTS Service
 * Sistema de generación de audio con múltiples proveedores
 * Optimización de costos y calidad según caso de uso
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/audio-tts.log' }),
    new winston.transports.Console()
  ]
});

// Configuración de proveedores TTS
const TTS_PROVIDERS = {
  elevenlabs: {
    name: 'ElevenLabs',
    endpoint: 'https://api.elevenlabs.io/v1/text-to-speech',
    costPer1MChars: 0.30,
    quality: 10,
    naturalness: 10,
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'pl', 'hi', 'ar', 'ja', 'ko', 'zh'],
    maxCharsPerRequest: 5000,
    voices: {
      male_guide: 'pNInz6obpgDQGcFmaJgB', // Adam
      female_guide: '21m00Tcm4TlvDq8ikWAM', // Rachel
      narrator: 'VR6AewLTigWG4xSOukaG', // Arnold
      storyteller: 'EXAVITQu4vr4xnSDxMaL' // Bella
    }
  },
  
  google: {
    name: 'Google Cloud TTS',
    endpoint: 'https://texttospeech.googleapis.com/v1/text:synthesize',
    costPer1MChars: 0.016,
    quality: 8,
    naturalness: 8,
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'he', 'hi', 'ru'],
    maxCharsPerRequest: 5000,
    voices: {
      male_guide: { name: 'es-ES-Standard-B', gender: 'MALE' },
      female_guide: { name: 'es-ES-Standard-A', gender: 'FEMALE' },
      narrator: { name: 'es-ES-Wavenet-B', gender: 'MALE' },
      storyteller: { name: 'es-ES-Wavenet-C', gender: 'FEMALE' }
    }
  },
  
  azure: {
    name: 'Azure Cognitive Services',
    endpoint: 'https://{region}.tts.speech.microsoft.com/cognitiveservices/v1',
    costPer1MChars: 0.016,
    quality: 8,
    naturalness: 8,
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'he', 'hi', 'ru'],
    maxCharsPerRequest: 5000,
    voices: {
      male_guide: 'es-ES-AlvaroNeural',
      female_guide: 'es-ES-ElviraNeural',
      narrator: 'es-ES-ThomasNeural',
      storyteller: 'es-ES-AbrilNeural'
    }
  },
  
  amazon: {
    name: 'Amazon Polly',
    endpoint: 'https://polly.{region}.amazonaws.com/v1/speech',
    costPer1MChars: 0.004,
    quality: 7,
    naturalness: 7,
    languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh', 'ar', 'he', 'hi', 'ru'],
    maxCharsPerRequest: 3000,
    voices: {
      male_guide: 'Miguel',
      female_guide: 'Lucia',
      narrator: 'Enrique',
      storyteller: 'Conchita'
    }
  }
};

// Voces especializadas por perspectiva
const PERSPECTIVE_VOICES = {
  islamic: {
    provider: 'elevenlabs',
    voice: 'narrator',
    style: 'respectful',
    speed: 0.95,
    pitch: 0
  },
  jewish: {
    provider: 'google',
    voice: 'male_guide',
    style: 'educational',
    speed: 1.0,
    pitch: 0
  },
  christian: {
    provider: 'google',
    voice: 'storyteller',
    style: 'warm',
    speed: 0.95,
    pitch: 2
  },
  historical: {
    provider: 'azure',
    voice: 'narrator',
    style: 'academic',
    speed: 1.0,
    pitch: 0
  },
  cultural: {
    provider: 'google',
    voice: 'female_guide',
    style: 'engaging',
    speed: 1.05,
    pitch: 1
  },
  archaeological: {
    provider: 'amazon',
    voice: 'narrator',
    style: 'documentary',
    speed: 1.0,
    pitch: -1
  }
};

class AudioTTSService {
  constructor(config = {}) {
    this.config = {
      audioDir: config.audioDir || './audio-cache',
      defaultProvider: config.defaultProvider || 'google',
      qualityThreshold: config.qualityThreshold || 8,
      cacheEnabled: config.cacheEnabled !== false,
      uploadToCloud: config.uploadToCloud || false,
      ...config
    };

    this.stats = {
      generated: 0,
      cached: 0,
      totalCost: 0,
      providerUsage: {}
    };

    // Inicializar estadísticas por proveedor
    Object.keys(TTS_PROVIDERS).forEach(provider => {
      this.stats.providerUsage[provider] = {
        requests: 0,
        characters: 0,
        cost: 0,
        avgQuality: 0
      };
    });

    // Crear directorio de cache si no existe
    this.ensureAudioDirectory();
  }

  async ensureAudioDirectory() {
    try {
      await fs.mkdir(this.config.audioDir, { recursive: true });
    } catch (error) {
      logger.error('Error creating audio directory:', error);
    }
  }

  /**
   * Genera audio a partir de texto
   */
  async generateAudio(text, options = {}) {
    const {
      language = 'es',
      perspective = null,
      importance = 'medium',
      voice = 'male_guide',
      speed = 1.0,
      emotion = 'neutral',
      format = 'mp3',
      useCache = true
    } = options;

    // Generar hash para cache
    const audioHash = this.generateHash(text, { language, perspective, voice, speed });

    // Verificar cache si está habilitado
    if (useCache && this.config.cacheEnabled) {
      const cachedAudio = await this.getFromCache(audioHash);
      if (cachedAudio) {
        this.stats.cached++;
        logger.info('Audio served from cache', { hash: audioHash });
        return {
          success: true,
          audioUrl: cachedAudio.url,
          audioPath: cachedAudio.path,
          duration: cachedAudio.duration,
          source: 'cache',
          cost: 0
        };
      }
    }

    // Seleccionar proveedor según criterios
    const provider = this.selectProvider(text, {
      perspective,
      importance,
      language,
      qualityRequired: importance === 'high' ? 9 : 7
    });

    logger.info('Generating audio with TTS', {
      provider: provider.name,
      characters: text.length,
      language,
      perspective
    });

    try {
      // Generar audio según proveedor
      const audioData = await this.callProvider(provider.key, text, {
        language,
        voice,
        speed,
        emotion,
        format
      });

      // Calcular costo
      const cost = (text.length / 1000000) * provider.costPer1MChars;

      // Guardar audio en cache
      const audioPath = await this.saveToCache(audioHash, audioData, {
        text,
        provider: provider.key,
        language,
        perspective,
        metadata: {
          cost,
          characters: text.length,
          generatedAt: new Date()
        }
      });

      // Actualizar estadísticas
      this.updateStats(provider.key, text.length, cost);

      // Subir a cloud storage si está configurado
      let cloudUrl = null;
      if (this.config.uploadToCloud) {
        cloudUrl = await this.uploadToCloud(audioPath);
      }

      return {
        success: true,
        audioUrl: cloudUrl || `/audio/${audioHash}.${format}`,
        audioPath,
        duration: audioData.duration,
        provider: provider.name,
        cost,
        source: 'generated',
        metadata: {
          characters: text.length,
          language,
          perspective
        }
      };

    } catch (error) {
      logger.error('Error generating audio:', error);
      throw new Error(`Audio generation failed: ${error.message}`);
    }
  }

  /**
   * Genera audio guía completo para una perspectiva
   */
  async generatePerspectiveAudio(perspectiveData, options = {}) {
    const { perspective, explanation } = perspectiveData;
    
    // Obtener configuración de voz para esta perspectiva
    const voiceConfig = PERSPECTIVE_VOICES[perspective.id] || {
      provider: 'google',
      voice: 'male_guide',
      speed: 1.0
    };

    // Generar audio con configuración específica
    const audio = await this.generateAudio(explanation.content || explanation.full, {
      language: options.language || 'es',
      perspective: perspective.id,
      importance: 'high',
      voice: voiceConfig.voice,
      speed: voiceConfig.speed,
      provider: voiceConfig.provider,
      format: options.format || 'mp3'
    });

    return {
      ...audio,
      perspectiveId: perspective.id,
      perspectiveName: perspective.name,
      voiceProfile: voiceConfig
    };
  }

  /**
   * Genera múltiples audios en batch
   */
  async generateBatch(items, options = {}) {
    const results = [];
    
    for (const item of items) {
      try {
        const audio = await this.generateAudio(item.text, {
          ...options,
          ...item.options
        });
        results.push({ success: true, item, audio });
      } catch (error) {
        results.push({ success: false, item, error: error.message });
      }
    }

    return results;
  }

  /**
   * Selecciona el mejor proveedor según criterios
   */
  selectProvider(text, criteria) {
    const {
      perspective,
      importance,
      language,
      qualityRequired = 7,
      preferredProvider = null
    } = criteria;

    // Si hay proveedor preferido y cumple requisitos, usarlo
    if (preferredProvider && TTS_PROVIDERS[preferredProvider]) {
      const provider = TTS_PROVIDERS[preferredProvider];
      if (provider.quality >= qualityRequired && provider.languages.includes(language)) {
        return { key: preferredProvider, ...provider };
      }
    }

    // Si hay perspectiva específica, usar voz configurada
    if (perspective && PERSPECTIVE_VOICES[perspective]) {
      const voiceConfig = PERSPECTIVE_VOICES[perspective];
      const provider = TTS_PROVIDERS[voiceConfig.provider];
      if (provider.quality >= qualityRequired) {
        return { key: voiceConfig.provider, ...provider };
      }
    }

    // Estrategia por importancia
    if (importance === 'high') {
      // Para alta importancia, usar ElevenLabs (mejor calidad)
      if (TTS_PROVIDERS.elevenlabs.languages.includes(language)) {
        return { key: 'elevenlabs', ...TTS_PROVIDERS.elevenlabs };
      }
    }

    // Para importancia media/baja, optimizar por costo
    const providers = Object.entries(TTS_PROVIDERS)
      .filter(([_, p]) => p.quality >= qualityRequired && p.languages.includes(language))
      .sort((a, b) => a[1].costPer1MChars - b[1].costPer1MChars);

    if (providers.length === 0) {
      throw new Error(`No provider available for language ${language} with quality ${qualityRequired}`);
    }

    const [key, provider] = providers[0];
    return { key, ...provider };
  }

  /**
   * Llama al proveedor específico
   */
  async callProvider(providerKey, text, options) {
    const provider = TTS_PROVIDERS[providerKey];
    
    switch (providerKey) {
      case 'elevenlabs':
        return await this.callElevenLabs(text, options);
      
      case 'google':
        return await this.callGoogleTTS(text, options);
      
      case 'azure':
        return await this.callAzureTTS(text, options);
      
      case 'amazon':
        return await this.callAmazonPolly(text, options);
      
      default:
        throw new Error(`Provider ${providerKey} not implemented`);
    }
  }

  /**
   * ElevenLabs TTS
   */
  async callElevenLabs(text, options) {
    const provider = TTS_PROVIDERS.elevenlabs;
    const voiceId = provider.voices[options.voice] || provider.voices.male_guide;

    const response = await axios.post(
      `${provider.endpoint}/${voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    return {
      audio: Buffer.from(response.data),
      duration: this.estimateDuration(text),
      format: 'mp3'
    };
  }

  /**
   * Google Cloud TTS
   */
  async callGoogleTTS(text, options) {
    const provider = TTS_PROVIDERS.google;
    const voice = provider.voices[options.voice] || provider.voices.male_guide;

    const response = await axios.post(
      `${provider.endpoint}?key=${process.env.GOOGLE_TTS_API_KEY}`,
      {
        input: { text },
        voice: {
          languageCode: `${options.language}-${options.language.toUpperCase()}`,
          name: voice.name,
          ssmlGender: voice.gender
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: options.speed || 1.0,
          pitch: 0.0
        }
      }
    );

    return {
      audio: Buffer.from(response.data.audioContent, 'base64'),
      duration: this.estimateDuration(text),
      format: 'mp3'
    };
  }

  /**
   * Azure Cognitive Services TTS
   */
  async callAzureTTS(text, options) {
    const provider = TTS_PROVIDERS.azure;
    const voiceName = provider.voices[options.voice] || provider.voices.male_guide;
    const region = process.env.AZURE_REGION || 'westus';

    const ssml = `
      <speak version='1.0' xml:lang='${options.language}-${options.language.toUpperCase()}'>
        <voice name='${voiceName}'>
          <prosody rate='${options.speed || 1.0}'>
            ${text}
          </prosody>
        </voice>
      </speak>
    `;

    const response = await axios.post(
      provider.endpoint.replace('{region}', region),
      ssml,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.AZURE_TTS_API_KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
        },
        responseType: 'arraybuffer'
      }
    );

    return {
      audio: Buffer.from(response.data),
      duration: this.estimateDuration(text),
      format: 'mp3'
    };
  }

  /**
   * Amazon Polly TTS
   */
  async callAmazonPolly(text, options) {
    // Implementación con AWS SDK
    const AWS = require('aws-sdk');
    const polly = new AWS.Polly({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    const provider = TTS_PROVIDERS.amazon;
    const voiceId = provider.voices[options.voice] || provider.voices.male_guide;

    const params = {
      Text: text,
      OutputFormat: 'mp3',
      VoiceId: voiceId,
      Engine: 'neural',
      LanguageCode: `${options.language}-${options.language.toUpperCase()}`
    };

    const response = await polly.synthesizeSpeech(params).promise();

    return {
      audio: response.AudioStream,
      duration: this.estimateDuration(text),
      format: 'mp3'
    };
  }

  /**
   * Genera hash para identificación única
   */
  generateHash(text, options) {
    const data = JSON.stringify({ text, ...options });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Obtiene audio del cache
   */
  async getFromCache(hash) {
    const audioPath = path.join(this.config.audioDir, `${hash}.mp3`);
    const metadataPath = path.join(this.config.audioDir, `${hash}.json`);

    try {
      await fs.access(audioPath);
      const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));

      return {
        path: audioPath,
        url: `/audio/${hash}.mp3`,
        duration: metadata.duration,
        ...metadata
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Guarda audio en cache
   */
  async saveToCache(hash, audioData, metadata) {
    const audioPath = path.join(this.config.audioDir, `${hash}.mp3`);
    const metadataPath = path.join(this.config.audioDir, `${hash}.json`);

    await fs.writeFile(audioPath, audioData.audio);
    await fs.writeFile(metadataPath, JSON.stringify({
      ...metadata,
      duration: audioData.duration,
      format: audioData.format,
      cachedAt: new Date()
    }, null, 2));

    return audioPath;
  }

  /**
   * Estima duración del audio
   */
  estimateDuration(text) {
    // Estimación: ~150 palabras por minuto
    const words = text.split(/\s+/).length;
    return Math.ceil((words / 150) * 60);
  }

  /**
   * Actualiza estadísticas
   */
  updateStats(provider, characters, cost) {
    this.stats.generated++;
    this.stats.totalCost += cost;

    const providerStats = this.stats.providerUsage[provider];
    providerStats.requests++;
    providerStats.characters += characters;
    providerStats.cost += cost;
  }

  /**
   * Obtiene estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      cacheHitRate: this.stats.cached / (this.stats.generated + this.stats.cached) * 100,
      avgCostPerGeneration: this.stats.totalCost / this.stats.generated,
      providerBreakdown: Object.entries(this.stats.providerUsage).map(([provider, stats]) => ({
        provider,
        ...stats,
        avgCostPerRequest: stats.cost / stats.requests
      }))
    };
  }

  /**
   * Sube audio a cloud storage (S3, GCS, Azure Blob)
   */
  async uploadToCloud(localPath) {
    // Implementar según cloud provider configurado
    // Por ahora, retornar URL local
    return `/audio/${path.basename(localPath)}`;
  }

  /**
   * Limpia cache antiguo
   */
  async cleanOldCache(daysOld = 30) {
    const files = await fs.readdir(this.config.audioDir);
    const now = Date.now();
    const maxAge = daysOld * 24 * 60 * 60 * 1000;

    let deleted = 0;

    for (const file of files) {
      const filePath = path.join(this.config.audioDir, file);
      const stats = await fs.stat(filePath);

      if (now - stats.mtimeMs > maxAge) {
        await fs.unlink(filePath);
        deleted++;
      }
    }

    logger.info(`Cleaned ${deleted} old audio files`);
    return deleted;
  }
}

module.exports = AudioTTSService;
