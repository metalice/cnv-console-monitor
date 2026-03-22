import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Split,
  SplitItem,
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Spinner,
  EmptyState,
  EmptyStateBody,
  ExpandableSection,
} from '@patternfly/react-core';
import { SyncAltIcon, LightbulbIcon } from '@patternfly/react-icons';
import type { TreeNode } from '@cnv-monitor/shared';
import { fetchTree, syncAllRepos } from '../api/testExplorer';
import { useComponentFilter } from '../context/ComponentFilterContext';
import { FileTree } from '../components/test-explorer/FileTree';
import { FileDetail } from '../components/test-explorer/FileDetail';
import { QuarantineDashboard } from '../components/test-explorer/QuarantineDashboard';
import { CreateQuarantineModal } from '../components/test-explorer/QuarantineModal';
import { AIInsightsDrawer } from '../components/test-explorer/AIInsightsDrawer';

export const TestExplorerPage: React.FC = () => {
  useEffect(() => { document.title = 'Test Explorer | CNV Console Monitor'; }, []);

  const { selectedComponent: activeComponent } = useComponentFilter();
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [quarantineTarget, setQuarantineTarget] = useState<TreeNode | null>(null);
  const [quarantineOpen, setQuarantineOpen] = useState(false);

  const { data: tree, isLoading, refetch } = useQuery({
    queryKey: ['testExplorerTree', activeComponent],
    queryFn: () => fetchTree(activeComponent || undefined),
    staleTime: 60_000,
  });

  const handleQuarantine = (node: TreeNode) => {
    setQuarantineTarget(node);
    setQuarantineOpen(true);
  };

  const content = (
    <>
      <PageSection>
        <Content component="h1">Test Explorer</Content>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Button variant="secondary" icon={<SyncAltIcon />} onClick={() => { syncAllRepos(); refetch(); }}>Sync Repos</Button>
            </ToolbarItem>
            <ToolbarItem>
              <Button variant="secondary" icon={<LightbulbIcon />} onClick={() => setInsightsOpen(!insightsOpen)}>
                AI Insights
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </PageSection>

      {isLoading ? (
        <PageSection isFilled><div className="app-page-spinner"><Spinner aria-label="Loading tree" /></div></PageSection>
      ) : !tree || tree.length === 0 ? (
        <PageSection>
          <EmptyState variant="lg">
            <EmptyStateBody>
              No repositories configured. Go to Settings &gt; Repository Mapping to add repositories.
            </EmptyStateBody>
          </EmptyState>
        </PageSection>
      ) : (
        <PageSection isFilled>
          <Split hasGutter>
            <SplitItem style={{ width: '40%', minWidth: 300, maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
              <FileTree
                tree={tree}
                onSelect={setSelectedNode}
                selectedPath={selectedNode?.path}
              />
            </SplitItem>
            <SplitItem isFilled style={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
              {selectedNode ? (
                <FileDetail node={selectedNode} onQuarantine={handleQuarantine} />
              ) : (
                <EmptyState variant="sm">
                  <EmptyStateBody>Select a file from the tree to view details.</EmptyStateBody>
                </EmptyState>
              )}
            </SplitItem>
          </Split>
        </PageSection>
      )}

      <PageSection>
        <ExpandableSection toggleText="Quarantine Dashboard" isExpanded>
          <QuarantineDashboard />
        </ExpandableSection>
      </PageSection>

      {quarantineTarget && (
        <CreateQuarantineModal
          isOpen={quarantineOpen}
          onClose={() => { setQuarantineOpen(false); setQuarantineTarget(null); }}
          testName={quarantineTarget.path || quarantineTarget.name}
          testFilePath={quarantineTarget.path}
          repoId={quarantineTarget.repoId}
          component={undefined}
        />
      )}
    </>
  );

  return (
    <AIInsightsDrawer
      isOpen={insightsOpen}
      onClose={() => setInsightsOpen(false)}
      component={activeComponent || undefined}
    >
      {content}
    </AIInsightsDrawer>
  );
};
