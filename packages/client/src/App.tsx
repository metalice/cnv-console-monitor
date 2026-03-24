import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Spinner } from '@patternfly/react-core';

import { AppLayout } from './components/layout/AppLayout';

const DashboardPage = React.lazy(() =>
  import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })),
);
const MyWorkPage = React.lazy(() =>
  import('./pages/MyWorkPage').then(m => ({ default: m.MyWorkPage })),
);
const LaunchDetailPage = React.lazy(() =>
  import('./pages/LaunchDetailPage').then(m => ({ default: m.LaunchDetailPage })),
);
const FailuresPage = React.lazy(() =>
  import('./pages/FailuresPage').then(m => ({ default: m.FailuresPage })),
);
const TrendsPage = React.lazy(() =>
  import('./pages/TrendsPage').then(m => ({ default: m.TrendsPage })),
);
const FlakyTestsPage = React.lazy(() =>
  import('./pages/FlakyTestsPage').then(m => ({ default: m.FlakyTestsPage })),
);
const ActivityPage = React.lazy(() =>
  import('./pages/ActivityPage').then(m => ({ default: m.ActivityPage })),
);
const ReleasePage = React.lazy(() =>
  import('./pages/ReleasePage').then(m => ({ default: m.ReleasePage })),
);
const SettingsPage = React.lazy(() =>
  import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })),
);
const TestProfilePage = React.lazy(() =>
  import('./pages/TestProfilePage').then(m => ({ default: m.TestProfilePage })),
);
const ComponentHealthPage = React.lazy(() =>
  import('./pages/ComponentHealthPage').then(m => ({ default: m.ComponentHealthPage })),
);
const ComparePage = React.lazy(() =>
  import('./pages/ComparePage').then(m => ({ default: m.ComparePage })),
);
const ReadinessPage = React.lazy(() =>
  import('./pages/ReadinessPage').then(m => ({ default: m.ReadinessPage })),
);
const AboutPage = React.lazy(() =>
  import('./pages/AboutPage').then(m => ({ default: m.AboutPage })),
);
const TestExplorerPage = React.lazy(() =>
  import('./pages/TestExplorerPage').then(m => ({ default: m.TestExplorerPage })),
);

const PageFallback: React.FC = () => (
  <div className="app-page-spinner">
    <Spinner aria-label="Loading page" />
  </div>
);

const App: React.FC = () => (
  <AppLayout>
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<DashboardPage />} path="/" />
        <Route element={<MyWorkPage />} path="/my-work" />
        <Route element={<LaunchDetailPage />} path="/launch/:launchId" />
        <Route element={<FailuresPage />} path="/failures" />
        <Route element={<TrendsPage />} path="/trends" />
        <Route element={<FlakyTestsPage />} path="/flaky" />
        <Route element={<ReleasePage />} path="/releases" />
        <Route element={<ActivityPage />} path="/activity" />
        <Route element={<ComponentHealthPage />} path="/components" />
        <Route element={<ComparePage />} path="/compare" />
        <Route element={<SettingsPage />} path="/settings" />
        <Route element={<ReadinessPage />} path="/readiness" />
        <Route element={<ReadinessPage />} path="/readiness/:version" />
        <Route element={<TestProfilePage />} path="/test/:uniqueId" />
        <Route element={<TestExplorerPage />} path="/test-explorer" />
        <Route element={<AboutPage />} path="/about" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </Suspense>
  </AppLayout>
);

export default App;
