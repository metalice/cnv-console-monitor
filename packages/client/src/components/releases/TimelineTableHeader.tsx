import type { ThProps } from '@patternfly/react-table';
import { Tr } from '@patternfly/react-table';

import { ThWithHelp } from '../common/ThWithHelp';

const COLUMN_HELP: Record<string, string> = {
  countdown: 'Days until next release.',
  gaDate: 'General Availability date.',
  lastReleased: 'Date of the most recent batch release.',
  nextRelease: 'Next scheduled batch or GA release.',
  phase: 'Current lifecycle phase.',
  releases: 'Total past releases. Click row to expand history.',
  version: 'CNV version shortname.',
  zStream: 'Current z-stream version.',
};

const COLUMN_LABELS: Record<string, string> = {
  countdown: 'Countdown',
  gaDate: 'GA Date',
  lastReleased: 'Last Released',
  nextRelease: 'Next Release',
  phase: 'Phase',
  releases: 'Releases',
  version: 'Version',
  zStream: 'Z-Stream',
};

const COLUMN_ORDER = [
  'version',
  'phase',
  'gaDate',
  'zStream',
  'lastReleased',
  'nextRelease',
  'countdown',
  'releases',
];

type TimelineTableHeaderProps = {
  isColumnVisible: (id: string) => boolean;
  getSortParams: (index: number) => ThProps['sort'];
};

export const TimelineTableHeader = ({
  getSortParams,
  isColumnVisible,
}: TimelineTableHeaderProps) => (
  <Tr>
    {COLUMN_ORDER.map((colId, idx) =>
      isColumnVisible(colId) ? (
        <ThWithHelp
          help={COLUMN_HELP[colId]}
          key={colId}
          label={COLUMN_LABELS[colId]}
          sort={getSortParams(idx)}
        />
      ) : null,
    )}
  </Tr>
);
