import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';

import { generateHealthNarrative, generateStandupSummary } from '../api/ai';
import { fetchComponentHealth } from '../api/componentHealth';
import { AIActionButton } from '../components/ai/AIActionButton';
import { ComponentHealthCard } from '../components/common/ComponentHealthCard';
import { useDate } from '../context/DateContext';

export const ComponentHealthPage: React.FC = () => {
  const navigate = useNavigate();
  const { displayLabel, since, until } = useDate();

  useEffect(() => {
    document.title = 'Component Health | CNV Console Monitor';
  }, []);

  const { data: components, isLoading } = useQuery({
    queryFn: () => fetchComponentHealth(since, until),
    queryKey: ['componentHealth', since, until],
  });

  if (isLoading) {
    return (
      <div className="app-page-spinner">
        <Spinner aria-label="Loading component health" />
      </div>
    );
  }

  if (!components?.length) {
    return (
      <PageSection>
        <EmptyState headingLevel="h4" icon={CubesIcon} titleText="No components found">
          <EmptyStateBody>
            No component data available yet. Components are assigned during polling.
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Content component="h1">Component Health</Content>
            <Content component="small">
              Health overview per component ({displayLabel}). Trend compares to the previous
              equivalent period.
            </Content>
          </FlexItem>
          <FlexItem>
            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <AIActionButton
                  apiCall={() =>
                    generateHealthNarrative({
                      components: components.map(c => ({
                        failedTests: c.failedLaunches,
                        launches: c.totalLaunches,
                        name: c.component,
                        passRate: c.passRate,
                      })),
                      days: Math.round((until - since) / (24 * 60 * 60 * 1000)),
                    })
                  }
                  description="AI is analyzing component health data..."
                  help="AI analyzes pass rates, failure trends, and test counts for each component and writes a concise health narrative."
                  label="AI Health Summary"
                />
              </FlexItem>
              <FlexItem>
                <AIActionButton
                  apiCall={() =>
                    generateStandupSummary({
                      acks: 0,
                      classifications: 0,
                      components: components.map(c => ({
                        failed: c.failedLaunches,
                        launches: c.totalLaunches,
                        name: c.component,
                        passRate: c.passRate,
                      })),
                      date: new Date().toLocaleDateString(),
                      jiraCreated: 0,
                      passRate: Math.round(
                        components.reduce((s, c) => s + c.passRate, 0) / components.length,
                      ),
                      passRateDelta: 0,
                      recentFailures: [],
                      totalLaunches: components.reduce((s, c) => s + c.totalLaunches, 0),
                      upcoming: [],
                    })
                  }
                  description="AI is generating a standup summary..."
                  help="AI generates 3-5 bullet points summarizing the last 24 hours — test results, notable failures, upcoming releases — ready for a standup meeting."
                  label="Standup Summary"
                />
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        {components.map(healthData => (
          <ComponentHealthCard
            component={healthData}
            key={healthData.component}
            onClick={() =>
              navigate(`/failures?component=${encodeURIComponent(healthData.component)}`)
            }
          />
        ))}
      </PageSection>
    </>
  );
};
