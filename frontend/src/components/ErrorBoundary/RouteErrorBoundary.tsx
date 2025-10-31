import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Paper, Container } from '@mui/material';
import { Error as ErrorIcon, ArrowBack } from '@mui/icons-material';

interface RouteErrorBoundaryProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

/**
 * Route-specific Error Boundary
 * Lighter weight error display for route-level errors
 */
const RouteErrorBoundary: React.FC<RouteErrorBoundaryProps> = ({
  error,
  resetErrorBoundary,
}) => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (resetErrorBoundary) {
      resetErrorBoundary();
    }
    navigate(-1);
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Paper
          elevation={2}
          sx={{
            p: 4,
            textAlign: 'center',
            width: '100%',
          }}
        >
          <ErrorIcon
            sx={{
              fontSize: 60,
              color: 'warning.main',
              mb: 2,
            }}
          />

          <Typography variant="h5" gutterBottom fontWeight={600}>
            Page Error
          </Typography>

          <Typography variant="body2" color="text.secondary" paragraph>
            {error?.message || 'This page encountered an error. Please try going back.'}
          </Typography>

          <Button
            variant="contained"
            startIcon={<ArrowBack />}
            onClick={handleGoBack}
            sx={{ mt: 2 }}
          >
            Go Back
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default RouteErrorBoundary;
