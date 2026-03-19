import React, { useState } from 'react';
import { Alert, Flex, FlexItem, Label } from '@patternfly/react-core';
import type { ReleaseInfo } from '@cnv-monitor/shared';

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
      if (m.isPast) continue;
      const mDate = new Date(m.date);
      const daysLeft = Math.round((mDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
      if (daysLeft >= 0 && daysLeft <= withinDays) {
        deadlines.push({
          version: release.shortname.replace('cnv-', ''),
          milestone: m.name.replace(/^Batch\s+/, '').replace(/GA Stable Release|GA Release/g, 'GA').trim(),
          date: m.date,
          daysLeft,
        });
      }
    }
  }

  return deadlines.sort((a, b) => a.daysLeft - b.daysLeft);
};

const urgencyColor = (days: number): 'red' | 'orange' | 'yellow' => {
  if (days <= 3) return 'red';
  if (days <= 7) return 'orange';
  return 'yellow';
};

type DeadlineBannerProps = {
  releases: ReleaseInfo[];
};

export const DeadlineBanner: React.FC<DeadlineBannerProps> = ({ releases }) => {
  const [dismissed, setDismissed] = useState(false);
  const deadlines = getUpcomingDeadlines(releases);

  if (dismissed || deadlines.length === 0) return null;

  const topDeadline = deadlines[0];
  const variant = topDeadline.daysLeft <= 3 ? 'danger' : topDeadline.daysLeft <= 7 ? 'warning' : 'info';

  return (
    <Alert
      variant={variant}
      isInline
      title="Upcoming release deadlines — releases or milestones within the next 14 days"
      actionClose={<button className="pf-v6-c-alert__action" onClick={() => setDismissed(true)} aria-label="Dismiss">&times;</button>}
    >
      <Flex spaceItems={{ default: 'spaceItemsMd' }} flexWrap={{ default: 'wrap' }}>
        {deadlines.slice(0, 5).map((d, i) => (
          <FlexItem key={i}>
            <Label color={urgencyColor(d.daysLeft)} isCompact>
              {d.version} {d.milestone} — {new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ({d.daysLeft}d)
            </Label>
          </FlexItem>
        ))}
      </Flex>
    </Alert>
  );
};
