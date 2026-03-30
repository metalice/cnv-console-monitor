import { type ReactNode, useMemo } from 'react';

import type { ActivityEntry } from '@cnv-monitor/shared';

import {
  Bullseye,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  Pagination,
  Spinner,
} from '@patternfly/react-core';
import { Table, Tbody, Thead, Tr } from '@patternfly/react-table';

import { ThWithHelp } from '../common/ThWithHelp';

import { groupBulkActions, type GroupedEntry } from './activityTableHelpers';
import { ActivityTableRow } from './ActivityTableRow';

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
  toolbar?: ReactNode;
};

export const ActivityTable = ({
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
}: ActivityTableProps) => {
  const groupedRows = useMemo(() => (entries ? groupBulkActions(entries) : []), [entries]);

  const pinnedIds = useMemo(
    () => new Set<number>((pinnedEntries ?? []).map(entry => entry.id)),
    [pinnedEntries],
  );

  const allRows: GroupedEntry[] = useMemo(() => {
    if (!pinnedEntries?.length) {
      return groupedRows;
    }
    const pinnedNotInPage = pinnedEntries.filter(
      entry => !groupedRows.some(row => row.id === entry.id),
    );
    return [...pinnedNotInPage, ...groupedRows];
  }, [pinnedEntries, groupedRows]);

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
                  {allRows.map(entry => (
                    <ActivityTableRow
                      entry={entry}
                      isPinned={pinnedIds.has(entry.id)}
                      isSelected={selectedId === entry.id}
                      key={entry.id}
                      onRowClick={onRowClick}
                    />
                  ))}
                </Tbody>
              </Table>
            </div>
            <Pagination
              isCompact
              className="app-mt-md"
              itemCount={total}
              page={page}
              perPage={pageSize}
              onSetPage={(_e, newPage) => onPageChange(newPage)}
            />
          </>
        )}
      </CardBody>
    </Card>
  );
};
