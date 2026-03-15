import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardBody,
  Button,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Tooltip,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Tbody, Td, SortByDirection } from '@patternfly/react-table';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { useTableSort } from '../../hooks/useTableSort';
import { useColumnManagement, type ColumnDef } from '../../hooks/useColumnManagement';
import { TableToolbar } from '../common/TableToolbar';
import { ThWithHelp } from '../common/ThWithHelp';

export type FlakyRow = {
  name: string;
  unique_id: string;
  flip_count: number;
  total_runs: number;
  flipRate: number;
};

const FLAKY_COLUMNS: ColumnDef[] = [
  { id: 'testName', title: 'Test Name' },
  { id: 'flips', title: 'Flips' },
  { id: 'totalRuns', title: 'Total Runs' },
  { id: 'flipRate', title: 'Flip Rate' },
];

const SORT_ACCESSORS: Record<number, (r: FlakyRow) => string | number | null> = {
  0: (row) => row.name.split('.').pop() || row.name,
  1: (row) => row.flip_count,
  2: (row) => row.total_runs,
  3: (row) => row.flipRate,
};

type FlakyTableProps = {
  rows: FlakyRow[];
  isLoading: boolean;
};

export const FlakyTable: React.FC<FlakyTableProps> = ({ rows, isLoading }) => {
  const navigate = useNavigate();
  const { sorted, getSortParams } = useTableSort(rows, SORT_ACCESSORS, { index: 3, direction: SortByDirection.desc });

  const [tableSearch, setTableSearch] = useState('');
  const colMgmt = useColumnManagement('flaky', FLAKY_COLUMNS);

  const searchFiltered = useMemo(() => {
    if (!tableSearch.trim()) return sorted;
    const searchLower = tableSearch.toLowerCase();
    return sorted.filter(test => test.name.toLowerCase().includes(searchLower));
  }, [sorted, tableSearch]);

  return (
    <Card>
      <CardBody>
        {isLoading ? (
          <Spinner aria-label="Loading flaky tests" />
        ) : !sorted.length ? (
          <EmptyState icon={CheckCircleIcon} headingLevel="h4" titleText="No flaky tests!">
            <EmptyStateBody>No flaky tests detected. Nice!</EmptyStateBody>
          </EmptyState>
        ) : (
          <>
            <TableToolbar
              searchValue={tableSearch}
              onSearchChange={setTableSearch}
              searchPlaceholder="Search flaky tests..."
              resultCount={searchFiltered.length}
              totalCount={rows.length}
              columns={FLAKY_COLUMNS}
              visibleIds={colMgmt.visibleIds}
              onSaveColumns={colMgmt.setColumns}
              onResetColumns={colMgmt.resetColumns}
            />
            <div className="app-table-scroll">
              <Table aria-label="Flaky tests" variant="compact" isStickyHeader>
                <Thead>
                  <Tr>
                    {colMgmt.isColumnVisible('testName') && <ThWithHelp label="Test Name" help="Full qualified name of the test identified as flaky." sort={getSortParams(0)} />}
                    {colMgmt.isColumnVisible('flips') && <ThWithHelp label="Flips" help="Number of status transitions (pass→fail or fail→pass) in the lookback window." sort={getSortParams(1)} />}
                    {colMgmt.isColumnVisible('totalRuns') && <ThWithHelp label="Total Runs" help="Total number of times this test executed in the lookback window." sort={getSortParams(2)} />}
                    {colMgmt.isColumnVisible('flipRate') && <ThWithHelp label="Flip Rate" help="Flips / Total Runs × 100. Higher = more flaky. > 30% is concerning." sort={getSortParams(3)} />}
                  </Tr>
                </Thead>
                <Tbody>
                  {searchFiltered.map((test) => {
                    const shortName = test.name.split('.').pop() || test.name;
                    return (
                      <Tr key={test.unique_id}>
                        {colMgmt.isColumnVisible('testName') && (
                          <Td dataLabel="Test Name" className="app-cell-truncate">
                            <Tooltip content={test.name}>
                              <Button variant="link" isInline size="sm" onClick={() => navigate(`/test/${encodeURIComponent(test.unique_id)}`)}>
                                {shortName}
                              </Button>
                            </Tooltip>
                          </Td>
                        )}
                        {colMgmt.isColumnVisible('flips') && <Td dataLabel="Flips" className="app-cell-nowrap"><strong>{test.flip_count}</strong></Td>}
                        {colMgmt.isColumnVisible('totalRuns') && <Td dataLabel="Total Runs" className="app-cell-nowrap">{test.total_runs}</Td>}
                        {colMgmt.isColumnVisible('flipRate') && <Td dataLabel="Flip Rate" className="app-cell-nowrap">{test.flipRate}%</Td>}
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
};
