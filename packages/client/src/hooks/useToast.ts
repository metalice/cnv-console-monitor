import { useState, useCallback } from 'react';

export type Toast = {
  id: number;
  variant: 'success' | 'danger' | 'info' | 'warning';
  title: string;
};

let nextId = 0;

export function useToast(): {
  toasts: Toast[];
  addToast: (variant: Toast['variant'], title: string) => void;
  removeToast: (id: number) => void;
} {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((variant: Toast['variant'], title: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, variant, title }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
