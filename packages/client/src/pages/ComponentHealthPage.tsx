import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Bullseye,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { fetchComponentHealth } from '../api/componentHealth';
import { useDate } from '../context/DateContext';
import { ComponentHealthCard } from '../components/common/ComponentHealthCard';

export const ComponentHealthPage: React.FC = () => {
  const navigate = useNavigate();
  const { since, until, displayLabel } = useDate();

  useEffect(() => {
    document.title = 'Component Health | CNV Console Monitor';
  }, []);

  const { data: components, isLoading } = useQuery({
    queryKey: ['componentHealth', since, until],
    queryFn: () => fetchComponentHealth(since, until),
  });

  if (isLoading) {
    return (
      <PageSection>
        <Bullseye className="app-min-h-300">
          <Spinner aria-label="Loading component health" />
        </Bullseye>
      </PageSection>
    );
  }

  if (!components?.length) {
    return (
      <PageSection>
        <EmptyState icon={CubesIcon} headingLevel="h4" titleText="No components found">
          <EmptyStateBody>No component data available yet. Components are assigned during polling.</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection>
        <Content component="h1">Component Health</Content>
        <Content component="small">Health overview per component ({displayLabel}). Trend compares to the previous equivalent period.</Content>
      </PageSection>

      <PageSection>
        {components.map((healthData) => (
          <ComponentHealthCard
            key={healthData.component}
            component={healthData}
            onClick={() => navigate(`/failures?component=${encodeURIComponent(healthData.component)}`)}
          />
        ))}
      </PageSection>
    </>
  );
};
