import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  Label,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import { useQuery } from '@tanstack/react-query';

import { fetchReadiness } from '../../api/readiness';
import { useComponentFilter } from '../../context/ComponentFilterContext';

import { ReadinessBlocking } from './ReadinessBlocking';
import { ReadinessComponentBreakdown } from './ReadinessComponentBreakdown';
import { ReadinessBanner, ReadinessStatsGallery } from './ReadinessStats';
import { ReadinessTrendChart } from './ReadinessTrendChart';

export const ReadinessDetails = ({ version }: { version: string }) => {
  const navigate = useNavigate();
  const { selectedComponents } = useComponentFilter();
  const components = useMemo(() => [...selectedComponents], [selectedComponents]);

  useEffect(() => {
    document.title = `Readiness: ${version} | CNV Console Monitor`;
  }, [version]);

  const { data, error, isLoading } = useQuery({
    enabled: Boolean(version),
    queryFn: () => fetchReadiness(version, 30, components.length > 0 ? components : undefined),
    queryKey: ['readiness', version, components],
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
        <Breadcrumb className="app-mb-sm">
          <BreadcrumbItem>
            <Button isInline variant="link" onClick={() => navigate('/readiness')}>
              Version Readiness
            </Button>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{version}</BreadcrumbItem>
        </Breadcrumb>
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
                <Content component="h1">CNV {version}</Content>
              </FlexItem>
              <FlexItem>
                <Label
                  isCompact
                  color={
                    data.recommendation === 'ready'
                      ? 'green'
                      : data.recommendation === 'blocked'
                        ? 'red'
                        : 'yellow'
                  }
                >
                  {data.recommendation === 'ready'
                    ? 'Ready to Ship'
                    : data.recommendation === 'blocked'
                      ? 'Blocked'
                      : 'At Risk'}
                </Label>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      <ReadinessBanner data={data} />
      <ReadinessStatsGallery data={data} />

      <PageSection>
        <Grid hasGutter>
          <GridItem span={8}>
            <ReadinessTrendChart trend={data.trend} />
          </GridItem>
          <GridItem span={4}>
            <ReadinessComponentBreakdown breakdown={data.componentBreakdown} />
          </GridItem>
        </Grid>
      </PageSection>

      <PageSection>
        <ReadinessBlocking failures={data.blockingFailures} />
      </PageSection>
    </>
  );
};
