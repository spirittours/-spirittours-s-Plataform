/**
 * BoardView Component
 * 
 * Multi-view board interface supporting table, kanban, timeline, calendar views.
 * Features: dynamic columns, filtering, sorting, grouping
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Tabs,
  Tab,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  LinearProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  ViewModule as TableViewIcon,
  ViewKanban as KanbanViewIcon,
  Timeline as TimelineViewIcon,
  CalendarToday as CalendarViewIcon,
  Map as MapViewIcon,
  BarChart as ChartViewIcon,
  Add as AddIcon,
  MoreVert as MoreIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const BoardView = ({ workspaceId, boardId }) => {
  const [board, setBoard] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(null);
  const [viewType, setViewType] = useState('table');
  const [selectedItems, setSelectedItems] = useState([]);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '',
    columnValues: {},
  });

  // Load board and items
  useEffect(() => {
    loadBoardAndItems();
  }, [boardId]);

  const loadBoardAndItems = async () => {
    try {
      setLoading(true);
      
      // Load board with columns and views
      const boardRes = await axios.get(`/api/crm/boards/${boardId}`);
      const boardData = boardRes.data.data;
      setBoard(boardData);

      // Set current view
      const defaultView = boardData.views.find(v => v.isDefault) || boardData.views[0];
      setCurrentView(defaultView);
      setViewType(defaultView?.type || 'table');

      // Load items
      const itemsRes = await axios.get('/api/crm/items', {
        params: { board: boardId },
      });
      setItems(itemsRes.data.data);
    } catch (error) {
      console.error('Error loading board and items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle create item
  const handleCreateItem = async () => {
    try {
      const response = await axios.post('/api/crm/items', {
        ...newItem,
        board: boardId,
        workspace: workspaceId,
      });

      setItems([response.data.data, ...items]);
      setItemDialogOpen(false);
      setNewItem({ name: '', columnValues: {} });
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  // Handle update column value
  const handleUpdateColumn = async (itemId, columnId, value) => {
    try {
      await axios.put(`/api/crm/items/${itemId}/column`, {
        columnId,
        value,
      });

      // Update local state
      setItems(items.map(item => {
        if (item._id === itemId) {
          return {
            ...item,
            columnValues: {
              ...item.columnValues,
              [columnId]: value,
            },
          };
        }
        return item;
      }));
    } catch (error) {
      console.error('Error updating column:', error);
    }
  };

  // Handle delete item
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this item?')) return;

    try {
      await axios.delete(`/api/crm/items/${itemId}`);
      setItems(items.filter(i => i._id !== itemId));
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  // Handle complete item
  const handleCompleteItem = async (itemId) => {
    try {
      await axios.post(`/api/crm/items/${itemId}/complete`);
      
      setItems(items.map(item => {
        if (item._id === itemId) {
          return { ...item, isCompleted: true };
        }
        return item;
      }));
    } catch (error) {
      console.error('Error completing item:', error);
    }
  };

  // Render column cell based on type
  const renderColumnCell = (item, column) => {
    const value = item.columnValues?.[column.id];

    switch (column.type) {
      case 'text':
      case 'longtext':
        return (
          <TextField
            size="small"
            value={value || ''}
            onChange={(e) => handleUpdateColumn(item._id, column.id, e.target.value)}
            onBlur={() => {}}
            variant="standard"
            fullWidth
          />
        );

      case 'number':
      case 'currency':
        return (
          <TextField
            size="small"
            type="number"
            value={value || 0}
            onChange={(e) => handleUpdateColumn(item._id, column.id, parseFloat(e.target.value))}
            variant="standard"
            fullWidth
          />
        );

      case 'date':
      case 'datetime':
        return (
          <TextField
            size="small"
            type="date"
            value={value || ''}
            onChange={(e) => handleUpdateColumn(item._id, column.id, e.target.value)}
            variant="standard"
            fullWidth
          />
        );

      case 'checkbox':
        return (
          <Checkbox
            checked={value || false}
            onChange={(e) => handleUpdateColumn(item._id, column.id, e.target.checked)}
          />
        );

      case 'dropdown':
        return (
          <Select
            size="small"
            value={value || ''}
            onChange={(e) => handleUpdateColumn(item._id, column.id, e.target.value)}
            variant="standard"
            fullWidth
          >
            {column.options?.values?.map((opt) => (
              <MenuItem key={opt.value || opt} value={opt.value || opt}>
                {opt.label || opt}
              </MenuItem>
            ))}
          </Select>
        );

      case 'status':
        return (
          <Chip
            label={value || 'Not set'}
            size="small"
            sx={{
              bgcolor: column.options?.values?.find(v => v.label === value)?.color || 'default',
              color: 'white',
            }}
          />
        );

      case 'priority':
        return (
          <Chip
            label={value || 'Medium'}
            size="small"
            color={
              value === 'urgent' ? 'error' :
              value === 'high' ? 'warning' :
              value === 'low' ? 'info' : 'default'
            }
          />
        );

      default:
        return <Typography variant="body2">{value || '-'}</Typography>;
    }
  };

  // Render table view
  const renderTableView = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                checked={selectedItems.length === items.length && items.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedItems(items.map(i => i._id));
                  } else {
                    setSelectedItems([]);
                  }
                }}
              />
            </TableCell>
            <TableCell>Item Name</TableCell>
            {board.columns.filter(c => c.visible).map((column) => (
              <TableCell key={column.id}>
                {column.name}
              </TableCell>
            ))}
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item._id}
              hover
              sx={{ opacity: item.isCompleted ? 0.5 : 1 }}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedItems.includes(item._id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems([...selectedItems, item._id]);
                    } else {
                      setSelectedItems(selectedItems.filter(id => id !== item._id));
                    }
                  }}
                />
              </TableCell>
              <TableCell>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ textDecoration: item.isCompleted ? 'line-through' : 'none' }}
                >
                  {item.name}
                </Typography>
              </TableCell>
              {board.columns.filter(c => c.visible).map((column) => (
                <TableCell key={column.id}>
                  {renderColumnCell(item, column)}
                </TableCell>
              ))}
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={() => handleCompleteItem(item._id)}
                  disabled={item.isCompleted}
                >
                  <MoreIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteItem(item._id)}
                >
                  <MoreIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render kanban view
  const renderKanbanView = () => {
    const statusColumn = board.columns.find(c => c.type === 'status');
    if (!statusColumn) {
      return <Typography>No status column found for Kanban view</Typography>;
    }

    const statusValues = statusColumn.options?.values || [];
    const itemsByStatus = {};
    
    statusValues.forEach(status => {
      itemsByStatus[status.label || status] = items.filter(
        item => item.columnValues?.[statusColumn.id] === (status.label || status)
      );
    });

    return (
      <DragDropContext onDragEnd={() => {}}>
        <Box sx={{ display: 'flex', gap: 2, overflow: 'auto' }}>
          {statusValues.map((status) => (
            <Box
              key={status.label || status}
              sx={{ minWidth: 300, bgcolor: 'grey.50', p: 2, borderRadius: 2 }}
            >
              <Typography variant="h6" gutterBottom>
                {status.label || status}
                <Chip
                  label={itemsByStatus[status.label || status]?.length || 0}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Droppable droppableId={status.label || status}>
                {(provided) => (
                  <Box ref={provided.innerRef} {...provided.droppableProps}>
                    {itemsByStatus[status.label || status]?.map((item, index) => (
                      <Draggable key={item._id} draggableId={item._id} index={index}>
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            sx={{ mb: 2 }}
                          >
                            <CardContent>
                              <Typography variant="body1" fontWeight={600}>
                                {item.name}
                              </Typography>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>
            </Box>
          ))}
        </Box>
      </DragDropContext>
    );
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (!board) {
    return <Typography>Board not found</Typography>;
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight={600}>
            {board.icon} {board.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton size="small">
              <FilterIcon />
            </IconButton>
            <IconButton size="small">
              <SortIcon />
            </IconButton>
            <IconButton size="small">
              <GroupIcon />
            </IconButton>
            <IconButton size="small">
              <SettingsIcon />
            </IconButton>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              size="small"
              onClick={() => setItemDialogOpen(true)}
            >
              New Item
            </Button>
          </Box>
        </Box>

        {/* View Tabs */}
        <Tabs value={viewType} onChange={(e, v) => setViewType(v)}>
          {board.views.map((view) => (
            <Tab
              key={view.id}
              value={view.type}
              label={view.name}
              icon={
                view.type === 'table' ? <TableViewIcon /> :
                view.type === 'kanban' ? <KanbanViewIcon /> :
                view.type === 'timeline' ? <TimelineViewIcon /> :
                view.type === 'calendar' ? <CalendarViewIcon /> :
                view.type === 'map' ? <MapViewIcon /> :
                view.type === 'chart' ? <ChartViewIcon /> : null
              }
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      {/* View Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {viewType === 'table' && renderTableView()}
        {viewType === 'kanban' && renderKanbanView()}
        {viewType === 'timeline' && (
          <Typography>Timeline view coming soon</Typography>
        )}
        {viewType === 'calendar' && (
          <Typography>Calendar view coming soon</Typography>
        )}
      </Box>

      {/* Create Item Dialog */}
      <Dialog
        open={itemDialogOpen}
        onClose={() => setItemDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Create New Item</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Item Name"
                fullWidth
                required
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
            </Grid>
            {board.columns.slice(0, 5).map((column) => (
              <Grid item xs={12} sm={6} key={column.id}>
                <TextField
                  label={column.name}
                  fullWidth
                  onChange={(e) => setNewItem({
                    ...newItem,
                    columnValues: {
                      ...newItem.columnValues,
                      [column.id]: e.target.value,
                    },
                  })}
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateItem} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BoardView;
