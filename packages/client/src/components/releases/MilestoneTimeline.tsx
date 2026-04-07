import type { ReleaseInfo } from '@cnv-monitor/shared';

import { Tooltip } from '@patternfly/react-core';

const MILESTONE_TYPE_COLORS: Record<string, string> = {
  batch: 'var(--pf-t--global--color--brand--default)',
  blockers_only: 'var(--pf-t--global--color--status--danger--default)',
  code_freeze: 'var(--pf-t--global--color--status--purple--default, #6753ac)',
  custom: 'var(--pf-t--global--color--status--purple--default, #6753ac)',
  feature_freeze: 'var(--pf-t--global--color--status--warning--default)',
  ga: 'var(--pf-t--global--color--status--danger--default)',
};

const KEY_TYPES = new Set(['feature_freeze', 'blockers_only', 'code_freeze', 'ga']);

const extractShortName = (name: string): string => {
  const ver = /(\d{1,20}\.\d{1,20}(?:\.\d{1,20})?)/.exec(name);
  if (ver) {
    return ver[1];
  }
  if (name.toLowerCase().includes('feature freeze')) {
    return 'FF';
  }
  if (name.toLowerCase().includes('code freeze')) {
    return 'CF';
  }
  if (name.toLowerCase().includes('blocker')) {
    return 'BO';
  }
  return name.substring(0, 10);
};

type MilestoneTimelineProps = {
  release: ReleaseInfo;
};

export const MilestoneTimeline = ({ release }: MilestoneTimelineProps) => {
  const firstIdx = release.milestones.findIndex(milestone => !milestone.isPast);

  return (
    <div className="app-ms-strip-scroll">
      <div className="app-ms-strip">
        <div className="app-ms-line" />
        {release.milestones.map((milestone, idx) => {
          const isKey = KEY_TYPES.has(milestone.type);
          const isCurrent = idx === firstIdx || idx === firstIdx - 1;
          const isBatch = milestone.type === 'batch';

          let color =
            MILESTONE_TYPE_COLORS[milestone.type] ?? 'var(--pf-t--global--border--color--default)';
          if (isBatch && milestone.isPast) {
            color = 'var(--pf-t--global--color--status--success--default)';
          }

          return (
            <Tooltip
              content={`${milestone.name} — ${new Date(milestone.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}${milestone.isPast ? ' (released)' : ''}`}
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
            >
              <div
                className={`app-ms-point ${milestone.isPast ? 'app-ms-past' : ''} ${isCurrent ? 'app-ms-current' : ''}`}
              >
                <div
                  className={`app-ms-dot ${isKey ? 'app-ms-dot-key' : ''}`}
                  style={{
                    background: color,
                    ...(isBatch && { height: 8, width: 8 }),
                  }}
                />
                <span className="app-ms-label-top">{extractShortName(milestone.name)}</span>
                <span className="app-ms-label-bot">
                  {new Date(milestone.date).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};
