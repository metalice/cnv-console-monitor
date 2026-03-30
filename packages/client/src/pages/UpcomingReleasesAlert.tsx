import type { ReleaseInfo } from '@cnv-monitor/shared';

import { Alert, Label } from '@patternfly/react-core';

type UpcomingReleasesAlertProps = {
  releases: ReleaseInfo[];
  onNavigate: () => void;
};

export const UpcomingReleasesAlert = ({ onNavigate, releases }: UpcomingReleasesAlertProps) => {
  if (releases.length === 0) {
    return null;
  }
  return (
    <Alert isInline className="app-mb-md" title="Upcoming Releases" variant="warning">
      {releases.map(release => (
        <Label
          className="app-mr-sm app-cursor-pointer"
          color={(release.daysUntilNext ?? 0) <= 3 ? 'red' : 'orange'}
          key={release.shortname}
          onClick={onNavigate}
        >
          {release.shortname.replace('cnv-', 'CNV ')} &mdash; {release.nextRelease?.date} (
          {release.daysUntilNext}d)
        </Label>
      ))}
    </Alert>
  );
};
