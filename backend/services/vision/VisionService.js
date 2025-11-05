/**
 * Vision Service - GPT-4V Document Analysis
 * Provides image and document analysis using GPT-4 Vision API
 * 
 * Features:
 * - Document OCR and extraction
 * - Image analysis and description
 * - Chart and graph interpretation
 * - Receipt and invoice parsing
 * - Business card extraction
 * - Handwriting recognition
 * - Multi-image analysis
 * - Screenshot understanding
 * - Diagram interpretation
 * - Visual QA (Question Answering)
 * 
 * Supported Formats: PNG, JPEG, WEBP, GIF (non-animated)
 * Max Image Size: 20 MB
 * Max Resolution: 2048x2048 (high detail mode)
 */

const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');
const axios = require('axios');
const sharp = require('sharp');

class VisionService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
      model: config.model || 'gpt-4o',
      maxTokens: config.maxTokens || 4096,
      temperature: config.temperature || 0.2,
      detailLevel: config.detailLevel || 'high', // low, high, auto
      maxImageSize: config.maxImageSize || 20 * 1024 * 1024, // 20 MB
      maxResolution: config.maxResolution || 2048,
      ...config
    };

    this.openai = new OpenAI({ apiKey: this.config.apiKey });
    
    // Supported formats
    this.supportedFormats = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
    
    // Analysis templates
    this.templates = {
      document: 'Extract all text from this document. Maintain formatting and structure.',
      receipt: 'Extract: merchant name, date, total amount, items purchased with prices, payment method, and any other relevant information.',
      invoice: 'Extract: invoice number, date, due date, seller details, buyer details, line items with quantities and prices, subtotal, tax, total amount.',
      businessCard: 'Extract: name, title, company, phone number, email, address, website, and any other contact information.',
      chart: 'Analyze this chart/graph. Describe: type of chart, data points, trends, key insights, and conclusions.',
      diagram: 'Describe this diagram in detail. Explain: components, relationships, flow, and purpose.',
      screenshot: 'Analyze this screenshot. Describe: UI elements, text content, functionality, and any issues visible.',
      handwriting: 'Transcribe the handwritten text in this image. Maintain original formatting if possible.',
      general: 'Provide a detailed description of this image, including all visible elements, text, and context.'
    };

    // Statistics
    this.stats = {
      totalAnalyses: 0,
      totalImages: 0,
      totalTokensUsed: 0,
      averageConfidence: 0,
      typeBreakdown: {},
      errors: 0
    };
  }

  /**
   * Analyze image with custom prompt
   */
  async analyzeImage(imagePath, prompt, options = {}) {
    const startTime = Date.now();

    try {
      // Validate and prepare image
      const imageData = await this.prepareImage(imagePath, options);

      this.emit('analysis:started', {
        file: imagePath,
        type: 'custom'
      });

      // Build messages
      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData.url,
                detail: options.detailLevel || this.config.detailLevel
              }
            }
          ]
        }
      ];

      // Call GPT-4V
      const response = await this.openai.chat.completions.create({
        model: options.model || this.config.model,
        messages,
        max_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature
      });

      const result = this.processResponse(response, 'custom');
      const processingTime = Date.now() - startTime;

      this.updateStatistics(result, 'custom', processingTime);

      this.emit('analysis:completed', {
        file: imagePath,
        type: 'custom',
        duration: processingTime
      });

      return {
        success: true,
        type: 'custom',
        content: result.content,
        confidence: result.confidence,
        tokens: result.tokens,
        processingTime,
        metadata: {
          model: response.model,
          imageSize: imageData.size,
          detailLevel: options.detailLevel || this.config.detailLevel
        }
      };

    } catch (error) {
      this.stats.errors++;
      this.emit('analysis:error', {
        file: imagePath,
        error: error.message
      });

      throw new Error(`Image analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze document (OCR and extraction)
   */
  async analyzeDocument(imagePath, options = {}) {
    const prompt = options.customPrompt || this.templates.document;
    return await this.analyzeImage(imagePath, prompt, {
      ...options,
      type: 'document'
    });
  }

  /**
   * Parse receipt
   */
  async parseReceipt(imagePath, options = {}) {
    const prompt = options.customPrompt || this.templates.receipt;
    
    const result = await this.analyzeImage(imagePath, prompt, {
      ...options,
      type: 'receipt'
    });

    // Structure the data
    return {
      ...result,
      structured: this.structureReceiptData(result.content)
    };
  }

  /**
   * Parse invoice
   */
  async parseInvoice(imagePath, options = {}) {
    const prompt = options.customPrompt || this.templates.invoice;
    
    const result = await this.analyzeImage(imagePath, prompt, {
      ...options,
      type: 'invoice'
    });

    return {
      ...result,
      structured: this.structureInvoiceData(result.content)
    };
  }

  /**
   * Extract business card information
   */
  async extractBusinessCard(imagePath, options = {}) {
    const prompt = options.customPrompt || this.templates.businessCard;
    
    const result = await this.analyzeImage(imagePath, prompt, {
      ...options,
      type: 'businessCard'
    });

    return {
      ...result,
      structured: this.structureBusinessCardData(result.content)
    };
  }

  /**
   * Analyze chart or graph
   */
  async analyzeChart(imagePath, options = {}) {
    const prompt = options.customPrompt || this.templates.chart;
    
    return await this.analyzeImage(imagePath, prompt, {
      ...options,
      type: 'chart'
    });
  }

  /**
   * Analyze diagram
   */
  async analyzeDiagram(imagePath, options = {}) {
    const prompt = options.customPrompt || this.templates.diagram;
    
    return await this.analyzeImage(imagePath, prompt, {
      ...options,
      type: 'diagram'
    });
  }

  /**
   * Analyze screenshot
   */
  async analyzeScreenshot(imagePath, options = {}) {
    const prompt = options.customPrompt || this.templates.screenshot;
    
    return await this.analyzeImage(imagePath, prompt, {
      ...options,
      type: 'screenshot'
    });
  }

  /**
   * Transcribe handwriting
   */
  async transcribeHandwriting(imagePath, options = {}) {
    const prompt = options.customPrompt || this.templates.handwriting;
    
    return await this.analyzeImage(imagePath, prompt, {
      ...options,
      type: 'handwriting'
    });
  }

  /**
   * Analyze multiple images together
   */
  async analyzeMultipleImages(imagePaths, prompt, options = {}) {
    const startTime = Date.now();

    try {
      this.emit('multi-analysis:started', {
        imageCount: imagePaths.length
      });

      // Prepare all images
      const imageDataArray = await Promise.all(
        imagePaths.map(path => this.prepareImage(path, options))
      );

      // Build content array
      const content = [
        {
          type: 'text',
          text: prompt
        },
        ...imageDataArray.map(imageData => ({
          type: 'image_url',
          image_url: {
            url: imageData.url,
            detail: options.detailLevel || this.config.detailLevel
          }
        }))
      ];

      const messages = [{ role: 'user', content }];

      // Call GPT-4V
      const response = await this.openai.chat.completions.create({
        model: options.model || this.config.model,
        messages,
        max_tokens: options.maxTokens || this.config.maxTokens,
        temperature: options.temperature || this.config.temperature
      });

      const result = this.processResponse(response, 'multi-image');
      const processingTime = Date.now() - startTime;

      this.updateStatistics(result, 'multi-image', processingTime);

      this.emit('multi-analysis:completed', {
        imageCount: imagePaths.length,
        duration: processingTime
      });

      return {
        success: true,
        type: 'multi-image',
        imageCount: imagePaths.length,
        content: result.content,
        confidence: result.confidence,
        tokens: result.tokens,
        processingTime,
        metadata: {
          model: response.model,
          detailLevel: options.detailLevel || this.config.detailLevel
        }
      };

    } catch (error) {
      this.stats.errors++;
      this.emit('multi-analysis:error', {
        imageCount: imagePaths.length,
        error: error.message
      });

      throw new Error(`Multi-image analysis failed: ${error.message}`);
    }
  }

  /**
   * Visual Question Answering
   */
  async askAboutImage(imagePath, question, options = {}) {
    return await this.analyzeImage(imagePath, question, {
      ...options,
      type: 'qa'
    });
  }

  /**
   * Compare two images
   */
  async compareImages(imagePath1, imagePath2, options = {}) {
    const prompt = options.customPrompt || 
      'Compare these two images. Describe similarities, differences, and any notable changes.';
    
    return await this.analyzeMultipleImages(
      [imagePath1, imagePath2],
      prompt,
      { ...options, type: 'comparison' }
    );
  }

  /**
   * Batch analyze multiple images
   */
  async batchAnalyze(imagePaths, analysisType = 'general', options = {}) {
    const results = [];
    const errors = [];

    this.emit('batch:started', {
      totalImages: imagePaths.length,
      type: analysisType
    });

    for (let i = 0; i < imagePaths.length; i++) {
      try {
        let result;
        
        switch (analysisType) {
          case 'document':
            result = await this.analyzeDocument(imagePaths[i], options);
            break;
          case 'receipt':
            result = await this.parseReceipt(imagePaths[i], options);
            break;
          case 'invoice':
            result = await this.parseInvoice(imagePaths[i], options);
            break;
          case 'businessCard':
            result = await this.extractBusinessCard(imagePaths[i], options);
            break;
          default:
            const prompt = this.templates[analysisType] || this.templates.general;
            result = await this.analyzeImage(imagePaths[i], prompt, options);
        }

        results.push({
          file: imagePaths[i],
          index: i,
          ...result
        });

        this.emit('batch:progress', {
          current: i + 1,
          total: imagePaths.length
        });

      } catch (error) {
        errors.push({
          file: imagePaths[i],
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
        total: imagePaths.length,
        successful: results.length,
        failed: errors.length
      }
    };
  }

  /**
   * Prepare image for API
   */
  async prepareImage(imagePath, options = {}) {
    // Validate file
    await this.validateImage(imagePath);

    // Check if it's a URL or local file
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return {
        url: imagePath,
        size: null,
        isUrl: true
      };
    }

    // Read local file
    const fileStats = await fs.stat(imagePath);
    let imageBuffer = await fs.readFile(imagePath);

    // Resize if too large
    if (options.resize !== false) {
      const metadata = await sharp(imageBuffer).metadata();
      
      if (metadata.width > this.config.maxResolution || 
          metadata.height > this.config.maxResolution) {
        imageBuffer = await sharp(imageBuffer)
          .resize(this.config.maxResolution, this.config.maxResolution, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .toBuffer();
      }
    }

    // Convert to base64
    const base64Image = imageBuffer.toString('base64');
    const mimeType = this.getImageMimeType(imagePath);
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    return {
      url: dataUrl,
      size: fileStats.size,
      isUrl: false
    };
  }

  /**
   * Validate image file
   */
  async validateImage(imagePath) {
    // Skip validation for URLs
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return true;
    }

    // Check if file exists
    try {
      await fs.access(imagePath);
    } catch (error) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Check file size
    const stats = await fs.stat(imagePath);
    if (stats.size > this.config.maxImageSize) {
      throw new Error(
        `File size ${stats.size} exceeds maximum ${this.config.maxImageSize} bytes`
      );
    }

    // Check file format
    const ext = path.extname(imagePath).toLowerCase().slice(1);
    if (!this.supportedFormats.includes(ext)) {
      throw new Error(
        `Unsupported format: ${ext}. Supported: ${this.supportedFormats.join(', ')}`
      );
    }

    return true;
  }

  /**
   * Get image MIME type
   */
  getImageMimeType(imagePath) {
    const ext = path.extname(imagePath).toLowerCase().slice(1);
    const mimeTypes = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif'
    };
    return mimeTypes[ext] || 'image/jpeg';
  }

  /**
   * Process API response
   */
  processResponse(response, analysisType) {
    const choice = response.choices[0];
    const content = choice.message.content;

    return {
      content,
      confidence: this.estimateConfidence(choice),
      tokens: {
        prompt: response.usage.prompt_tokens,
        completion: response.usage.completion_tokens,
        total: response.usage.total_tokens
      },
      finishReason: choice.finish_reason
    };
  }

  /**
   * Estimate confidence from response
   */
  estimateConfidence(choice) {
    // GPT-4V doesn't provide confidence scores
    // Estimate based on finish reason and response characteristics
    if (choice.finish_reason === 'stop') {
      return 0.95;
    } else if (choice.finish_reason === 'length') {
      return 0.85;
    }
    return 0.75;
  }

  /**
   * Structure receipt data
   */
  structureReceiptData(content) {
    // Basic parsing - can be enhanced with more sophisticated NLP
    const data = {
      merchant: null,
      date: null,
      total: null,
      items: [],
      paymentMethod: null,
      raw: content
    };

    // Extract patterns (simplified)
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('total')) {
        const match = line.match(/[\$€£]?\s?(\d+\.?\d*)/);
        if (match) data.total = parseFloat(match[1]);
      }
    }

    return data;
  }

  /**
   * Structure invoice data
   */
  structureInvoiceData(content) {
    return {
      invoiceNumber: null,
      date: null,
      dueDate: null,
      seller: {},
      buyer: {},
      items: [],
      subtotal: null,
      tax: null,
      total: null,
      raw: content
    };
  }

  /**
   * Structure business card data
   */
  structureBusinessCardData(content) {
    return {
      name: null,
      title: null,
      company: null,
      phone: null,
      email: null,
      address: null,
      website: null,
      raw: content
    };
  }

  /**
   * Update statistics
   */
  updateStatistics(result, type, processingTime) {
    this.stats.totalAnalyses++;
    this.stats.totalImages++;
    this.stats.totalTokensUsed += result.tokens.total;
    
    this.stats.typeBreakdown[type] = (this.stats.typeBreakdown[type] || 0) + 1;

    const currentAvg = this.stats.averageConfidence;
    const count = this.stats.totalAnalyses;
    this.stats.averageConfidence = 
      (currentAvg * (count - 1) + result.confidence) / count;
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      averageTokensPerAnalysis: this.stats.totalAnalyses > 0
        ? this.stats.totalTokensUsed / this.stats.totalAnalyses
        : 0,
      successRate: this.stats.totalAnalyses > 0
        ? ((this.stats.totalAnalyses - this.stats.errors) / 
           this.stats.totalAnalyses) * 100
        : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      totalAnalyses: 0,
      totalImages: 0,
      totalTokensUsed: 0,
      averageConfidence: 0,
      typeBreakdown: {},
      errors: 0
    };
  }
}

// Singleton instance
let visionServiceInstance = null;

function getVisionService(config = {}) {
  if (!visionServiceInstance) {
    visionServiceInstance = new VisionService(config);
  }
  return visionServiceInstance;
}

module.exports = {
  VisionService,
  getVisionService
};
