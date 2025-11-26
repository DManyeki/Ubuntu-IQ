import { useState, useEffect } from 'react';

export function useSessionStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Initialize state function to only read from storage once on mount
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn(`Error reading sessionStorage key "${key}":`, e);
    }
    return initialValue;
  });

  // Update storage whenever value changes
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Error writing sessionStorage key "${key}":`, e);
    }
  }, [key, value]);

  return [value, setValue];
}