import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Button,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Tooltip,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import { SortByDirection, Table, Tbody, Td, Thead, Tr } from '@patternfly/react-table';

import { useColumnManagement } from '../../hooks/useColumnManagement';
import { useTableSort } from '../../hooks/useTableSort';
import { TableToolbar } from '../common/TableToolbar';
import { ThWithHelp } from '../common/ThWithHelp';

import { FLAKY_COLUMNS, type FlakyRow, SORT_ACCESSORS } from './flakyTableColumns';

export type { FlakyRow };

type FlakyTableProps = {
  rows: FlakyRow[];
  isLoading: boolean;
};

export const FlakyTable = ({ isLoading, rows }: FlakyTableProps) => {
  const navigate = useNavigate();
  const { getSortParams, sorted } = useTableSort(rows, SORT_ACCESSORS, {
    direction: SortByDirection.desc,
    index: 3,
  });

  const [tableSearch, setTableSearch] = useState('');
  const colMgmt = useColumnManagement('flaky', FLAKY_COLUMNS);

  const searchFiltered = useMemo(() => {
    if (!tableSearch.trim()) {
      return sorted;
    }
    const searchLower = tableSearch.toLowerCase();
    return sorted.filter(test => test.name.toLowerCase().includes(searchLower));
  }, [sorted, tableSearch]);

  return (
    <Card>
      <CardBody>
        {isLoading ? (
          <Spinner aria-label="Loading flaky tests" />
        ) : !sorted.length ? (
          <EmptyState headingLevel="h4" icon={CheckCircleIcon} titleText="No flaky tests!">
            <EmptyStateBody>No flaky tests detected. Nice!</EmptyStateBody>
          </EmptyState>
        ) : (
          <>
            <TableToolbar
              columns={FLAKY_COLUMNS}
              resultCount={searchFiltered.length}
              searchPlaceholder="Search flaky tests..."
              searchValue={tableSearch}
              totalCount={rows.length}
              visibleIds={colMgmt.visibleIds}
              onResetColumns={colMgmt.resetColumns}
              onSaveColumns={colMgmt.setColumns}
              onSearchChange={setTableSearch}
            />
            <div className="app-table-scroll">
              <Table isStickyHeader aria-label="Flaky tests" variant="compact">
                <Thead>
                  <Tr>
                    {colMgmt.isColumnVisible('testName') && (
                      <ThWithHelp
                        help="Full qualified name of the test identified as flaky."
                        label="Test Name"
                        sort={getSortParams(0)}
                      />
                    )}
                    {colMgmt.isColumnVisible('flips') && (
                      <ThWithHelp
                        help="Number of status transitions (pass→fail or fail→pass) in the lookback window."
                        label="Flips"
                        sort={getSortParams(1)}
                      />
                    )}
                    {colMgmt.isColumnVisible('totalRuns') && (
                      <ThWithHelp
                        help="Total number of times this test executed in the lookback window."
                        label="Total Runs"
                        sort={getSortParams(2)}
                      />
                    )}
                    {colMgmt.isColumnVisible('flipRate') && (
                      <ThWithHelp
                        help="Flips / Total Runs × 100. Higher = more flaky. > 30% is concerning."
                        label="Flip Rate"
                        sort={getSortParams(3)}
                      />
                    )}
                  </Tr>
                </Thead>
                <Tbody>
                  {searchFiltered.map(test => {
                    const shortName = test.name.split('.').pop() || test.name;
                    return (
                      <Tr key={test.unique_id}>
                        {colMgmt.isColumnVisible('testName') && (
                          <Td className="app-cell-truncate" dataLabel="Test Name">
                            <Tooltip content={test.name}>
                              <Button
                                isInline
                                size="sm"
                                variant="link"
                                onClick={() =>
                                  navigate(`/test/${encodeURIComponent(test.unique_id)}`)
                                }
                              >
                                {shortName}
                              </Button>
                            </Tooltip>
                          </Td>
                        )}
                        {colMgmt.isColumnVisible('flips') && (
                          <Td className="app-cell-nowrap" dataLabel="Flips">
                            <strong>{test.flip_count}</strong>
                          </Td>
                        )}
                        {colMgmt.isColumnVisible('totalRuns') && (
                          <Td className="app-cell-nowrap" dataLabel="Total Runs">
                            {test.total_runs}
                          </Td>
                        )}
                        {colMgmt.isColumnVisible('flipRate') && (
                          <Td className="app-cell-nowrap" dataLabel="Flip Rate">
                            {test.flipRate}%
                          </Td>
                        )}
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
