import { useEffect, useState } from 'react';

/** Storage is optional: blocked storage must not stop shopping. */
export function useStoredState(key, initialValue, validate) {
  const [value, setValue] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      return validate(saved) ? saved : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* Private mode or full storage. */
    }
  }, [key, value]);
  return [value, setValue];
}
