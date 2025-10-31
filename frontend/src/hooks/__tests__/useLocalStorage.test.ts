/**
 * Tests for useLocalStorage Hook
 */

import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should initialize with default value', () => {
    const { result } = renderHook(() =>
      useLocalStorage('testKey', 'defaultValue')
    );

    expect(result.current[0]).toBe('defaultValue');
  });

  it('should initialize with value from localStorage if exists', () => {
    localStorage.setItem('testKey', JSON.stringify('storedValue'));

    const { result } = renderHook(() =>
      useLocalStorage('testKey', 'defaultValue')
    );

    expect(result.current[0]).toBe('storedValue');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() =>
      useLocalStorage('testKey', 'initialValue')
    );

    act(() => {
      result.current[1]('newValue');
    });

    expect(result.current[0]).toBe('newValue');
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'testKey',
      JSON.stringify('newValue')
    );
  });

  it('should support functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('counter', 0));

    act(() => {
      result.current[1](prev => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });

  it('should remove item from localStorage', () => {
    const { result } = renderHook(() =>
      useLocalStorage('testKey', 'initialValue')
    );

    act(() => {
      result.current[2](); // remove function
    });

    expect(result.current[0]).toBe('initialValue'); // back to default
    expect(localStorage.removeItem).toHaveBeenCalledWith('testKey');
  });

  it('should handle complex objects', () => {
    const complexObject = {
      name: 'Test',
      nested: { value: 42 },
      array: [1, 2, 3],
    };

    const { result } = renderHook(() =>
      useLocalStorage('complexKey', complexObject)
    );

    expect(result.current[0]).toEqual(complexObject);

    const updatedObject = { ...complexObject, name: 'Updated' };

    act(() => {
      result.current[1](updatedObject);
    });

    expect(result.current[0]).toEqual(updatedObject);
  });

  it('should handle localStorage errors gracefully', () => {
    const mockSetItem = jest.fn(() => {
      throw new Error('Storage full');
    });
    Storage.prototype.setItem = mockSetItem;

    const { result } = renderHook(() =>
      useLocalStorage('testKey', 'initialValue')
    );

    // Should not throw
    act(() => {
      result.current[1]('newValue');
    });

    // Value should still update in memory
    expect(result.current[0]).toBe('newValue');
  });

  it('should handle invalid JSON in localStorage', () => {
    localStorage.setItem('testKey', 'invalid json {');

    const { result } = renderHook(() =>
      useLocalStorage('testKey', 'defaultValue')
    );

    // Should fall back to default value
    expect(result.current[0]).toBe('defaultValue');
  });
});
