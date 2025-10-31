/**
 * Files Service
 * Service layer for file upload, management, and gallery
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface FileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnail_url?: string;
  uploaded_at: string;
  uploaded_by: string;
  folder?: string;
  tags?: string[];
}

class FilesService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/v1/files`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // ============== UPLOAD ==============

  async uploadFile(file: File, folder?: string, tags?: string[]) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folder) formData.append('folder', folder);
      if (tags) formData.append('tags', JSON.stringify(tags));

      const response = await this.api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async uploadMultiple(files: File[], folder?: string) {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      if (folder) formData.append('folder', folder);

      const response = await this.api.post('/upload-multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      console.error('Error uploading files:', error);
      throw error;
    }
  }

  // ============== GALLERY ==============

  async getFiles(filters?: any) {
    try {
      const response = await this.api.get('/list', { params: filters });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching files:', error);
      throw error;
    }
  }

  async getFile(fileId: string) {
    try {
      const response = await this.api.get(`/${fileId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching file:', error);
      throw error;
    }
  }

  async deleteFile(fileId: string) {
    try {
      const response = await this.api.delete(`/${fileId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async updateFile(fileId: string, data: any) {
    try {
      const response = await this.api.put(`/${fileId}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating file:', error);
      throw error;
    }
  }

  // ============== FOLDERS ==============

  async getFolders() {
    try {
      const response = await this.api.get('/folders');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching folders:', error);
      throw error;
    }
  }

  async createFolder(name: string) {
    try {
      const response = await this.api.post('/folders', { name });
      return response.data;
    } catch (error: any) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  // ============== DOWNLOAD ==============

  async downloadFile(fileId: string) {
    try {
      const response = await this.api.get(`/${fileId}/download`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }
}

export const filesService = new FilesService();
export default filesService;
