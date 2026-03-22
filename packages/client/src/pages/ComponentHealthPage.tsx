import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Flex, FlexItem,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { fetchComponentHealth } from '../api/componentHealth';
import { generateHealthNarrative, generateStandupSummary } from '../api/ai';
import { useDate } from '../context/DateContext';
import { ComponentHealthCard } from '../components/common/ComponentHealthCard';
import { AIActionButton } from '../components/ai/AIActionButton';

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
    return <div className="app-page-spinner"><Spinner aria-label="Loading component health" /></div>;
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
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">Component Health</Content>
            <Content component="small">Health overview per component ({displayLabel}). Trend compares to the previous equivalent period.</Content>
          </FlexItem>
          <FlexItem>
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <AIActionButton
                  label="AI Health Summary"
                  description="AI is analyzing component health data..."
                  help="AI analyzes pass rates, failure trends, and test counts for each component and writes a concise health narrative."
                  apiCall={() => generateHealthNarrative({
                    components: components?.map(c => ({
                      name: c.component,
                      passRate: c.passRate,
                      launches: c.totalLaunches,
                      failedTests: c.failedLaunches,
                    })) ?? [],
                    days: Math.round((until - since) / (24 * 60 * 60 * 1000)),
                  })}
                />
              </FlexItem>
              <FlexItem>
                <AIActionButton
                  label="Standup Summary"
                  description="AI is generating a standup summary..."
                  help="AI generates 3-5 bullet points summarizing the last 24 hours — test results, notable failures, upcoming releases — ready for a standup meeting."
                  apiCall={() => generateStandupSummary({
                    date: new Date().toLocaleDateString(),
                    passRate: components ? Math.round(components.reduce((s, c) => s + c.passRate, 0) / components.length) : 0,
                    totalLaunches: components?.reduce((s, c) => s + c.totalLaunches, 0) ?? 0,
                    passRateDelta: 0,
                    components: components?.map(c => ({ name: c.component, passRate: c.passRate, launches: c.totalLaunches, failed: c.failedLaunches })) ?? [],
                    classifications: 0, jiraCreated: 0, acks: 0,
                    upcoming: [],
                    recentFailures: [],
                  })}
                />
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
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
