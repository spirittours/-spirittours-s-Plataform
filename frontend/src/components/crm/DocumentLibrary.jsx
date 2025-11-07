/**
 * Document Library Component
 * Document management with upload, versioning, and permissions.
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Typography, Button, IconButton, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Avatar, Stack,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Delete as DeleteIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';

const DocumentLibrary = ({ workspaceId }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openUpload, setOpenUpload] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [workspaceId]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`/api/crm/documents/${workspaceId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (data.success) setDocuments(data.documents);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = { draft: 'default', review: 'warning', approved: 'success', rejected: 'error' };
    return colors[status] || 'default';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Documents</Typography>
        <Button variant="contained" startIcon={<UploadIcon />} onClick={() => setOpenUpload(true)}>
          Upload Document
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Version</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc._id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <FileIcon color="action" />
                    <Typography>{doc.name}</Typography>
                  </Stack>
                </TableCell>
                <TableCell><Chip label={doc.type} size="small" /></TableCell>
                <TableCell>
                  <Chip label={doc.status} size="small" color={getStatusColor(doc.status)} />
                </TableCell>
                <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar src={doc.owner?.avatar} sx={{ width: 24, height: 24 }}>
                      {doc.owner?.firstName?.[0]}
                    </Avatar>
                    <Typography variant="body2">{doc.owner?.firstName}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>v{doc.currentVersion}</TableCell>
                <TableCell align="right">
                  <IconButton size="small"><DownloadIcon /></IconButton>
                  <IconButton size="small"><ShareIcon /></IconButton>
                  <IconButton size="small"><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openUpload} onClose={() => setOpenUpload(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Document</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Document Name" margin="normal" />
          <TextField fullWidth select label="Type" margin="normal" defaultValue="other">
            <MenuItem value="contract">Contract</MenuItem>
            <MenuItem value="proposal">Proposal</MenuItem>
            <MenuItem value="invoice">Invoice</MenuItem>
            <MenuItem value="report">Report</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
          <Button variant="outlined" component="label" fullWidth sx={{ mt: 2 }}>
            Choose File
            <input type="file" hidden />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUpload(false)}>Cancel</Button>
          <Button variant="contained">Upload</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentLibrary;
