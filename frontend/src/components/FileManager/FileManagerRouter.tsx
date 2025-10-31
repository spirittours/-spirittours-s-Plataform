import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Container, Typography, Paper, Breadcrumbs, Link } from '@mui/material';
import { Folder as FolderIcon } from '@mui/icons-material';
import FileManagerDashboard from './FileManagerDashboard';

const FileManagerRouter: React.FC = () => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="xl">
        {/* Header */}
        <Paper elevation={2} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <FolderIcon sx={{ fontSize: 40, color: 'white' }} />
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 600 }}>
              File Manager
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)' }}>
            Upload, organize, and manage your files with ease
          </Typography>
        </Paper>

        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link underline="hover" color="inherit" href="/">
            Home
          </Link>
          <Typography color="text.primary">File Manager</Typography>
        </Breadcrumbs>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<FileManagerDashboard />} />
          <Route path="*" element={<Navigate to="/files" replace />} />
        </Routes>
      </Container>
    </Box>
  );
};

export default FileManagerRouter;
