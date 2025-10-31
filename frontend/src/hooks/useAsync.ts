import { useState, useEffect, useCallback } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseAsyncReturn<T> extends AsyncState<T> {
  execute: () => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook for handling async operations
 * Manages loading, error, and data states automatically
 * 
 * @param asyncFunction - Async function to execute
 * @param immediate - Whether to execute immediately (default: true)
 * @returns Object with data, loading, error, execute, and reset
 */
function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate: boolean = true
): UseAsyncReturn<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ data: null, loading: true, error: null });

    try {
      const response = await asyncFunction();
      setState({ data: response, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [asyncFunction]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { ...state, execute, reset };
}

export default useAsync;
