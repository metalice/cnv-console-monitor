import type { ReleaseInfo } from '@cnv-monitor/shared';

import { Card, CardBody, Gallery, GalleryItem, Progress, Tooltip } from '@patternfly/react-core';

import { PhaseBadge } from './PhaseBadge';
import { phaseColor } from './phaseUtils';
import { countdownColor, fmtDate } from './timelineHelpers';

type ActiveReleasesStripProps = {
  releases: ReleaseInfo[];
  onSelectVersion?: (shortname: string) => void;
};

const PHASE_BORDER_COLORS: Record<string, string> = {
  blue: 'var(--pf-t--global--color--status--info--default)',
  green: 'var(--pf-t--global--color--status--success--default)',
  grey: 'var(--pf-t--global--border--color--default)',
  orange: 'var(--pf-t--global--color--status--warning--default)',
  purple: 'var(--pf-t--global--color--status--purple--default, #6753ac)',
  red: 'var(--pf-t--global--color--status--danger--default)',
};

const computeProgress = (release: ReleaseInfo): number => {
  if (!release.startDate || !release.gaDate) {
    return 0;
  }
  const start = new Date(release.startDate).getTime();
  const end = new Date(release.gaDate).getTime();
  const now = Date.now();
  if (now >= end) {
    return 100;
  }
  if (now <= start || end <= start) {
    return 0;
  }
  return Math.round(((now - start) / (end - start)) * 100);
};

const MS_PER_DAY = 86_400_000;

export const ActiveReleasesStrip = ({ onSelectVersion, releases }: ActiveReleasesStripProps) => {
  const active = releases.filter(rel => rel.phase !== 'GA');
  if (active.length === 0) {
    return null;
  }

  return (
    <Gallery hasGutter className="app-mb-md" minWidths={{ default: '240px' }}>
      {active.slice(0, 4).map(release => {
        const progress = computeProgress(release);
        const MAX_LABEL_LEN = 25;
        const rawLabel = release.nextRelease?.name.replace(/Batch |GA Stable Release/g, '').trim();
        const nextLabel =
          rawLabel && rawLabel.length > MAX_LABEL_LEN
            ? `${rawLabel.substring(0, MAX_LABEL_LEN)}...`
            : rawLabel;
        const borderColor =
          PHASE_BORDER_COLORS[phaseColor(release.phase)] ?? PHASE_BORDER_COLORS.grey;
        const totalDays =
          release.startDate && release.gaDate
            ? Math.round(
                (new Date(release.gaDate).getTime() - new Date(release.startDate).getTime()) /
                  MS_PER_DAY,
              )
            : null;
        const elapsedDays = release.startDate
          ? Math.max(
              0,
              Math.round((Date.now() - new Date(release.startDate).getTime()) / MS_PER_DAY),
            )
          : null;

        return (
          <GalleryItem key={release.shortname}>
            <Card
              isClickable
              isCompact
              className="app-cursor-pointer"
              style={{ borderLeft: `4px solid ${borderColor}` }}
              onClick={() => onSelectVersion?.(release.shortname)}
            >
              <CardBody>
                <div className="app-mb-xs">
                  <strong>{release.shortname.replace('cnv-', 'CNV ')}</strong>{' '}
                  <PhaseBadge phase={release.phase} />
                </div>
                {release.daysUntilNext !== null && (
                  <div className="app-mb-sm">
                    <span className="app-countdown-hero">
                      <span className={`app-countdown-${countdownColor(release.daysUntilNext)}`}>
                        {release.daysUntilNext}
                      </span>
                    </span>
                    <span className="app-text-sm app-text-subtle">
                      {' '}
                      days to {nextLabel ?? 'next milestone'}
                    </span>
                  </div>
                )}
                {release.gaDate && (
                  <>
                    <Tooltip content={`GA: ${fmtDate(release.gaDate)}`}>
                      <Progress
                        aria-label={`${release.shortname} progress to GA`}
                        measureLocation="none"
                        value={progress}
                        variant={progress >= 90 ? 'warning' : undefined}
                      />
                    </Tooltip>
                    <div className="app-text-xs app-text-subtle app-mt-sm">
                      {elapsedDays !== null && totalDays !== null
                        ? `Day ${elapsedDays} of ${totalDays}`
                        : `GA: ${fmtDate(release.gaDate)}`}
                    </div>
                  </>
                )}
              </CardBody>
            </Card>
          </GalleryItem>
        );
      })}
    </Gallery>
  );
};
