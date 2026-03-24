import React, { useMemo } from 'react';

import type { ActivityEntry } from '@cnv-monitor/shared';

import { Card, CardBody, CardTitle, Flex, FlexItem, Label } from '@patternfly/react-core';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from '@patternfly/react-icons';

type Bucket = {
  classifications: number;
  jiraActions: number;
  comments: number;
  acks: number;
  total: number;
  uniqueUsers: number;
};

const computeBucket = (entries: ActivityEntry[]): Bucket => {
  let acks = 0,
    classifications = 0,
    comments = 0,
    jiraActions = 0;
  const users = new Set<string>();
  for (const e of entries) {
    if (e.action === 'classify_defect' || e.action === 'bulk_classify_defect') {
      classifications++;
    } else if (e.action === 'create_jira' || e.action === 'link_jira') {
      jiraActions++;
    } else if (e.action === 'add_comment') {
      comments++;
    } else if (e.action === 'acknowledge') {
      acks++;
    }
    if (e.performed_by) {
      users.add(e.performed_by);
    }
  }
  return {
    acks,
    classifications,
    comments,
    jiraActions,
    total: entries.length,
    uniqueUsers: users.size,
  };
};

const DeltaBadge: React.FC<{ current: number; previous: number; label: string }> = ({
  current,
  label,
  previous,
}) => {
  const diff = current - previous;
  const pctChange = previous > 0 ? Math.round((diff / previous) * 100) : current > 0 ? 100 : 0;

  return (
    <div className="app-cmp-metric">
      <span className="app-digest-value">{current}</span>
      <span className="app-text-xs app-text-muted">{label}</span>
      {diff !== 0 && (
        <span className={`app-text-xs ${diff > 0 ? 'app-text-success' : 'app-text-danger'}`}>
          {diff > 0 ? <ArrowUpIcon /> : <ArrowDownIcon />} {Math.abs(diff)} (
          {pctChange > 0 ? '+' : ''}
          {pctChange}%)
        </span>
      )}
      {diff === 0 && previous > 0 && (
        <span className="app-text-xs app-text-muted">
          <MinusIcon /> No change
        </span>
      )}
    </div>
  );
};

type ComparisonViewProps = {
  currentEntries: ActivityEntry[];
  previousEntries: ActivityEntry[];
  currentLabel: string;
  previousLabel: string;
};

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  currentEntries,
  currentLabel,
  previousEntries,
  previousLabel,
}) => {
  const current = useMemo(() => computeBucket(currentEntries), [currentEntries]);
  const previous = useMemo(() => computeBucket(previousEntries), [previousEntries]);

  return (
    <Card>
      <CardTitle>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>Comparison</FlexItem>
          <FlexItem>
            <Label isCompact color="blue">
              {currentLabel}
            </Label>
          </FlexItem>
          <FlexItem>
            <span className="app-text-xs app-text-muted">vs</span>
          </FlexItem>
          <FlexItem>
            <Label isCompact color="grey">
              {previousLabel}
            </Label>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <div className="app-cmp-grid">
          <DeltaBadge current={current.total} label="Total Actions" previous={previous.total} />
          <DeltaBadge
            current={current.classifications}
            label="Classifications"
            previous={previous.classifications}
          />
          <DeltaBadge
            current={current.jiraActions}
            label="Jira Actions"
            previous={previous.jiraActions}
          />
          <DeltaBadge current={current.comments} label="Comments" previous={previous.comments} />
          <DeltaBadge current={current.acks} label="Acknowledgments" previous={previous.acks} />
          <DeltaBadge
            current={current.uniqueUsers}
            label="Active Users"
            previous={previous.uniqueUsers}
          />
        </div>
      </CardBody>
    </Card>
  );
};
