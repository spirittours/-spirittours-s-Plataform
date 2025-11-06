/**
 * CMS API Client Service
 * Handles all API communication with the CMS backend
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * PAGE BUILDER API
 */
export const pageAPI = {
  // Get all pages with filters
  async getPages(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    
    const response = await apiClient.get(`/cms/pages?${params}`);
    return response.data;
  },

  // Get single page by ID
  async getPage(id) {
    const response = await apiClient.get(`/cms/pages/${id}`);
    return response.data;
  },

  // Get page by slug (public)
  async getPageBySlug(slug) {
    const response = await apiClient.get(`/cms/pages/slug/${slug}`);
    return response.data;
  },

  // Create new page
  async createPage(pageData) {
    const response = await apiClient.post('/cms/pages', pageData);
    return response.data;
  },

  // Update page
  async updatePage(id, pageData) {
    const response = await apiClient.put(`/cms/pages/${id}`, pageData);
    return response.data;
  },

  // Publish page
  async publishPage(id, scheduleDate = null) {
    const response = await apiClient.post(`/cms/pages/${id}/publish`, {
      scheduleDate,
    });
    return response.data;
  },

  // Unpublish page
  async unpublishPage(id) {
    const response = await apiClient.post(`/cms/pages/${id}/unpublish`);
    return response.data;
  },

  // Duplicate page
  async duplicatePage(id) {
    const response = await apiClient.post(`/cms/pages/${id}/duplicate`);
    return response.data;
  },

  // Delete page (soft delete)
  async deletePage(id) {
    const response = await apiClient.delete(`/cms/pages/${id}`);
    return response.data;
  },

  // Get page versions
  async getPageVersions(id) {
    const response = await apiClient.get(`/cms/pages/${id}/versions`);
    return response.data;
  },

  // Restore page version
  async restoreVersion(id, version) {
    const response = await apiClient.post(`/cms/pages/${id}/restore-version`, {
      version,
    });
    return response.data;
  },

  // Preview page
  async previewPage(id) {
    const response = await apiClient.get(`/cms/pages/${id}/preview`);
    return response.data;
  },
};

/**
 * MEDIA LIBRARY API
 */
export const mediaAPI = {
  // Get all media assets
  async getAssets(filters = {}) {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.folder) params.append('folder', filters.folder);
    if (filters.search) params.append('search', filters.search);
    if (filters.tags) params.append('tags', filters.tags.join(','));
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    
    const response = await apiClient.get(`/cms/media?${params}`);
    return response.data;
  },

  // Get single asset
  async getAsset(id) {
    const response = await apiClient.get(`/cms/media/${id}`);
    return response.data;
  },

  // Upload single file
  async uploadFile(file, metadata = {}) {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata.folder) formData.append('folder', metadata.folder);
    if (metadata.alt) formData.append('alt', metadata.alt);
    if (metadata.title) formData.append('title', metadata.title);
    if (metadata.tags) formData.append('tags', JSON.stringify(metadata.tags));

    const response = await apiClient.post('/cms/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Upload multiple files
  async uploadMultipleFiles(files, metadata = {}) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (metadata.folder) formData.append('folder', metadata.folder);
    if (metadata.tags) formData.append('tags', JSON.stringify(metadata.tags));

    const response = await apiClient.post('/cms/media/upload-multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Update asset metadata
  async updateAsset(id, metadata) {
    const response = await apiClient.put(`/cms/media/${id}`, metadata);
    return response.data;
  },

  // Delete asset (soft delete)
  async deleteAsset(id) {
    const response = await apiClient.delete(`/cms/media/${id}`);
    return response.data;
  },

  // Permanently delete asset
  async deleteAssetPermanently(id) {
    const response = await apiClient.delete(`/cms/media/${id}/permanent`);
    return response.data;
  },

  // Restore deleted asset
  async restoreAsset(id) {
    const response = await apiClient.post(`/cms/media/${id}/restore`);
    return response.data;
  },

  // Get folders
  async getFolders() {
    const response = await apiClient.get('/cms/media/folders');
    return response.data;
  },

  // Create folder
  async createFolder(path) {
    const response = await apiClient.post('/cms/media/folders', { path });
    return response.data;
  },

  // Search assets
  async searchAssets(query) {
    const response = await apiClient.get(`/cms/media/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
};

/**
 * CONTENT TEMPLATES API
 */
export const templateAPI = {
  // Get all templates
  async getTemplates(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    
    const response = await apiClient.get(`/cms/templates?${params}`);
    return response.data;
  },

  // Get popular templates
  async getPopularTemplates(limit = 10) {
    const response = await apiClient.get(`/cms/templates/popular?limit=${limit}`);
    return response.data;
  },

  // Get single template
  async getTemplate(id) {
    const response = await apiClient.get(`/cms/templates/${id}`);
    return response.data;
  },

  // Create template
  async createTemplate(templateData) {
    const response = await apiClient.post('/cms/templates', templateData);
    return response.data;
  },

  // Update template
  async updateTemplate(id, templateData) {
    const response = await apiClient.put(`/cms/templates/${id}`, templateData);
    return response.data;
  },

  // Delete template
  async deleteTemplate(id) {
    const response = await apiClient.delete(`/cms/templates/${id}`);
    return response.data;
  },

  // Apply template to page
  async applyTemplate(templateId, variables) {
    const response = await apiClient.post(`/cms/templates/${templateId}/apply`, {
      variables,
    });
    return response.data;
  },

  // Rate template
  async rateTemplate(templateId, rating) {
    const response = await apiClient.post(`/cms/templates/${templateId}/rate`, {
      rating,
    });
    return response.data;
  },

  // Favorite template
  async favoriteTemplate(templateId) {
    const response = await apiClient.post(`/cms/templates/${templateId}/favorite`);
    return response.data;
  },

  // Get template categories
  async getCategories() {
    const response = await apiClient.get('/cms/templates/categories');
    return response.data;
  },
};

/**
 * SEO MANAGER API
 */
export const seoAPI = {
  // Generate sitemap
  async generateSitemap() {
    const response = await apiClient.get('/cms/seo/sitemap');
    return response.data;
  },

  // Analyze page SEO
  async analyzePage(pageId) {
    const response = await apiClient.get(`/cms/seo/analyze/${pageId}`);
    return response.data;
  },

  // Get SEO suggestions
  async getSuggestions(pageId) {
    const response = await apiClient.get(`/cms/seo/suggestions/${pageId}`);
    return response.data;
  },

  // Get SEO report
  async getReport(filters = {}) {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const response = await apiClient.get(`/cms/seo/report?${params}`);
    return response.data;
  },

  // Update robots.txt
  async updateRobotsTxt(content) {
    const response = await apiClient.post('/cms/seo/robots', { content });
    return response.data;
  },
};

/**
 * CATALOG BUILDER API
 */
export const catalogAPI = {
  // Get all catalogs
  async getCatalogs(filters = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    
    const response = await apiClient.get(`/api/catalogs?${params}`);
    return response.data;
  },

  // Get single catalog
  async getCatalog(id) {
    const response = await apiClient.get(`/api/catalogs/${id}`);
    return response.data;
  },

  // Create catalog
  async createCatalog(catalogData) {
    const response = await apiClient.post('/api/catalogs', catalogData);
    return response.data;
  },

  // Update catalog
  async updateCatalog(id, catalogData) {
    const response = await apiClient.put(`/api/catalogs/${id}`, catalogData);
    return response.data;
  },

  // Delete catalog
  async deleteCatalog(id) {
    const response = await apiClient.delete(`/api/catalogs/${id}`);
    return response.data;
  },

  // Generate catalog files
  async generateCatalog(id) {
    const response = await apiClient.post(`/api/catalogs/${id}/generate`);
    return response.data;
  },

  // Download catalog
  async downloadCatalog(id, format) {
    const response = await apiClient.post(`/api/catalogs/${id}/download`, {
      format,
    });
    return response.data;
  },

  // Duplicate catalog
  async duplicateCatalog(id) {
    const response = await apiClient.post(`/api/catalogs/${id}/duplicate`);
    return response.data;
  },

  // Get catalog stats
  async getCatalogStats(id) {
    const response = await apiClient.get(`/api/catalogs/${id}/stats`);
    return response.data;
  },
};

/**
 * API CONFIGURATION API
 */
export const apiConfigAPI = {
  // Get all configurations
  async getConfigurations() {
    const response = await apiClient.get('/api/admin/api-config');
    return response.data;
  },

  // Get single configuration
  async getConfiguration(service) {
    const response = await apiClient.get(`/api/admin/api-config/${service}`);
    return response.data;
  },

  // Update configuration
  async updateConfiguration(service, configData) {
    const response = await apiClient.put(`/api/admin/api-config/${service}`, configData);
    return response.data;
  },

  // Enable/disable service
  async toggleService(service, enabled) {
    const endpoint = enabled ? 'enable' : 'disable';
    const response = await apiClient.post(`/api/admin/api-config/${service}/${endpoint}`);
    return response.data;
  },

  // Run health check
  async runHealthCheck(service) {
    const response = await apiClient.post(`/api/admin/api-config/${service}/health-check`);
    return response.data;
  },

  // Run all health checks
  async runAllHealthChecks() {
    const response = await apiClient.post('/api/admin/api-config/health-check/run-all');
    return response.data;
  },

  // Get health summary
  async getHealthSummary() {
    const response = await apiClient.get('/api/admin/api-config/health-check/summary');
    return response.data;
  },

  // Test credentials
  async testCredentials(service, credentials) {
    const response = await apiClient.post(`/api/admin/api-config/${service}/test`, {
      credentials,
    });
    return response.data;
  },

  // Get service statistics
  async getServiceStats(service) {
    const response = await apiClient.get(`/api/admin/api-config/${service}/stats`);
    return response.data;
  },

  // Get audit log
  async getAuditLog(service, filters = {}) {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.limit) params.append('limit', filters.limit);
    
    const response = await apiClient.get(`/api/admin/api-config/${service}/audit-log?${params}`);
    return response.data;
  },
};

export default {
  page: pageAPI,
  media: mediaAPI,
  template: templateAPI,
  seo: seoAPI,
  catalog: catalogAPI,
  apiConfig: apiConfigAPI,
};
