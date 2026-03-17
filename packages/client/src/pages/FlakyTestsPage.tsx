import React, { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Button,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import { fetchFlakyTests } from '../api/flaky';
import { useComponentFilter } from '../context/ComponentFilterContext';
import { FlakyTable, type FlakyRow } from '../components/flaky/FlakyTable';
import { exportCsv } from '../utils/csvExport';

export const FlakyTestsPage: React.FC = () => {
  useEffect(() => { document.title = 'Flaky Tests | CNV Console Monitor'; }, []);

  const { selectedComponent } = useComponentFilter();

  const { data: tests, isLoading } = useQuery({
    queryKey: ['flakyTests', selectedComponent],
    queryFn: () => fetchFlakyTests(14, 30, selectedComponent),
  });

  const rows: FlakyRow[] = useMemo(() =>
    (tests ?? []).map(test => ({ ...test, flipRate: Math.round((test.flip_count / test.total_runs) * 100) })),
  [tests]);

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
              <FlexItem>
                <Button variant="secondary" icon={<DownloadIcon />} isDisabled={!rows.length} onClick={() => {
                  exportCsv('flaky-tests.csv',
                    ['Test Name', 'Flips', 'Total Runs', 'Flip Rate'],
                    rows.map(row => [row.name, row.flip_count, row.total_runs, `${row.flipRate}%`]),
                  );
                }}>Export</Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <FlakyTable rows={rows} isLoading={isLoading} />
      </PageSection>
    </>
  );
};
