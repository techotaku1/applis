import { useCallback, useRef } from 'react';

import type { CleaningService, SaveResult } from '~/types';

export function useDebouncedSave(
  saveFunction: (data: CleaningService[]) => Promise<SaveResult>,
  onSuccess: () => void,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const debouncedSave = useCallback(
    (data: CleaningService[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(async () => {
        const result = await saveFunction(data);
        if (result.success) {
          onSuccess();
        }
      }, delay);
    },
    [saveFunction, onSuccess, delay]
  );

  return debouncedSave;
}
