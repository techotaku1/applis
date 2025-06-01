import { useCallback, useRef, useEffect } from 'react';

import type { CleaningService, SaveResult } from '~/types';

export function useDebouncedSave(
  saveFunction: (data: CleaningService[]) => Promise<SaveResult>,
  onSuccess: () => void,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pendingDataRef = useRef<CleaningService[] | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedSave = useCallback(
    (data: CleaningService[]) => {
      // Store the latest data
      pendingDataRef.current = data;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        if (pendingDataRef.current) {
          try {
            const result = await saveFunction(pendingDataRef.current);
            if (result.success) {
              onSuccess();
            }
          } catch (error) {
            console.error('Error saving data:', error);
          }
          pendingDataRef.current = null;
        }
      }, delay);
    },
    [saveFunction, onSuccess, delay]
  );

  return debouncedSave;
}
