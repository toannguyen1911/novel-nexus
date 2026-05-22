import { useEffect, useRef } from 'react';

/**
 * Custom hook to debounce a function execution.
 * @param {Function} callback - The function to execute.
 * @param {number} delay - Debounce delay in milliseconds.
 * @returns {Function} - The debounced function.
 */
export function useDebounce(callback, delay) {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef(null);

  // Keep callback reference updated to avoid stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  };
}
