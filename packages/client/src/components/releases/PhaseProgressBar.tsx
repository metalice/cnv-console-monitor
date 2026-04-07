import type { ReleaseInfo, ReleaseMilestone } from '@cnv-monitor/shared';

import { Tooltip } from '@patternfly/react-core';

type PhaseProgressBarProps = {
  release: ReleaseInfo;
};

type PhaseMarker = {
  label: string;
  fullLabel: string;
  date: string;
  position: number;
  type: string;
  daysAway: number;
};

const KEY_TYPES = new Set(['feature_freeze', 'blockers_only', 'code_freeze', 'ga']);
const TYPE_LABELS: Record<string, string> = {
  blockers_only: 'BO',
  code_freeze: 'CF',
  feature_freeze: 'FF',
  ga: 'GA',
};

const TYPE_FULL_LABELS: Record<string, string> = {
  blockers_only: 'Blockers Only',
  code_freeze: 'Code Freeze',
  feature_freeze: 'Feature Freeze',
  ga: 'GA Release',
};

const TYPE_CLASSES: Record<string, string> = {
  blockers_only: 'app-phase-marker-danger',
  code_freeze: 'app-phase-marker-purple',
  feature_freeze: 'app-phase-marker-warning',
  ga: 'app-phase-marker-success',
};

const MS_PER_DAY = 86_400_000;

const buildMarkers = (release: ReleaseInfo): PhaseMarker[] => {
  if (!release.startDate) {
    return [];
  }

  const startMs = new Date(release.startDate).getTime();
  const endMs = release.gaDate
    ? new Date(release.gaDate).getTime()
    : new Date(release.endDate ?? release.startDate).getTime();
  const span = endMs - startMs;
  const nowMs = Date.now();

  if (span <= 0) {
    return [];
  }

  const seen = new Set<string>();
  return release.milestones
    .filter((milestone: ReleaseMilestone) => KEY_TYPES.has(milestone.type))
    .filter((milestone: ReleaseMilestone) => {
      if (seen.has(milestone.type)) {
        return false;
      }
      seen.add(milestone.type);
      return true;
    })
    .map((milestone: ReleaseMilestone) => {
      const milestoneMs = new Date(milestone.date).getTime();
      return {
        date: milestone.date,
        daysAway: Math.round((milestoneMs - nowMs) / MS_PER_DAY),
        fullLabel: TYPE_FULL_LABELS[milestone.type] ?? milestone.type,
        label: TYPE_LABELS[milestone.type] ?? milestone.type,
        position: Math.min(100, Math.max(0, ((milestoneMs - startMs) / span) * 100)),
        type: milestone.type,
      };
    });
};

export const PhaseProgressBar = ({ release }: PhaseProgressBarProps) => {
  const markers = buildMarkers(release);
  if (markers.length === 0) {
    return null;
  }

  const startMs = new Date(release.startDate ?? '').getTime();
  const endMs = release.gaDate
    ? new Date(release.gaDate).getTime()
    : new Date(release.endDate ?? '').getTime();
  const span = endMs - startMs;
  const todayPct = span > 0 ? Math.min(100, Math.max(0, ((Date.now() - startMs) / span) * 100)) : 0;

  return (
    <div className="app-phase-bar">
      <div className="app-phase-track">
        <div className="app-phase-fill" style={{ width: `${todayPct}%` }} />
        {markers.map(marker => {
          const isPast = marker.position <= todayPct;

          return (
            <Tooltip
              content={
                marker.daysAway > 0
                  ? `${marker.fullLabel} in ${marker.daysAway} days (${new Date(marker.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})`
                  : `${marker.fullLabel}: ${new Date(marker.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`
              }
              key={marker.type}
            >
              <div
                className={`app-phase-marker ${TYPE_CLASSES[marker.type] ?? ''} ${isPast ? 'app-phase-marker-past' : ''}`}
                style={{ left: `${marker.position}%` }}
              >
                <span className="app-phase-marker-label">{marker.label}</span>
              </div>
            </Tooltip>
          );
        })}
        <Tooltip content="Today">
          <div className="app-phase-today-pulse" style={{ left: `${todayPct}%` }} />
        </Tooltip>
      </div>
    </div>
  );
};
