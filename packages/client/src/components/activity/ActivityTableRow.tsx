import { type ActivityEntry, timeAgo } from '@cnv-monitor/shared';

import { Label, Tooltip } from '@patternfly/react-core';
import { ThumbtackIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';

import { actionLabel } from './actionLabel';
import { DiffBadge, UserAvatar } from './ActivityTableCells';
import type { GroupedEntry } from './activityTableHelpers';

type ActivityTableRowProps = {
  entry: GroupedEntry;
  isPinned: boolean;
  isSelected: boolean;
  onRowClick: (entry: ActivityEntry) => void;
};

export const ActivityTableRow = ({
  entry,
  isPinned,
  isSelected,
  onRowClick,
}: ActivityTableRowProps) => {
  const isAck = entry.action === 'acknowledge';
  const performedAtMs = new Date(entry.performed_at).getTime();

  return (
    <Tr
      isClickable
      className={`${isPinned ? 'app-pinned-row' : ''}${isSelected ? ' app-selected-row' : ''}`}
      key={entry.id}
      onRowClick={() => onRowClick(entry)}
    >
      <Td dataLabel="Time">
        <Tooltip content={new Date(entry.performed_at).toLocaleString()}>
          <span>{timeAgo(performedAtMs)}</span>
        </Tooltip>
      </Td>
      <Td dataLabel="Action">
        {isPinned && <ThumbtackIcon className="app-pin-icon" />}
        {actionLabel(entry.action)}
        {entry.groupCount && entry.groupCount > 1 && (
          <Label isCompact className="app-ml-xs" color="grey">
            {entry.groupCount}x
          </Label>
        )}
      </Td>
      <Td dataLabel="Component">
        {entry.component ? (
          <Label isCompact color="grey">
            {entry.component}
          </Label>
        ) : (
          '--'
        )}
      </Td>
      <Td dataLabel="Test / Target">
        {isAck ? (
          <span>{entry.component || 'Report'} acknowledged</span>
        ) : entry.groupCount && entry.groupCount > 1 ? (
          <span>
            {entry.groupCount} tests classified as {entry.new_value}
          </span>
        ) : (
          <Tooltip content={entry.test_name || '--'}>
            <span className="app-text-ellipsis">{entry.test_name || '--'}</span>
          </Tooltip>
        )}
      </Td>
      <Td dataLabel="Details">
        {isAck ? (
          entry.notes ? (
            <Label isCompact color="blue">
              Has notes
            </Label>
          ) : (
            '--'
          )
        ) : (
          <DiffBadge newVal={entry.new_value} oldVal={entry.old_value} />
        )}
      </Td>
      <Td dataLabel="By">{entry.performed_by ? <UserAvatar name={entry.performed_by} /> : '--'}</Td>
    </Tr>
  );
};
