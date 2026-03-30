import type { ReleaseInfo } from '@cnv-monitor/shared';

import { Tooltip } from '@patternfly/react-core';

const MILESTONE_TYPE_COLORS: Record<string, string> = {
  batch: 'var(--pf-t--global--color--brand--default)',
  blockers_only: 'var(--pf-t--global--color--status--danger--default)',
  code_freeze: 'var(--pf-t--global--color--status--warning--default)',
  custom: 'var(--pf-t--global--color--status--purple--default, #6753ac)',
  feature_freeze: 'var(--pf-t--global--color--status--warning--default)',
  ga: 'var(--pf-t--global--color--status--danger--default)',
};

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

export const MilestoneTimeline = ({ release }: MilestoneTimelineProps) => (
  <div className="app-ms-strip-scroll">
    <div className="app-ms-strip">
      <div className="app-ms-line" />
      {release.milestones.map((milestone, idx) => {
        const color =
          MILESTONE_TYPE_COLORS[milestone.type] ?? 'var(--pf-t--global--border--color--default)';
        return (
          <Tooltip
            content={`${milestone.name} — ${new Date(milestone.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}`}
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
          >
            <div className={`app-ms-point ${milestone.isPast ? 'app-ms-past' : ''}`}>
              <div className="app-ms-dot" style={{ background: color }} />
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
