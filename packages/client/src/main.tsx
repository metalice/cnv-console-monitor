/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { keepPreviousData, QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ConnectionBanner } from './components/common/ConnectionBanner';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { ComponentFilterProvider } from './context/ComponentFilterContext';
import { DateProvider } from './context/DateContext';
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { ToastProvider } from './context/ToastContext';
import { useWebSocket } from './hooks/useWebSocket';
import { initConsoleBuffer } from './utils/consoleBuffer';
import App from './App';

import '@patternfly/react-core/dist/styles/base.css';
import './styles/app.css';

initConsoleBuffer();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      placeholderData: keepPreviousData,
      retry: 2,
      staleTime: 30 * 1000,
    },
  },
});

const ThemeEffect: React.FC = () => {
  const { preferences } = usePreferences();
  React.useEffect(() => {
    const theme = preferences.theme || 'auto';
    const prefersDark =
      theme === 'auto'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : theme === 'dark';
    document.documentElement.classList.toggle('pf-v6-theme-dark', prefersDark);
  }, [preferences.theme]);
  return null;
};

const AppWithProviders: React.FC = () => {
  const wsStatus = useWebSocket();
  return (
    <BrowserRouter>
      <ThemeEffect />
      <ConnectionBanner status={wsStatus} />
      <DateProvider>
        <App />
      </DateProvider>
    </BrowserRouter>
  );
};

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- root element is guaranteed to exist in index.html
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PreferencesProvider>
            <ComponentFilterProvider>
              <ToastProvider>
                <AppWithProviders />
              </ToastProvider>
            </ComponentFilterProvider>
          </PreferencesProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
