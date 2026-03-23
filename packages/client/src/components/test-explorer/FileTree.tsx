import React, { useState, useMemo, useCallback } from 'react';
import {
  TreeView,
  TreeViewDataItem,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Badge,
  Content,
  ToggleGroup,
  ToggleGroupItem,
  Label,
} from '@patternfly/react-core';
import {
  FolderIcon,
  FileIcon,
  CodeIcon,
  OutlinedFileAltIcon,
  CubesIcon,
  RepositoryIcon,
  BanIcon,
} from '@patternfly/react-icons';
import type { TreeNode } from '@cnv-monitor/shared';
import { GapBadge } from './GapBadge';
import { TreeContextMenu, type ContextMenuAction } from './TreeContextMenu';

interface FileTreeProps {
  tree: TreeNode[];
  onSelect: (node: TreeNode) => void;
  selectedPath?: string;
  draftPaths?: Set<string>;
  contextActions?: ContextMenuAction;
}

const nodeToTreeItem = (node: TreeNode, selectedPath?: string, draftPaths?: Set<string>): TreeViewDataItem => {
  const isSelected = (node.path || node.name) === selectedPath;
  const icon = node.type === 'component' ? <CubesIcon />
    : node.type === 'repo' ? <RepositoryIcon />
    : node.type === 'folder' ? <FolderIcon />
    : node.type === 'doc' ? <OutlinedFileAltIcon />
    : node.type === 'test' ? <CodeIcon />
    : <FileIcon />;

  const badges: React.ReactNode[] = [];
  if (node.type === 'doc' || node.type === 'test') {
    badges.push(<GapBadge key="gap" hasCounterpart={node.hasCounterpart} type={node.type} />);
  }
  if (node.quarantine) {
    badges.push(<Badge key="q" screenReaderText="Quarantined"><BanIcon className="app-text-warning" /> Q</Badge>);
  }
  if (draftPaths && node.path && draftPaths.has(node.path)) {
    badges.push(<Badge key="draft" screenReaderText="Has draft">✎</Badge>);
  }
  if (node.type === 'folder' && node.fileCount !== undefined) {
    badges.push(<Badge key="count" isRead>{node.fileCount}</Badge>);
  }

  return {
    id: node.path || node.name,
    name: (
      <span className={`app-tree-node${isSelected ? ' app-tree-node--selected' : ''}`} data-node-id={node.path || node.name}>
        <span className="app-tree-node-name">{node.name}</span>
        {badges.length > 0 && <span className="app-tree-badges">{badges}</span>}
      </span>
    ),
    icon,
    children: node.children?.map(child => nodeToTreeItem(child, selectedPath, draftPaths)),
    defaultExpanded: node.type === 'component' || node.type === 'repo',
  };
};

function hasDocDescendant(node: TreeNode): boolean {
  if (node.type === 'doc') return true;
  if (node.children) return node.children.some(hasDocDescendant);
  return false;
}

function isUndocumentedTest(node: TreeNode): boolean {
  if (node.type === 'test' && !node.hasCounterpart) return true;
  if (node.children) return node.children.some(isUndocumentedTest);
  return false;
}

function filterTreeByPredicate(nodes: TreeNode[], predicate: (node: TreeNode) => boolean): TreeNode[] {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    if (node.type === 'doc' || node.type === 'test') {
      if (predicate(node)) result.push(node);
    } else if (node.children) {
      const filtered = filterTreeByPredicate(node.children, predicate);
      if (filtered.length > 0) {
        result.push({ ...node, children: filtered, fileCount: countFiles(filtered), gapCount: countGaps(filtered) });
      }
    } else {
      result.push(node);
    }
  }
  return result;
}

function countFiles(nodes: TreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === 'doc' || node.type === 'test') count++;
    if (node.children) count += countFiles(node.children);
  }
  return count;
}

function countGaps(nodes: TreeNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if ((node.type === 'doc' || node.type === 'test') && !node.hasCounterpart) count++;
    if (node.children) count += countGaps(node.children);
  }
  return count;
}

function countByType(nodes: TreeNode[], type: string): number {
  let count = 0;
  for (const node of nodes) {
    if (node.type === type) count++;
    if (node.children) count += countByType(node.children, type);
  }
  return count;
}

export const FileTree: React.FC<FileTreeProps> = ({ tree, onSelect, selectedPath, draftPaths, contextActions }) => {
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<'documented' | 'undocumented'>('documented');
  const [contextMenu, setContextMenu] = useState<{ node: TreeNode; x: number; y: number } | null>(null);

  const documentedTree = useMemo(
    () => filterTreeByPredicate(tree, (node) => node.type === 'doc' || (node.type === 'test' && !!node.hasCounterpart)),
    [tree],
  );

  const undocumentedTree = useMemo(
    () => filterTreeByPredicate(tree, (node) => node.type === 'test' && !node.hasCounterpart),
    [tree],
  );

  const docCount = useMemo(() => countByType(tree, 'doc'), [tree]);
  const undocumentedCount = useMemo(() => countFiles(undocumentedTree), [undocumentedTree]);

  const activeTree = view === 'documented' ? documentedTree : undocumentedTree;

  const filteredTree = useMemo(() => {
    if (!filter) return activeTree;
    const lower = filter.toLowerCase();
    const filterNode = (node: TreeNode): TreeNode | null => {
      if (node.name.toLowerCase().includes(lower) || node.path?.toLowerCase().includes(lower)) return node;
      if (node.children) {
        const filtered = node.children.map(filterNode).filter(Boolean) as TreeNode[];
        if (filtered.length > 0) return { ...node, children: filtered };
      }
      return null;
    };
    return activeTree.map(filterNode).filter(Boolean) as TreeNode[];
  }, [activeTree, filter]);

  const treeItems = useMemo(
    () => filteredTree.map(node => nodeToTreeItem(node, selectedPath, draftPaths)),
    [filteredTree, selectedPath, draftPaths],
  );

  const totalFiles = useMemo(() => countFiles(activeTree), [activeTree]);
  const filteredFiles = useMemo(() => filter ? countFiles(filteredTree) : totalFiles, [filter, filteredTree, totalFiles]);

  const handleSelect = useCallback((_event: React.MouseEvent, item: TreeViewDataItem) => {
    const findNode = (nodes: TreeNode[], id: string): TreeNode | undefined => {
      for (const node of nodes) {
        if ((node.path || node.name) === id) return node;
        if (node.children) { const found = findNode(node.children, id); if (found) return found; }
      }
      return undefined;
    };
    const node = findNode(tree, item.id as string);
    if (node) onSelect(node);
  }, [tree, onSelect]);

  return (
    <div className="app-file-tree">
      <div className="app-file-tree-tabs">
        <ToggleGroup>
          <ToggleGroupItem
            text={<>Documented <Label isCompact className="app-ml-xs">{docCount}</Label></>}
            isSelected={view === 'documented'}
            onChange={() => setView('documented')}
          />
          <ToggleGroupItem
            text={<>Undocumented <Label isCompact color={undocumentedCount > 0 ? 'orange' : 'grey'} className="app-ml-xs">{undocumentedCount}</Label></>}
            isSelected={view === 'undocumented'}
            onChange={() => setView('undocumented')}
          />
        </ToggleGroup>
      </div>
      <Toolbar className="app-file-tree-toolbar">
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder={view === 'documented' ? 'Filter docs & tests...' : 'Filter undocumented tests...'}
              value={filter}
              onChange={(_e, val) => setFilter(val)}
              onClear={() => setFilter('')}
              resultsCount={filter ? `${filteredFiles} / ${totalFiles}` : undefined}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <div
        className="app-file-tree-content"
        onContextMenu={(e) => {
          const target = e.target as HTMLElement;
          const nodeEl = target.closest('[data-node-id]');
          if (!nodeEl) return;
          e.preventDefault();
          const nodeId = nodeEl.getAttribute('data-node-id');
          if (!nodeId) return;
          const findById = (nodes: TreeNode[], id: string): TreeNode | undefined => {
            for (const n of nodes) {
              if ((n.path || n.name) === id) return n;
              if (n.children) { const found = findById(n.children, id); if (found) return found; }
            }
            return undefined;
          };
          const found = findById(tree, nodeId);
          if (found) setContextMenu({ node: found, x: e.clientX, y: e.clientY });
        }}
      >
        {treeItems.length > 0 ? (
          <TreeView data={treeItems} onSelect={handleSelect} hasGuides />
        ) : (
          <Content component="p" className="app-text-muted app-p-lg app-text-center">
            {filter ? 'No files match your filter.'
              : view === 'documented' ? 'No documented tests found.'
              : 'All tests are documented!'}
          </Content>
        )}
      </div>

      {contextMenu && contextActions && (
        <TreeContextMenu
          node={contextMenu.node}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          actions={contextActions}
        />
      )}
    </div>
  );
};
