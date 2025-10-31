/**
 * Tests for useDebounce Hook
 */

import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

jest.useFakeTimers();

describe('useDebounce', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 500));

    expect(result.current).toBe('test');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 500 },
      }
    );

    expect(result.current).toBe('initial');

    // Update value
    rerender({ value: 'updated', delay: 500 });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Value should update after delay
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      {
        initialProps: { value: 'initial' },
      }
    );

    // Make rapid changes
    rerender({ value: 'first' });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    rerender({ value: 'second' });
    act(() => {
      jest.advanceTimersByTime(200);
    });

    rerender({ value: 'third' });

    // Should still be initial because timer keeps resetting
    expect(result.current).toBe('initial');

    // Complete the delay
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should now be the last value
    expect(result.current).toBe('third');
  });

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: 'initial', delay: 1000 },
      }
    );

    rerender({ value: 'updated', delay: 1000 });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should not update yet
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should update after 1000ms
    expect(result.current).toBe('updated');
  });

  it('should cleanup timeout on unmount', () => {
    const { unmount } = renderHook(() => useDebounce('test', 500));

    const spy = jest.spyOn(global, 'clearTimeout');

    unmount();

    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it('should handle complex objects', () => {
    const obj1 = { id: 1, name: 'Test' };
    const obj2 = { id: 2, name: 'Updated' };

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      {
        initialProps: { value: obj1 },
      }
    );

    expect(result.current).toEqual(obj1);

    rerender({ value: obj2 });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current).toEqual(obj2);
  });

  it('should use default delay of 500ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      {
        initialProps: { value: 'initial' },
      }
    );

    rerender({ value: 'updated' });

    act(() => {
      jest.advanceTimersByTime(499);
    });

    // Should not update yet
    expect(result.current).toBe('initial');

    act(() => {
      jest.advanceTimersByTime(1);
    });

    // Should update after default 500ms
    expect(result.current).toBe('updated');
  });
});
