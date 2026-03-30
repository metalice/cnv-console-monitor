import { useCallback, useEffect } from 'react';

export const useCtrlSave = (hasChanges: () => boolean, saveAll: () => void) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges()) saveAll();
      }
    },
    [hasChanges, saveAll],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
