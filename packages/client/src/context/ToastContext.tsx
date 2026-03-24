import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

import { Alert, AlertActionCloseButton, AlertGroup, AlertVariant } from '@patternfly/react-core';

type ToastVariant = 'success' | 'danger' | 'warning' | 'info';

type Toast = {
  id: number;
  variant: AlertVariant;
  title: string;
  description?: string;
};

type ToastContextValue = {
  addToast: (variant: ToastVariant, title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_TIMEOUT_MS = 6000;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      const id = nextId.current++;
      const alertVariant =
        variant === 'success'
          ? AlertVariant.success
          : variant === 'danger'
            ? AlertVariant.danger
            : variant === 'warning'
              ? AlertVariant.warning
              : AlertVariant.info;

      setToasts(prev => [...prev, { description, id, title, variant: alertVariant }]);

      setTimeout(() => removeToast(id), TOAST_TIMEOUT_MS);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <AlertGroup isLiveRegion isToast>
        {toasts.map(toast => (
          <Alert
            actionClose={<AlertActionCloseButton onClose={() => removeToast(toast.id)} />}
            key={toast.id}
            timeout={TOAST_TIMEOUT_MS}
            title={toast.title}
            variant={toast.variant}
          >
            {toast.description}
          </Alert>
        ))}
      </AlertGroup>
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};
