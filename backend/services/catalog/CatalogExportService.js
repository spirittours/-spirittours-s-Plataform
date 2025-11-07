const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const Catalog = require('../../models/catalog/Catalog');

/**
 * CatalogExportService - Servicio integrado para exportación de catálogos
 * Genera PDF, Word y Flipbook
 * 
 * NOTA: Este es un servicio base. Requiere instalación de:
 * - puppeteer (para PDF)
 * - docx (para Word)
 * - pdf2pic o similar (para flipbook)
 */
class CatalogExportService extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
    this.outputDir = path.join(process.cwd(), 'generated', 'catalogs');
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('[CatalogExportService] Initializing...');
    
    // Crear directorio de salida
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'pdf'), { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'word'), { recursive: true });
      await fs.mkdir(path.join(this.outputDir, 'flipbook'), { recursive: true });
    } catch (error) {
      console.error('[CatalogExportService] Error creating directories:', error);
    }
    
    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Generar todos los formatos de un catálogo
   */
  async generateCatalog(catalogId) {
    const startTime = Date.now();
    
    try {
      const catalog = await Catalog.findById(catalogId)
        .populate('content.selectedTours')
        .populate('createdBy', 'name email');

      if (!catalog) {
        throw new Error('Catalog not found');
      }

      // Marcar como generando
      await catalog.startGeneration();
      this.emit('catalog:generating', { catalog });

      const files = {};

      // Generar PDF si está habilitado
      if (catalog.export.formats.pdf) {
        const pdfResult = await this.generatePDF(catalog);
        files.pdf = pdfResult;
      }

      // Generar Word si está habilitado
      if (catalog.export.formats.word) {
        const wordResult = await this.generateWord(catalog);
        files.word = wordResult;
      }

      // Generar Flipbook si está habilitado
      if (catalog.export.formats.flipbook && files.pdf) {
        const flipbookResult = await this.generateFlipbook(catalog, files.pdf.filePath);
        files.flipbook = flipbookResult;
      }

      const generationTime = Math.round((Date.now() - startTime) / 1000);

      // Marcar como listo
      await catalog.markAsReady(files, generationTime);
      this.emit('catalog:generated', { catalog, files, generationTime });

      return {
        success: true,
        catalog,
        files,
        generationTime
      };
    } catch (error) {
      console.error('[CatalogExportService] Error generating catalog:', error);
      
      const catalog = await Catalog.findById(catalogId);
      if (catalog) {
        await catalog.markAsError(error.message);
      }
      
      this.emit('catalog:generation_error', { catalogId, error });
      throw error;
    }
  }

  /**
   * Generar PDF
   * NOTA: Requiere puppeteer instalado
   */
  async generatePDF(catalog) {
    try {
      console.log('[CatalogExportService] Generating PDF for catalog:', catalog.title);
      
      // Generar HTML del catálogo
      const html = await this.generateCatalogHTML(catalog);
      
      // Nombre del archivo
      const filename = `catalog_${catalog._id}_${Date.now()}.pdf`;
      const filePath = path.join(this.outputDir, 'pdf', filename);
      
      // IMPLEMENTACIÓN SIMPLIFICADA
      // En producción, usar puppeteer:
      /*
      const puppeteer = require('puppeteer');
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      await page.pdf({
        path: filePath,
        format: catalog.design.pageSize,
        orientation: catalog.design.orientation,
        printBackground: true,
        margin: catalog.design.margins
      });
      
      await browser.close();
      */
      
      // Por ahora, crear archivo placeholder
      await fs.writeFile(filePath, `PDF Placeholder for: ${catalog.title}\n\n${html}`);
      
      const stats = await fs.stat(filePath);
      
      return {
        url: `/generated/catalogs/pdf/${filename}`,
        filePath,
        size: stats.size
      };
    } catch (error) {
      console.error('[CatalogExportService] Error generating PDF:', error);
      throw error;
    }
  }

  /**
   * Generar Word
   * NOTA: Requiere librería docx instalada
   */
  async generateWord(catalog) {
    try {
      console.log('[CatalogExportService] Generating Word for catalog:', catalog.title);
      
      const filename = `catalog_${catalog._id}_${Date.now()}.docx`;
      const filePath = path.join(this.outputDir, 'word', filename);
      
      // IMPLEMENTACIÓN SIMPLIFICADA
      // En producción, usar librería docx:
      /*
      const { Document, Packer, Paragraph, Table, ImageRun } = require('docx');
      
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({ text: catalog.title, heading: 'Title' }),
              // ... más contenido
            ]
          }
        ]
      });
      
      const buffer = await Packer.toBuffer(doc);
      await fs.writeFile(filePath, buffer);
      */
      
      // Placeholder
      await fs.writeFile(filePath, `Word Document Placeholder for: ${catalog.title}`);
      
      const stats = await fs.stat(filePath);
      
      return {
        url: `/generated/catalogs/word/${filename}`,
        filePath,
        size: stats.size
      };
    } catch (error) {
      console.error('[CatalogExportService] Error generating Word:', error);
      throw error;
    }
  }

  /**
   * Generar Flipbook
   * NOTA: Convierte PDF a imágenes y crea HTML con turn.js
   */
  async generateFlipbook(catalog, pdfPath) {
    try {
      console.log('[CatalogExportService] Generating Flipbook for catalog:', catalog.title);
      
      const flipbookDir = path.join(this.outputDir, 'flipbook', catalog._id.toString());
      await fs.mkdir(flipbookDir, { recursive: true });
      
      // IMPLEMENTACIÓN SIMPLIFICADA
      // En producción, convertir PDF a imágenes y crear HTML interactivo
      /*
      const pdf2pic = require('pdf2pic');
      const converter = pdf2pic.fromPath(pdfPath, {
        density: 100,
        saveFilename: 'page',
        savePath: flipbookDir,
        format: 'jpg',
        width: 800,
        height: 1000
      });
      
      const pages = await converter.bulk(-1);
      
      // Crear HTML con turn.js
      const flipbookHTML = this.createFlipbookHTML(catalog, pages);
      await fs.writeFile(path.join(flipbookDir, 'index.html'), flipbookHTML);
      */
      
      // Placeholder
      const placeholderHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${catalog.title} - Flipbook</title>
        </head>
        <body>
          <h1>${catalog.title}</h1>
          <p>Flipbook Placeholder</p>
        </body>
        </html>
      `;
      
      await fs.writeFile(path.join(flipbookDir, 'index.html'), placeholderHTML);
      
      return {
        url: `/generated/catalogs/flipbook/${catalog._id}/index.html`
      };
    } catch (error) {
      console.error('[CatalogExportService] Error generating Flipbook:', error);
      throw error;
    }
  }

  /**
   * Generar HTML del catálogo
   */
  async generateCatalogHTML(catalog) {
    try {
      let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${catalog.title}</title>
          <style>
            body {
              font-family: ${catalog.design.fontFamily}, sans-serif;
              color: ${catalog.design.textColor};
              background: ${catalog.design.backgroundColor};
              margin: 0;
              padding: 20px;
            }
            .cover {
              text-align: center;
              padding: 50px 0;
            }
            .cover h1 {
              color: ${catalog.design.primaryColor};
              font-size: 48px;
              margin: 20px 0;
            }
            .tour-section {
              page-break-after: always;
              margin: 40px 0;
            }
            .tour-title {
              color: ${catalog.design.primaryColor};
              font-size: 32px;
              margin-bottom: 20px;
            }
            .pricing-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            .pricing-table th, .pricing-table td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: center;
            }
            .pricing-table th {
              background: ${catalog.design.primaryColor};
              color: white;
            }
          </style>
        </head>
        <body>
      `;

      // Portada
      html += `
        <div class="cover">
          <h1>${catalog.title}</h1>
          ${catalog.subtitle ? `<p style="font-size: 24px;">${catalog.subtitle}</p>` : ''}
          ${catalog.coverImage ? `<img src="${catalog.coverImage}" style="max-width: 400px;">` : ''}
        </div>
      `;

      // Páginas personalizadas iniciales
      if (catalog.customPages.firstPages) {
        for (const page of catalog.customPages.firstPages) {
          html += `
            <div class="custom-page">
              <h2>${page.title}</h2>
              <div>${page.content}</div>
            </div>
          `;
        }
      }

      // Tours
      const tours = catalog.content.selectedTours || [];
      for (const tour of tours) {
        html += `
          <div class="tour-section">
            <h2 class="tour-title">${tour.title || tour.name}</h2>
            <p>${tour.description || ''}</p>
            
            ${catalog.pricing.showPrices ? this.generatePricingTableHTML(tour, catalog) : ''}
          </div>
        `;
      }

      // Páginas personalizadas finales
      if (catalog.customPages.lastPages) {
        for (const page of catalog.customPages.lastPages) {
          html += `
            <div class="custom-page">
              <h2>${page.title}</h2>
              <div>${page.content}</div>
            </div>
          `;
        }
      }

      html += `
        </body>
        </html>
      `;

      return html;
    } catch (error) {
      console.error('[CatalogExportService] Error generating HTML:', error);
      throw error;
    }
  }

  /**
   * Generar tabla de precios HTML
   */
  generatePricingTableHTML(tour, catalog) {
    // Implementación simplificada
    return `
      <table class="pricing-table">
        <thead>
          <tr>
            <th>Temporada</th>
            <th>Doble</th>
            <th>Triple</th>
            <th>Supl. Individual</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Temporada Baja</td>
            <td>$${Math.floor(Math.random() * 1000) + 500}</td>
            <td>$${Math.floor(Math.random() * 900) + 400}</td>
            <td>$${Math.floor(Math.random() * 300) + 100}</td>
          </tr>
        </tbody>
      </table>
    `;
  }
}

// Singleton
let instance = null;

function getCatalogExportService() {
  if (!instance) {
    instance = new CatalogExportService();
  }
  return instance;
}

module.exports = { CatalogExportService, getCatalogExportService };
