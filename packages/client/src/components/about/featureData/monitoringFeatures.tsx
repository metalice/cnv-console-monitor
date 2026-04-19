import {
  CheckCircleIcon,
  CodeBranchIcon,
  DatabaseIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  HomeIcon,
  ListIcon,
  SearchIcon,
  UserIcon,
} from '@patternfly/react-icons';

import { type FeatureGroupProps } from '../FeatureCard';

export const DAILY_MONITORING_GROUP: FeatureGroupProps = {
  features: [
    {
      capabilities: [
        'Status matrix by version, tier, and component',
        'Health indicators (green/yellow/red)',
        'Real-time progress for in-progress launches',
        'Export results to CSV',
      ],
      description:
        'Central status matrix showing all launch groups with health indicators, pass rates, and live progress tracking.',
      icon: <HomeIcon />,
      path: '/',
      title: 'Dashboard',
    },
    {
      capabilities: [
        'Per-component or global acknowledgment',
        'Notes field for review comments',
        'Reviewer streak and coverage tracking',
        'History calendar with heatmap',
      ],
      description: 'Daily sign-off workflow for QE to confirm they reviewed test results.',
      icon: <CheckCircleIcon />,
      path: '/',
      title: 'Acknowledgment',
    },
    {
      capabilities: [
        'Recent triage actions and comments',
        'Jira bugs assigned to you',
        'Quick links to items needing attention',
      ],
      description: 'Personal dashboard showing your recent activity and assigned Jira bugs.',
      icon: <UserIcon />,
      path: '/my-work',
      title: 'My Work',
    },
    {
      capabilities: [
        'Triage, acknowledgment, and comment history',
        'Reviewer stats and streak tracking',
        'Component activity breakdown chart',
        'Review calendar heatmap',
        'Filter by action type, user, and date range',
      ],
      description:
        'Audit trail of all triage actions, acknowledgments, and comments across the team.',
      icon: <ListIcon />,
      path: '/activity',
      title: 'Activity Feed',
    },
  ],
  icon: <HomeIcon />,
  title: 'Daily Monitoring',
};

export const TEST_ANALYSIS_GROUP: FeatureGroupProps = {
  features: [
    {
      capabilities: [
        'Failed test items table with triage actions',
        'Error log viewer per test item',
        'Artifacts panel (screenshots, videos)',
        'Auto, pattern, and unique error analysis',
        'Similar failures panel',
      ],
      description:
        'Deep-dive into a single launch or group of launches, with test items, logs, and artifacts.',
      icon: <DatabaseIcon />,
      path: '/',
      title: 'Launch Detail',
    },
    {
      capabilities: [
        'Aggregated view by unique test ID',
        'Bulk triage (select multiple, classify at once)',
        'New failure detection (first-time failures highlighted)',
        'Failure streak indicators',
      ],
      description: 'View and triage all untriaged failures across launches.',
      icon: <ExclamationCircleIcon />,
      path: '/failures',
      title: 'Failures',
    },
    {
      capabilities: [
        'Flip count and flip rate per test',
        'Sortable by flakiness',
        'Links to test profile for history',
      ],
      description: 'Identify tests that flip between pass and fail across runs.',
      icon: <ExclamationTriangleIcon />,
      path: '/flaky',
      title: 'Flaky Tests',
    },
    {
      capabilities: [
        'Consecutive failure streak',
        'Pass/fail history across launches',
        'Triage log for this specific test',
        'Links to affected launches',
      ],
      description: 'Per-test deep-dive showing history, streak, and triage timeline.',
      title: 'Test Profile',
    },
    {
      capabilities: [
        'Pick two launch groups (A vs B)',
        'Regressions: tests that passed in A but fail in B',
        'Fixes: tests that failed in A but pass in B',
        'Persistent failures across both',
      ],
      description: 'Side-by-side comparison of two launch groups to find regressions and fixes.',
      icon: <CodeBranchIcon />,
      path: '/compare',
      title: 'Compare',
    },
    {
      capabilities: [
        'Hierarchical file tree of test suites',
        'Monaco code viewer for test sources',
        'AI-powered test summaries per file',
        'Repository sync from GitHub/GitLab',
        'Component-scoped filtering',
      ],
      description:
        'Browse and explore test source files from linked repositories with AI-generated summaries.',
      icon: <SearchIcon />,
      path: '/test-explorer',
      title: 'Test Explorer',
    },
  ],
  icon: <SearchIcon />,
  title: 'Test Analysis',
};
