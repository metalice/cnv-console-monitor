import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Bullseye,
  EmptyState,
  EmptyStateBody,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { fetchCompare, fetchCompareLaunches, type CompareResult } from '../api/compare';
import { CompareSelector } from '../components/compare/CompareSelector';
import { CompareResults } from '../components/compare/CompareResults';

export const ComparePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => { document.title = 'Compare Launches | CNV Console Monitor'; }, []);

  const paramA = searchParams.get('a') ?? '';
  const paramB = searchParams.get('b') ?? '';
  const queryA = paramA ? parseInt(paramA, 10) : NaN;
  const queryB = paramB ? parseInt(paramB, 10) : NaN;
  const hasValidParams = !isNaN(queryA) && !isNaN(queryB);

  const [selectedLaunchName, setSelectedLaunchName] = useState<string | null>(null);
  const [selectedRunA, setSelectedRunA] = useState<number | null>(!isNaN(queryA) ? queryA : null);
  const [selectedRunB, setSelectedRunB] = useState<number | null>(!isNaN(queryB) ? queryB : null);

  const { data: launchGroups, isLoading: groupsLoading } = useQuery({
    queryKey: ['compareLaunches'],
    queryFn: () => fetchCompareLaunches(60),
    staleTime: 5 * 60 * 1000,
  });

  const selectedGroup = useMemo(() => {
    if (!selectedLaunchName || !launchGroups) return null;
    return launchGroups.find((group) => group.name === selectedLaunchName) ?? null;
  }, [selectedLaunchName, launchGroups]);

  const { data: result, isLoading: comparing, error: compareError } = useQuery<CompareResult>({
    queryKey: ['compare', queryA, queryB],
    queryFn: () => fetchCompare(queryA, queryB),
    enabled: hasValidParams,
  });

  const handleSelectLaunch = (name: string) => {
    setSelectedLaunchName(name);
    setSelectedRunA(null);
    setSelectedRunB(null);
  };

  const handleCompare = () => {
    if (selectedRunA && selectedRunB) {
      setSearchParams({ a: String(selectedRunA), b: String(selectedRunB) });
    }
  };

  const handleReset = () => {
    setSearchParams({});
    setSelectedRunA(null);
    setSelectedRunB(null);
  };

  return (
    <>
      <PageSection>
        <Content component="h1">Compare Runs</Content>
        <Content component="small">Pick a launch, then select two runs to compare</Content>
      </PageSection>

      {!hasValidParams && (
        <PageSection>
          <CompareSelector
            launchGroups={launchGroups}
            isLoading={groupsLoading}
            selectedGroup={selectedGroup}
            onSelectLaunch={handleSelectLaunch}
            onClearLaunch={() => setSelectedLaunchName(null)}
            selectedRunA={selectedRunA}
            selectedRunB={selectedRunB}
            onSelectRunA={setSelectedRunA}
            onSelectRunB={setSelectedRunB}
            onCompare={handleCompare}
            isComparing={comparing}
          />
        </PageSection>
      )}

      {comparing && (
        <PageSection><Bullseye className="app-min-h-200"><Spinner aria-label="Comparing" /></Bullseye></PageSection>
      )}

      {compareError && (
        <PageSection>
          <EmptyState headingLevel="h4" titleText="Comparison failed" icon={ExclamationCircleIcon}>
            <EmptyStateBody>{(compareError as Error).message}</EmptyStateBody>
          </EmptyState>
        </PageSection>
      )}

      {result && result.summary && (
        <PageSection>
          <CompareResults result={result} onReset={handleReset} />
        </PageSection>
      )}
    </>
  );
};
