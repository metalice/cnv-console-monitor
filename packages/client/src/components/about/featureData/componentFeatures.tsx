import { CubesIcon } from '@patternfly/react-icons';

import { type FeatureGroupProps } from '../FeatureCard';

export const COMPONENTS_GROUP: FeatureGroupProps = {
  features: [
    {
      capabilities: [
        'Health cards per component',
        'AI-generated health narrative',
        'AI standup summary',
      ],
      description: 'Per-component pass rate and health overview.',
      icon: <CubesIcon />,
      path: '/components',
      title: 'Component Health',
    },
    {
      adminOnly: true,
      capabilities: [
        'Pattern-based mapping rules',
        'Auto-generate mappings from Jenkins teams',
        'Preview matched launches per pattern',
        'Unmapped launch detection',
      ],
      description: 'Map Jenkins job names to logical components using regex patterns.',
      path: '/settings',
      title: 'Component Mappings',
    },
    {
      capabilities: [
        'Multi-select component filter',
        'Persisted across page navigation',
        'Synced to URL for shareable links',
      ],
      description: 'Filter all pages by component using the masthead dropdown.',
      title: 'Global Component Filter',
    },
  ],
  icon: <CubesIcon />,
  title: 'Components',
};
