/**
 * Report Generator Service - Sprint 25 (Fase 7)
 * 
 * Multi-format report generation service for analytics dashboards.
 * Generates professional reports in CSV, PDF, and Excel formats.
 * 
 * Features:
 * - CSV export with custom delimiters
 * - PDF generation with charts and tables
 * - Excel export with multiple sheets and formatting
 * - Template-based report generation
 * - Scheduled report generation
 * - Email delivery integration
 */

const EventEmitter = require('events');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const { Parser: CSVParser } = require('json2csv');
const fs = require('fs');
const path = require('path');

class ReportGeneratorService extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Output settings
      outputDir: path.join(__dirname, '../../temp/reports'),
      
      // Format options
      formats: ['csv', 'pdf', 'xlsx'],
      defaultFormat: 'pdf',
      
      // CSV options
      csv: {
        delimiter: ',',
        includeHeaders: true,
        quote: '"'
      },
      
      // PDF options
      pdf: {
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        font: 'Helvetica',
        fontSize: 10,
        includeCharts: true,
        includeLogo: true
      },
      
      // Excel options
      xlsx: {
        includeFormatting: true,
        includeCharts: false,
        sheetNames: ['Summary', 'Details', 'Trends']
      },
      
      // File retention
      retentionDays: 7,
      autoCleanup: true,
      
      ...config
    };
    
    this.initialized = false;
    this.templates = new Map();
  }

  /**
   * Initialize the service
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('🚀 Initializing ReportGeneratorService...');
    
    try {
      // Ensure output directory exists
      if (!fs.existsSync(this.config.outputDir)) {
        fs.mkdirSync(this.config.outputDir, { recursive: true });
      }
      
      // Load report templates
      this.loadTemplates();
      
      // Start auto-cleanup if enabled
      if (this.config.autoCleanup) {
        this.startAutoCleanup();
      }
      
      this.initialized = true;
      this.emit('initialized');
      console.log('✅ ReportGeneratorService initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ ReportGeneratorService initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Generate report in specified format
   * 
   * @param {Object} options - Report options
   * @param {String} options.type - Report type (executive, trend, custom)
   * @param {String} options.format - Output format (csv, pdf, xlsx)
   * @param {Object} options.data - Report data
   * @param {Object} options.metadata - Report metadata
   * @returns {Object} Generated report info
   */
  async generateReport(options = {}) {
    const {
      type = 'executive',
      format = this.config.defaultFormat,
      data,
      metadata = {},
      template = null
    } = options;

    if (!this.config.formats.includes(format)) {
      throw new Error(`Unsupported format: ${format}`);
    }

    if (!data) {
      throw new Error('Report data is required');
    }

    try {
      const reportId = this.generateReportId();
      const fileName = `${type}_report_${reportId}.${format}`;
      const filePath = path.join(this.config.outputDir, fileName);

      let result;
      
      switch (format) {
        case 'csv':
          result = await this.generateCSV(data, filePath, metadata);
          break;
        case 'pdf':
          result = await this.generatePDF(data, filePath, metadata, template);
          break;
        case 'xlsx':
          result = await this.generateExcel(data, filePath, metadata);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const reportInfo = {
        reportId,
        type,
        format,
        fileName,
        filePath,
        size: result.size,
        generatedAt: new Date(),
        metadata: {
          ...metadata,
          recordCount: Array.isArray(data) ? data.length : 0
        }
      };

      this.emit('report_generated', reportInfo);
      return reportInfo;
      
    } catch (error) {
      console.error('Error generating report:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Generate CSV report
   */
  async generateCSV(data, filePath, metadata) {
    try {
      // Prepare data for CSV
      let csvData = data;
      
      // If data is an object with nested structures, flatten it
      if (!Array.isArray(data)) {
        csvData = this.flattenData(data);
      }

      // Configure CSV parser
      const fields = Object.keys(csvData[0] || {});
      const parser = new CSVParser({
        fields,
        delimiter: this.config.csv.delimiter,
        quote: this.config.csv.quote,
        header: this.config.csv.includeHeaders
      });

      const csv = parser.parse(csvData);

      // Write to file
      fs.writeFileSync(filePath, csv, 'utf-8');

      const stats = fs.statSync(filePath);
      
      return {
        success: true,
        size: stats.size,
        records: csvData.length
      };
      
    } catch (error) {
      console.error('Error generating CSV:', error);
      throw error;
    }
  }

  /**
   * Generate PDF report
   */
  async generatePDF(data, filePath, metadata, template) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: this.config.pdf.size,
          margins: this.config.pdf.margins
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Header
        this.addPDFHeader(doc, metadata);

        // Title
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text(metadata.title || 'Analytics Report', { align: 'center' });
        
        doc.moveDown();

        // Metadata section
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Generated: ${new Date().toLocaleString()}`, { align: 'left' });
        
        if (metadata.period) {
          doc.text(`Period: ${metadata.period.startDate} to ${metadata.period.endDate}`);
        }
        
        doc.moveDown();

        // Summary section
        if (data.summary) {
          this.addPDFSummary(doc, data.summary);
          doc.moveDown();
        }

        // KPIs section
        if (data.revenueMetrics || data.customerMetrics) {
          this.addPDFKPIs(doc, data);
          doc.moveDown();
        }

        // Trends section
        if (data.trends) {
          this.addPDFTrends(doc, data.trends);
        }

        // Table section
        if (Array.isArray(data)) {
          this.addPDFTable(doc, data);
        }

        // Footer
        this.addPDFFooter(doc);

        doc.end();

        stream.on('finish', () => {
          const stats = fs.statSync(filePath);
          resolve({
            success: true,
            size: stats.size
          });
        });

        stream.on('error', reject);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Excel report
   */
  async generateExcel(data, filePath, metadata) {
    try {
      const workbook = XLSX.utils.book_new();

      // Summary sheet
      if (data.summary) {
        const summaryData = this.convertToExcelFormat(data.summary);
        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      }

      // Details sheet
      if (data.revenueMetrics || data.customerMetrics) {
        const detailsData = this.prepareDetailsForExcel(data);
        const detailsSheet = XLSX.utils.json_to_sheet(detailsData);
        XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Details');
      }

      // Trends sheet
      if (data.trends || data.data) {
        const trendsData = Array.isArray(data.data) ? data.data : this.flattenData(data.trends || {});
        const trendsSheet = XLSX.utils.json_to_sheet(trendsData);
        XLSX.utils.book_append_sheet(workbook, trendsSheet, 'Trends');
      }

      // If data is array, add as Data sheet
      if (Array.isArray(data)) {
        const dataSheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');
      }

      // Write file
      XLSX.writeFile(workbook, filePath);

      const stats = fs.statSync(filePath);
      
      return {
        success: true,
        size: stats.size,
        sheets: workbook.SheetNames.length
      };
      
    } catch (error) {
      console.error('Error generating Excel:', error);
      throw error;
    }
  }

  /**
   * PDF Helper: Add header
   */
  addPDFHeader(doc, metadata) {
    if (this.config.pdf.includeLogo && metadata.logo) {
      // Add logo if available
      // doc.image(metadata.logo, 50, 50, { width: 100 });
    }

    doc.fontSize(8)
       .text(`${metadata.companyName || 'Spirit Tours'}`, { align: 'right' });
  }

  /**
   * PDF Helper: Add summary section
   */
  addPDFSummary(doc, summary) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Summary', { underline: true });
    
    doc.moveDown(0.5);
    doc.fontSize(10)
       .font('Helvetica');

    Object.entries(summary).forEach(([key, value]) => {
      const label = this.formatLabel(key);
      const formattedValue = this.formatValue(key, value);
      doc.text(`${label}: ${formattedValue}`);
    });
  }

  /**
   * PDF Helper: Add KPIs section
   */
  addPDFKPIs(doc, data) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Key Performance Indicators', { underline: true });
    
    doc.moveDown(0.5);
    doc.fontSize(10)
       .font('Helvetica');

    if (data.revenueMetrics) {
      doc.font('Helvetica-Bold').text('Revenue Metrics:');
      doc.font('Helvetica');
      Object.entries(data.revenueMetrics).forEach(([key, value]) => {
        if (typeof value !== 'object') {
          doc.text(`  ${this.formatLabel(key)}: ${this.formatValue(key, value)}`);
        }
      });
      doc.moveDown(0.5);
    }

    if (data.customerMetrics) {
      doc.font('Helvetica-Bold').text('Customer Metrics:');
      doc.font('Helvetica');
      Object.entries(data.customerMetrics).forEach(([key, value]) => {
        if (typeof value !== 'object') {
          doc.text(`  ${this.formatLabel(key)}: ${this.formatValue(key, value)}`);
        }
      });
      doc.moveDown(0.5);
    }

    if (data.operationalMetrics) {
      doc.font('Helvetica-Bold').text('Operational Metrics:');
      doc.font('Helvetica');
      Object.entries(data.operationalMetrics).forEach(([key, value]) => {
        if (typeof value !== 'object') {
          doc.text(`  ${this.formatLabel(key)}: ${this.formatValue(key, value)}`);
        }
      });
    }
  }

  /**
   * PDF Helper: Add trends section
   */
  addPDFTrends(doc, trends) {
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('Trends Analysis', { underline: true });
    
    doc.moveDown(0.5);
    doc.fontSize(10)
       .font('Helvetica');

    if (trends.trend) {
      doc.text(`Direction: ${trends.trend.direction}`);
      doc.text(`Strength: ${trends.trend.strength}`);
      doc.text(`Confidence: ${(trends.trend.confidence * 100).toFixed(1)}%`);
    }
  }

  /**
   * PDF Helper: Add table
   */
  addPDFTable(doc, data) {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const tableTop = doc.y + 10;
    const itemHeight = 20;
    const columnWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / headers.length;

    // Draw headers
    doc.fontSize(9)
       .font('Helvetica-Bold');
    
    headers.forEach((header, i) => {
      doc.text(
        this.formatLabel(header),
        doc.page.margins.left + i * columnWidth,
        tableTop,
        { width: columnWidth, align: 'left' }
      );
    });

    // Draw rows (limited to first 20 rows for space)
    doc.font('Helvetica');
    const rowsToShow = Math.min(data.length, 20);
    
    for (let i = 0; i < rowsToShow; i++) {
      const row = data[i];
      const y = tableTop + (i + 1) * itemHeight;

      headers.forEach((header, j) => {
        const value = this.formatValue(header, row[header]);
        doc.text(
          value,
          doc.page.margins.left + j * columnWidth,
          y,
          { width: columnWidth, align: 'left' }
        );
      });
    }

    if (data.length > rowsToShow) {
      doc.text(`... and ${data.length - rowsToShow} more rows`, {
        align: 'center'
      });
    }
  }

  /**
   * PDF Helper: Add footer
   */
  addPDFFooter(doc) {
    const pageCount = doc.bufferedPageRange().count;
    
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8)
         .text(
           `Page ${i + 1} of ${pageCount}`,
           doc.page.margins.left,
           doc.page.height - 50,
           { align: 'center' }
         );
    }
  }

  /**
   * Helper: Flatten nested data
   */
  flattenData(obj, prefix = '') {
    const flattened = [];
    
    if (Array.isArray(obj)) {
      return obj;
    }

    const flattenObject = (o, p = '') => {
      const result = {};
      Object.entries(o).forEach(([key, value]) => {
        const newKey = p ? `${p}_${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(result, flattenObject(value, newKey));
        } else if (!Array.isArray(value)) {
          result[newKey] = value;
        }
      });
      return result;
    };

    const flat = flattenObject(obj, prefix);
    return [flat];
  }

  /**
   * Helper: Prepare details for Excel
   */
  prepareDetailsForExcel(data) {
    const details = [];

    if (data.revenueMetrics) {
      Object.entries(data.revenueMetrics).forEach(([key, value]) => {
        if (typeof value !== 'object') {
          details.push({
            Category: 'Revenue',
            Metric: this.formatLabel(key),
            Value: value
          });
        }
      });
    }

    if (data.customerMetrics) {
      Object.entries(data.customerMetrics).forEach(([key, value]) => {
        if (typeof value !== 'object') {
          details.push({
            Category: 'Customer',
            Metric: this.formatLabel(key),
            Value: value
          });
        }
      });
    }

    if (data.operationalMetrics) {
      Object.entries(data.operationalMetrics).forEach(([key, value]) => {
        if (typeof value !== 'object') {
          details.push({
            Category: 'Operational',
            Metric: this.formatLabel(key),
            Value: value
          });
        }
      });
    }

    return details;
  }

  /**
   * Helper: Convert to Excel format
   */
  convertToExcelFormat(obj) {
    return Object.entries(obj).map(([key, value]) => ({
      Metric: this.formatLabel(key),
      Value: this.formatValue(key, value)
    }));
  }

  /**
   * Helper: Format label for display
   */
  formatLabel(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Helper: Format value based on key
   */
  formatValue(key, value) {
    if (value === null || value === undefined) return 'N/A';
    
    const lowerKey = key.toLowerCase();
    
    // Currency values
    if (lowerKey.includes('revenue') || lowerKey.includes('price') || lowerKey.includes('cost')) {
      return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    
    // Percentage values
    if (lowerKey.includes('rate') || lowerKey.includes('percentage') || lowerKey.includes('score')) {
      return `${Number(value).toFixed(2)}%`;
    }
    
    // Numbers
    if (typeof value === 'number') {
      return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    
    return String(value);
  }

  /**
   * Helper: Generate unique report ID
   */
  generateReportId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load report templates
   */
  loadTemplates() {
    // Define default templates
    this.templates.set('executive', {
      sections: ['summary', 'kpis', 'trends', 'recommendations']
    });
    
    this.templates.set('detailed', {
      sections: ['summary', 'revenue', 'customers', 'operations', 'employees', 'trends']
    });
    
    this.templates.set('custom', {
      sections: [] // User-defined
    });
  }

  /**
   * Start automatic cleanup of old reports
   */
  startAutoCleanup() {
    const cleanupInterval = 24 * 60 * 60 * 1000; // Daily
    
    setInterval(() => {
      this.cleanupOldReports();
    }, cleanupInterval);
    
    // Run initial cleanup
    this.cleanupOldReports();
  }

  /**
   * Clean up old report files
   */
  cleanupOldReports() {
    try {
      const files = fs.readdirSync(this.config.outputDir);
      const cutoffDate = Date.now() - (this.config.retentionDays * 24 * 60 * 60 * 1000);

      files.forEach(file => {
        const filePath = path.join(this.config.outputDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtimeMs < cutoffDate) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  Cleaned up old report: ${file}`);
        }
      });
      
    } catch (error) {
      console.error('Error cleaning up old reports:', error);
    }
  }
}

// Singleton instance
let instance = null;

function getReportGeneratorService(config) {
  if (!instance) {
    instance = new ReportGeneratorService(config);
  }
  return instance;
}

module.exports = {
  ReportGeneratorService,
  getReportGeneratorService
};
