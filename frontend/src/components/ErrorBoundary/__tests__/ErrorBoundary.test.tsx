/**
 * Tests for ErrorBoundary Component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// Component that throws an error
const ThrowError: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = true }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

// Suppress console.error for cleaner test output
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should catch errors and display fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/algo salió mal/i)).toBeInTheDocument();
  });

  it('should display error message in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/test error/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should show reset button', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const resetButton = screen.getByRole('button', { name: /intentar nuevamente/i });
    expect(resetButton).toBeInTheDocument();
  });

  it('should reset error state when reset button is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error boundary should show fallback
    expect(screen.getByText(/algo salió mal/i)).toBeInTheDocument();

    // Click reset button
    const resetButton = screen.getByRole('button', { name: /intentar nuevamente/i });
    fireEvent.click(resetButton);

    // Rerender with non-throwing component
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    // Should show normal content again
    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onErrorMock = jest.fn();

    render(
      <ErrorBoundary onError={onErrorMock}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalled();
    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String),
      })
    );
  });

  it('should show navigation button', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const navButton = screen.getByRole('button', { name: /volver al inicio/i });
    expect(navButton).toBeInTheDocument();
  });

  it('should use custom fallback component', () => {
    const CustomFallback = () => <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('should display error details button in development', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const detailsButton = screen.getByRole('button', { name: /mostrar detalles/i });
    expect(detailsButton).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should toggle error details when button is clicked', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const detailsButton = screen.getByRole('button', { name: /mostrar detalles/i });

    // Error details should not be visible initially
    expect(screen.queryByText(/stack trace/i)).not.toBeInTheDocument();

    // Click to show details
    fireEvent.click(detailsButton);

    // Error details should be visible
    expect(screen.getByText(/stack trace/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should log error to console', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('should handle async errors in useEffect', async () => {
    const AsyncErrorComponent = () => {
      React.useEffect(() => {
        throw new Error('Async error');
      }, []);

      return <div>Async component</div>;
    };

    // Note: Error boundaries don't catch async errors
    // This test documents the limitation
    render(
      <ErrorBoundary>
        <AsyncErrorComponent />
      </ErrorBoundary>
    );

    // Component should render normally (error boundary won't catch this)
    expect(screen.getByText('Async component')).toBeInTheDocument();
  });

  it('should provide error info to fallback render function', () => {
    const fallbackRenderMock = jest.fn(() => <div>Fallback</div>);

    render(
      <ErrorBoundary fallback={fallbackRenderMock}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(fallbackRenderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
        errorInfo: expect.any(Object),
      })
    );
  });
});
