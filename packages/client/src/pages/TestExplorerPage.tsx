import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { TreeNode } from '@cnv-monitor/shared';

import {
  Alert,
  Button,
  Content,
  Divider,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Label,
  PageSection,
  Spinner,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import {
  CogIcon,
  LightbulbIcon,
  RepositoryIcon,
  SearchIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';
import { useMutation, useQuery } from '@tanstack/react-query';

import {
  fetchDraftCount,
  fetchDraftPaths,
  fetchExplorerStats,
  fetchTree,
  syncAllRepos,
  syncRepo,
} from '../api/testExplorer';
import { StatCard } from '../components/common/StatCard';
import { TimeAgo } from '../components/common/TimeAgo';
import { AIInsightsDrawer } from '../components/test-explorer/AIInsightsDrawer';
import { EditActivitySection } from '../components/test-explorer/EditActivitySection';
import { FileDetail } from '../components/test-explorer/FileDetail';
import { FileTree } from '../components/test-explorer/FileTree';
import { QuarantineDashboard } from '../components/test-explorer/QuarantineDashboard';
import { CreateQuarantineModal } from '../components/test-explorer/QuarantineModal';
import { SubmitDraftsModal } from '../components/test-explorer/SubmitDraftsModal';
import { SyncProgressBanner } from '../components/test-explorer/SyncProgressBanner';
import type { ContextMenuAction } from '../components/test-explorer/TreeContextMenu';
import { useComponentFilter } from '../context/ComponentFilterContext';
import { usePreferences } from '../context/PreferencesContext';

const STATUS_SUCCESS = 'var(--pf-t--global--color--status--success--default)';
const STATUS_DANGER = 'var(--pf-t--global--color--status--danger--default)';
const STATUS_WARNING = 'var(--pf-t--global--color--status--warning--default)';
const STATUS_INFO = 'var(--pf-t--global--color--status--info--default)';

export const TestExplorerPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Test Explorer | CNV Console Monitor';
  }, []);

  const navigate = useNavigate();
  const { selectedComponent: activeComponent } = useComponentFilter();
  const { preferences, setPreference } = usePreferences();
  const prevSidebarState = useRef<boolean | undefined>(undefined);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [highlightInfo, setHighlightInfo] = useState<{ lines: number[]; scrollTo: number } | null>(
    null,
  );
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [quarantineTarget, setQuarantineTarget] = useState<TreeNode | null>(null);
  const [quarantineOpen, setQuarantineOpen] = useState(false);
  const [submitDraftsOpen, setSubmitDraftsOpen] = useState(false);

  const { data: draftPaths } = useQuery({
    queryFn: fetchDraftPaths,
    queryKey: ['draftPaths'],
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const { data: draftCount } = useQuery({
    queryFn: fetchDraftCount,
    queryKey: ['draftCount'],
    refetchInterval: 30_000,
    staleTime: 10_000,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount/unmount only: restores sidebar state on leave
  }, []);

  const {
    data: tree,
    dataUpdatedAt,
    isLoading,
    refetch,
  } = useQuery({
    queryFn: () => fetchTree(activeComponent || undefined),
    queryKey: ['testExplorerTree', activeComponent],
    staleTime: 60_000,
  });

  const { data: stats } = useQuery({
    queryFn: () => fetchExplorerStats(activeComponent || undefined),
    queryKey: ['testExplorerStats', activeComponent],
    staleTime: 60_000,
  });

  const [syncErrors, setSyncErrors] = useState<string[]>([]);

  const syncMutation = useMutation({
    mutationFn: () => syncAllRepos(),
    onSuccess: data => {
      const result = data;
      const errors = (result.errors as string[]) || [];
      setSyncErrors(errors);
      setTimeout(() => refetch(), 5000);
    },
  });

  const handleQuarantine = useCallback((node: TreeNode) => {
    setQuarantineTarget(node);
    setQuarantineOpen(true);
  }, []);

  const [, setEditTrigger] = useState(0);

  const findNodeInTree = useCallback((nodes: TreeNode[], target: string): TreeNode | undefined => {
    for (const n of nodes) {
      if (n.path === target) {
        return n;
      }
      if (n.children) {
        const found = findNodeInTree(n.children, target);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }, []);

  const contextActions: ContextMenuAction = useMemo(
    () => ({
      onAiAnalyze: node => {
        setSelectedNode(node);
        setHighlightInfo(null);
      },
      onEdit: node => {
        setSelectedNode(node);
        setHighlightInfo(null);
        setEditTrigger(prev => prev + 1);
      },
      onFilterComponent: component => {
        const params = new URLSearchParams(window.location.search);
        params.set('components', component);
        window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
        window.location.reload();
      },
      onQuarantine: handleQuarantine,
      onSyncRepo: repoId => {
        void syncRepo(repoId).then(() => refetch());
      },
      onViewCounterpart: path => {
        if (!tree) {
          return;
        }
        const target = findNodeInTree(tree, path);
        if (target) {
          setSelectedNode(target);
          setHighlightInfo(null);
        }
      },
    }),
    [tree, handleQuarantine, findNodeInTree, refetch],
  );

  const statsData = stats;
  const quarantineStats = statsData?.quarantine as Record<string, number> | undefined;

  const content = (
    <>
      <PageSection>
        <Flex
          alignItems={{ default: 'alignItemsCenter' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
        >
          <FlexItem>
            <Content component="h1">Test Explorer</Content>
            <Content className="app-text-muted" component="small">
              Documentation tree, test coverage gaps, and quarantine management
            </Content>
          </FlexItem>
          <FlexItem>
            <Toolbar>
              <ToolbarContent>
                <ToolbarGroup>
                  {dataUpdatedAt > 0 && (
                    <ToolbarItem>
                      <Label className="app-text-muted app-text-xs" variant="outline">
                        Last synced: <TimeAgo timestamp={dataUpdatedAt} />
                      </Label>
                    </ToolbarItem>
                  )}
                  <ToolbarItem>
                    <Button
                      icon={<SyncAltIcon />}
                      isDisabled={syncMutation.isPending}
                      isLoading={syncMutation.isPending}
                      variant="secondary"
                      onClick={() => syncMutation.mutate()}
                    >
                      {syncMutation.isPending ? 'Syncing...' : 'Sync Repos'}
                    </Button>
                  </ToolbarItem>
                  <ToolbarItem>
                    <Button
                      icon={<LightbulbIcon />}
                      variant={insightsOpen ? 'primary' : 'secondary'}
                      onClick={() => setInsightsOpen(!insightsOpen)}
                    >
                      AI Insights
                    </Button>
                  </ToolbarItem>
                  {(draftCount?.count ?? 0) > 0 && (
                    <ToolbarItem>
                      <Button variant="primary" onClick={() => setSubmitDraftsOpen(true)}>
                        Submit Changes{' '}
                        <Label isCompact className="app-ml-xs">
                          {draftCount?.count}
                        </Label>
                      </Button>
                    </ToolbarItem>
                  )}
                  <ToolbarItem>
                    <Button
                      icon={<CogIcon />}
                      variant="plain"
                      onClick={() => navigate('/settings')}
                    />
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
          <Alert isInline title="Sync failed" variant="danger">
            {syncMutation.isError
              ? syncMutation.error?.message || 'Unknown error'
              : syncErrors.join(' ')}
          </Alert>
        </PageSection>
      )}

      {statsData && (
        <PageSection>
          <Gallery hasGutter minWidths={{ default: '140px' }}>
            <GalleryItem>
              <StatCard
                color={STATUS_INFO}
                help="Number of registered and enabled repositories"
                label="Repositories"
                value={Number(statsData.repositories ?? 0)}
              />
            </GalleryItem>
            <GalleryItem>
              <StatCard
                help="Total markdown documentation files found across all repos"
                label="Doc Files"
                value={Number(statsData.docs ?? 0)}
              />
            </GalleryItem>
            <GalleryItem>
              <StatCard
                help="Total test files found across all repos"
                label="Test Files"
                value={Number(statsData.tests ?? 0)}
              />
            </GalleryItem>
            <GalleryItem>
              <StatCard
                color={STATUS_SUCCESS}
                help="Doc-test file pairs that have been matched"
                label="Matched Pairs"
                value={Number(statsData.matched ?? 0)}
              />
            </GalleryItem>
            <GalleryItem>
              <StatCard
                color={
                  Number(statsData.docCoverage ?? 0) >= 80
                    ? STATUS_SUCCESS
                    : Number(statsData.docCoverage ?? 0) >= 50
                      ? STATUS_WARNING
                      : STATUS_DANGER
                }
                help="Percentage of test files that have matching documentation"
                label="Coverage %"
                value={Number(statsData.docCoverage ?? 0)}
              />
            </GalleryItem>
            <GalleryItem>
              <StatCard
                color={(quarantineStats?.active ?? 0) > 0 ? STATUS_WARNING : STATUS_SUCCESS}
                help="Tests currently quarantined (active + overdue)"
                label="Quarantined"
                value={quarantineStats?.active ?? 0}
              />
            </GalleryItem>
          </Gallery>
        </PageSection>
      )}

      <Divider />

      {isLoading ? (
        <PageSection isFilled>
          <div className="app-page-spinner">
            <Spinner aria-label="Loading tree" />
          </div>
        </PageSection>
      ) : !tree || tree.length === 0 ? (
        <PageSection>
          <EmptyState icon={RepositoryIcon} variant="lg">
            <Content component="h2">No repositories configured</Content>
            <EmptyStateBody>
              Add a repository in Settings to start exploring test documentation, coverage gaps, and
              quarantine management.
            </EmptyStateBody>
            <Button icon={<CogIcon />} variant="primary" onClick={() => navigate('/settings')}>
              Go to Settings
            </Button>
          </EmptyState>
        </PageSection>
      ) : (
        <PageSection isFilled>
          <div className="app-explorer-layout">
            <div className="app-explorer-tree-panel">
              <FileTree
                contextActions={contextActions}
                draftPaths={draftPathSet}
                selectedPath={selectedNode?.path}
                tree={tree}
                onSelect={n => {
                  setSelectedNode(n);
                  setHighlightInfo(null);
                }}
              />
            </div>
            <div className="app-explorer-detail-panel">
              {selectedNode ? (
                <FileDetail
                  highlightInfo={highlightInfo}
                  node={selectedNode}
                  onNavigate={(path, highlight) => {
                    if (!tree) {
                      return;
                    }
                    const findNode = (nodes: TreeNode[], target: string): TreeNode | undefined => {
                      for (const n of nodes) {
                        if (n.path === target) {
                          return n;
                        }
                        if (n.children) {
                          const found = findNode(n.children, target);
                          if (found) {
                            return found;
                          }
                        }
                      }
                      return undefined;
                    };
                    const target = findNode(tree, path);
                    if (target) {
                      setSelectedNode(target);
                      setHighlightInfo(highlight || null);
                    }
                  }}
                  onQuarantine={handleQuarantine}
                />
              ) : (
                <div className="app-explorer-empty">
                  <EmptyState icon={SearchIcon} variant="sm">
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
          component={activeComponent || undefined}
          isOpen={quarantineOpen}
          repoId={quarantineTarget.repoId}
          testFilePath={quarantineTarget.path}
          testName={quarantineTarget.name}
          onClose={() => {
            setQuarantineOpen(false);
            setQuarantineTarget(null);
          }}
        />
      )}

      <SubmitDraftsModal isOpen={submitDraftsOpen} onClose={() => setSubmitDraftsOpen(false)} />
    </>
  );

  return (
    <AIInsightsDrawer
      component={activeComponent || undefined}
      isOpen={insightsOpen}
      onClose={() => setInsightsOpen(false)}
    >
      {content}
    </AIInsightsDrawer>
  );
};
