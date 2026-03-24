import React, { useEffect, useMemo } from 'react';

import { Button, Content, Flex, FlexItem, PageSection } from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';

import { fetchFlakyTests } from '../api/flaky';
import { type FlakyRow, FlakyTable } from '../components/flaky/FlakyTable';
import { useComponentFilter } from '../context/ComponentFilterContext';
import { exportCsv } from '../utils/csvExport';

export const FlakyTestsPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Flaky Tests | CNV Console Monitor';
  }, []);

  const { selectedComponent } = useComponentFilter();

  const { data: tests, isLoading } = useQuery({
    queryFn: () => fetchFlakyTests(14, 30, selectedComponent),
    queryKey: ['flakyTests', selectedComponent],
  });

  const rows: FlakyRow[] = useMemo(
    () =>
      (tests ?? []).map(test => ({
        ...test,
        flipRate: Math.round((test.flip_count / test.total_runs) * 100),
      })),
    [tests],
  );

  return (
    <>
      <PageSection>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Content component="h1">Flaky Tests</Content>
            <Content component="small">
              Tests that flip between pass and fail (last 14 days)
            </Content>
          </FlexItem>
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <FlexItem>
                <Button
                  icon={<DownloadIcon />}
                  isDisabled={!rows.length}
                  variant="secondary"
                  onClick={() => {
                    exportCsv(
                      'flaky-tests.csv',
                      ['Test Name', 'Flips', 'Total Runs', 'Flip Rate'],
                      rows.map(row => [
                        row.name,
                        row.flip_count,
                        row.total_runs,
                        `${row.flipRate}%`,
                      ]),
                    );
                  }}
                >
                  Export
                </Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <FlakyTable isLoading={isLoading} rows={rows} />
      </PageSection>
    </>
  );
};
