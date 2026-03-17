import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import '@patternfly/react-core/dist/styles/base.css';
import './styles/app.css';
import App from './App';
import { useWebSocket } from './hooks/useWebSocket';
import { ConnectionBanner } from './components/common/ConnectionBanner';
import { DateProvider } from './context/DateContext';
import { AuthProvider } from './context/AuthContext';
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ComponentFilterProvider } from './context/ComponentFilterContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 2,
      placeholderData: keepPreviousData,
    },
  },
});

const ThemeEffect: React.FC = () => {
  const { preferences } = usePreferences();
  React.useEffect(() => {
    const theme = preferences.theme || 'auto';
    const prefersDark = theme === 'auto' ? window.matchMedia('(prefers-color-scheme: dark)').matches : theme === 'dark';
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
