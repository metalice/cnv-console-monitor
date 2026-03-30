import { BugIcon, CalendarAltIcon, RobotIcon } from '@patternfly/react-icons';

import { type QuickStartDef } from './types';

export const WORKFLOW_GUIDES: QuickStartDef[] = [
  {
    icon: <BugIcon />,
    steps: [
      {
        description: 'Use the Failures page or click into a launch group from the Dashboard.',
        link: { label: 'Go to Failures', path: '/failures' },
        title: 'Find the failure',
      },
      {
        description: 'Click a test item to expand it and see the error message and logs.',
        title: 'View error details',
      },
      {
        description:
          'Click "Classify" and select the defect type. AI can suggest a classification.',
        title: 'Classify the defect',
      },
      {
        description:
          'Click "Create Jira" to file a new bug, or "Link Jira" to associate an existing one.',
        title: 'Create or link a Jira bug',
      },
      {
        description: 'Add a comment to explain your analysis for the team.',
        title: 'Add a comment (optional)',
      },
    ],
    title: 'Triaging a Failure',
  },
  {
    icon: <CalendarAltIcon />,
    steps: [
      {
        description: 'View all CNV releases with their GA dates and current phase.',
        link: { label: 'Go to Releases', path: '/releases' },
        title: 'Open the Releases page',
      },
      {
        description: 'Click a version to see its dashboard with test readiness and blockers.',
        title: 'Select a version',
      },
      {
        description: 'Check Jira-driven tasks for release preparation status.',
        title: 'Review the checklist',
      },
      {
        description: 'Use AI to generate a changelog comparing two versions.',
        title: 'Generate a changelog',
      },
    ],
    title: 'Tracking a Release',
  },
  {
    icon: <RobotIcon />,
    steps: [
      {
        description:
          'Go to Settings > AI Configuration and select a provider (Gemini, OpenAI, Vertex Claude, etc.).',
        link: { label: 'Go to Settings', path: '/settings' },
        title: 'Configure AI provider',
      },
      {
        description:
          'Toggle "Enable AI" on and save. Enter the API key or configure ADC for Vertex AI.',
        title: 'Enable AI',
      },
      {
        description: 'On any failure, click the AI button to get an automated root cause analysis.',
        title: 'Analyze failures',
      },
      {
        description:
          'On the Component Health page, use AI buttons for health narratives and standup summaries.',
        link: { label: 'Go to Components', path: '/components' },
        title: 'Generate reports',
      },
    ],
    title: 'Using AI Features',
  },
];
