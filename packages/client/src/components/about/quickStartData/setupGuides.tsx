import { BellIcon, CheckCircleIcon, KeyIcon } from '@patternfly/react-icons';

import { type QuickStartDef } from './types';

export const SETUP_GUIDES: QuickStartDef[] = [
  {
    defaultExpanded: true,
    icon: <KeyIcon />,
    steps: [
      {
        description: 'Enter your ReportPortal URL, API token, and project name.',
        link: { label: 'Go to Settings', path: '/settings' },
        title: 'Configure ReportPortal',
      },
      {
        description:
          'Click "Sync Now" in the masthead or start a full backfill from Settings to import historical data.',
        link: { label: 'Go to Settings', path: '/settings' },
        title: 'Run initial poll',
      },
      {
        description:
          'Map Jenkins job names to logical components so launches are grouped correctly.',
        link: { label: 'Go to Settings', path: '/settings' },
        title: 'Set up component mappings',
      },
      {
        description: 'Add Jira credentials to enable bug creation and linking from failures.',
        title: 'Configure Jira (optional)',
      },
      {
        description: 'Create a Slack or email subscription for automated daily digests.',
        title: 'Set up notifications (optional)',
      },
    ],
    title: 'First-Time Setup',
  },
  {
    icon: <CheckCircleIcon />,
    steps: [
      {
        description:
          "Open the Dashboard to see today's launch status matrix. Red groups need attention.",
        link: { label: 'Go to Dashboard', path: '/' },
        title: 'Check the Dashboard',
      },
      {
        description:
          'Click a red group to see failed test items. Use the Failures page for a cross-launch view.',
        link: { label: 'Go to Failures', path: '/failures' },
        title: 'Review failures',
      },
      {
        description:
          'Classify defects (Product Bug, Automation Bug, etc.) and create/link Jira issues.',
        title: 'Triage untriaged items',
      },
      {
        description:
          'Click the "Acknowledge" button on the Dashboard to sign off that you reviewed today\'s results.',
        title: 'Acknowledge the review',
      },
    ],
    title: 'Daily Review Workflow',
  },
  {
    icon: <BellIcon />,
    steps: [
      {
        description: 'Go to Settings > Notification Subscriptions and click "New Subscription".',
        link: { label: 'Go to Settings', path: '/settings' },
        title: 'Create a subscription',
      },
      {
        description: 'Select which components this subscription covers, or leave empty for all.',
        title: 'Pick components',
      },
      {
        description: 'Enter a Slack webhook URL and/or email recipients.',
        title: 'Add channels',
      },
      {
        description: 'Choose when digests are sent (e.g., 7:00 AM on weekdays).',
        title: 'Set schedule',
      },
      {
        description: 'Use the "Test" button to send a preview notification.',
        title: 'Test it',
      },
    ],
    title: 'Setting Up Notifications',
  },
];
