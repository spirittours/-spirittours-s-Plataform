import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  IconButton,
  CircularProgress,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import { Add, Search, Visibility, ThumbUp, ThumbDown, Article } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { KnowledgeBaseArticle, KBCategory } from '../../types/support.types';
import apiClient from '../../services/apiClient';

const KnowledgeBase: React.FC = () => {
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchArticles(); }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<KnowledgeBaseArticle[]>('/api/support/knowledge-base');
      setArticles(response.data);
    } catch (err) {
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    article.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const groupedArticles = filteredArticles.reduce((acc, article) => {
    if (!acc[article.category]) acc[article.category] = [];
    acc[article.category].push(article);
    return acc;
  }, {} as Record<string, KnowledgeBaseArticle[]>);

  if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">Knowledge Base</Typography>
        <Button variant="contained" startIcon={<Add />}>New Article</Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search articles..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start"><Search /></InputAdornment>
          ),
        }}
      />

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Total Articles</Typography>
              <Typography variant="h4" fontWeight="bold">{articles.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Published</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {articles.filter(a => a.status === 'published').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Total Views</Typography>
              <Typography variant="h4" fontWeight="bold">
                {articles.reduce((sum, a) => sum + a.views, 0).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {Object.entries(groupedArticles).map(([category, categoryArticles]) => (
        <Card key={category} sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" mb={2}>
              {category.replace('_', ' ').toUpperCase()}
            </Typography>
            <List>
              {categoryArticles.map((article, idx) => (
                <React.Fragment key={article.id}>
                  {idx > 0 && <Divider />}
                  <ListItem
                    secondaryAction={
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <ThumbUp fontSize="small" sx={{ fontSize: 14 }} />
                          <Typography variant="caption">{article.helpful}</Typography>
                        </Box>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <Article fontSize="small" />
                          <Typography variant="caption">{article.views}</Typography>
                        </Box>
                        <IconButton size="small"><Visibility fontSize="small" /></IconButton>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={article.title}
                      secondary={
                        <Box display="flex" gap={1} mt={0.5}>
                          <Chip label={article.status} size="small" color={article.status === 'published' ? 'success' : 'default'} />
                          {article.tags.slice(0, 3).map((tag, idx) => (
                            <Chip key={idx} label={tag} size="small" variant="outlined" />
                          ))}
                        </Box>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default KnowledgeBase;
