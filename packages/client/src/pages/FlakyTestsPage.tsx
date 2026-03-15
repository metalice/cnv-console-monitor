import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Button,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Flex,
  FlexItem,
  Tooltip,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Tbody, Td } from '@patternfly/react-table';
import { CheckCircleIcon, DownloadIcon } from '@patternfly/react-icons';
import type { FlakyTest } from '@cnv-monitor/shared';
import { SortByDirection } from '@patternfly/react-table';
import { apiFetch } from '../api/client';
import { fetchFlakyTests } from '../api/flaky';
import { useTableSort } from '../hooks/useTableSort';
import { useColumnManagement, type ColumnDef } from '../hooks/useColumnManagement';
import { usePreferences } from '../context/PreferencesContext';
import { ComponentMultiSelect } from '../components/common/ComponentMultiSelect';
import { TableToolbar } from '../components/common/TableToolbar';
import { ThWithHelp } from '../components/common/ThWithHelp';
import { exportCsv } from '../utils/csvExport';

type FlakyRow = FlakyTest & { flipRate: number };

const FLAKY_COLUMNS: ColumnDef[] = [
  { id: 'testName', title: 'Test Name' },
  { id: 'flips', title: 'Flips' },
  { id: 'totalRuns', title: 'Total Runs' },
  { id: 'flipRate', title: 'Flip Rate' },
];

const SORT_ACCESSORS: Record<number, (r: FlakyRow) => string | number | null> = {
  0: (r) => r.name.split('.').pop() || r.name,
  1: (r) => r.flip_count,
  2: (r) => r.total_runs,
  3: (r) => r.flipRate,
};

export const FlakyTestsPage: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => { document.title = 'Flaky Tests | CNV Console Monitor'; }, []);

  const { preferences, loaded: prefsLoaded, setPreference } = usePreferences();
  const [selectedComponents, setSelectedComponentsState] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (prefsLoaded && preferences.dashboardComponents?.length) {
      setSelectedComponentsState(new Set(preferences.dashboardComponents));
    }
  }, [prefsLoaded, preferences.dashboardComponents]);

  const setSelectedComponents = (val: Set<string>) => { setSelectedComponentsState(val); setPreference('dashboardComponents', [...val]); };
  const comp = selectedComponents.size === 1 ? [...selectedComponents][0] : undefined;

  const { data: availableComponents } = useQuery({
    queryKey: ['availableComponents'],
    queryFn: () => apiFetch<string[]>('/launches/components'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tests, isLoading } = useQuery({
    queryKey: ['flakyTests', comp],
    queryFn: () => fetchFlakyTests(14, 30, comp),
  });

  const rows: FlakyRow[] = useMemo(() =>
    (tests ?? []).map(t => ({ ...t, flipRate: Math.round((t.flip_count / t.total_runs) * 100) })),
  [tests]);

  const { sorted, getSortParams } = useTableSort(rows, SORT_ACCESSORS, { index: 3, direction: SortByDirection.desc });

  const [tableSearch, setTableSearch] = useState('');
  const colMgmt = useColumnManagement('flaky', FLAKY_COLUMNS);

  const searchFiltered = useMemo(() => {
    if (!tableSearch.trim()) return sorted;
    const s = tableSearch.toLowerCase();
    return sorted.filter(t => t.name.toLowerCase().includes(s));
  }, [sorted, tableSearch]);

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">Flaky Tests</Content>
            <Content component="small">Tests that flip between pass and fail (last 14 days)</Content>
          </FlexItem>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
              {(availableComponents?.length ?? 0) > 0 && (
                <FlexItem>
                  <ComponentMultiSelect
                    id="flaky-component"
                    selected={selectedComponents}
                    options={availableComponents ?? []}
                    onChange={setSelectedComponents}
                  />
                </FlexItem>
              )}
              <FlexItem>
                <Button variant="secondary" icon={<DownloadIcon />} isDisabled={!searchFiltered.length} onClick={() => {
                  exportCsv('flaky-tests.csv',
                    ['Test Name', 'Flips', 'Total Runs', 'Flip Rate'],
                    searchFiltered.map(t => [t.name, t.flip_count, t.total_runs, `${t.flipRate}%`]),
                  );
                }}>Export</Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
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
                  {searchFiltered.map((t) => {
                    const shortName = t.name.split('.').pop() || t.name;
                    return (
                      <Tr key={t.unique_id}>
                        {colMgmt.isColumnVisible('testName') && (
                          <Td dataLabel="Test Name" className="app-cell-truncate">
                            <Tooltip content={t.name}>
                              <Button variant="link" isInline size="sm" onClick={() => navigate(`/test/${encodeURIComponent(t.unique_id)}`)}>
                                {shortName}
                              </Button>
                            </Tooltip>
                          </Td>
                        )}
                        {colMgmt.isColumnVisible('flips') && <Td dataLabel="Flips" className="app-cell-nowrap"><strong>{t.flip_count}</strong></Td>}
                        {colMgmt.isColumnVisible('totalRuns') && <Td dataLabel="Total Runs" className="app-cell-nowrap">{t.total_runs}</Td>}
                        {colMgmt.isColumnVisible('flipRate') && <Td dataLabel="Flip Rate" className="app-cell-nowrap">{t.flipRate}%</Td>}
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
      </PageSection>
    </>
  );
};
