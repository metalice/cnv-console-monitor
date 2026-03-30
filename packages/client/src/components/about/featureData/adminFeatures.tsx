import { CogIcon, ShieldAltIcon, SyncAltIcon, UserIcon } from '@patternfly/react-icons';

import { type FeatureGroupProps } from '../FeatureCard';

export const ADMINISTRATION_GROUP: FeatureGroupProps = {
  features: [
    {
      adminOnly: true,
      capabilities: [
        'ReportPortal, Jira, Jenkins, Email connections',
        'Polling schedule and concurrency',
        'Dashboard links and preferences',
        'Export/import settings',
      ],
      description: 'Configure all integrations, polling, and system behavior.',
      icon: <CogIcon />,
      path: '/settings',
      title: 'Settings',
    },
    {
      adminOnly: true,
      capabilities: [
        'View all users',
        'Promote/demote admin roles',
        'Admin bootstrap for first-time setup',
      ],
      description: 'Manage user roles and admin access.',
      icon: <UserIcon />,
      path: '/settings',
      title: 'User Management',
    },
    {
      adminOnly: true,
      capabilities: [
        'Phase progress with ETA',
        'Cancel and resume individual phases',
        'Retry failed items',
        'Activity log with error details',
        'Health check and dry run',
      ],
      description: 'Monitor and control the data sync pipeline.',
      icon: <SyncAltIcon />,
      path: '/settings',
      title: 'Data Pipeline',
    },
  ],
  icon: <ShieldAltIcon />,
  title: 'Administration',
};
