import { ChartLineIcon } from '@patternfly/react-icons';

import { type FeatureGroupProps } from '../FeatureCard';

export const TRENDS_ANALYTICS_GROUP: FeatureGroupProps = {
  features: [
    {
      capabilities: [
        '30-day trend charts',
        'Per-version trend breakdown',
        'Component-filtered views',
      ],
      description: 'Track pass rates over time by launch name or CNV version.',
      icon: <ChartLineIcon />,
      path: '/trends',
      title: 'Pass Rate Trends',
    },
    {
      capabilities: [
        'Color-coded cells (pass/fail/skip)',
        'Identify consistently failing tests',
        'Spot intermittent patterns',
      ],
      description: 'Visual grid showing failure patterns by test and date.',
      path: '/trends',
      title: 'Heatmap',
    },
    {
      capabilities: [
        'Top failing tests ranked by frequency',
        'Cluster reliability comparison',
        'Error message pattern grouping',
        'Defect type trends over time',
        'Failures by hour of day',
      ],
      description:
        'Top failures, cluster reliability, error patterns, defect trends, and hourly distribution.',
      path: '/trends',
      title: 'Advanced Analytics',
    },
  ],
  icon: <ChartLineIcon />,
  title: 'Trends & Analytics',
};
