import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Typography, Paper, Container } from '@mui/material';
import { Error as ErrorIcon, Refresh, Home } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to error tracking service (Sentry, etc.)
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error: Error, errorInfo: ErrorInfo): void => {
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry integration
      // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
      
      // For now, just log to console
      console.error('Production Error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  };

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <Container maxWidth="md">
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              py: 4,
            }}
          >
            <Paper
              elevation={3}
              sx={{
                p: 4,
                textAlign: 'center',
                maxWidth: 600,
                width: '100%',
              }}
            >
              {/* Error Icon */}
              <ErrorIcon
                sx={{
                  fontSize: 80,
                  color: 'error.main',
                  mb: 2,
                }}
              />

              {/* Error Title */}
              <Typography variant="h4" gutterBottom fontWeight={600}>
                Oops! Something went wrong
              </Typography>

              {/* Error Description */}
              <Typography variant="body1" color="text.secondary" paragraph>
                We're sorry for the inconvenience. An unexpected error has occurred.
              </Typography>

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Paper
                  sx={{
                    p: 2,
                    mt: 2,
                    mb: 3,
                    bgcolor: '#f5f5f5',
                    textAlign: 'left',
                    overflow: 'auto',
                    maxHeight: 300,
                  }}
                >
                  <Typography variant="subtitle2" color="error" gutterBottom>
                    Error Details (Development Mode):
                  </Typography>
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {this.state.error.toString()}
                    {'\n\n'}
                    {this.state.errorInfo?.componentStack}
                  </Typography>
                </Paper>
              )}

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={this.handleReset}
                  size="large"
                >
                  Try Again
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Home />}
                  onClick={this.handleGoHome}
                  size="large"
                >
                  Go Home
                </Button>
              </Box>

              {/* Help Text */}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
                If the problem persists, please contact support at{' '}
                <a href="mailto:support@spirittours.com" style={{ color: 'inherit' }}>
                  support@spirittours.com
                </a>
              </Typography>
            </Paper>
          </Box>
        </Container>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
