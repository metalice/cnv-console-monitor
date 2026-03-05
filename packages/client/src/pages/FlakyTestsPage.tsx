import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  EmptyState,
  EmptyStateBody,
  Spinner,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Tbody, Td } from '@patternfly/react-table';
import { CheckCircleIcon } from '@patternfly/react-icons';
import type { FlakyTest } from '@cnv-monitor/shared';
import { fetchFlakyTests } from '../api/flaky';
import { useTableSort } from '../hooks/useTableSort';
import { ThWithHelp } from '../components/common/ThWithHelp';

type FlakyRow = FlakyTest & { flipRate: number };

const SORT_ACCESSORS: Record<number, (r: FlakyRow) => string | number | null> = {
  0: (r) => r.name.split('.').pop() || r.name,
  1: (r) => r.flip_count,
  2: (r) => r.total_runs,
  3: (r) => r.flipRate,
};

export const FlakyTestsPage: React.FC = () => {
  useEffect(() => { document.title = 'Flaky Tests | CNV Console Monitor'; }, []);

  const { data: tests, isLoading } = useQuery({
    queryKey: ['flakyTests'],
    queryFn: () => fetchFlakyTests(14, 30),
  });

  const rows: FlakyRow[] = useMemo(() =>
    (tests ?? []).map(t => ({ ...t, flipRate: Math.round((t.flip_count / t.total_runs) * 100) })),
  [tests]);

  const { sorted, getSortParams } = useTableSort(rows, SORT_ACCESSORS, { index: 3, direction: 'desc' });

  return (
    <>
      <PageSection>
        <Content component="h1">Flaky Tests</Content>
        <Content component="small">Tests that flip between pass and fail (last 14 days)</Content>
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
              <Table aria-label="Flaky tests">
                <Thead>
                  <Tr>
                    <ThWithHelp label="Test Name" help="Full qualified name of the test identified as flaky." sort={getSortParams(0)} />
                    <ThWithHelp label="Flips" help="Number of status transitions (pass→fail or fail→pass) in the lookback window." sort={getSortParams(1)} />
                    <ThWithHelp label="Total Runs" help="Total number of times this test executed in the lookback window." sort={getSortParams(2)} />
                    <ThWithHelp label="Flip Rate" help="Flips / Total Runs × 100. Higher = more flaky. > 30% is concerning." sort={getSortParams(3)} />
                  </Tr>
                </Thead>
                <Tbody>
                  {sorted.map((t) => {
                    const shortName = t.name.split('.').pop() || t.name;
                    return (
                      <Tr key={t.unique_id}>
                        <Td dataLabel="Test Name">{shortName}</Td>
                        <Td dataLabel="Flips"><strong>{t.flip_count}</strong></Td>
                        <Td dataLabel="Total Runs">{t.total_runs}</Td>
                        <Td dataLabel="Flip Rate">{t.flipRate}%</Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>
      </PageSection>
    </>
  );
};
