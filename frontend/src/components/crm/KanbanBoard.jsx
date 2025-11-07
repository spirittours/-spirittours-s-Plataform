/**
 * Kanban Board Component
 * 
 * Advanced drag-and-drop Kanban board for deal/item management.
 * Uses @dnd-kit for React 19 compatibility (react-beautiful-dnd not compatible).
 * 
 * Features:
 * - Drag and drop cards between columns
 * - Multi-column support
 * - Card customization
 * - Quick actions
 * - Column management
 */

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Avatar,
  AvatarGroup,
  Button,
  TextField,
  Menu,
  MenuItem,
  Tooltip,
  Stack,
  Paper,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '../../utils/formatters';

/**
 * Sortable Card Item
 */
const SortableCard = ({ id, card, onEdit, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [anchorEl, setAnchorEl] = useState(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    onEdit(card);
  };

  const handleDelete = () => {
    handleMenuClose();
    onDelete(card.id);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{
        mb: 2,
        cursor: isDragging ? 'grabbing' : 'grab',
        '&:hover': {
          boxShadow: 3,
        },
      }}
      {...attributes}
      {...listeners}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {card.title}
          </Typography>
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>

        {card.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {card.description}
          </Typography>
        )}

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mb: 2, flexWrap: 'wrap' }}>
            {card.tags.map((tag, index) => (
              <Chip
                key={index}
                label={tag}
                size="small"
                sx={{ mb: 0.5 }}
              />
            ))}
          </Stack>
        )}

        {/* Metadata */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {card.value && (
            <Chip
              icon={<MoneyIcon />}
              label={formatCurrency(card.value)}
              size="small"
              color="success"
              variant="outlined"
            />
          )}
          {card.dueDate && (
            <Chip
              icon={<CalendarIcon />}
              label={formatDate(card.dueDate)}
              size="small"
              color={new Date(card.dueDate) < new Date() ? 'error' : 'default'}
              variant="outlined"
            />
          )}
          {card.priority && (
            <Chip
              label={card.priority}
              size="small"
              color={
                card.priority === 'high' ? 'error' :
                card.priority === 'medium' ? 'warning' : 'default'
              }
              variant="outlined"
            />
          )}
        </Box>

        {/* Assignees */}
        {card.assignees && card.assignees.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon fontSize="small" color="action" />
            <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: 12 } }}>
              {card.assignees.map((assignee, index) => (
                <Tooltip key={index} title={assignee.name}>
                  <Avatar src={assignee.avatar} alt={assignee.name}>
                    {assignee.name.charAt(0)}
                  </Avatar>
                </Tooltip>
              ))}
            </AvatarGroup>
          </Box>
        )}

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEdit}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem onClick={handleDelete}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
};

/**
 * Kanban Column
 */
const KanbanColumn = ({ column, cards, onAddCard, onEditCard, onDeleteCard }) => {
  const cardIds = useMemo(() => cards.map(card => card.id), [cards]);

  return (
    <Paper
      elevation={2}
      sx={{
        minWidth: 300,
        maxWidth: 350,
        bgcolor: 'background.default',
        borderRadius: 2,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 200px)',
      }}
    >
      {/* Column Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" fontWeight="bold">
            {column.name}
          </Typography>
          <Chip label={cards.length} size="small" />
        </Box>
        <IconButton size="small" onClick={() => onAddCard(column.id)}>
          <AddIcon />
        </IconButton>
      </Box>

      {/* Cards List */}
      <Box sx={{ overflowY: 'auto', flexGrow: 1 }}>
        <SortableContext
          items={cardIds}
          strategy={verticalListSortingStrategy}
        >
          {cards.map(card => (
            <SortableCard
              key={card.id}
              id={card.id}
              card={card}
              onEdit={onEditCard}
              onDelete={onDeleteCard}
            />
          ))}
        </SortableContext>
      </Box>

      {/* Add Card Button */}
      <Button
        fullWidth
        startIcon={<AddIcon />}
        onClick={() => onAddCard(column.id)}
        sx={{ mt: 1 }}
      >
        Add Card
      </Button>
    </Paper>
  );
};

/**
 * Main Kanban Board Component
 */
const KanbanBoard = ({
  columns: initialColumns,
  cards: initialCards,
  onCardMove,
  onCardAdd,
  onCardEdit,
  onCardDelete,
}) => {
  const [columns] = useState(initialColumns);
  const [cards, setCards] = useState(initialCards);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeCard = cards.find(card => card.id === active.id);
    const overCard = cards.find(card => card.id === over.id);

    if (!activeCard) {
      setActiveId(null);
      return;
    }

    // Moving within the same column
    if (activeCard.columnId === overCard?.columnId) {
      const columnCards = cards.filter(card => card.columnId === activeCard.columnId);
      const oldIndex = columnCards.findIndex(card => card.id === active.id);
      const newIndex = columnCards.findIndex(card => card.id === over.id);

      const reorderedColumnCards = arrayMove(columnCards, oldIndex, newIndex);
      const otherCards = cards.filter(card => card.columnId !== activeCard.columnId);
      
      setCards([...otherCards, ...reorderedColumnCards]);
    } else {
      // Moving to a different column
      const targetColumnId = overCard?.columnId || over.id;
      
      setCards(prevCards =>
        prevCards.map(card =>
          card.id === activeCard.id
            ? { ...card, columnId: targetColumnId }
            : card
        )
      );

      if (onCardMove) {
        onCardMove(activeCard.id, activeCard.columnId, targetColumnId);
      }
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleAddCard = (columnId) => {
    if (onCardAdd) {
      onCardAdd(columnId);
    }
  };

  const handleEditCard = (card) => {
    if (onCardEdit) {
      onCardEdit(card);
    }
  };

  const handleDeleteCard = (cardId) => {
    if (onCardDelete) {
      onCardDelete(cardId);
    }
    setCards(prevCards => prevCards.filter(card => card.id !== cardId));
  };

  const activeCard = activeId ? cards.find(card => card.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 3,
          overflowX: 'auto',
          p: 2,
          minHeight: 'calc(100vh - 200px)',
        }}
      >
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            cards={cards.filter(card => card.columnId === column.id)}
            onAddCard={handleAddCard}
            onEditCard={handleEditCard}
            onDeleteCard={handleDeleteCard}
          />
        ))}
      </Box>

      <DragOverlay>
        {activeCard ? (
          <Card sx={{ width: 300, opacity: 0.9 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold">
                {activeCard.title}
              </Typography>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
