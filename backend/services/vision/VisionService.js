const { OpenAI } = require('openai');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../config/logger');

/**
 * VisionService
 * Document analysis and OCR using GPT-4 Vision
 * 
 * Features:
 * - Document OCR and text extraction
 * - Invoice/Receipt processing
 * - Business card parsing
 * - Chart and diagram analysis
 * - Signature detection
 * - Multi-page document processing
 * - Image-based search
 * - Visual quality assessment
 */
class VisionService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.config = {
      model: 'gpt-4o', // GPT-4 with vision
      maxTokens: 4096,
      supportedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      maxFileSize: 20 * 1024 * 1024, // 20MB
    };
    
    this.stats = {
      totalAnalyses: 0,
      totalDocuments: 0,
      errorCount: 0,
    };
  }
  
  /**
   * Analyze image with custom prompt
   */
  async analyzeImage(imagePath, prompt, options = {}) {
    try {
      const { detail = 'high', maxTokens = this.config.maxTokens } = options;
      
      // Validate image
      await this.validateImage(imagePath);
      
      // Read and encode image
      const imageData = await this.encodeImage(imagePath);
      
      logger.info(`Analyzing image: ${path.basename(imagePath)}`);
      
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageData}`,
                  detail,
                },
              },
            ],
          },
        ],
        max_tokens: maxTokens,
      });
      
      this.stats.totalAnalyses++;
      
      return {
        success: true,
        analysis: completion.choices[0].message.content,
        usage: completion.usage,
        model: this.config.model,
      };
    } catch (error) {
      this.stats.errorCount++;
      logger.error('Error analyzing image:', error);
      throw error;
    }
  }
  
  /**
   * Extract text from document (OCR)
   */
  async extractTextFromDocument(imagePath, options = {}) {
    try {
      const { language = 'English', preserveFormatting = true } = options;
      
      const prompt = `Extract all text from this document image. 
Language: ${language}
${preserveFormatting ? 'Preserve the original formatting and structure.' : 'Return plain text.'}
Return only the extracted text, maintaining headings, paragraphs, and lists.`;
      
      const result = await this.analyzeImage(imagePath, prompt, { detail: 'high' });
      
      this.stats.totalDocuments++;
      
      return {
        ...result,
        extractedText: result.analysis,
        language,
      };
    } catch (error) {
      logger.error('Error extracting text:', error);
      throw error;
    }
  }
  
  /**
   * Process invoice/receipt
   */
  async processInvoice(imagePath) {
    try {
      const prompt = `Analyze this invoice/receipt and extract the following information in JSON format:
{
  "type": "invoice|receipt",
  "vendor": "company name",
  "vendorAddress": "address",
  "invoiceNumber": "number",
  "date": "YYYY-MM-DD",
  "dueDate": "YYYY-MM-DD",
  "items": [
    {
      "description": "item description",
      "quantity": number,
      "unitPrice": number,
      "amount": number
    }
  ],
  "subtotal": number,
  "tax": number,
  "total": number,
  "currency": "USD|EUR|etc",
  "paymentTerms": "terms",
  "notes": "additional notes"
}`;
      
      const result = await this.analyzeImage(imagePath, prompt, { detail: 'high' });
      
      try {
        const invoiceData = JSON.parse(result.analysis);
        return {
          success: true,
          invoiceData,
          rawText: result.analysis,
        };
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse invoice data',
          rawText: result.analysis,
        };
      }
    } catch (error) {
      logger.error('Error processing invoice:', error);
      throw error;
    }
  }
  
  /**
   * Parse business card
   */
  async parseBusinessCard(imagePath) {
    try {
      const prompt = `Extract information from this business card in JSON format:
{
  "name": "full name",
  "title": "job title",
  "company": "company name",
  "email": "email address",
  "phone": "phone number",
  "mobile": "mobile number",
  "website": "website URL",
  "address": "full address",
  "socialMedia": {
    "linkedin": "URL",
    "twitter": "handle"
  },
  "additionalInfo": "any other relevant information"
}`;
      
      const result = await this.analyzeImage(imagePath, prompt);
      
      try {
        const cardData = JSON.parse(result.analysis);
        return {
          success: true,
          cardData,
          rawText: result.analysis,
        };
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse business card',
          rawText: result.analysis,
        };
      }
    } catch (error) {
      logger.error('Error parsing business card:', error);
      throw error;
    }
  }
  
  /**
   * Analyze chart or diagram
   */
  async analyzeChart(imagePath, chartType = 'auto') {
    try {
      const prompt = `Analyze this ${chartType} chart/diagram and provide:
1. Chart type (bar, line, pie, scatter, etc.)
2. Title and labels
3. Data series and values (extract as much data as possible)
4. Key insights and trends
5. Any anomalies or notable patterns

Respond in JSON format:
{
  "chartType": "type",
  "title": "title",
  "xAxisLabel": "label",
  "yAxisLabel": "label",
  "dataSeries": [
    {
      "name": "series name",
      "data": [{"label": "x", "value": y}]
    }
  ],
  "insights": ["insight 1", "insight 2"],
  "trends": ["trend 1", "trend 2"]
}`;
      
      const result = await this.analyzeImage(imagePath, prompt, { detail: 'high' });
      
      try {
        const chartData = JSON.parse(result.analysis);
        return {
          success: true,
          chartData,
          rawAnalysis: result.analysis,
        };
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse chart data',
          rawAnalysis: result.analysis,
        };
      }
    } catch (error) {
      logger.error('Error analyzing chart:', error);
      throw error;
    }
  }
  
  /**
   * Detect signatures
   */
  async detectSignatures(imagePath) {
    try {
      const prompt = `Analyze this document and detect signatures. Provide:
1. Number of signatures found
2. Location of each signature (approximate position)
3. Whether each signature appears valid
4. Any text near signatures (dates, names)

Respond in JSON format:
{
  "signaturesFound": number,
  "signatures": [
    {
      "position": "top-right|bottom-left|etc",
      "appearsValid": true|false,
      "nearbyText": "text",
      "confidence": "high|medium|low"
    }
  ],
  "documentType": "contract|form|letter|etc"
}`;
      
      const result = await this.analyzeImage(imagePath, prompt);
      
      try {
        const signatureData = JSON.parse(result.analysis);
        return {
          success: true,
          signatureData,
        };
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse signature data',
          rawAnalysis: result.analysis,
        };
      }
    } catch (error) {
      logger.error('Error detecting signatures:', error);
      throw error;
    }
  }
  
  /**
   * Analyze form/document structure
   */
  async analyzeFormStructure(imagePath) {
    try {
      const prompt = `Analyze this form/document structure and extract:
1. Form title
2. All fields and their labels
3. Field types (text, checkbox, radio, dropdown, signature, etc.)
4. Pre-filled values
5. Required vs optional fields
6. Sections and their organization

Respond in JSON format:
{
  "title": "form title",
  "sections": [
    {
      "name": "section name",
      "fields": [
        {
          "label": "field label",
          "type": "text|checkbox|etc",
          "value": "pre-filled value or empty",
          "required": true|false
        }
      ]
    }
  ]
}`;
      
      const result = await this.analyzeImage(imagePath, prompt, { detail: 'high' });
      
      try {
        const formData = JSON.parse(result.analysis);
        return {
          success: true,
          formData,
        };
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse form structure',
          rawAnalysis: result.analysis,
        };
      }
    } catch (error) {
      logger.error('Error analyzing form structure:', error);
      throw error;
    }
  }
  
  /**
   * Compare two images
   */
  async compareImages(imagePath1, imagePath2, comparisonType = 'general') {
    try {
      // Validate both images
      await this.validateImage(imagePath1);
      await this.validateImage(imagePath2);
      
      // Encode both images
      const imageData1 = await this.encodeImage(imagePath1);
      const imageData2 = await this.encodeImage(imagePath2);
      
      const prompt = comparisonType === 'document'
        ? 'Compare these two documents. Identify differences in text, layout, and content. List all changes.'
        : 'Compare these two images. Describe similarities and differences.';
      
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageData1}`,
                  detail: 'high',
                },
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageData2}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: this.config.maxTokens,
      });
      
      return {
        success: true,
        comparison: completion.choices[0].message.content,
      };
    } catch (error) {
      logger.error('Error comparing images:', error);
      throw error;
    }
  }
  
  /**
   * Assess visual quality
   */
  async assessQuality(imagePath) {
    try {
      const prompt = `Assess the quality of this image for business use. Provide:
1. Overall quality score (0-100)
2. Resolution assessment
3. Clarity and focus
4. Lighting conditions
5. Suitability for OCR/text extraction
6. Recommendations for improvement

Respond in JSON format:
{
  "qualityScore": number,
  "resolution": "high|medium|low",
  "clarity": "excellent|good|fair|poor",
  "lighting": "excellent|good|fair|poor",
  "ocrSuitability": "high|medium|low",
  "issues": ["issue 1", "issue 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;
      
      const result = await this.analyzeImage(imagePath, prompt);
      
      try {
        const qualityData = JSON.parse(result.analysis);
        return {
          success: true,
          qualityData,
        };
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse quality assessment',
          rawAnalysis: result.analysis,
        };
      }
    } catch (error) {
      logger.error('Error assessing quality:', error);
      throw error;
    }
  }
  
  /**
   * Generate image description
   */
  async describeImage(imagePath, options = {}) {
    try {
      const { detail = 'medium', style = 'concise' } = options;
      
      const prompts = {
        concise: 'Describe this image in 2-3 sentences.',
        detailed: 'Provide a detailed description of this image, including all visible elements, colors, composition, and context.',
        technical: 'Provide a technical description of this image, including visual elements, layout, and any text or data visible.',
      };
      
      const result = await this.analyzeImage(
        imagePath,
        prompts[style] || prompts.concise,
        { detail }
      );
      
      return {
        success: true,
        description: result.analysis,
      };
    } catch (error) {
      logger.error('Error describing image:', error);
      throw error;
    }
  }
  
  // ========================================
  // Helper methods
  // ========================================
  
  async validateImage(filePath) {
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
      logger.error('Error validating image:', error);
      throw error;
    }
  }
  
  async encodeImage(imagePath) {
    const imageBuffer = await fs.readFile(imagePath);
    return imageBuffer.toString('base64');
  }
  
  getStats() {
    return {
      ...this.stats,
      errorRate: this.stats.totalAnalyses > 0
        ? ((this.stats.errorCount / this.stats.totalAnalyses) * 100).toFixed(2) + '%'
        : '0%',
    };
  }
}

module.exports = new VisionService();
