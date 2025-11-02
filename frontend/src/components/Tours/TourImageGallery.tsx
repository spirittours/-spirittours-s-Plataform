import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Stack,
  Paper,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Checkbox,
  Menu,
  MenuItem,
  LinearProgress,
  Alert,
  Tooltip,
  Fade,
  Zoom,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CloudUpload as CloudUploadIcon,
  Close as CloseIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon,
  CheckCircle as CheckCircleIcon,
  DragIndicator as DragIndicatorIcon,
} from '@mui/icons-material';
import { toast } from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toursService } from '../../services/toursService';
import { TourImage } from '../../types/tour.types';

interface TourImageGalleryProps {
  tourId: string;
  images: TourImage[];
  editable?: boolean;
  maxImages?: number;
  onImagesChange?: (images: TourImage[]) => void;
}

interface ImageUploadProgress {
  [key: string]: number;
}

const TourImageGallery: React.FC<TourImageGalleryProps> = ({
  tourId,
  images: initialImages,
  editable = false,
  maxImages = 20,
  onImagesChange,
}) => {
  // State
  const [images, setImages] = useState<TourImage[]>(initialImages);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<ImageUploadProgress>({});
  const [uploading, setUploading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<TourImage | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuImageId, setMenuImageId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  
  // Form state for editing
  const [imageCaption, setImageCaption] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB size limit`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    await uploadImages(validFiles);
  };

  // Upload images
  const uploadImages = async (files: File[]) => {
    try {
      setUploading(true);
      
      const result = await toursService.uploadImages(
        tourId,
        files,
        (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress((prev) => ({
            ...prev,
            [files[0].name]: progress,
          }));
        }
      );

      const newImages: TourImage[] = result.images.map((url, index) => ({
        id: `${Date.now()}_${index}`,
        url,
        caption: '',
        alt: files[index].name,
        isPrimary: images.length === 0 && index === 0,
        order: images.length + index,
      }));

      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      onImagesChange?.(updatedImages);
      
      toast.success(`${files.length} image(s) uploaded successfully`);
      
      // Clear upload progress after a delay
      setTimeout(() => {
        setUploadProgress({});
      }, 1000);
    } catch (error) {
      console.error('Failed to upload images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  // Handle drag and drop file upload
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*';
        
        // Trigger file selection with dropped files
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        input.files = dataTransfer.files;
        
        handleFileSelect({ target: input } as any);
      }
    },
    [images, maxImages]
  );

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle image reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);

    const reorderedImages = arrayMove(images, oldIndex, newIndex).map((img, index) => ({
      ...img,
      order: index,
    }));

    setImages(reorderedImages);
    onImagesChange?.(reorderedImages);

    try {
      await toursService.reorderImages(tourId, reorderedImages.map(img => img.id));
      toast.success('Images reordered successfully');
    } catch (error) {
      console.error('Failed to reorder images:', error);
      toast.error('Failed to save new order');
    }
  };

  // Handle set primary image
  const handleSetPrimary = async (imageId: string) => {
    try {
      await toursService.setPrimaryImage(tourId, imageId);
      
      const updatedImages = images.map(img => ({
        ...img,
        isPrimary: img.id === imageId,
      }));
      
      setImages(updatedImages);
      onImagesChange?.(updatedImages);
      toast.success('Primary image updated');
    } catch (error) {
      console.error('Failed to set primary image:', error);
      toast.error('Failed to update primary image');
    }
  };

  // Handle edit image
  const handleEditImage = (image: TourImage) => {
    setEditingImage(image);
    setImageCaption(image.caption || '');
    setImageAlt(image.alt || '');
    setEditDialogOpen(true);
    handleMenuClose();
  };

  // Handle save image metadata
  const handleSaveImageMetadata = async () => {
    if (!editingImage) return;

    try {
      await toursService.updateImageMetadata(tourId, editingImage.id, {
        caption: imageCaption,
        alt: imageAlt,
      });

      const updatedImages = images.map(img =>
        img.id === editingImage.id
          ? { ...img, caption: imageCaption, alt: imageAlt }
          : img
      );

      setImages(updatedImages);
      onImagesChange?.(updatedImages);
      setEditDialogOpen(false);
      toast.success('Image metadata updated');
    } catch (error) {
      console.error('Failed to update image metadata:', error);
      toast.error('Failed to update image');
    }
  };

  // Handle delete selected images
  const handleDeleteSelected = async () => {
    try {
      await toursService.deleteImages(tourId, selectedImages);
      
      const updatedImages = images.filter(img => !selectedImages.includes(img.id));
      setImages(updatedImages);
      onImagesChange?.(updatedImages);
      setSelectedImages([]);
      setDeleteConfirmOpen(false);
      
      toast.success(`${selectedImages.length} image(s) deleted`);
    } catch (error) {
      console.error('Failed to delete images:', error);
      toast.error('Failed to delete images');
    }
  };

  // Handle single image delete
  const handleDeleteImage = async (imageId: string) => {
    setSelectedImages([imageId]);
    setDeleteConfirmOpen(true);
    handleMenuClose();
  };

  // Handle image selection
  const handleImageSelect = (imageId: string) => {
    setSelectedImages((prev) =>
      prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    );
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedImages.length === images.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(images.map(img => img.id));
    }
  };

  // Handle lightbox open
  const handleOpenLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
    setZoom(1);
  };

  // Handle lightbox navigation
  const handlePreviousImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setZoom(1);
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setZoom(1);
  };

  // Handle zoom
  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5));
  };

  // Handle download image
  const handleDownloadImage = async (imageUrl: string, imageName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = imageName || 'tour-image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Image downloaded');
    } catch (error) {
      console.error('Failed to download image:', error);
      toast.error('Failed to download image');
    }
    handleMenuClose();
  };

  // Handle copy image URL
  const handleCopyImageUrl = (imageUrl: string) => {
    navigator.clipboard.writeText(imageUrl);
    toast.success('Image URL copied to clipboard');
    handleMenuClose();
  };

  // Menu handlers
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, imageId: string) => {
    setAnchorEl(event.currentTarget);
    setMenuImageId(imageId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuImageId(null);
  };

  // Render upload area
  const renderUploadArea = () => (
    <Paper
      sx={{
        p: 4,
        border: '2px dashed',
        borderColor: 'primary.main',
        borderRadius: 2,
        textAlign: 'center',
        backgroundColor: 'background.default',
        cursor: 'pointer',
        transition: 'all 0.3s',
        '&:hover': {
          backgroundColor: 'action.hover',
          borderColor: 'primary.dark',
        },
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={() => document.getElementById('file-upload-input')?.click()}
    >
      <input
        id="file-upload-input"
        type="file"
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Drag & Drop Images Here
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        or click to browse
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Supports JPG, PNG, GIF, WebP (Max 10MB per image, up to {maxImages} images)
      </Typography>
      
      {Object.keys(uploadProgress).length > 0 && (
        <Box sx={{ mt: 2 }}>
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <Box key={fileName} sx={{ mb: 1 }}>
              <Typography variant="caption">{fileName}</Typography>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );

  // Sortable Image Item Component
  const SortableImageItem = ({ image, index }: { image: TourImage; index: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: image.id, disabled: !editable });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <ImageListItem
        ref={setNodeRef}
        style={style}
        sx={{
          position: 'relative',
          cursor: editable ? 'move' : 'pointer',
          border: selectedImages.includes(image.id) ? '3px solid' : 'none',
          borderColor: 'primary.main',
          borderRadius: 1,
          overflow: 'hidden',
        }}
        onClick={() => !editable && handleOpenLightbox(index)}
      >
        <img
          src={image.url}
          alt={image.alt || `Tour image ${index + 1}`}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        
        {editable && (
          <>
            <Box
              {...attributes}
              {...listeners}
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                borderRadius: 1,
                p: 0.5,
                cursor: 'grab',
                '&:active': { cursor: 'grabbing' },
              }}
            >
              <DragIndicatorIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            
            <Checkbox
              checked={selectedImages.includes(image.id)}
              onChange={() => handleImageSelect(image.id)}
              onClick={(e) => e.stopPropagation()}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
              }}
            />
          </>
        )}
        
        {image.isPrimary && (
          <Chip
            label="Primary"
            size="small"
            color="primary"
            icon={<StarIcon />}
            sx={{
              position: 'absolute',
              bottom: 48,
              left: 8,
            }}
          />
        )}
        
        <ImageListItemBar
          title={image.caption || `Image ${index + 1}`}
          subtitle={image.alt}
          actionIcon={
            editable ? (
              <IconButton
                sx={{ color: 'rgba(255, 255, 255, 0.9)' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMenuOpen(e, image.id);
                }}
              >
                <MoreVertIcon />
              </IconButton>
            ) : undefined
          }
        />
      </ImageListItem>
    );
  };

  // Render image grid
  const renderImageGrid = () => (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={images.map(img => img.id)}
        strategy={rectSortingStrategy}
      >
        <ImageList
          sx={{ width: '100%', height: 'auto' }}
          cols={4}
          rowHeight={200}
          gap={16}
        >
          {images.map((image, index) => (
            <SortableImageItem key={image.id} image={image} index={index} />
          ))}
        </ImageList>
      </SortableContext>
    </DndContext>
  );

  // Render lightbox
  const renderLightbox = () => {
    const currentImage = images[currentImageIndex];
    if (!currentImage) return null;

    return (
      <Dialog
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            maxWidth: '90vw',
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {currentImageIndex + 1} / {images.length}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Zoom Out">
              <IconButton onClick={handleZoomOut} sx={{ color: 'white' }} disabled={zoom <= 0.5}>
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom In">
              <IconButton onClick={handleZoomIn} sx={{ color: 'white' }} disabled={zoom >= 3}>
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download">
              <IconButton
                onClick={() => handleDownloadImage(currentImage.url, currentImage.alt || 'tour-image.jpg')}
                sx={{ color: 'white' }}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <IconButton onClick={() => setLightboxOpen(false)} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            overflow: 'auto',
            p: 0,
          }}
        >
          <IconButton
            onClick={handlePreviousImage}
            sx={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
            }}
          >
            <NavigateBeforeIcon fontSize="large" />
          </IconButton>
          
          <Box
            component="img"
            src={currentImage.url}
            alt={currentImage.alt}
            sx={{
              maxWidth: '100%',
              maxHeight: '70vh',
              objectFit: 'contain',
              transform: `scale(${zoom})`,
              transition: 'transform 0.3s',
            }}
          />
          
          <IconButton
            onClick={handleNextImage}
            sx={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
            }}
          >
            <NavigateNextIcon fontSize="large" />
          </IconButton>
        </DialogContent>
        {currentImage.caption && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: 'white' }}>
              {currentImage.caption}
            </Typography>
          </Box>
        )}
      </Dialog>
    );
  };

  // Render edit dialog
  const renderEditDialog = () => (
    <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Image</DialogTitle>
      <DialogContent>
        {editingImage && (
          <Box>
            <Box
              component="img"
              src={editingImage.url}
              alt={editingImage.alt}
              sx={{ width: '100%', mb: 2, borderRadius: 1 }}
            />
            <TextField
              fullWidth
              label="Caption"
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
              multiline
              rows={2}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Alt Text"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              helperText="Used for accessibility and SEO"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
        <Button onClick={handleSaveImageMetadata} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render delete confirmation dialog
  const renderDeleteConfirmDialog = () => (
    <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
      <DialogTitle>Confirm Delete</DialogTitle>
      <DialogContent>
        <Typography>
          Are you sure you want to delete {selectedImages.length} image(s)? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
        <Button onClick={handleDeleteSelected} color="error" variant="contained">
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Render context menu
  const renderContextMenu = () => {
    const image = images.find(img => img.id === menuImageId);
    if (!image) return null;

    return (
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => handleSetPrimary(image.id)}>
          {image.isPrimary ? <StarIcon /> : <StarBorderIcon />}
          <Typography sx={{ ml: 1 }}>
            {image.isPrimary ? 'Primary Image' : 'Set as Primary'}
          </Typography>
        </MenuItem>
        <MenuItem onClick={() => handleEditImage(image)}>
          <EditIcon />
          <Typography sx={{ ml: 1 }}>Edit Details</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleCopyImageUrl(image.url)}>
          <ContentCopyIcon />
          <Typography sx={{ ml: 1 }}>Copy URL</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleDownloadImage(image.url, image.alt || 'tour-image.jpg')}>
          <DownloadIcon />
          <Typography sx={{ ml: 1 }}>Download</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleDeleteImage(image.id)} sx={{ color: 'error.main' }}>
          <DeleteIcon />
          <Typography sx={{ ml: 1 }}>Delete</Typography>
        </MenuItem>
      </Menu>
    );
  };

  return (
    <Box>
      {/* Header */}
      {editable && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">
              Tour Images ({images.length}/{maxImages})
            </Typography>
            {selectedImages.length > 0 && (
              <Stack direction="row" spacing={2}>
                <Chip
                  label={`${selectedImages.length} selected`}
                  onDelete={handleSelectAll}
                  deleteIcon={<CloseIcon />}
                />
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  Delete Selected
                </Button>
              </Stack>
            )}
          </Box>
          
          {images.length < maxImages && renderUploadArea()}
          
          {uploading && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Uploading images...
            </Alert>
          )}
        </Box>
      )}

      {/* Image Grid */}
      {images.length > 0 ? (
        renderImageGrid()
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No images yet. {editable && 'Upload your first image to get started.'}
          </Typography>
        </Paper>
      )}

      {/* Dialogs */}
      {renderLightbox()}
      {renderEditDialog()}
      {renderDeleteConfirmDialog()}
      {renderContextMenu()}
    </Box>
  );
};

export default TourImageGallery;
