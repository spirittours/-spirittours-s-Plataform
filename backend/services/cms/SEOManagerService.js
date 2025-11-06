const EventEmitter = require('events');
const Page = require('../../models/cms/Page');

/**
 * SEOManagerService - Gestión de SEO y metadata
 * Genera sitemaps, valida SEO, sugiere mejoras
 */
class SEOManagerService extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    console.log('[SEOManagerService] Initializing...');
    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Generar sitemap XML
   */
  async generateSitemap(baseUrl = 'https://spirittours.com') {
    try {
      const publishedPages = await Page.findPublished();

      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      for (const page of publishedPages) {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
        
        if (page.lastPublishedAt) {
          xml += `    <lastmod>${page.lastPublishedAt.toISOString()}</lastmod>\n`;
        }
        
        // Prioridad basada en tipo de página
        let priority = '0.5';
        if (page.type === 'home') priority = '1.0';
        else if (page.type === 'about' || page.type === 'contact') priority = '0.8';
        
        xml += `    <priority>${priority}</priority>\n`;
        xml += '  </url>\n';
      }

      xml += '</urlset>';

      return {
        success: true,
        sitemap: xml,
        pageCount: publishedPages.length
      };
    } catch (error) {
      console.error('[SEOManagerService] Error generating sitemap:', error);
      throw error;
    }
  }

  /**
   * Analizar SEO de una página
   */
  async analyzeSEO(pageId) {
    try {
      const page = await Page.findById(pageId);

      if (!page) {
        throw new Error('Page not found');
      }

      const issues = [];
      const warnings = [];
      const suggestions = [];
      let score = 100;

      // Verificar título
      if (!page.title || page.title.length === 0) {
        issues.push('Missing page title');
        score -= 15;
      } else if (page.title.length < 30) {
        warnings.push('Page title is too short (recommended: 30-60 characters)');
        score -= 5;
      } else if (page.title.length > 60) {
        warnings.push('Page title is too long (recommended: 30-60 characters)');
        score -= 5;
      }

      // Verificar meta description
      if (!page.seo?.metaDescription) {
        issues.push('Missing meta description');
        score -= 15;
      } else if (page.seo.metaDescription.length < 120) {
        warnings.push('Meta description is too short (recommended: 120-160 characters)');
        score -= 5;
      } else if (page.seo.metaDescription.length > 160) {
        warnings.push('Meta description is too long (recommended: 120-160 characters)');
        score -= 5;
      }

      // Verificar slug
      if (!page.slug || page.slug.length === 0) {
        issues.push('Missing URL slug');
        score -= 10;
      } else if (page.slug.length > 75) {
        warnings.push('URL slug is too long');
        score -= 5;
      }

      // Verificar keywords
      if (!page.seo?.keywords || page.seo.keywords.length === 0) {
        warnings.push('No keywords defined');
        score -= 5;
      }

      // Verificar imágenes con alt text
      let imagesWithoutAlt = 0;
      if (page.sections) {
        page.sections.forEach(section => {
          if (section.type === 'image' && !section.content?.alt) {
            imagesWithoutAlt++;
          }
        });
      }

      if (imagesWithoutAlt > 0) {
        warnings.push(`${imagesWithoutAlt} image(s) without alt text`);
        score -= imagesWithoutAlt * 2;
      }

      // Verificar Open Graph
      if (!page.seo?.ogTitle || !page.seo?.ogDescription || !page.seo?.ogImage) {
        suggestions.push('Add Open Graph tags for better social media sharing');
        score -= 3;
      }

      // Verificar structured data
      if (!page.structuredData) {
        suggestions.push('Add Schema.org structured data for better search results');
        score -= 3;
      }

      // Sugerencias adicionales
      if (!page.seo?.canonical) {
        suggestions.push('Consider adding a canonical URL');
      }

      // Score mínimo 0
      score = Math.max(0, score);

      // Nivel de SEO
      let level = 'Excellent';
      if (score < 50) level = 'Poor';
      else if (score < 70) level = 'Needs Improvement';
      else if (score < 90) level = 'Good';

      return {
        success: true,
        analysis: {
          score,
          level,
          issues,
          warnings,
          suggestions,
          pageTitle: page.title,
          metaDescription: page.seo?.metaDescription || '',
          slug: page.slug
        }
      };
    } catch (error) {
      console.error('[SEOManagerService] Error analyzing SEO:', error);
      throw error;
    }
  }

  /**
   * Sugerir mejoras de SEO
   */
  async suggestImprovements(pageId) {
    try {
      const analysis = await this.analyzeSEO(pageId);
      
      const improvements = [];

      analysis.analysis.issues.forEach(issue => {
        improvements.push({
          type: 'critical',
          message: issue,
          action: this.getActionForIssue(issue)
        });
      });

      analysis.analysis.warnings.forEach(warning => {
        improvements.push({
          type: 'warning',
          message: warning,
          action: this.getActionForWarning(warning)
        });
      });

      analysis.analysis.suggestions.forEach(suggestion => {
        improvements.push({
          type: 'suggestion',
          message: suggestion,
          action: 'Consider implementing this improvement'
        });
      });

      return {
        success: true,
        score: analysis.analysis.score,
        improvements
      };
    } catch (error) {
      console.error('[SEOManagerService] Error suggesting improvements:', error);
      throw error;
    }
  }

  /**
   * Obtener acción para issue
   */
  getActionForIssue(issue) {
    if (issue.includes('title')) {
      return 'Add a descriptive page title (30-60 characters)';
    } else if (issue.includes('meta description')) {
      return 'Add a compelling meta description (120-160 characters)';
    } else if (issue.includes('slug')) {
      return 'Add a SEO-friendly URL slug';
    }
    return 'Fix this issue immediately';
  }

  /**
   * Obtener acción para warning
   */
  getActionForWarning(warning) {
    if (warning.includes('too short')) {
      return 'Expand the content to meet recommended length';
    } else if (warning.includes('too long')) {
      return 'Shorten the content to meet recommended length';
    } else if (warning.includes('alt text')) {
      return 'Add descriptive alt text to all images';
    } else if (warning.includes('keywords')) {
      return 'Add relevant keywords for better SEO';
    }
    return 'Review and improve this aspect';
  }

  /**
   * Generar robots.txt
   */
  generateRobotsTxt(options = {}) {
    const {
      sitemapUrl = '/sitemap.xml',
      disallow = []
    } = options;

    let txt = 'User-agent: *\n';
    
    if (disallow.length > 0) {
      disallow.forEach(path => {
        txt += `Disallow: ${path}\n`;
      });
    } else {
      txt += 'Disallow:\n';
    }

    txt += `\nSitemap: ${sitemapUrl}`;

    return {
      success: true,
      robotsTxt: txt
    };
  }

  /**
   * Obtener todas las páginas con problemas de SEO
   */
  async getPagesWithSEOIssues() {
    try {
      const allPages = await Page.find({ status: 'published' });
      const pagesWithIssues = [];

      for (const page of allPages) {
        const analysis = await this.analyzeSEO(page._id);
        
        if (analysis.analysis.score < 70 || analysis.analysis.issues.length > 0) {
          pagesWithIssues.push({
            pageId: page._id,
            title: page.title,
            slug: page.slug,
            score: analysis.analysis.score,
            issuesCount: analysis.analysis.issues.length,
            warningsCount: analysis.analysis.warnings.length
          });
        }
      }

      return {
        success: true,
        pages: pagesWithIssues.sort((a, b) => a.score - b.score),
        count: pagesWithIssues.length
      };
    } catch (error) {
      console.error('[SEOManagerService] Error getting pages with SEO issues:', error);
      throw error;
    }
  }
}

// Singleton
let instance = null;

function getSEOManagerService() {
  if (!instance) {
    instance = new SEOManagerService();
  }
  return instance;
}

module.exports = { SEOManagerService, getSEOManagerService };
