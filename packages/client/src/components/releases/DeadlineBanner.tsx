import React, { useState } from 'react';

import type { ReleaseInfo } from '@cnv-monitor/shared';

import { Alert, Flex, FlexItem, Label } from '@patternfly/react-core';

type Deadline = {
  version: string;
  milestone: string;
  date: string;
  daysLeft: number;
};

const getUpcomingDeadlines = (releases: ReleaseInfo[], withinDays = 14): Deadline[] => {
  const deadlines: Deadline[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const release of releases) {
    for (const m of release.milestones) {
      if (m.isPast) {
        continue;
      }
      const mDate = new Date(m.date);
      const daysLeft = Math.round((mDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      if (daysLeft >= 0 && daysLeft <= withinDays) {
        deadlines.push({
          date: m.date,
          daysLeft,
          milestone: m.name
            .replace(/^Batch\s+/, '')
            .replace(/GA Stable Release|GA Release/g, 'GA')
            .trim(),
          version: release.shortname.replace('cnv-', ''),
        });
      }
    }
  }

  return deadlines.sort((a, b) => a.daysLeft - b.daysLeft);
};

const urgencyColor = (days: number): 'red' | 'orange' | 'yellow' => {
  if (days <= 3) {
    return 'red';
  }
  if (days <= 7) {
    return 'orange';
  }
  return 'yellow';
};

type DeadlineBannerProps = {
  releases: ReleaseInfo[];
};

export const DeadlineBanner: React.FC<DeadlineBannerProps> = ({ releases }) => {
  const [dismissed, setDismissed] = useState(false);
  const deadlines = getUpcomingDeadlines(releases);

  if (dismissed || deadlines.length === 0) {
    return null;
  }

  const topDeadline = deadlines[0];
  const variant =
    topDeadline.daysLeft <= 3 ? 'danger' : topDeadline.daysLeft <= 7 ? 'warning' : 'info';

  return (
    <Alert
      isInline
      actionClose={
        <button
          aria-label="Dismiss"
          className="pf-v6-c-alert__action"
          onClick={() => setDismissed(true)}
        >
          &times;
        </button>
      }
      title="Upcoming release deadlines — releases or milestones within the next 14 days"
      variant={variant}
    >
      <Flex flexWrap={{ default: 'wrap' }} spaceItems={{ default: 'spaceItemsMd' }}>
        {deadlines.slice(0, 5).map((d, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <FlexItem key={i}>
            <Label isCompact color={urgencyColor(d.daysLeft)}>
              {d.version} {d.milestone} —{' '}
              {new Date(d.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} (
              {d.daysLeft}d)
            </Label>
          </FlexItem>
        ))}
      </Flex>
    </Alert>
  );
};
