import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import '@patternfly/react-core/dist/styles/base.css';
import App from './App';
import { useWebSocket } from './hooks/useWebSocket';
import { DateProvider } from './context/DateContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 2,
      placeholderData: keepPreviousData,
    },
  },
});

const AppWithProviders: React.FC = () => {
  useWebSocket();
  return (
    <BrowserRouter>
      <DateProvider>
        <App />
      </DateProvider>
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppWithProviders />
    </QueryClientProvider>
  </React.StrictMode>,
);
