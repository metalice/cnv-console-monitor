import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Button,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import { apiFetch } from '../api/client';
import { fetchFlakyTests } from '../api/flaky';
import { usePreferences } from '../context/PreferencesContext';
import { ComponentMultiSelect } from '../components/common/ComponentMultiSelect';
import { FlakyTable, type FlakyRow } from '../components/flaky/FlakyTable';
import { exportCsv } from '../utils/csvExport';

export const FlakyTestsPage: React.FC = () => {
  useEffect(() => { document.title = 'Flaky Tests | CNV Console Monitor'; }, []);

  const { preferences, loaded: prefsLoaded, setPreference } = usePreferences();
  const [selectedComponents, setSelectedComponentsState] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (prefsLoaded && preferences.dashboardComponents?.length) {
      setSelectedComponentsState(new Set(preferences.dashboardComponents));
    }
  }, [prefsLoaded, preferences.dashboardComponents]);

  const setSelectedComponents = (value: Set<string>) => { setSelectedComponentsState(value); setPreference('dashboardComponents', [...value]); };
  const selectedComponent = selectedComponents.size === 1 ? [...selectedComponents][0] : undefined;

  const { data: availableComponents } = useQuery({
    queryKey: ['availableComponents'],
    queryFn: () => apiFetch<string[]>('/launches/components'),
    staleTime: 5 * 60 * 1000,
  });

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
