import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarGroup,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Card,
  CardBody,
  Gallery,
  GalleryItem,
  Flex,
  FlexItem,
  Label,
  Alert,
  Divider,
} from '@patternfly/react-core';
import {
  SyncAltIcon,
  LightbulbIcon,
  RepositoryIcon,
  OutlinedFileAltIcon,
  CodeIcon,
  LinkIcon,
  ShieldAltIcon,
  SearchIcon,
  CogIcon,
} from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import type { TreeNode } from '@cnv-monitor/shared';
import { fetchTree, fetchExplorerStats, syncAllRepos, syncRepo, fetchDraftPaths, fetchDraftCount } from '../api/testExplorer';
import type { ContextMenuAction } from '../components/test-explorer/TreeContextMenu';
import { useComponentFilter } from '../context/ComponentFilterContext';
import { usePreferences } from '../context/PreferencesContext';
import { FileTree } from '../components/test-explorer/FileTree';
import { FileDetail } from '../components/test-explorer/FileDetail';
import { QuarantineDashboard } from '../components/test-explorer/QuarantineDashboard';
import { CreateQuarantineModal } from '../components/test-explorer/QuarantineModal';
import { AIInsightsDrawer } from '../components/test-explorer/AIInsightsDrawer';
import { SubmitDraftsModal } from '../components/test-explorer/SubmitDraftsModal';
import { EditActivitySection } from '../components/test-explorer/EditActivitySection';
import { SyncProgressBanner } from '../components/test-explorer/SyncProgressBanner';
import { StatCard } from '../components/common/StatCard';
import { TimeAgo } from '../components/common/TimeAgo';

const STATUS_SUCCESS = 'var(--pf-t--global--color--status--success--default)';
const STATUS_DANGER = 'var(--pf-t--global--color--status--danger--default)';
const STATUS_WARNING = 'var(--pf-t--global--color--status--warning--default)';
const STATUS_INFO = 'var(--pf-t--global--color--status--info--default)';

export const TestExplorerPage: React.FC = () => {
  useEffect(() => { document.title = 'Test Explorer | CNV Console Monitor'; }, []);

  const navigate = useNavigate();
  const { selectedComponent: activeComponent } = useComponentFilter();
  const { preferences, setPreference } = usePreferences();
  const prevSidebarState = useRef<boolean | undefined>(undefined);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [highlightInfo, setHighlightInfo] = useState<{ lines: number[]; scrollTo: number } | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [quarantineTarget, setQuarantineTarget] = useState<TreeNode | null>(null);
  const [quarantineOpen, setQuarantineOpen] = useState(false);
  const [submitDraftsOpen, setSubmitDraftsOpen] = useState(false);

  const { data: draftPaths } = useQuery({
    queryKey: ['draftPaths'],
    queryFn: fetchDraftPaths,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const { data: draftCount } = useQuery({
    queryKey: ['draftCount'],
    queryFn: fetchDraftCount,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  const draftPathSet = useMemo(() => new Set(draftPaths || []), [draftPaths]);

  useEffect(() => {
    if (prevSidebarState.current === undefined) {
      prevSidebarState.current = preferences.sidebarCollapsed !== true;
    }
    setPreference('sidebarCollapsed', true);
    return () => {
      if (prevSidebarState.current !== undefined) {
        setPreference('sidebarCollapsed', !prevSidebarState.current);
      }
    };
  }, []);

  const { data: tree, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['testExplorerTree', activeComponent],
    queryFn: () => fetchTree(activeComponent || undefined),
    staleTime: 60_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['testExplorerStats', activeComponent],
    queryFn: () => fetchExplorerStats(activeComponent || undefined),
    staleTime: 60_000,
  });

  const [syncErrors, setSyncErrors] = useState<string[]>([]);

  const syncMutation = useMutation({
    mutationFn: () => syncAllRepos(),
    onSuccess: (data) => {
      const result = data as Record<string, unknown>;
      const errors = (result.errors as string[]) || [];
      setSyncErrors(errors);
      setTimeout(() => refetch(), 5000);
    },
  });

  const handleQuarantine = (node: TreeNode) => {
    setQuarantineTarget(node);
    setQuarantineOpen(true);
  };

  const [editTrigger, setEditTrigger] = useState(0);

  const findNodeInTree = useCallback((nodes: TreeNode[], target: string): TreeNode | undefined => {
    for (const n of nodes) {
      if (n.path === target) return n;
      if (n.children) { const found = findNodeInTree(n.children, target); if (found) return found; }
    }
    return undefined;
  }, []);

  const contextActions: ContextMenuAction = useMemo(() => ({
    onEdit: (node) => { setSelectedNode(node); setHighlightInfo(null); setEditTrigger(prev => prev + 1); },
    onQuarantine: handleQuarantine,
    onViewCounterpart: (path) => {
      if (!tree) return;
      const target = findNodeInTree(tree, path);
      if (target) { setSelectedNode(target); setHighlightInfo(null); }
    },
    onSyncRepo: (repoId) => { syncRepo(repoId).then(() => refetch()); },
    onFilterComponent: (component) => {
      const params = new URLSearchParams(window.location.search);
      params.set('components', component);
      window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
      window.location.reload();
    },
    onAiAnalyze: (node) => { setSelectedNode(node); setHighlightInfo(null); },
  }), [tree, handleQuarantine, findNodeInTree, refetch]);

  const statsData = stats as Record<string, unknown> | undefined;
  const quarantineStats = statsData?.quarantine as Record<string, number> | undefined;

  const content = (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">Test Explorer</Content>
            <Content component="small" className="app-text-muted">
              Documentation tree, test coverage gaps, and quarantine management
            </Content>
          </FlexItem>
          <FlexItem>
            <Toolbar>
              <ToolbarContent>
                <ToolbarGroup>
                  {dataUpdatedAt > 0 && (
                    <ToolbarItem>
                      <Label variant="outline" className="app-text-muted app-text-xs">
                        Last synced: <TimeAgo timestamp={dataUpdatedAt} />
                      </Label>
                    </ToolbarItem>
                  )}
                  <ToolbarItem>
                    <Button
                      variant="secondary"
                      icon={<SyncAltIcon />}
                      onClick={() => syncMutation.mutate()}
                      isLoading={syncMutation.isPending}
                      isDisabled={syncMutation.isPending}
                    >
                      {syncMutation.isPending ? 'Syncing...' : 'Sync Repos'}
                    </Button>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button
                      variant={insightsOpen ? 'primary' : 'secondary'}
                      icon={<LightbulbIcon />}
                      onClick={() => setInsightsOpen(!insightsOpen)}
                    >
                      AI Insights
                    </Button>
                  </ToolbarItem>
                  {(draftCount?.count ?? 0) > 0 && (
                    <ToolbarItem>
                      <Button variant="primary" onClick={() => setSubmitDraftsOpen(true)}>
                        Submit Changes <Label isCompact className="app-ml-xs">{draftCount?.count}</Label>
                      </Button>
                    </ToolbarItem>
                  )}
                  <ToolbarItem>
                    <Button variant="plain" icon={<CogIcon />} onClick={() => navigate('/settings')} />
                  </ToolbarItem>
                </ToolbarGroup>
              </ToolbarContent>
            </Toolbar>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <SyncProgressBanner />
      </PageSection>

      {(syncMutation.isError || syncErrors.length > 0) && (
        <PageSection>
          <Alert variant="danger" isInline title="Sync failed">
            {syncMutation.isError
              ? String((syncMutation.error as Error)?.message || 'Unknown error')
              : syncErrors.join(' ')}
          </Alert>
        </PageSection>
      )}

      {statsData && (
        <PageSection>
          <Gallery hasGutter minWidths={{ default: '140px' }}>
            <GalleryItem>
              <StatCard
                value={Number(statsData.repositories ?? 0)}
                label="Repositories"
                color={STATUS_INFO}
                help="Number of registered and enabled repositories"
              />
            </GalleryItem>
            <GalleryItem>
              <StatCard
                value={Number(statsData.docs ?? 0)}
                label="Doc Files"
                help="Total markdown documentation files found across all repos"
              />
            </GalleryItem>
            <GalleryItem>
              <StatCard
                value={Number(statsData.tests ?? 0)}
                label="Test Files"
                help="Total test files found across all repos"
              />
            </GalleryItem>
            <GalleryItem>
              <StatCard
                value={Number(statsData.matched ?? 0)}
                label="Matched Pairs"
                color={STATUS_SUCCESS}
                help="Doc-test file pairs that have been matched"
              />
            </GalleryItem>
            <GalleryItem>
              <StatCard
                value={Number(statsData.docCoverage ?? 0)}
                label="Coverage %"
                color={
                  Number(statsData.docCoverage ?? 0) >= 80 ? STATUS_SUCCESS
                    : Number(statsData.docCoverage ?? 0) >= 50 ? STATUS_WARNING
                    : STATUS_DANGER
                }
                help="Percentage of test files that have matching documentation"
              />
            </GalleryItem>
            <GalleryItem>
              <StatCard
                value={quarantineStats?.active ?? 0}
                label="Quarantined"
                color={(quarantineStats?.active ?? 0) > 0 ? STATUS_WARNING : STATUS_SUCCESS}
                help="Tests currently quarantined (active + overdue)"
              />
            </GalleryItem>
          </Gallery>
        </PageSection>
      )}

      <Divider />

      {isLoading ? (
        <PageSection isFilled>
          <div className="app-page-spinner"><Spinner aria-label="Loading tree" /></div>
        </PageSection>
      ) : !tree || tree.length === 0 ? (
        <PageSection>
          <EmptyState variant="lg" icon={RepositoryIcon}>
            <Content component="h2">No repositories configured</Content>
            <EmptyStateBody>
              Add a repository in Settings to start exploring test documentation, coverage gaps, and quarantine management.
            </EmptyStateBody>
            <Button variant="primary" icon={<CogIcon />} onClick={() => navigate('/settings')}>
              Go to Settings
            </Button>
          </EmptyState>
        </PageSection>
      ) : (
        <PageSection isFilled>
          <div className="app-explorer-layout">
            <div className="app-explorer-tree-panel">
              <FileTree tree={tree} onSelect={(n) => { setSelectedNode(n); setHighlightInfo(null); }} selectedPath={selectedNode?.path} draftPaths={draftPathSet} contextActions={contextActions} />
            </div>
            <div className="app-explorer-detail-panel">
              {selectedNode ? (
                <FileDetail node={selectedNode} onQuarantine={handleQuarantine} highlightInfo={highlightInfo} onNavigate={(path, highlight) => {
                  if (!tree) return;
                  const findNode = (nodes: TreeNode[], target: string): TreeNode | undefined => {
                    for (const n of nodes) {
                      if (n.path === target) return n;
                      if (n.children) { const found = findNode(n.children, target); if (found) return found; }
                    }
                    return undefined;
                  };
                  const target = findNode(tree, path);
                  if (target) {
                    setSelectedNode(target);
                    setHighlightInfo(highlight || null);
                  }
                }} />
              ) : (
                <div className="app-explorer-empty">
                  <EmptyState variant="sm" icon={SearchIcon}>
                    <Content component="h4">Select a file</Content>
                    <EmptyStateBody>
                      Click a file in the tree to view its details, metadata, and content.
                    </EmptyStateBody>
                  </EmptyState>
                </div>
              )}
            </div>
          </div>
        </PageSection>
      )}

      <PageSection>
        <QuarantineDashboard />
      </PageSection>

      <PageSection>
        <EditActivitySection />
      </PageSection>

      {quarantineTarget && (
        <CreateQuarantineModal
          isOpen={quarantineOpen}
          onClose={() => { setQuarantineOpen(false); setQuarantineTarget(null); }}
          testName={quarantineTarget.name}
          testFilePath={quarantineTarget.path}
          repoId={quarantineTarget.repoId}
          component={activeComponent || undefined}
        />
      )}

      <SubmitDraftsModal isOpen={submitDraftsOpen} onClose={() => setSubmitDraftsOpen(false)} />
    </>
  );

  return (
    <AIInsightsDrawer isOpen={insightsOpen} onClose={() => setInsightsOpen(false)} component={activeComponent || undefined}>
      {content}
    </AIInsightsDrawer>
  );
};
