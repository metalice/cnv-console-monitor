import { RobotIcon } from '@patternfly/react-icons';

import { type FeatureGroupProps } from '../FeatureCard';

export const AI_FEATURES_GROUP: FeatureGroupProps = {
  features: [
    {
      aiPowered: true,
      capabilities: [
        'Root cause analysis',
        'Suggested fix actions',
        'Pattern recognition across failures',
      ],
      description: 'AI analyzes error messages and test context to explain why tests failed.',
      title: 'Failure Analysis',
    },
    {
      aiPowered: true,
      capabilities: [
        'Based on error message and history',
        'Confidence score',
        'One-click apply suggestion',
      ],
      description: 'AI suggests the most likely defect classification for a failure.',
      title: 'Smart Triage',
    },
    {
      aiPowered: true,
      capabilities: [
        'Daily digest summary',
        'Standup summary per component',
        'Health narrative',
        'Risk assessment',
      ],
      description: 'AI-generated daily digests, standup summaries, and risk assessments.',
      title: 'Report Generation',
    },
    {
      aiPowered: true,
      capabilities: ['Powered by AI chat', 'Searches across launches, tests, and activity'],
      description: 'Search test data using natural language queries from the masthead.',
      title: 'Natural Language Search',
    },
    {
      adminOnly: true,
      capabilities: [
        'Per-provider API key configuration',
        'Model selection per provider',
        'Usage tracking and cache management',
        'Vertex AI auto-refresh via ADC',
      ],
      description: 'Choose between Gemini, OpenAI, Anthropic, Vertex AI Claude, or local Ollama.',
      path: '/settings',
      title: 'Multi-Provider Support',
    },
  ],
  icon: <RobotIcon />,
  title: 'AI Features',
};
