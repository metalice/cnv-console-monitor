import React, { useMemo } from 'react';

import { type ActivityEntry, timeAgo } from '@cnv-monitor/shared';

import {
  Bullseye,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  Label,
  Pagination,
  Spinner,
  Tooltip,
} from '@patternfly/react-core';
import { ArrowRightIcon, ThumbtackIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Thead, Tr } from '@patternfly/react-table';

import { ThWithHelp } from '../common/ThWithHelp';

const actionLabel = (action: string): React.ReactNode => {
  switch (action) {
    case 'classify_defect':
      return (
        <Label isCompact color="purple">
          Classified
        </Label>
      );
    case 'bulk_classify_defect':
      return (
        <Label isCompact color="purple">
          Bulk Classified
        </Label>
      );
    case 'add_comment':
      return (
        <Label isCompact color="blue">
          Comment
        </Label>
      );
    case 'create_jira':
      return (
        <Label isCompact color="red">
          Jira Created
        </Label>
      );
    case 'link_jira':
      return (
        <Label isCompact color="orange">
          Jira Linked
        </Label>
      );
    case 'acknowledge':
      return (
        <Label isCompact color="green">
          Acknowledged
        </Label>
      );
    default:
      return <Label isCompact>{action}</Label>;
  }
};

const UserAvatar: React.FC<{ name: string }> = ({ name }) => {
  const initial = (name.split('@')[0]?.[0] || '?').toUpperCase();
  return (
    <Tooltip content={name}>
      <span className="app-user-avatar">{initial}</span>
    </Tooltip>
  );
};

const DiffBadge: React.FC<{ oldVal?: string | null; newVal?: string | null }> = ({
  newVal,
  oldVal,
}) => {
  if (oldVal && newVal && oldVal !== newVal) {
    return (
      <span className="app-diff-badge">
        <Label isCompact color="red">
          {oldVal}
        </Label>
        <ArrowRightIcon className="app-diff-arrow" />
        <Label isCompact color="green">
          {newVal}
        </Label>
      </span>
    );
  }
  return <span>{newVal || '--'}</span>;
};

type GroupedEntry = ActivityEntry & { groupCount?: number; groupedEntries?: ActivityEntry[] };

const groupBulkActions = (entries: ActivityEntry[]): GroupedEntry[] => {
  const result: GroupedEntry[] = [];
  let i = 0;
  while (i < entries.length) {
    const e = entries[i];
    if (e.action === 'bulk_classify_defect' && e.performed_by) {
      const group: ActivityEntry[] = [e];
      let j = i + 1;
      while (
        j < entries.length &&
        entries[j].action === 'bulk_classify_defect' &&
        entries[j].performed_by === e.performed_by &&
        entries[j].new_value === e.new_value &&
        Math.abs(new Date(entries[j].performed_at).getTime() - new Date(e.performed_at).getTime()) <
          60000
      ) {
        group.push(entries[j]);
        j++;
      }
      if (group.length > 1) {
        result.push({ ...e, groupCount: group.length, groupedEntries: group });
        i = j;
        continue;
      }
    }
    result.push(e);
    i++;
  }
  return result;
};

type ActivityTableProps = {
  entries: ActivityEntry[] | undefined;
  pinnedEntries?: ActivityEntry[];
  total: number;
  isLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onRowClick: (entry: ActivityEntry) => void;
  selectedId?: number | null;
  toolbar?: React.ReactNode;
};

export const ActivityTable: React.FC<ActivityTableProps> = ({
  entries,
  isLoading,
  onPageChange,
  onRowClick,
  page,
  pageSize,
  pinnedEntries,
  selectedId,
  toolbar,
  total,
}) => {
  const grouped = useMemo(() => (entries ? groupBulkActions(entries) : []), [entries]);

  const pinnedIds = useMemo(() => new Set((pinnedEntries ?? []).map(e => e.id)), [pinnedEntries]);

  const allRows = useMemo(() => {
    if (!pinnedEntries?.length) {
      return grouped;
    }
    const pinnedNotInPage = pinnedEntries.filter(e => !grouped.some(g => g.id === e.id));
    return [...pinnedNotInPage, ...grouped];
  }, [pinnedEntries, grouped]);

  return (
    <Card>
      {toolbar && <CardBody style={{ paddingBottom: 0 }}>{toolbar}</CardBody>}
      <CardBody>
        {isLoading ? (
          <Bullseye className="app-card-spinner">
            <Spinner aria-label="Loading activity" />
          </Bullseye>
        ) : !allRows.length ? (
          <EmptyState>
            <EmptyStateBody>
              No activity yet. Activity appears here when tests are triaged, Jira tickets are
              created, or daily reports are acknowledged. Use the Dashboard or Failures page to get
              started.
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <>
            <div className="app-table-scroll">
              <Table isStickyHeader aria-label="Activity feed" variant="compact">
                <Thead>
                  <Tr>
                    <ThWithHelp help="When the action was performed." label="Time" width={15} />
                    <ThWithHelp help="Type of action performed." label="Action" width={10} />
                    <ThWithHelp
                      help="Component this action relates to."
                      label="Component"
                      width={10}
                    />
                    <ThWithHelp
                      help="Test item or acknowledgment target."
                      label="Test / Target"
                      width={30}
                    />
                    <ThWithHelp help="Additional context." label="Details" width={25} />
                    <ThWithHelp help="Who performed this action." label="By" width={10} />
                  </Tr>
                </Thead>
                <Tbody>
                  {allRows.map(entry => {
                    const ge = entry as GroupedEntry;
                    const isAck = entry.action === 'acknowledge';
                    const ts = new Date(entry.performed_at).getTime();
                    const isPinned = pinnedIds.has(entry.id);
                    const isSelected = selectedId === entry.id;

                    return (
                      <Tr
                        isClickable
                        className={`${isPinned ? 'app-pinned-row' : ''}${isSelected ? ' app-selected-row' : ''}`}
                        key={entry.id}
                        onRowClick={() => onRowClick(entry)}
                      >
                        <Td dataLabel="Time">
                          <Tooltip content={new Date(entry.performed_at).toLocaleString()}>
                            <span>{timeAgo(ts)}</span>
                          </Tooltip>
                        </Td>
                        <Td dataLabel="Action">
                          {isPinned && <ThumbtackIcon className="app-pin-icon" />}
                          {actionLabel(entry.action)}
                          {ge.groupCount && ge.groupCount > 1 && (
                            <Label isCompact className="app-ml-xs" color="grey">
                              {ge.groupCount}x
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
                          ) : ge.groupCount && ge.groupCount > 1 ? (
                            <span>
                              {ge.groupCount} tests classified as {entry.new_value}
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
                        <Td dataLabel="By">
                          {entry.performed_by ? <UserAvatar name={entry.performed_by} /> : '--'}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </div>
            <Pagination
              isCompact
              className="app-mt-md"
              itemCount={total}
              page={page}
              perPage={pageSize}
              onSetPage={(_e, p) => onPageChange(p)}
            />
          </>
        )}
      </CardBody>
    </Card>
  );
};
