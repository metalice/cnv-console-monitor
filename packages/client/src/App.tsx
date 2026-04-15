import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Spinner } from '@patternfly/react-core';

import { AppLayout } from './components/layout/AppLayout';

const DashboardPage = React.lazy(() =>
  import('./pages/DashboardPage').then(mod => ({ default: mod.DashboardPage })),
);
const MyWorkPage = React.lazy(() =>
  import('./pages/MyWorkPage').then(mod => ({ default: mod.MyWorkPage })),
);
const LaunchDetailPage = React.lazy(() =>
  import('./pages/LaunchDetailPage').then(mod => ({ default: mod.LaunchDetailPage })),
);
const FailuresPage = React.lazy(() =>
  import('./pages/FailuresPage').then(mod => ({ default: mod.FailuresPage })),
);
const TrendsPage = React.lazy(() =>
  import('./pages/TrendsPage').then(mod => ({ default: mod.TrendsPage })),
);
const FlakyTestsPage = React.lazy(() =>
  import('./pages/FlakyTestsPage').then(mod => ({ default: mod.FlakyTestsPage })),
);
const ActivityPage = React.lazy(() =>
  import('./pages/ActivityPage').then(mod => ({ default: mod.ActivityPage })),
);
const ReleasePage = React.lazy(() =>
  import('./pages/ReleasePage').then(mod => ({ default: mod.ReleasePage })),
);
const SettingsPage = React.lazy(() =>
  import('./pages/SettingsPage').then(mod => ({ default: mod.SettingsPage })),
);
const TestProfilePage = React.lazy(() =>
  import('./pages/TestProfilePage').then(mod => ({ default: mod.TestProfilePage })),
);
const ComponentHealthPage = React.lazy(() =>
  import('./pages/ComponentHealthPage').then(mod => ({ default: mod.ComponentHealthPage })),
);
const ComparePage = React.lazy(() =>
  import('./pages/ComparePage').then(mod => ({ default: mod.ComparePage })),
);
const ReadinessPage = React.lazy(() =>
  import('./pages/ReadinessPage').then(mod => ({ default: mod.ReadinessPage })),
);
const AboutPage = React.lazy(() =>
  import('./pages/AboutPage').then(mod => ({ default: mod.AboutPage })),
);
const TestExplorerPage = React.lazy(() =>
  import('./pages/TestExplorerPage').then(mod => ({ default: mod.TestExplorerPage })),
);
const WeeklyDashboardPage = React.lazy(() =>
  import('./pages/WeeklyDashboardPage').then(mod => ({ default: mod.WeeklyDashboardPage })),
);
const ReportDetailPage = React.lazy(() =>
  import('./pages/ReportEditorPage').then(mod => ({ default: mod.ReportEditorPage })),
);
const WeeklyTeamPage = React.lazy(() =>
  import('./pages/WeeklyTeamPage').then(mod => ({ default: mod.WeeklyTeamPage })),
);
const WeeklyHistoryPage = React.lazy(() =>
  import('./pages/WeeklyHistoryPage').then(mod => ({ default: mod.WeeklyHistoryPage })),
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
        <Route element={<WeeklyDashboardPage />} path="/report" />
        <Route element={<ReportDetailPage />} path="/report/:component/:weekId" />
        <Route element={<WeeklyTeamPage />} path="/report/team" />
        <Route element={<WeeklyHistoryPage />} path="/report/history" />
        <Route element={<Navigate replace to="/report" />} path="/weekly" />
        <Route element={<Navigate replace to="/report/team" />} path="/weekly/team" />
        <Route element={<Navigate replace to="/report/history" />} path="/weekly/history" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Routes>
    </Suspense>
  </AppLayout>
);

export default App;
