import { Card, CardBody, Gallery } from '@patternfly/react-core';

const STAT_CONFIGS = [
  { className: 'app-weekly-stat--success', key: 'prsMerged', label: 'PRs Merged' },
  { className: 'app-weekly-stat--info', key: 'ticketsDone', label: 'Tickets Done' },
  { className: 'app-weekly-stat--default', key: 'commitCount', label: 'Commits' },
  { className: 'app-weekly-stat--warning', key: 'storyPoints', label: 'Story Points' },
  { className: 'app-weekly-stat--purple', key: 'contributorCount', label: 'Contributors' },
] as const;

type StatCardsProps = {
  commitCount: number;
  contributorCount: number;
  prsMerged: number;
  storyPoints: number;
  ticketsDone: number;
};

export const StatCards = (props: StatCardsProps) => (
  <Gallery hasGutter minWidths={{ default: '150px' }}>
    {STAT_CONFIGS.map(({ className, key, label }) => (
      <Card className={`app-weekly-stat ${className}`} key={key}>
        <CardBody>
          <div className="app-weekly-stat-value">{props[key]}</div>
          <div className="app-weekly-stat-label">{label}</div>
        </CardBody>
      </Card>
    ))}
  </Gallery>
);
