/**
 * AI Content Generator Component
 * 
 * Main interface for generating AI-powered social media content
 * 
 * Features:
 * - Multi-platform post generation
 * - Hashtag optimization
 * - Content repurposing
 * - A/B testing variants
 * - Provider selection
 * - Real-time preview
 * 
 * Author: Spirit Tours Development Team
 * Created: 2025-10-04
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Card,
  CardContent,
  CardActions,
  CircularProgress,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Stack,
  Divider
} from '@mui/material';
import {
  AutoAwesome,
  ContentCopy,
  Refresh,
  Send,
  ExpandMore,
  Settings,
  Psychology,
  Translate,
  TrendingUp,
  Speed,
  AttachMoney
} from '@mui/icons-material';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as aiApi from '../../api/aiContentApi';

// Platform icons
import {
  Facebook,
  Instagram,
  Twitter,
  LinkedIn,
  YouTube
} from '@mui/icons-material';

interface GeneratedContent {
  content: string;
  provider: string;
  metadata: any;
  tokens: any;
  cost_estimate: any;
}

const AIContentGenerator: React.FC = () => {
  // Tab state
  const [currentTab, setCurrentTab] = useState(0);
  
  // Form state
  const [prompt, setPrompt] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [language, setLanguage] = useState('en');
  const [tone, setTone] = useState('friendly');
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [provider, setProvider] = useState('auto');
  
  // Generated content state
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Fetch AI configuration
  const { data: config } = useQuery({
    queryKey: ['ai-config'],
    queryFn: aiApi.getAIConfiguration
  });
  
  // Fetch providers
  const { data: providers } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: aiApi.getProviders
  });
  
  // Generate post mutation
  const generateMutation = useMutation({
    mutationFn: aiApi.generatePost,
    onSuccess: (data) => {
      setGeneratedContent(data as GeneratedContent);
      setIsGenerating(false);
    },
    onError: (error: any) => {
      console.error('Generation failed:', error);
      setIsGenerating(false);
    }
  });
  
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      await generateMutation.mutateAsync({
        prompt,
        platform,
        language,
        tone,
        topic: topic || undefined,
        keywords: keywords.length > 0 ? keywords : undefined,
        provider: provider !== 'auto' ? provider : undefined
      });
    } catch (error) {
      console.error('Generation error:', error);
    }
  };
  
  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };
  
  const handleDeleteKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };
  
  const handleCopyContent = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent.content);
      alert('Content copied to clipboard!');
    }
  };
  
  const getPlatformIcon = (platformName: string) => {
    const icons: Record<string, React.ReactElement> = {
      facebook: <Facebook />,
      instagram: <Instagram />,
      twitter: <Twitter />,
      linkedin: <LinkedIn />,
      youtube: <YouTube />,
      tiktok: <AutoAwesome />
    };
    return icons[platformName] || <AutoAwesome />;
  };
  
  const getPlatformColor = (platformName: string) => {
    const colors: Record<string, string> = {
      facebook: '#1877F2',
      instagram: '#E4405F',
      twitter: '#1DA1F2',
      linkedin: '#0A66C2',
      youtube: '#FF0000',
      tiktok: '#000000'
    };
    return colors[platformName] || '#666';
  };
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <AutoAwesome sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" gutterBottom>
              🤖 AI Content Generator
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generate optimized social media content with multi-provider AI
            </Typography>
          </Box>
        </Stack>
      </Box>
      
      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Left Panel - Input Form */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Content Generation
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Prompt */}
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Content Prompt"
              placeholder="Example: Create an engaging post about our upcoming spiritual retreat in Sedona, focusing on meditation and energy healing"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              sx={{ mb: 2 }}
              helperText="Describe what content you want to generate"
            />
            
            {/* Platform Selection */}
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Platform</InputLabel>
              <Select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                label="Platform"
                startAdornment={
                  <Box sx={{ ml: 1, display: 'flex', alignItems: 'center' }}>
                    {getPlatformIcon(platform)}
                  </Box>
                }
              >
                {config?.platforms.map((p) => (
                  <MenuItem key={p} value={p}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getPlatformIcon(p)}
                      <span style={{ textTransform: 'capitalize' }}>{p}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {/* Language */}
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    label="Language"
                    startAdornment={<Translate sx={{ ml: 1 }} />}
                  >
                    {config && Object.entries(config.languages).map(([code, name]) => (
                      <MenuItem key={code} value={code}>
                        {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Tone */}
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Tone</InputLabel>
                  <Select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    label="Tone"
                    startAdornment={<Psychology sx={{ ml: 1 }} />}
                  >
                    {config?.tones.map((t) => (
                      <MenuItem key={t} value={t}>
                        <span style={{ textTransform: 'capitalize' }}>{t}</span>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            
            {/* Advanced Options Accordion */}
            <Accordion sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Settings sx={{ mr: 1 }} />
                <Typography>Advanced Options</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {/* Topic */}
                <TextField
                  fullWidth
                  label="Topic (Optional)"
                  placeholder="e.g., Spiritual Retreats"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  sx={{ mb: 2 }}
                />
                
                {/* Keywords */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Keywords
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <TextField
                      size="small"
                      placeholder="Add keyword"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleAddKeyword}
                    >
                      Add
                    </Button>
                  </Stack>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {keywords.map((keyword) => (
                      <Chip
                        key={keyword}
                        label={keyword}
                        onDelete={() => handleDeleteKeyword(keyword)}
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
                
                {/* Provider Selection */}
                <FormControl fullWidth>
                  <InputLabel>AI Provider</InputLabel>
                  <Select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    label="AI Provider"
                  >
                    <MenuItem value="auto">
                      <em>Auto (Smart Selection)</em>
                    </MenuItem>
                    {providers?.providers.map((p) => (
                      <MenuItem key={p.provider} value={p.provider}>
                        <Box>
                          <Typography variant="body2">
                            {p.provider.toUpperCase()} - {p.model}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ${p.cost_per_1k_output}/1K tokens
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </AccordionDetails>
            </Accordion>
            
            {/* Generate Button */}
            <Button
              fullWidth
              variant="contained"
              size="medium"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              startIcon={isGenerating ? <CircularProgress size={20} /> : <AutoAwesome />}
              sx={{ 
                py: 1.5,
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
              }}
            >
              {isGenerating ? 'Generating...' : 'Generate Content'}
            </Button>
          </Paper>
        </Grid>
        
        {/* Right Panel - Generated Content */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, minHeight: 600 }}>
            <Typography variant="h6" gutterBottom>
              Generated Content
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            {!generatedContent && !isGenerating && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 400,
                  color: 'text.secondary'
                }}
              >
                <AutoAwesome sx={{ fontSize: 80, mb: 2, opacity: 0.3 }} />
                <Typography variant="body1">
                  Your generated content will appear here
                </Typography>
                <Typography variant="caption">
                  Fill in the form and click "Generate Content"
                </Typography>
              </Box>
            )}
            
            {isGenerating && (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 400
                }}
              >
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Generating content...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This may take a few seconds
                </Typography>
              </Box>
            )}
            
            {generatedContent && !isGenerating && (
              <Box>
                {/* Content Preview */}
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getPlatformIcon(platform)}
                      <Typography
                        variant="caption"
                        sx={{
                          textTransform: 'uppercase',
                          fontWeight: 'bold',
                          color: getPlatformColor(platform)
                        }}
                      >
                        {platform}
                      </Typography>
                    </Box>
                    
                    <Typography
                      variant="body1"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.7,
                        fontSize: '1rem'
                      }}
                    >
                      {generatedContent.content}
                    </Typography>
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      size="small"
                      startIcon={<ContentCopy />}
                      onClick={handleCopyContent}
                    >
                      Copy
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Refresh />}
                      onClick={handleGenerate}
                    >
                      Regenerate
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Send />}
                      color="primary"
                      disabled
                    >
                      Schedule Post
                    </Button>
                  </CardActions>
                </Card>
                
                {/* Metadata */}
                <Grid container spacing={2}>
                  {/* Provider Info */}
                  <Grid item xs={12}>
                    <Alert severity="info" icon={<Psychology />}>
                      <AlertTitle>AI Provider</AlertTitle>
                      Generated by <strong>{generatedContent.provider.toUpperCase()}</strong> in{' '}
                      {generatedContent.metadata.generation_time_ms}ms
                    </Alert>
                  </Grid>
                  
                  {/* Token Usage */}
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Speed color="primary" />
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Tokens Used
                            </Typography>
                            <Typography variant="h6">
                              {generatedContent.tokens.total}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  {/* Cost Estimate */}
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <AttachMoney color="success" />
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Cost
                            </Typography>
                            <Typography variant="h6">
                              ${generatedContent.cost_estimate.total.toFixed(4)}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  {/* Hashtags */}
                  {generatedContent.metadata.hashtags && generatedContent.metadata.hashtags.length > 0 && (
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                            <TrendingUp color="primary" />
                            <Typography variant="subtitle2">
                              Hashtags ({generatedContent.metadata.hashtags.length})
                            </Typography>
                          </Stack>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {generatedContent.metadata.hashtags.map((tag: string) => (
                              <Chip key={tag} label={tag} size="small" />
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AIContentGenerator;
