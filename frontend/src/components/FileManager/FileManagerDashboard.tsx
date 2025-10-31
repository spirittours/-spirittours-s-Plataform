/**
 * File Manager Dashboard
 * Upload, gallery, and file management system
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogContent,
  Chip,
  Menu,
  MenuItem,
  TextField,
  LinearProgress,
} from '@mui/material';
import {
  CloudUpload,
  Folder,
  Image,
  PictureAsPdf,
  Description,
  VideoLibrary,
  Delete,
  Download,
  MoreVert,
  Close,
  Search,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { filesService } from '../../services/filesService';

const FileManagerDashboard: React.FC = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [folders, setFolders] = useState<string[]>(['All', 'Images', 'Documents', 'Videos']);
  const [selectedFolder, setSelectedFolder] = useState('All');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  useEffect(() => {
    loadFiles();
  }, [selectedFolder]);

  const loadFiles = async () => {
    try {
      // Mock data
      setFiles([
        {
          id: '1',
          name: 'madrid-tour.jpg',
          type: 'image/jpeg',
          size: 2457600,
          url: 'https://via.placeholder.com/300x200?text=Madrid',
          folder: 'Images',
          uploaded_at: '2024-10-28',
          uploaded_by: 'Admin',
        },
        {
          id: '2',
          name: 'barcelona-package.pdf',
          type: 'application/pdf',
          size: 1024000,
          url: '#',
          folder: 'Documents',
          uploaded_at: '2024-10-27',
          uploaded_by: 'Admin',
        },
        {
          id: '3',
          name: 'sevilla-promo.mp4',
          type: 'video/mp4',
          size: 15728640,
          url: '#',
          folder: 'Videos',
          uploaded_at: '2024-10-26',
          uploaded_by: 'Admin',
        },
        {
          id: '4',
          name: 'valencia-beach.jpg',
          type: 'image/jpeg',
          size: 3145728,
          url: 'https://via.placeholder.com/300x200?text=Valencia',
          folder: 'Images',
          uploaded_at: '2024-10-25',
          uploaded_by: 'Admin',
        },
      ]);
    } catch (error) {
      toast.error('Failed to load files');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      // Upload files
      const fileArray = Array.from(selectedFiles);
      await filesService.uploadMultiple(fileArray, selectedFolder !== 'All' ? selectedFolder : undefined);

      toast.success(`${fileArray.length} file(s) uploaded successfully!`);
      loadFiles();
    } catch (error) {
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      await filesService.deleteFile(fileId);
      toast.success('File deleted successfully');
      loadFiles();
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const handleDownload = async (file: any) => {
    try {
      const blob = await filesService.downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image sx={{ fontSize: 48, color: '#4caf50' }} />;
    if (type === 'application/pdf') return <PictureAsPdf sx={{ fontSize: 48, color: '#f44336' }} />;
    if (type.startsWith('video/')) return <VideoLibrary sx={{ fontSize: 48, color: '#2196f3' }} />;
    return <Description sx={{ fontSize: 48, color: '#ff9800' }} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const filteredFiles = files.filter(
    (file) =>
      (selectedFolder === 'All' || file.folder === selectedFolder) &&
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            File Manager
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Upload, organize, and manage your files
          </Typography>
        </Box>
        <Button
          variant="contained"
          component="label"
          startIcon={<CloudUpload />}
          disabled={uploading}
        >
          Upload Files
          <input type="file" hidden multiple onChange={handleFileUpload} />
        </Button>
      </Box>

      {/* Upload Progress */}
      {uploading && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            Uploading... {uploadProgress}%
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {/* Folders & Search */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        {folders.map((folder) => (
          <Chip
            key={folder}
            icon={<Folder />}
            label={folder}
            onClick={() => setSelectedFolder(folder)}
            color={selectedFolder === folder ? 'primary' : 'default'}
            variant={selectedFolder === folder ? 'filled' : 'outlined'}
          />
        ))}
        <TextField
          size="small"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ ml: 'auto', minWidth: 300 }}
        />
      </Box>

      {/* File Gallery */}
      <Grid container spacing={2}>
        {filteredFiles.map((file) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              {file.type.startsWith('image/') ? (
                <CardMedia
                  component="img"
                  height="200"
                  image={file.url}
                  alt={file.name}
                  sx={{ objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => setPreviewFile(file)}
                />
              ) : (
                <Box
                  sx={{
                    height: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.default',
                    cursor: 'pointer',
                  }}
                  onClick={() => setPreviewFile(file)}
                >
                  {getFileIcon(file.type)}
                </Box>
              )}
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" noWrap title={file.name}>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {formatFileSize(file.size)} • {file.uploaded_at}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <IconButton size="small" onClick={() => handleDownload(file)}>
                    <Download />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(file.id)} color="error">
                    <Delete />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      setAnchorEl(e.currentTarget);
                      setSelectedFile(file);
                    }}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* File Preview Dialog */}
      <Dialog open={!!previewFile} onClose={() => setPreviewFile(null)} maxWidth="md" fullWidth>
        <IconButton
          sx={{ position: 'absolute', right: 8, top: 8, zIndex: 1 }}
          onClick={() => setPreviewFile(null)}
        >
          <Close />
        </IconButton>
        <DialogContent>
          {previewFile?.type.startsWith('image/') && (
            <img src={previewFile.url} alt={previewFile.name} style={{ width: '100%' }} />
          )}
          {previewFile && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">{previewFile.name}</Typography>
              <Typography variant="body2" color="textSecondary">
                Size: {formatFileSize(previewFile.size)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Uploaded: {previewFile.uploaded_at} by {previewFile.uploaded_by}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem
          onClick={() => {
            if (selectedFile) handleDownload(selectedFile);
            setAnchorEl(null);
          }}
        >
          <Download sx={{ mr: 1 }} /> Download
        </MenuItem>
        <MenuItem
          onClick={() => {
            setPreviewFile(selectedFile);
            setAnchorEl(null);
          }}
        >
          <Image sx={{ mr: 1 }} /> Preview
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedFile) handleDelete(selectedFile.id);
            setAnchorEl(null);
          }}
        >
          <Delete sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default FileManagerDashboard;
