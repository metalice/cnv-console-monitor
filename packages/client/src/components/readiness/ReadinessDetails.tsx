import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Bullseye,
  Button,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import { useQuery } from '@tanstack/react-query';

import { fetchReadiness, fetchReadinessVersions } from '../../api/readiness';

import { ReadinessBlocking } from './ReadinessBlocking';
import { ReadinessBanner, ReadinessStatsGallery } from './ReadinessStats';
import { ReadinessTrendChart } from './ReadinessTrendChart';

export const ReadinessDetails = ({ version }: { version: string }) => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `Readiness: ${version} | CNV Console Monitor`;
  }, [version]);

  const { data: versions } = useQuery({
    queryFn: fetchReadinessVersions,
    queryKey: ['readinessVersions'],
    staleTime: 5 * 60 * 1000,
  });
  const { data, error, isLoading } = useQuery({
    enabled: Boolean(version),
    queryFn: () => fetchReadiness(version),
    queryKey: ['readiness', version],
  });

  if (isLoading) {
    return (
      <Bullseye className="app-min-h-300">
        <Spinner aria-label="Loading readiness" />
      </Bullseye>
    );
  }

  if (error) {
    return (
      <PageSection>
        <EmptyState headingLevel="h4" titleText="Error loading readiness data">
          <EmptyStateBody>{error.message}</EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <PageSection>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsMd' }}
            >
              <FlexItem>
                <Content component="h1">Readiness: {version}</Content>
              </FlexItem>
              {(versions?.length ?? 0) > 1 && (
                <FlexItem>
                  {(versions ?? [])
                    .filter(ver => ver !== version)
                    .slice(0, 3)
                    .map(ver => (
                      <Button
                        className="app-mr-sm"
                        key={ver}
                        size="sm"
                        variant="link"
                        onClick={() => navigate(`/readiness/${ver}`)}
                      >
                        {ver}
                      </Button>
                    ))}
                </FlexItem>
              )}
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      <ReadinessBanner data={data} />
      <ReadinessStatsGallery data={data} />
      <ReadinessTrendChart trend={data.trend} />

      <PageSection>
        <ReadinessBlocking failures={data.blockingFailures} />
      </PageSection>
    </>
  );
};
