import {
  BellIcon,
  BugIcon,
  CalendarAltIcon,
  CheckCircleIcon,
  ClipboardCheckIcon,
  FlagIcon,
  OutlinedCommentsIcon,
} from '@patternfly/react-icons';

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
        'Version cards with pass rate, launch count, and recommendation',
        'Component-aware filtering via global toolbar',
        'Pass rate trend with 95% threshold reference line',
        'Per-component breakdown with progress bars',
        'Blocking failures table with trend indicators',
      ],
      description:
        'Dedicated readiness assessment page with detailed metrics, trends, and component health per CNV version.',
      icon: <CheckCircleIcon />,
      path: '/readiness',
      title: 'Version Readiness',
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

export const TEAM_REPORT_GROUP: FeatureGroupProps = {
  features: [
    {
      aiPowered: true,
      capabilities: [
        'Aggregates GitHub PRs, GitLab MRs, and Jira tickets',
        'AI-generated per-person highlights',
        'Manager summary with task breakdown',
        'Configurable date range and component scope',
      ],
      description:
        'Weekly team status report generated from Git activity and Jira, with AI summaries per contributor.',
      icon: <ClipboardCheckIcon />,
      path: '/report',
      title: 'Weekly Report',
    },
    {
      adminOnly: true,
      capabilities: [
        'GitHub and GitLab repository registration',
        'Team member identity mapping across platforms',
        'Component-scoped repository assignments',
      ],
      description: 'Configure which repositories and team members to include in weekly reports.',
      path: '/settings',
      title: 'Report Configuration',
    },
  ],
  icon: <ClipboardCheckIcon />,
  title: 'Team Reports',
};

export const FEEDBACK_GROUP: FeatureGroupProps = {
  features: [
    {
      capabilities: [
        'Categorized feedback (bug, feature, improvement, question)',
        'Priority levels and status tracking',
        'Component tagging for targeted feedback',
        'Admin response and resolution workflow',
      ],
      description:
        'Submit and track feedback, feature requests, and bug reports directly from the dashboard.',
      icon: <OutlinedCommentsIcon />,
      path: '/feedback',
      title: 'Feedback Portal',
    },
  ],
  icon: <OutlinedCommentsIcon />,
  title: 'Feedback',
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
