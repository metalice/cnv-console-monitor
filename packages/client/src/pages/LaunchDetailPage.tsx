import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Button,
  Breadcrumb,
  BreadcrumbItem,
  Flex,
  FlexItem,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { SearchIcon, WrenchIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import type { TestItem, PublicConfig } from '@cnv-monitor/shared';
import { apiFetch } from '../api/client';
import { fetchTestItems, fetchTestItemsForLaunches } from '../api/testItems';
import { triggerAutoAnalysis, triggerPatternAnalysis, triggerUniqueErrorAnalysis } from '../api/analysis';
import { aggregateTestItems } from '../utils/aggregation';
import { TestItemsTable } from '../components/detail/TestItemsTable';
import { ArtifactsPanel } from '../components/detail/ArtifactsPanel';
import { TriageModal } from '../components/modals/TriageModal';
import { JiraCreateModal } from '../components/modals/JiraCreateModal';
import { JiraLinkModal } from '../components/modals/JiraLinkModal';

export const LaunchDetailPage: React.FC = () => {
  const { launchId } = useParams<{ launchId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const launchRpId = parseInt(launchId || '0');
  const launchIdsParam = searchParams.get('launches');
  const groupVersion = searchParams.get('version');
  const groupTier = searchParams.get('tier');

  const launchIds = useMemo(() => {
    if (!launchIdsParam) return [launchRpId];
    return launchIdsParam.split(',').map(segment => parseInt(segment.trim())).filter(parsed => !isNaN(parsed));
  }, [launchIdsParam, launchRpId]);

  const isGroupMode = launchIds.length > 1;
  const title = isGroupMode ? `${groupVersion ?? 'Unknown'} ${groupTier ?? ''} — ${launchIds.length} launches` : `Launch #${launchRpId}`;

  const [triageItemIds, setTriageItemIds] = useState<number[] | null>(null);
  const [jiraCreateItem, setJiraCreateItem] = useState<TestItem | null>(null);
  const [jiraLinkItemId, setJiraLinkItemId] = useState<number | null>(null);

  useEffect(() => { document.title = `${title} | CNV Console Monitor`; }, [title]);

  const { data: config } = useQuery({ queryKey: ['config'], queryFn: () => apiFetch<PublicConfig>('/config'), staleTime: Infinity });
  const { data: items, isLoading } = useQuery({
    queryKey: isGroupMode ? ['testItems', 'group', ...launchIds] : ['testItems', launchRpId],
    queryFn: () => isGroupMode ? fetchTestItemsForLaunches(launchIds) : fetchTestItems(launchRpId),
    enabled: launchIds.length > 0,
  });

  const autoAnalysis = useMutation({ mutationFn: () => triggerAutoAnalysis(launchRpId) });
  const patternAnalysis = useMutation({ mutationFn: () => triggerPatternAnalysis(launchRpId) });
  const uniqueAnalysis = useMutation({ mutationFn: () => triggerUniqueErrorAnalysis(launchRpId) });

  const failedItems = useMemo(() => items?.filter((item) => item.status === 'FAILED') ?? [], [items]);
  const passedItems = useMemo(() => items?.filter((item) => item.status === 'PASSED') ?? [], [items]);
  const skippedItems = useMemo(() => items?.filter((item) => item.status === 'SKIPPED') ?? [], [items]);

  const displayItems = useMemo(() => {
    if (isGroupMode) return aggregateTestItems(failedItems);
    return failedItems.map(item => ({ representative: item, allRpIds: [item.rp_id], occurrences: 1 }));
  }, [isGroupMode, failedItems]);

  return (
    <>
      <PageSection>
        <Breadcrumb className="app-breadcrumb">
          <BreadcrumbItem onClick={() => navigate('/')} className="app-cursor-pointer">Dashboard</BreadcrumbItem>
          <BreadcrumbItem isActive>{title}</BreadcrumbItem>
        </Breadcrumb>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">
              {title}
              {!isGroupMode && config && (
                <a href={`${config.rpLaunchBaseUrl}/${launchRpId}`} target="_blank" rel="noreferrer" aria-label="Open in ReportPortal" className="app-rp-link">
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
                  <ToolbarItem><Button variant="secondary" icon={<SearchIcon />} onClick={() => autoAnalysis.mutate()} isLoading={autoAnalysis.isPending}>Auto-Analysis</Button></ToolbarItem>
                  <ToolbarItem><Button variant="secondary" icon={<WrenchIcon />} onClick={() => patternAnalysis.mutate()} isLoading={patternAnalysis.isPending}>Pattern Analysis</Button></ToolbarItem>
                  <ToolbarItem><Button variant="secondary" onClick={() => uniqueAnalysis.mutate()} isLoading={uniqueAnalysis.isPending}>Unique Error</Button></ToolbarItem>
                </ToolbarContent>
              </Toolbar>
            </FlexItem>
          )}
        </Flex>
      </PageSection>

      {isLoading ? (
        <PageSection isFilled><div className="app-page-spinner"><Spinner aria-label="Loading test items" /></div></PageSection>
      ) : (
        <PageSection>
          <Card>
            <CardBody>
              <TestItemsTable displayItems={displayItems} isGroupMode={isGroupMode} launchCount={launchIds.length} config={config} onNavigate={navigate} onTriage={setTriageItemIds} onCreateJira={setJiraCreateItem} onLinkJira={setJiraLinkItemId} />
            </CardBody>
          </Card>
        </PageSection>
      )}

      {!isGroupMode && <PageSection><ArtifactsPanel launchId={launchRpId} /></PageSection>}

      {triageItemIds && <TriageModal isOpen onClose={() => setTriageItemIds(null)} itemIds={triageItemIds} />}
      {jiraCreateItem && <JiraCreateModal isOpen onClose={() => setJiraCreateItem(null)} testItemId={jiraCreateItem.rp_id} testName={jiraCreateItem.name} polarionId={jiraCreateItem.polarion_id} />}
      {jiraLinkItemId && <JiraLinkModal isOpen onClose={() => setJiraLinkItemId(null)} testItemId={jiraLinkItemId} />}
    </>
  );
};
