import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Category as CategoryIcon,
  LocalOffer,
  DragIndicator,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import { TourCategory, TourTag, CategoryFormData, TagFormData } from '../../types/settings.types';
import apiClient from '../../services/apiClient';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const TourCategories: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [categories, setCategories] = useState<TourCategory[]>([]);
  const [tags, setTags] = useState<TourTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [openTagDialog, setOpenTagDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TourCategory | null>(null);
  const [editingTag, setEditingTag] = useState<TourTag | null>(null);

  const categoryForm = useForm<CategoryFormData>();
  const tagForm = useForm<TagFormData>();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, tagsRes] = await Promise.all([
        apiClient.get<TourCategory[]>('/api/settings/tour-categories'),
        apiClient.get<TourTag[]>('/api/settings/tour-tags'),
      ]);
      setCategories(categoriesRes.data);
      setTags(tagsRes.data);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load categories and tags');
    } finally {
      setLoading(false);
    }
  };

  // Category handlers
  const handleOpenCategoryDialog = (category?: TourCategory) => {
    if (category) {
      setEditingCategory(category);
      categoryForm.reset(category);
    } else {
      setEditingCategory(null);
      categoryForm.reset({ isActive: true, level: 1, order: categories.length + 1 });
    }
    setOpenCategoryDialog(true);
  };

  const handleCloseCategoryDialog = () => {
    setOpenCategoryDialog(false);
    setEditingCategory(null);
  };

  const onSubmitCategory = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        await apiClient.put(`/api/settings/tour-categories/${editingCategory.id}`, data);
        toast.success('Category updated successfully!');
      } else {
        await apiClient.post('/api/settings/tour-categories', data);
        toast.success('Category created successfully!');
      }
      await fetchData();
      handleCloseCategoryDialog();
    } catch (err: any) {
      console.error('Error saving category:', err);
      toast.error(err.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;

    try {
      await apiClient.delete(`/api/settings/tour-categories/${id}`);
      toast.success('Category deleted successfully!');
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting category:', err);
      toast.error('Failed to delete category');
    }
  };

  // Tag handlers
  const handleOpenTagDialog = (tag?: TourTag) => {
    if (tag) {
      setEditingTag(tag);
      tagForm.reset(tag);
    } else {
      setEditingTag(null);
      tagForm.reset({ isActive: true, color: '#1976d2' });
    }
    setOpenTagDialog(true);
  };

  const handleCloseTagDialog = () => {
    setOpenTagDialog(false);
    setEditingTag(null);
  };

  const onSubmitTag = async (data: TagFormData) => {
    try {
      if (editingTag) {
        await apiClient.put(`/api/settings/tour-tags/${editingTag.id}`, data);
        toast.success('Tag updated successfully!');
      } else {
        await apiClient.post('/api/settings/tour-tags', data);
        toast.success('Tag created successfully!');
      }
      await fetchData();
      handleCloseTagDialog();
    } catch (err: any) {
      console.error('Error saving tag:', err);
      toast.error(err.response?.data?.message || 'Failed to save tag');
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this tag?')) return;

    try {
      await apiClient.delete(`/api/settings/tour-tags/${id}`);
      toast.success('Tag deleted successfully!');
      await fetchData();
    } catch (err: any) {
      console.error('Error deleting tag:', err);
      toast.error('Failed to delete tag');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Tour Categories & Tags
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Organize and classify your tours
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Card>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Categories" icon={<CategoryIcon />} iconPosition="start" />
          <Tab label="Tags" icon={<LocalOffer />} iconPosition="start" />
        </Tabs>

        <CardContent>
          {/* Categories Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenCategoryDialog()}
              >
                New Category
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell width={50}></TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Slug</TableCell>
                    <TableCell>Tours</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id} hover>
                      <TableCell>
                        <IconButton size="small">
                          <DragIndicator fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: 1,
                              bgcolor: category.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography>{category.icon}</Typography>
                          </Box>
                          <Typography variant="body2" fontWeight="medium">
                            {category.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {category.slug}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={category.toursCount} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={category.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={category.isActive ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenCategoryDialog(category)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          {/* Tags Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenTagDialog()}
              >
                New Tag
              </Button>
            </Box>

            <Grid container spacing={2}>
              {tags.map((tag) => (
                <Grid item xs={12} sm={6} md={4} key={tag.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                        <Chip
                          label={tag.name}
                          size="small"
                          sx={{ bgcolor: tag.color, color: '#fff' }}
                        />
                        <Box>
                          <IconButton size="small" onClick={() => handleOpenTagDialog(tag)}>
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteTag(tag.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {tag.description}
                      </Typography>
                      <Box mt={1} display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Used {tag.usage} times
                        </Typography>
                        <Chip
                          label={tag.isActive ? 'Active' : 'Inactive'}
                          size="small"
                          color={tag.isActive ? 'success' : 'default'}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={openCategoryDialog} onClose={handleCloseCategoryDialog} maxWidth="md" fullWidth>
        <form onSubmit={categoryForm.handleSubmit(onSubmitCategory)}>
          <DialogTitle>
            {editingCategory ? 'Edit Category' : 'Create Category'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="name"
                  control={categoryForm.control}
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Category Name"
                      fullWidth
                      error={!!categoryForm.formState.errors.name}
                      helperText={categoryForm.formState.errors.name?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="slug"
                  control={categoryForm.control}
                  rules={{ required: 'Slug is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Slug"
                      fullWidth
                      error={!!categoryForm.formState.errors.slug}
                      helperText={categoryForm.formState.errors.slug?.message || 'URL-friendly identifier'}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={categoryForm.control}
                  render={({ field }) => (
                    <TextField {...field} label="Description" fullWidth multiline rows={2} />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="icon"
                  control={categoryForm.control}
                  render={({ field }) => (
                    <TextField {...field} label="Icon (Emoji)" fullWidth />
                  )}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <Controller
                  name="color"
                  control={categoryForm.control}
                  render={({ field }) => (
                    <TextField {...field} label="Color" type="color" fullWidth />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="isActive"
                  control={categoryForm.control}
                  defaultValue={true}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Active"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseCategoryDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={openTagDialog} onClose={handleCloseTagDialog} maxWidth="sm" fullWidth>
        <form onSubmit={tagForm.handleSubmit(onSubmitTag)}>
          <DialogTitle>{editingTag ? 'Edit Tag' : 'Create Tag'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={tagForm.control}
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Tag Name"
                      fullWidth
                      error={!!tagForm.formState.errors.name}
                      helperText={tagForm.formState.errors.name?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={tagForm.control}
                  render={({ field }) => (
                    <TextField {...field} label="Description" fullWidth multiline rows={2} />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="color"
                  control={tagForm.control}
                  defaultValue="#1976d2"
                  render={({ field }) => (
                    <TextField {...field} label="Color" type="color" fullWidth />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="isActive"
                  control={tagForm.control}
                  defaultValue={true}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Active"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseTagDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingTag ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default TourCategories;
