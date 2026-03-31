import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { TreeNode } from '@cnv-monitor/shared';

import {
  Badge,
  Button,
  Checkbox,
  Content,
  Label,
  SearchInput,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  TreeView,
  type TreeViewDataItem,
} from '@patternfly/react-core';
import {
  BanIcon,
  CodeIcon,
  CubesIcon,
  FileIcon,
  FolderIcon,
  OutlinedFileAltIcon,
  RepositoryIcon,
} from '@patternfly/react-icons';

import { GapBadge } from './GapBadge';
import { type ContextMenuAction, TreeContextMenu } from './TreeContextMenu';

type GenerateDocsTarget = { repoId: string; filePath: string; branch: string };

type FileTreeProps = {
  tree: TreeNode[];
  onSelect: (node: TreeNode) => void;
  selectedPath?: string;
  draftPaths?: Set<string>;
  contextActions?: ContextMenuAction;
  onGenerateDocs?: (tests: GenerateDocsTarget[]) => void;
};

type CheckboxState = {
  selected: Set<string>;
  toggle: (path: string) => void;
};

const collectTestInfo = (nodes: TreeNode[], selectedPaths: Set<string>): GenerateDocsTarget[] => {
  const result: GenerateDocsTarget[] = [];
  const walk = (node: TreeNode) => {
    if (node.type === 'test' && node.path && selectedPaths.has(node.path)) {
      result.push({
        branch: node.branch ?? 'main',
        filePath: node.path,
        repoId: node.repoId ?? '',
      });
    }
    node.children?.forEach(walk);
  };
  nodes.forEach(walk);
  return result;
};

const MAX_GENERATE_SELECTION = 20;

const nodeToTreeItem = (
  node: TreeNode,
  selectedPath?: string,
  draftPaths?: Set<string>,
  checkboxes?: CheckboxState,
): TreeViewDataItem => {
  const isSelected = (node.path || node.name) === selectedPath;
  const icon =
    node.type === 'component' ? (
      <CubesIcon />
    ) : node.type === 'repo' ? (
      <RepositoryIcon />
    ) : node.type === 'folder' ? (
      <FolderIcon />
    ) : node.type === 'doc' ? (
      <OutlinedFileAltIcon />
    ) : node.type === 'test' ? (
      <CodeIcon />
    ) : (
      <FileIcon />
    );

  const badges: React.ReactNode[] = [];
  if (node.type === 'doc' || node.type === 'test') {
    badges.push(<GapBadge hasCounterpart={node.hasCounterpart} key="gap" type={node.type} />);
  }
  if (node.quarantine) {
    badges.push(
      <Badge key="q" screenReaderText="Quarantined">
        <BanIcon className="app-text-warning" /> Q
      </Badge>,
    );
  }
  if (draftPaths && node.path && draftPaths.has(node.path)) {
    badges.push(
      <Badge key="draft" screenReaderText="Has draft">
        ✎
      </Badge>,
    );
  }
  if (node.type === 'folder' && node.fileCount !== undefined) {
    badges.push(
      <Badge isRead key="count">
        {node.fileCount}
      </Badge>,
    );
  }

  const nodeId = node.path || node.name;
  const showCheckbox = checkboxes && node.type === 'test' && node.path;

  return {
    children: node.children?.map(child =>
      nodeToTreeItem(child, selectedPath, draftPaths, checkboxes),
    ),
    defaultExpanded: node.type === 'component' || node.type === 'repo',
    icon,
    id: nodeId,
    name: (
      <span
        className={`app-tree-node${isSelected ? ' app-tree-node--selected' : ''}`}
        data-node-id={nodeId}
      >
        {showCheckbox && (
          <Checkbox
            className="app-tree-checkbox"
            id={`gen-cb-${nodeId}`}
            isChecked={checkboxes.selected.has(node.path ?? '')}
            onChange={() => checkboxes.toggle(node.path ?? '')}
            onClick={evt => evt.stopPropagation()}
          />
        )}
        <span className="app-tree-node-name">{node.name}</span>
        {badges.length > 0 && <span className="app-tree-badges">{badges}</span>}
      </span>
    ),
  };
};

const filterTreeByPredicate = (
  nodes: TreeNode[],
  predicate: (node: TreeNode) => boolean,
): TreeNode[] => {
  const result: TreeNode[] = [];
  for (const node of nodes) {
    if (node.type === 'doc' || node.type === 'test') {
      if (predicate(node)) {
        result.push(node);
      }
    } else if (node.children) {
      const filtered = filterTreeByPredicate(node.children, predicate);
      if (filtered.length > 0) {
        result.push({
          ...node,
          children: filtered,
          fileCount: countFiles(filtered),
          gapCount: countGaps(filtered),
        });
      }
    } else {
      result.push(node);
    }
  }
  return result;
};

const countFiles = (nodes: TreeNode[]): number => {
  let count = 0;
  for (const node of nodes) {
    if (node.type === 'doc' || node.type === 'test') {
      count++;
    }
    if (node.children) {
      count += countFiles(node.children);
    }
  }
  return count;
};

const countGaps = (nodes: TreeNode[]): number => {
  let count = 0;
  for (const node of nodes) {
    if ((node.type === 'doc' || node.type === 'test') && !node.hasCounterpart) {
      count++;
    }
    if (node.children) {
      count += countGaps(node.children);
    }
  }
  return count;
};

const countByType = (nodes: TreeNode[], type: string): number => {
  let count = 0;
  for (const node of nodes) {
    if (node.type === type) {
      count++;
    }
    if (node.children) {
      count += countByType(node.children, type);
    }
  }
  return count;
};

export const FileTree: React.FC<FileTreeProps> = ({
  contextActions,
  draftPaths,
  onGenerateDocs,
  onSelect,
  selectedPath,
  tree,
}) => {
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<'documented' | 'undocumented'>('documented');
  const [contextMenu, setContextMenu] = useState<{ node: TreeNode; x: number; y: number } | null>(
    null,
  );
  const [selected, setSelected] = useState(new Set<string>());

  useEffect(() => {
    setSelected(new Set<string>());
  }, [view]);

  const documentedTree = useMemo(
    () =>
      filterTreeByPredicate(
        tree,
        node => node.type === 'doc' || (node.type === 'test' && Boolean(node.hasCounterpart)),
      ),
    [tree],
  );

  const undocumentedTree = useMemo(
    () => filterTreeByPredicate(tree, node => node.type === 'test' && !node.hasCounterpart),
    [tree],
  );

  const docCount = useMemo(() => countByType(tree, 'doc'), [tree]);
  const undocumentedCount = useMemo(() => countFiles(undocumentedTree), [undocumentedTree]);

  const activeTree = view === 'documented' ? documentedTree : undocumentedTree;

  const filteredTree = useMemo(() => {
    if (!filter) {
      return activeTree;
    }
    const lower = filter.toLowerCase();
    const filterNode = (node: TreeNode): TreeNode | null => {
      if (node.name.toLowerCase().includes(lower) || node.path?.toLowerCase().includes(lower)) {
        return node;
      }
      if (node.children) {
        const filtered = node.children.map(filterNode).filter(Boolean) as TreeNode[];
        if (filtered.length > 0) {
          return { ...node, children: filtered };
        }
      }
      return null;
    };
    return activeTree.map(filterNode).filter(Boolean) as TreeNode[];
  }, [activeTree, filter]);

  const toggleSelection = useCallback((path: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const checkboxState: CheckboxState | undefined = useMemo(
    () =>
      view === 'undocumented' && onGenerateDocs ? { selected, toggle: toggleSelection } : undefined,
    [view, onGenerateDocs, selected, toggleSelection],
  );

  const treeItems = useMemo(
    () => filteredTree.map(node => nodeToTreeItem(node, selectedPath, draftPaths, checkboxState)),
    [filteredTree, selectedPath, draftPaths, checkboxState],
  );

  const totalFiles = useMemo(() => countFiles(activeTree), [activeTree]);
  const filteredFiles = useMemo(
    () => (filter ? countFiles(filteredTree) : totalFiles),
    [filter, filteredTree, totalFiles],
  );

  const handleSelect = useCallback(
    (_event: React.MouseEvent, item: TreeViewDataItem) => {
      const findNode = (nodes: TreeNode[], id: string): TreeNode | undefined => {
        for (const node of nodes) {
          if ((node.path || node.name) === id) {
            return node;
          }
          if (node.children) {
            const found = findNode(node.children, id);
            if (found) {
              return found;
            }
          }
        }
        return undefined;
      };
      const node = item.id ? findNode(tree, item.id) : undefined;
      if (node) {
        onSelect(node);
      }
    },
    [tree, onSelect],
  );

  return (
    <div className="app-file-tree">
      <div className="app-file-tree-tabs">
        <ToggleGroup>
          <ToggleGroupItem
            isSelected={view === 'documented'}
            text={
              <>
                Documented{' '}
                <Label isCompact className="app-ml-xs">
                  {docCount}
                </Label>
              </>
            }
            onChange={() => setView('documented')}
          />
          <ToggleGroupItem
            isSelected={view === 'undocumented'}
            text={
              <>
                Undocumented{' '}
                <Label
                  isCompact
                  className="app-ml-xs"
                  color={undocumentedCount > 0 ? 'orange' : 'grey'}
                >
                  {undocumentedCount}
                </Label>
              </>
            }
            onChange={() => setView('undocumented')}
          />
        </ToggleGroup>
      </div>
      <Toolbar className="app-file-tree-toolbar">
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder={
                view === 'documented' ? 'Filter docs & tests...' : 'Filter undocumented tests...'
              }
              resultsCount={filter ? `${filteredFiles} / ${totalFiles}` : undefined}
              value={filter}
              onChange={(_e, val) => setFilter(val)}
              onClear={() => setFilter('')}
            />
          </ToolbarItem>
          {view === 'undocumented' && onGenerateDocs && (
            <ToolbarItem>
              <Button
                isDisabled={selected.size === 0 || selected.size > MAX_GENERATE_SELECTION}
                variant="primary"
                onClick={() => {
                  const tests = collectTestInfo(tree, selected);
                  if (tests.length > 0) {
                    onGenerateDocs(tests);
                    setSelected(new Set<string>());
                  }
                }}
              >
                Generate Docs ({selected.size})
              </Button>
            </ToolbarItem>
          )}
        </ToolbarContent>
      </Toolbar>
      <div
        aria-label="Test file tree"
        className="app-file-tree-content"
        role="application"
        onContextMenu={e => {
          const target = e.target as HTMLElement;
          const nodeEl = target.closest('[data-node-id]');
          if (!nodeEl) {
            return;
          }
          e.preventDefault();
          const nodeId = nodeEl.getAttribute('data-node-id');
          if (!nodeId) {
            return;
          }
          const findById = (nodes: TreeNode[], id: string): TreeNode | undefined => {
            for (const n of nodes) {
              if ((n.path || n.name) === id) {
                return n;
              }
              if (n.children) {
                const found = findById(n.children, id);
                if (found) {
                  return found;
                }
              }
            }
            return undefined;
          };
          const found = findById(tree, nodeId);
          if (found) {
            setContextMenu({ node: found, x: e.clientX, y: e.clientY });
          }
        }}
      >
        {treeItems.length > 0 ? (
          <TreeView hasGuides data={treeItems} onSelect={handleSelect} />
        ) : (
          <Content className="app-text-muted app-p-lg app-text-center" component="p">
            {filter
              ? 'No files match your filter.'
              : view === 'documented'
                ? 'No documented tests found.'
                : 'All tests are documented!'}
          </Content>
        )}
      </div>

      {contextMenu && contextActions && (
        <TreeContextMenu
          actions={contextActions}
          node={contextMenu.node}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};
