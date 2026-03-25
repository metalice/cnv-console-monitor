import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  Bullseye,
  Content,
  EmptyState,
  EmptyStateBody,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';

import { type CompareResult, fetchCompare, fetchCompareLaunches } from '../api/compare';
import { CompareResults } from '../components/compare/CompareResults';
import { CompareSelector } from '../components/compare/CompareSelector';

export const ComparePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    document.title = 'Compare Launches | CNV Console Monitor';
  }, []);

  const paramA = searchParams.get('a') ?? '';
  const paramB = searchParams.get('b') ?? '';
  const queryA = paramA ? parseInt(paramA, 10) : NaN;
  const queryB = paramB ? parseInt(paramB, 10) : NaN;
  const hasValidParams = !isNaN(queryA) && !isNaN(queryB);

  const [selectedLaunchName, setSelectedLaunchName] = useState<string | null>(null);
  const [selectedRunA, setSelectedRunA] = useState(!isNaN(queryA) ? queryA : null);
  const [selectedRunB, setSelectedRunB] = useState(!isNaN(queryB) ? queryB : null);

  const { data: launchGroups, isLoading: groupsLoading } = useQuery({
    queryFn: () => fetchCompareLaunches(60),
    queryKey: ['compareLaunches'],
    staleTime: 5 * 60 * 1000,
  });

  const selectedGroup = useMemo(() => {
    if (!selectedLaunchName || !launchGroups) {
      return null;
    }
    return launchGroups.find(group => group.name === selectedLaunchName) ?? null;
  }, [selectedLaunchName, launchGroups]);

  const {
    data: result,
    error: compareError,
    isLoading: comparing,
  } = useQuery<CompareResult>({
    enabled: hasValidParams,
    queryFn: () => fetchCompare(queryA, queryB),
    queryKey: ['compare', queryA, queryB],
  });

  const handleSelectLaunch = (name: string) => {
    setSelectedLaunchName(name);
    setSelectedRunA(null);
    setSelectedRunB(null);
  };

  const handleCompare = () => {
    if (selectedRunA && selectedRunB) {
      const params = new URLSearchParams();
      params.set('a', String(selectedRunA));
      params.set('b', String(selectedRunB));
      setSearchParams(params);
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
            isComparing={comparing}
            isLoading={groupsLoading}
            launchGroups={launchGroups}
            selectedGroup={selectedGroup}
            selectedRunA={selectedRunA}
            selectedRunB={selectedRunB}
            onClearLaunch={() => setSelectedLaunchName(null)}
            onCompare={handleCompare}
            onSelectLaunch={handleSelectLaunch}
            onSelectRunA={setSelectedRunA}
            onSelectRunB={setSelectedRunB}
          />
        </PageSection>
      )}

      {comparing && (
        <PageSection>
          <Bullseye className="app-min-h-200">
            <Spinner aria-label="Comparing" />
          </Bullseye>
        </PageSection>
      )}

      {compareError && (
        <PageSection>
          <EmptyState headingLevel="h4" icon={ExclamationCircleIcon} titleText="Comparison failed">
            <EmptyStateBody>{compareError.message}</EmptyStateBody>
          </EmptyState>
        </PageSection>
      )}

      {result?.summary && (
        <PageSection>
          <CompareResults result={result} onReset={handleReset} />
        </PageSection>
      )}
    </>
  );
};
