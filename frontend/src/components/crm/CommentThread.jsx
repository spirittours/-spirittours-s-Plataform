/**
 * Comment Thread Component
 * 
 * Universal commenting system with @mentions, reactions, threading, and moderation.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  TextField,
  Avatar,
  Stack,
  Divider,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  Alert,
} from '@mui/material';
import {
  Send as SendIcon,
  Reply as ReplyIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ResolveIcon,
  PushPin as PinIcon,
  AttachFile as AttachIcon,
  EmojiEmotions as EmojiIcon,
  ThumbUp as ThumbUpIcon,
  Favorite as HeartIcon,
  Star as StarIcon,
  Celebration as CelebrationIcon,
} from '@mui/icons-material';

const EMOJI_OPTIONS = [
  { emoji: '👍', label: 'thumbs_up' },
  { emoji: '❤️', label: 'heart' },
  { emoji: '😊', label: 'smile' },
  { emoji: '🎉', label: 'celebration' },
  { emoji: '👏', label: 'clap' },
  { emoji: '🚀', label: 'rocket' },
  { emoji: '✅', label: 'check' },
  { emoji: '⭐', label: 'star' },
];

const CommentThread = ({ 
  workspaceId, 
  entityType, 
  entityId,
  showTitle = true 
}) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingComment, setEditingComment] = useState(null);
  const [editText, setEditText] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [selectedComment, setSelectedComment] = useState(null);
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const textFieldRef = useRef(null);

  useEffect(() => {
    fetchComments();
  }, [workspaceId, entityType, entityId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `/api/crm/comments/${workspaceId}/${entityType}/${entityId}`,
        {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommentChange = (e) => {
    const text = e.target.value;
    setNewComment(text);

    // Check for @ mentions
    const lastWord = text.split(' ').pop();
    if (lastWord.startsWith('@') && lastWord.length > 1) {
      setShowMentions(true);
      // In a real app, fetch users matching lastWord.substring(1)
      setMentionUsers([
        { _id: '1', firstName: 'John', lastName: 'Doe' },
        { _id: '2', firstName: 'Jane', lastName: 'Smith' },
      ]);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (user) => {
    const words = newComment.split(' ');
    words.pop(); // Remove partial mention
    words.push(`@${user.firstName}${user.lastName}`);
    setNewComment(words.join(' ') + ' ');
    setShowMentions(false);
    textFieldRef.current?.focus();
  };

  const createComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/crm/comments/${workspaceId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityType,
          entityId,
          content: newComment,
          parentComment: replyingTo?._id,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setNewComment('');
        setReplyingTo(null);
        fetchComments();
      }
    } catch (error) {
      console.error('Error creating comment:', error);
    }
  };

  const updateComment = async () => {
    if (!editText.trim() || !editingComment) return;

    try {
      const response = await fetch(
        `/api/crm/comments/${workspaceId}/${editingComment._id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: editText }),
        }
      );
      const data = await response.json();
      if (data.success) {
        setEditingComment(null);
        setEditText('');
        fetchComments();
      }
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      const response = await fetch(
        `/api/crm/comments/${workspaceId}/${commentId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        fetchComments();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const addReaction = async (commentId, emoji) => {
    try {
      const response = await fetch(
        `/api/crm/comments/${workspaceId}/${commentId}/reaction`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ emoji }),
        }
      );
      const data = await response.json();
      if (data.success) {
        fetchComments();
        setEmojiAnchor(null);
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const toggleResolve = async (comment) => {
    const endpoint = comment.isResolved ? 'unresolve' : 'resolve';
    try {
      const response = await fetch(
        `/api/crm/comments/${workspaceId}/${comment._id}/${endpoint}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        fetchComments();
      }
    } catch (error) {
      console.error('Error toggling resolve:', error);
    }
  };

  const togglePin = async (comment) => {
    const endpoint = comment.isPinned ? 'unpin' : 'pin';
    try {
      const response = await fetch(
        `/api/crm/comments/${workspaceId}/${comment._id}/${endpoint}`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        }
      );
      const data = await response.json();
      if (data.success) {
        fetchComments();
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const renderComment = (comment, isReply = false) => {
    const isEditing = editingComment?._id === comment._id;

    return (
      <Box
        key={comment._id}
        sx={{
          ml: isReply ? 6 : 0,
          mb: 2,
          opacity: comment.isDeleted ? 0.5 : 1,
        }}
      >
        <Card 
          variant="outlined"
          sx={{
            bgcolor: comment.isPinned ? 'action.hover' : 'background.paper',
            borderLeft: comment.isPinned ? '4px solid' : 'none',
            borderLeftColor: 'primary.main',
          }}
        >
          <CardContent>
            {/* Comment Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  src={comment.author?.avatar}
                  sx={{ width: 32, height: 32 }}
                >
                  {comment.author?.firstName?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {comment.author?.firstName} {comment.author?.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTimeAgo(comment.createdAt)}
                    {comment.isEdited && ' (edited)'}
                  </Typography>
                </Box>
                {comment.isPinned && (
                  <Chip icon={<PinIcon />} label="Pinned" size="small" color="primary" />
                )}
                {comment.isResolved && (
                  <Chip icon={<ResolveIcon />} label="Resolved" size="small" color="success" />
                )}
              </Stack>

              {/* Comment Actions */}
              <IconButton
                size="small"
                onClick={(e) => {
                  setAnchorEl(e.currentTarget);
                  setSelectedComment(comment);
                }}
              >
                <MoreIcon fontSize="small" />
              </IconButton>
            </Stack>

            {/* Comment Content */}
            {isEditing ? (
              <Box sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  variant="outlined"
                  size="small"
                />
                <Stack direction="row" spacing={1} mt={1}>
                  <Button size="small" variant="contained" onClick={updateComment}>
                    Save
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditingComment(null);
                      setEditText('');
                    }}
                  >
                    Cancel
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                {comment.content}
              </Typography>
            )}

            {/* Attachments */}
            {comment.attachments && comment.attachments.length > 0 && (
              <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                {comment.attachments.map((att, idx) => (
                  <Chip
                    key={idx}
                    icon={<AttachIcon />}
                    label={att.name}
                    size="small"
                    variant="outlined"
                    onClick={() => window.open(att.url, '_blank')}
                  />
                ))}
              </Stack>
            )}

            {/* Reactions */}
            {comment.reactions && comment.reactions.length > 0 && (
              <Stack direction="row" spacing={0.5} mt={2} flexWrap="wrap">
                {Object.entries(
                  comment.reactions.reduce((acc, r) => {
                    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([emoji, count]) => (
                  <Chip
                    key={emoji}
                    label={`${emoji} ${count}`}
                    size="small"
                    variant="outlined"
                    onClick={() => addReaction(comment._id, emoji)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
                <IconButton
                  size="small"
                  onClick={(e) => {
                    setEmojiAnchor(e.currentTarget);
                    setSelectedComment(comment);
                  }}
                >
                  <EmojiIcon fontSize="small" />
                </IconButton>
              </Stack>
            )}

            {/* Reply Button */}
            {!isReply && (
              <Button
                size="small"
                startIcon={<ReplyIcon />}
                onClick={() => setReplyingTo(comment)}
                sx={{ mt: 1 }}
              >
                Reply
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {comment.replies.map((reply) => renderComment(reply, true))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box>
      {showTitle && (
        <Typography variant="h6" fontWeight="bold" mb={2}>
          Comments
        </Typography>
      )}

      {/* Reply Alert */}
      {replyingTo && (
        <Alert
          severity="info"
          onClose={() => setReplyingTo(null)}
          sx={{ mb: 2 }}
        >
          Replying to {replyingTo.author?.firstName}
        </Alert>
      )}

      {/* Comment Input */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Write a comment... Use @ to mention someone"
          value={newComment}
          onChange={handleCommentChange}
          inputRef={textFieldRef}
          variant="outlined"
        />

        {/* Mention Suggestions */}
        {showMentions && mentionUsers.length > 0 && (
          <Paper sx={{ mt: 1, maxHeight: 150, overflow: 'auto' }} elevation={3}>
            {mentionUsers.map((user) => (
              <MenuItem
                key={user._id}
                onClick={() => insertMention(user)}
              >
                <Avatar src={user.avatar} sx={{ width: 24, height: 24, mr: 1 }}>
                  {user.firstName?.[0]}
                </Avatar>
                {user.firstName} {user.lastName}
              </MenuItem>
            ))}
          </Paper>
        )}

        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
          <Button
            startIcon={<AttachIcon />}
            size="small"
            component="label"
          >
            Attach File
            <input type="file" hidden />
          </Button>
          <Button
            variant="contained"
            endIcon={<SendIcon />}
            onClick={createComment}
            disabled={!newComment.trim()}
          >
            {replyingTo ? 'Reply' : 'Comment'}
          </Button>
        </Stack>
      </Paper>

      {/* Comments List */}
      <Box>
        {comments.length === 0 ? (
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No comments yet. Be the first to comment!
            </Typography>
          </Paper>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </Box>

      {/* Comment Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => {
          setAnchorEl(null);
          setSelectedComment(null);
        }}
      >
        <MenuItem
          onClick={() => {
            setEditingComment(selectedComment);
            setEditText(selectedComment.content);
            setAnchorEl(null);
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            toggleResolve(selectedComment);
            setAnchorEl(null);
          }}
        >
          <ResolveIcon fontSize="small" sx={{ mr: 1 }} />
          {selectedComment?.isResolved ? 'Unresolve' : 'Resolve'}
        </MenuItem>
        <MenuItem
          onClick={() => {
            togglePin(selectedComment);
            setAnchorEl(null);
          }}
        >
          <PinIcon fontSize="small" sx={{ mr: 1 }} />
          {selectedComment?.isPinned ? 'Unpin' : 'Pin'}
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            deleteComment(selectedComment._id);
            setAnchorEl(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Emoji Picker Menu */}
      <Menu
        anchorEl={emojiAnchor}
        open={Boolean(emojiAnchor)}
        onClose={() => {
          setEmojiAnchor(null);
          setSelectedComment(null);
        }}
      >
        {EMOJI_OPTIONS.map((opt) => (
          <MenuItem
            key={opt.label}
            onClick={() => addReaction(selectedComment._id, opt.emoji)}
          >
            <Typography fontSize="1.5rem" mr={1}>
              {opt.emoji}
            </Typography>
            {opt.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default CommentThread;
