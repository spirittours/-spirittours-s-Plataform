/**
 * Tests for useAsync Hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsync } from '../useAsync';

describe('useAsync', () => {
  it('should initialize with idle state', () => {
    const mockFn = jest.fn(() => Promise.resolve('data'));
    const { result } = renderHook(() => useAsync(mockFn));

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });

  it('should set loading state when executing', async () => {
    const mockFn = jest.fn(
      () => new Promise(resolve => setTimeout(() => resolve('data'), 100))
    );
    const { result } = renderHook(() => useAsync(mockFn));

    act(() => {
      result.current.execute();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('should update data on successful execution', async () => {
    const mockData = { id: 1, name: 'Test' };
    const mockFn = jest.fn(() => Promise.resolve(mockData));
    const { result } = renderHook(() => useAsync(mockFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual(mockData);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should update error on failed execution', async () => {
    const mockError = new Error('Test error');
    const mockFn = jest.fn(() => Promise.reject(mockError));
    const { result } = renderHook(() => useAsync(mockFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(mockError);
    expect(result.current.data).toBeNull();
  });

  it('should execute immediately when immediate is true', async () => {
    const mockData = 'immediate data';
    const mockFn = jest.fn(() => Promise.resolve(mockData));
    const { result } = renderHook(() => useAsync(mockFn, true));

    // Should start loading immediately
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toBe(mockData);
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('should reset state', async () => {
    const mockFn = jest.fn(() => Promise.resolve('data'));
    const { result } = renderHook(() => useAsync(mockFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe('data');

    act(() => {
      result.current.reset();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });

  it('should handle multiple executions', async () => {
    let counter = 0;
    const mockFn = jest.fn(() => Promise.resolve(++counter));
    const { result } = renderHook(() => useAsync(mockFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe(1);

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe(2);
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it('should handle async function with parameters via closure', async () => {
    const mockFn = (id: number) => Promise.resolve({ id, name: 'Test' });
    const { result } = renderHook(() => useAsync(() => mockFn(123)));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toEqual({ id: 123, name: 'Test' });
  });

  it('should clear error on successful retry', async () => {
    let shouldFail = true;
    const mockFn = jest.fn(() =>
      shouldFail ? Promise.reject(new Error('Fail')) : Promise.resolve('Success')
    );

    const { result } = renderHook(() => useAsync(mockFn));

    // First execution fails
    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.data).toBeNull();

    // Second execution succeeds
    shouldFail = false;
    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data).toBe('Success');
  });

  it('should not update state if component unmounts', async () => {
    const mockFn = jest.fn(
      () => new Promise(resolve => setTimeout(() => resolve('data'), 100))
    );
    const { result, unmount } = renderHook(() => useAsync(mockFn));

    act(() => {
      result.current.execute();
    });

    expect(result.current.loading).toBe(true);

    unmount();

    // Wait for promise to resolve
    await new Promise(resolve => setTimeout(resolve, 150));

    // State should not have updated (would cause warning if it did)
  });
});
