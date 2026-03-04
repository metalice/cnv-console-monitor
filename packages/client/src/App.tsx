import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LaunchDetailPage } from './pages/LaunchDetailPage';
import { FailuresPage } from './pages/FailuresPage';
import { TrendsPage } from './pages/TrendsPage';
import { FlakyTestsPage } from './pages/FlakyTestsPage';
import { ActivityPage } from './pages/ActivityPage';
import { SettingsPage } from './pages/SettingsPage';

const App: React.FC = () => (
  <AppLayout>
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/launch/:launchId" element={<LaunchDetailPage />} />
      <Route path="/failures" element={<FailuresPage />} />
      <Route path="/trends" element={<TrendsPage />} />
      <Route path="/flaky" element={<FlakyTestsPage />} />
      <Route path="/activity" element={<ActivityPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  </AppLayout>
);

export default App;
