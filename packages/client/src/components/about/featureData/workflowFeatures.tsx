import { BellIcon, BugIcon, CalendarAltIcon, FlagIcon } from '@patternfly/react-icons';

import { type FeatureGroupProps } from '../FeatureCard';

export const TRIAGE_JIRA_GROUP: FeatureGroupProps = {
  features: [
    {
      capabilities: [
        'Product Bug, Automation Bug, System Issue, No Defect, To Investigate',
        'Single or bulk classification',
        'Updates reflected in ReportPortal immediately',
        'AI-powered triage suggestions',
      ],
      description: 'Classify test failures with ReportPortal defect types.',
      icon: <FlagIcon />,
      title: 'Defect Classification',
    },
    {
      capabilities: [
        'Create Jira bug with pre-filled description',
        'Link existing Jira issues',
        'Search Jira from the dashboard',
        'AI-generated bug reports',
      ],
      description: 'Create bugs or link existing Jira issues directly from failures.',
      title: 'Jira Integration',
    },
    {
      capabilities: [
        'Comments synced to ReportPortal',
        'Visible in activity feed',
        'Acknowledgment notes for daily reviews',
      ],
      description: 'Add comments to test items for team communication.',
      title: 'Comments & Notes',
    },
  ],
  icon: <BugIcon />,
  title: 'Triage & Jira',
};

export const RELEASES_GROUP: FeatureGroupProps = {
  features: [
    {
      capabilities: [
        'Timeline, calendar, and Gantt views',
        'Product Pages integration for milestones',
        'Z-stream tracking',
      ],
      description: 'Track all CNV releases with milestones, GA dates, and current phase.',
      icon: <CalendarAltIcon />,
      path: '/releases',
      title: 'Release Timeline',
    },
    {
      capabilities: [
        'Per-version readiness score',
        'Blocking failures list',
        'Risk flags and traffic light indicators',
      ],
      description: 'Assess version readiness with test results and blocking issues.',
      path: '/releases',
      title: 'Readiness & Blockers',
    },
    {
      capabilities: [
        'Tasks pulled from Jira',
        'Status transitions from the dashboard',
        'Comments and notes per task',
      ],
      description: 'Jira-driven per-version task checklist for release preparation.',
      path: '/releases',
      title: 'Checklist',
    },
    {
      aiPowered: true,
      capabilities: [
        'Compares two versions',
        'Pulls GitHub PRs and commit data',
        'AI-structured changelog output',
      ],
      description: 'Generate release changelogs using AI analysis of merged PRs and test results.',
      path: '/releases',
      title: 'AI Changelog',
    },
  ],
  icon: <CalendarAltIcon />,
  title: 'Releases',
};

export const NOTIFICATIONS_GROUP: FeatureGroupProps = {
  features: [
    {
      adminOnly: true,
      capabilities: [
        'Slack webhooks',
        'Email distribution lists',
        'Per-component filtering',
        'Custom cron schedules with timezone',
      ],
      description: 'Create notification subscriptions with custom schedules and component filters.',
      icon: <BellIcon />,
      path: '/settings',
      title: 'Subscriptions',
    },
    {
      capabilities: [
        'Configurable reminder time',
        'Sent via Slack to subscription channels',
        'Weekday-only option',
      ],
      description: 'Automated reminders when daily acknowledgment is missing.',
      title: 'Daily Reminders',
    },
    {
      capabilities: ['Phase-level failure details', 'Sent to all active subscriptions'],
      description: 'Automatic Slack notification when a data pipeline run fails or is cancelled.',
      title: 'Pipeline Alerts',
    },
  ],
  icon: <BellIcon />,
  title: 'Notifications',
};
