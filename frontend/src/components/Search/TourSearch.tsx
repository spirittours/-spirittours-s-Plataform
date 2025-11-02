/**
 * Advanced Tour Search Component
 * 
 * Main search interface with filters, autocomplete, and results.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  TextField,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  CircularProgress,
  InputAdornment,
  Autocomplete
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { useDebounce } from '../../hooks/useDebounce';

interface TourSearchProps {
  onSearch?: (results: any[]) => void;
}

const TourSearch: React.FC<TourSearchProps> = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<any>({});
  
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      fetchSuggestions(debouncedQuery);
    }
  }, [debouncedQuery]);

  const fetchSuggestions = async (q: string) => {
    try {
      const response = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/search/tours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, filters })
      });
      const data = await response.json();
      setResults(data.tours || []);
      if (onSearch) onSearch(data.tours);
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Autocomplete
          freeSolo
          options={suggestions}
          value={query}
          onInputChange={(e, newValue) => setQuery(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              fullWidth
              variant="outlined"
              placeholder="Search tours..."
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <>
                    {loading && <CircularProgress size={20} />}
                    {params.InputProps.endAdornment}
                  </>
                )
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
          )}
        />
        
        <Button
          variant="contained"
          onClick={handleSearch}
          sx={{ mt: 2 }}
          startIcon={<SearchIcon />}
        >
          Search
        </Button>
      </Box>

      <Grid container spacing={2}>
        {results.map((tour) => (
          <Grid item xs={12} md={6} key={tour.id}>
            <Card>
              <CardContent>
                <Typography variant="h6">{tour.title}</Typography>
                <Typography color="text.secondary">
                  {tour.short_description}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip label={tour.category} size="small" />
                  <Chip label={`$${tour.price}`} size="small" sx={{ ml: 1 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default TourSearch;
