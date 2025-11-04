/**
 * BoardView Component
 * 
 * Multi-view board display supporting table, kanban, calendar, and other views.
 * Provides dynamic column management and real-time data updates.
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  ViewList as TableIcon,
  ViewKanban as KanbanIcon,
  CalendarMonth as CalendarIcon,
  Timeline as TimelineIcon,
  Add as AddIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  ViewColumn as ColumnIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';

const BoardView = ({ workspaceId, boardId }) => {
  const [board, setBoard] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState(null);
  const [openItemDialog, setOpenItemDialog] = useState(false);
  const [openColumnDialog, setOpenColumnDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [itemFormData, setItemFormData] = useState({
    name: '',
    columnValues: {},
  });
  const [columnFormData, setColumnFormData] = useState({
    name: '',
    type: 'text',
    options: {},
  });

  useEffect(() => {
    if (boardId) {
      fetchBoardAndItems();
    }
  }, [boardId]);

  const fetchBoardAndItems = async () => {
    try {
      setLoading(true);
      
      // Fetch board details
      const boardRes = await axios.get(`/api/crm/boards/${boardId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setBoard(boardRes.data.data);
      
      // Set current view to default or first view
      if (boardRes.data.data.views?.length > 0) {
        const defaultView = boardRes.data.data.views.find(v => v.isDefault) || boardRes.data.data.views[0];
        setCurrentView(defaultView);
      }

      // Fetch items
      const itemsRes = await axios.get('/api/crm/items', {
        params: { board: boardId },
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setItems(itemsRes.data.data);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching board and items:', error);
      setLoading(false);
    }
  };

  const handleCreateItem = async () => {
    try {
      await axios.post(
        '/api/crm/items',
        {
          ...itemFormData,
          board: boardId,
          workspace: workspaceId,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchBoardAndItems();
      setOpenItemDialog(false);
      resetItemForm();
    } catch (error) {
      console.error('Error creating item:', error);
    }
  };

  const handleUpdateItem = async () => {
    try {
      await axios.put(
        `/api/crm/items/${selectedItem._id}`,
        itemFormData,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchBoardAndItems();
      setOpenItemDialog(false);
      resetItemForm();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const handleAddColumn = async () => {
    try {
      await axios.post(
        `/api/crm/boards/${boardId}/columns`,
        columnFormData,
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchBoardAndItems();
      setOpenColumnDialog(false);
      resetColumnForm();
    } catch (error) {
      console.error('Error adding column:', error);
    }
  };

  const handleUpdateColumnValue = async (itemId, columnId, value) => {
    try {
      await axios.put(
        `/api/crm/items/${itemId}/column`,
        { columnId, value },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchBoardAndItems();
    } catch (error) {
      console.error('Error updating column value:', error);
    }
  };

  const handleCompleteItem = async (itemId) => {
    try {
      await axios.post(
        `/api/crm/items/${itemId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchBoardAndItems();
    } catch (error) {
      console.error('Error completing item:', error);
    }
  };

  const handleDuplicateItem = async (itemId) => {
    try {
      await axios.post(
        `/api/crm/items/${itemId}/duplicate`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      fetchBoardAndItems();
    } catch (error) {
      console.error('Error duplicating item:', error);
    }
  };

  const resetItemForm = () => {
    setItemFormData({
      name: '',
      columnValues: {},
    });
    setSelectedItem(null);
  };

  const resetColumnForm = () => {
    setColumnFormData({
      name: '',
      type: 'text',
      options: {},
    });
  };

  const openEditItemDialog = (item) => {
    setSelectedItem(item);
    setItemFormData({
      name: item.name,
      columnValues: item.columnValues || {},
    });
    setOpenItemDialog(true);
  };

  const renderColumnValue = (column, value) => {
    if (!value) return '-';

    switch (column.type) {
      case 'status':
        return <Chip label={value} size="small" color="primary" />;
      case 'priority':
        const priorityColors = {
          low: 'default',
          medium: 'primary',
          high: 'warning',
          urgent: 'error',
        };
        return <Chip label={value} size="small" color={priorityColors[value] || 'default'} />;
      case 'checkbox':
        return value ? '✓' : '✗';
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      case 'percent':
        return `${value}%`;
      case 'rating':
        return '⭐'.repeat(value);
      default:
        return value;
    }
  };

  const renderTableView = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Item</TableCell>
            {board.columns
              .filter(col => col.visible)
              .map(column => (
                <TableCell key={column.id}>{column.name}</TableCell>
              ))}
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item._id} hover>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  {item.isCompleted && <Chip label="✓" size="small" color="success" />}
                  <Typography>{item.name}</Typography>
                </Box>
              </TableCell>
              {board.columns
                .filter(col => col.visible)
                .map(column => (
                  <TableCell key={column.id}>
                    {renderColumnValue(column, item.columnValues?.[column.id])}
                  </TableCell>
                ))}
              <TableCell>
                <Box display="flex" gap={0.5}>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => openEditItemDialog(item)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="More">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setAnchorEl(e.currentTarget);
                        setSelectedItem(item);
                      }}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={board.columns.length + 2} align="center">
                <Typography variant="body2" color="textSecondary">
                  No items yet. Click "New Item" to get started.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderKanbanView = () => {
    const statusColumn = board.columns.find(col => col.type === 'status');
    if (!statusColumn) {
      return (
        <Typography variant="body2" color="textSecondary">
          This board needs a Status column to display Kanban view
        </Typography>
      );
    }

    const statuses = statusColumn.options?.values || [];
    const itemsByStatus = {};
    statuses.forEach(status => {
      itemsByStatus[status.label] = items.filter(
        item => item.columnValues?.[statusColumn.id] === status.label
      );
    });

    return (
      <Box display="flex" gap={2} overflow="auto">
        {statuses.map(status => (
          <Card key={status.label} sx={{ minWidth: 280, maxWidth: 320 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">{status.label}</Typography>
                <Chip label={itemsByStatus[status.label]?.length || 0} size="small" />
              </Box>
              <Box display="flex" flexDirection="column" gap={1}>
                {itemsByStatus[status.label]?.map(item => (
                  <Card key={item._id} variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2">{item.name}</Typography>
                      {item.isCompleted && (
                        <Chip label="Completed" size="small" color="success" sx={{ mt: 1 }} />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  const renderCalendarView = () => (
    <Box p={3}>
      <Typography variant="body1" color="textSecondary">
        Calendar view coming soon...
      </Typography>
    </Box>
  );

  const renderTimelineView = () => (
    <Box p={3}>
      <Typography variant="body1" color="textSecondary">
        Timeline view coming soon...
      </Typography>
    </Box>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!board) {
    return (
      <Box p={3}>
        <Typography variant="h6">No board selected</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4">
            {board.icon} {board.name}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {board.description}
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<ColumnIcon />}
            onClick={() => setOpenColumnDialog(true)}
          >
            Add Column
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => setOpenItemDialog(true)}
          >
            New Item
          </Button>
        </Box>
      </Box>

      {/* View Selector */}
      <Box mb={3}>
        <Tabs
          value={currentView?.id || ''}
          onChange={(e, value) => {
            const view = board.views.find(v => v.id === value);
            setCurrentView(view);
          }}
        >
          {board.views?.map(view => {
            const icons = {
              table: <TableIcon />,
              kanban: <KanbanIcon />,
              calendar: <CalendarIcon />,
              timeline: <TimelineIcon />,
            };
            return (
              <Tab
                key={view.id}
                value={view.id}
                label={view.name}
                icon={icons[view.type]}
                iconPosition="start"
              />
            );
          })}
        </Tabs>
      </Box>

      {/* View Content */}
      <Card>
        <CardContent>
          {currentView?.type === 'table' && renderTableView()}
          {currentView?.type === 'kanban' && renderKanbanView()}
          {currentView?.type === 'calendar' && renderCalendarView()}
          {currentView?.type === 'timeline' && renderTimelineView()}
        </CardContent>
      </Card>

      {/* Item Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            handleCompleteItem(selectedItem?._id);
            setAnchorEl(null);
          }}
        >
          {selectedItem?.isCompleted ? 'Mark as Incomplete' : 'Mark as Complete'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleDuplicateItem(selectedItem?._id);
            setAnchorEl(null);
          }}
        >
          Duplicate
        </MenuItem>
        <MenuItem
          onClick={() => {
            // TODO: Implement delete
            setAnchorEl(null);
          }}
        >
          Delete
        </MenuItem>
      </Menu>

      {/* Create/Edit Item Dialog */}
      <Dialog open={openItemDialog} onClose={() => setOpenItemDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedItem ? 'Edit Item' : 'Create New Item'}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Item Name"
              value={itemFormData.name}
              onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
              fullWidth
              required
            />
            
            {board.columns.map(column => (
              <Box key={column.id}>
                {column.type === 'text' && (
                  <TextField
                    label={column.name}
                    value={itemFormData.columnValues[column.id] || ''}
                    onChange={(e) => setItemFormData({
                      ...itemFormData,
                      columnValues: {
                        ...itemFormData.columnValues,
                        [column.id]: e.target.value,
                      },
                    })}
                    fullWidth
                  />
                )}
                {column.type === 'dropdown' && (
                  <FormControl fullWidth>
                    <InputLabel>{column.name}</InputLabel>
                    <Select
                      value={itemFormData.columnValues[column.id] || ''}
                      onChange={(e) => setItemFormData({
                        ...itemFormData,
                        columnValues: {
                          ...itemFormData.columnValues,
                          [column.id]: e.target.value,
                        },
                      })}
                      label={column.name}
                    >
                      {column.options?.values?.map(opt => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                {column.type === 'date' && (
                  <TextField
                    label={column.name}
                    type="date"
                    value={itemFormData.columnValues[column.id] || ''}
                    onChange={(e) => setItemFormData({
                      ...itemFormData,
                      columnValues: {
                        ...itemFormData.columnValues,
                        [column.id]: e.target.value,
                      },
                    })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenItemDialog(false)}>Cancel</Button>
          <Button
            onClick={selectedItem ? handleUpdateItem : handleCreateItem}
            variant="contained"
            color="primary"
          >
            {selectedItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Column Dialog */}
      <Dialog open={openColumnDialog} onClose={() => setOpenColumnDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Column</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Column Name"
              value={columnFormData.name}
              onChange={(e) => setColumnFormData({ ...columnFormData, name: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Column Type</InputLabel>
              <Select
                value={columnFormData.type}
                onChange={(e) => setColumnFormData({ ...columnFormData, type: e.target.value })}
                label="Column Type"
              >
                <MenuItem value="text">Text</MenuItem>
                <MenuItem value="number">Number</MenuItem>
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="dropdown">Dropdown</MenuItem>
                <MenuItem value="status">Status</MenuItem>
                <MenuItem value="priority">Priority</MenuItem>
                <MenuItem value="checkbox">Checkbox</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="phone">Phone</MenuItem>
                <MenuItem value="currency">Currency</MenuItem>
                <MenuItem value="percent">Percent</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenColumnDialog(false)}>Cancel</Button>
          <Button onClick={handleAddColumn} variant="contained" color="primary">
            Add Column
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BoardView;
