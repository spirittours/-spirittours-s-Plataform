import { useState, useEffect, RefObject } from 'react';

/**
 * Custom hook for detecting when an element is visible on screen
 * Uses Intersection Observer API
 * 
 * @param ref - React ref to the element to observe
 * @param rootMargin - Margin around the root (default: '0px')
 * @param threshold - Percentage of visibility required (default: 0.1)
 * @returns Boolean indicating if element is visible
 */
function useOnScreen<T extends Element>(
  ref: RefObject<T>,
  rootMargin: string = '0px',
  threshold: number = 0.1
): boolean {
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIntersecting(entry.isIntersecting);
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [ref, rootMargin, threshold]);

  return isIntersecting;
}

export default useOnScreen;
