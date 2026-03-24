import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import type { PublicConfig, TestItem } from '@cnv-monitor/shared';

import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  PageSection,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, SearchIcon, WrenchIcon } from '@patternfly/react-icons';
import { useMutation, useQuery } from '@tanstack/react-query';

import {
  triggerAutoAnalysis,
  triggerPatternAnalysis,
  triggerUniqueErrorAnalysis,
} from '../api/analysis';
import { apiFetch } from '../api/client';
import { fetchTestItems, fetchTestItemsForLaunches } from '../api/testItems';
import { ArtifactsPanel } from '../components/detail/ArtifactsPanel';
import { TestItemsTable } from '../components/detail/TestItemsTable';
import { JiraCreateModal } from '../components/modals/JiraCreateModal';
import { JiraLinkModal } from '../components/modals/JiraLinkModal';
import { TriageModal } from '../components/modals/TriageModal';
import { aggregateTestItems } from '../utils/aggregation';

export const LaunchDetailPage: React.FC = () => {
  const { launchId } = useParams<{ launchId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const launchRpId = parseInt(launchId || '0');
  const launchIdsParam = searchParams.get('launches');
  const groupVersion = searchParams.get('version');
  const groupTier = searchParams.get('tier');

  const launchIds = useMemo(() => {
    if (!launchIdsParam) {
      return [launchRpId];
    }
    return launchIdsParam
      .split(',')
      .map(segment => parseInt(segment.trim()))
      .filter(parsed => !isNaN(parsed));
  }, [launchIdsParam, launchRpId]);

  const isGroupMode = launchIds.length > 1;
  const title = isGroupMode
    ? `${groupVersion ?? 'Unknown'} ${groupTier ?? ''} — ${launchIds.length} launches`
    : `Launch #${launchRpId}`;

  const [triageItemIds, setTriageItemIds] = useState<number[] | null>(null);
  const [jiraCreateItem, setJiraCreateItem] = useState<TestItem | null>(null);
  const [jiraLinkItemId, setJiraLinkItemId] = useState<number | null>(null);

  useEffect(() => {
    document.title = `${title} | CNV Console Monitor`;
  }, [title]);

  const { data: config } = useQuery({
    queryFn: () => apiFetch<PublicConfig>('/config'),
    queryKey: ['config'],
    staleTime: Infinity,
  });
  const { data: items, isLoading } = useQuery({
    enabled: launchIds.length > 0,
    queryFn: () =>
      isGroupMode ? fetchTestItemsForLaunches(launchIds) : fetchTestItems(launchRpId),
    queryKey: isGroupMode ? ['testItems', 'group', ...launchIds] : ['testItems', launchRpId],
  });

  const autoAnalysis = useMutation({ mutationFn: () => triggerAutoAnalysis(launchRpId) });
  const patternAnalysis = useMutation({ mutationFn: () => triggerPatternAnalysis(launchRpId) });
  const uniqueAnalysis = useMutation({ mutationFn: () => triggerUniqueErrorAnalysis(launchRpId) });

  const failedItems = useMemo(() => items?.filter(item => item.status === 'FAILED') ?? [], [items]);
  const passedItems = useMemo(() => items?.filter(item => item.status === 'PASSED') ?? [], [items]);
  const skippedItems = useMemo(
    () => items?.filter(item => item.status === 'SKIPPED') ?? [],
    [items],
  );

  const showAllItems = failedItems.length === 0 && (items?.length ?? 0) > 0;

  const displayItems = useMemo(() => {
    const source = showAllItems ? (items ?? []) : failedItems;
    if (isGroupMode) {
      return aggregateTestItems(source);
    }
    return source.map(item => ({ allRpIds: [item.rp_id], occurrences: 1, representative: item }));
  }, [isGroupMode, failedItems, showAllItems, items]);

  return (
    <>
      <PageSection>
        <Breadcrumb className="app-breadcrumb">
          <BreadcrumbItem className="app-cursor-pointer" onClick={() => navigate('/')}>
            Dashboard
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{title}</BreadcrumbItem>
        </Breadcrumb>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Content component="h1">
              {title}
              {!isGroupMode && config && (
                <a
                  aria-label="Open in ReportPortal"
                  className="app-rp-link"
                  href={`${config.rpLaunchBaseUrl}/${launchRpId}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLinkAltIcon /> ReportPortal
                </a>
              )}
            </Content>
            <Content component="small">
              {items
                ? isGroupMode
                  ? `${failedItems.length} total failures across ${launchIds.length} launches (${displayItems.length} unique tests)`
                  : `${passedItems.length} passed / ${failedItems.length} failed / ${skippedItems.length} skipped`
                : 'Loading...'}
            </Content>
          </FlexItem>
          {!isGroupMode && (
            <FlexItem>
              <Toolbar>
                <ToolbarContent>
                  <ToolbarItem>
                    <Button
                      icon={<SearchIcon />}
                      isLoading={autoAnalysis.isPending}
                      variant="secondary"
                      onClick={() => autoAnalysis.mutate()}
                    >
                      Auto-Analysis
                    </Button>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button
                      icon={<WrenchIcon />}
                      isLoading={patternAnalysis.isPending}
                      variant="secondary"
                      onClick={() => patternAnalysis.mutate()}
                    >
                      Pattern Analysis
                    </Button>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button
                      isLoading={uniqueAnalysis.isPending}
                      variant="secondary"
                      onClick={() => uniqueAnalysis.mutate()}
                    >
                      Unique Error
                    </Button>
                  </ToolbarItem>
                </ToolbarContent>
              </Toolbar>
            </FlexItem>
          )}
        </Flex>
      </PageSection>

      {isLoading ? (
        <PageSection isFilled>
          <div className="app-page-spinner">
            <Spinner aria-label="Loading test items" />
          </div>
        </PageSection>
      ) : displayItems.length === 0 && items ? (
        <PageSection>
          <Card>
            <CardBody>
              <EmptyState variant="lg">
                <EmptyStateBody>
                  No failed test items found.
                  {items.length > 0
                    ? ` All ${items.length} test items passed or were skipped. The launch status is FAILED due to an infrastructure or setup issue, not individual test failures.`
                    : ' This launch may have failed at the infrastructure level (setup/teardown) before any tests ran.'}
                  {config && !isGroupMode && (
                    <div className="app-mt-md">
                      <Button
                        component="a"
                        href={`${config.rpLaunchBaseUrl}/${launchRpId}`}
                        icon={<ExternalLinkAltIcon />}
                        rel="noreferrer"
                        target="_blank"
                        variant="link"
                      >
                        View in ReportPortal
                      </Button>
                    </div>
                  )}
                </EmptyStateBody>
              </EmptyState>
            </CardBody>
          </Card>
        </PageSection>
      ) : (
        <PageSection>
          <Card>
            <CardBody>
              <TestItemsTable
                config={config}
                displayItems={displayItems}
                isGroupMode={isGroupMode}
                launchCount={launchIds.length}
                onCreateJira={setJiraCreateItem}
                onLinkJira={setJiraLinkItemId}
                onNavigate={navigate}
                onTriage={setTriageItemIds}
              />
            </CardBody>
          </Card>
        </PageSection>
      )}

      {!isGroupMode && (
        <PageSection>
          <ArtifactsPanel launchId={launchRpId} />
        </PageSection>
      )}

      {triageItemIds && (
        <TriageModal isOpen itemIds={triageItemIds} onClose={() => setTriageItemIds(null)} />
      )}
      {jiraCreateItem && (
        <JiraCreateModal
          isOpen
          polarionId={jiraCreateItem.polarion_id}
          testItemId={jiraCreateItem.rp_id}
          testName={jiraCreateItem.name}
          onClose={() => setJiraCreateItem(null)}
        />
      )}
      {jiraLinkItemId && (
        <JiraLinkModal isOpen testItemId={jiraLinkItemId} onClose={() => setJiraLinkItemId(null)} />
      )}
    </>
  );
};
