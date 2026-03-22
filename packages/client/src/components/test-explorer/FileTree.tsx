import React, { useState, useMemo } from 'react';
import {
  TreeView,
  TreeViewDataItem,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Badge,
} from '@patternfly/react-core';
import { FolderIcon, FileIcon, CodeIcon, OutlinedFileAltIcon, CubesIcon, RepositoryIcon } from '@patternfly/react-icons';
import type { TreeNode } from '@cnv-monitor/shared';
import { GapBadge } from './GapBadge';

interface FileTreeProps {
  tree: TreeNode[];
  onSelect: (node: TreeNode) => void;
  selectedPath?: string;
}

const nodeToTreeItem = (node: TreeNode, onSelect: (node: TreeNode) => void, selectedPath?: string): TreeViewDataItem => {
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
    badges.push(<Badge key="q" isRead>Q</Badge>);
  }
  if (node.fileCount !== undefined && node.gapCount !== undefined && node.gapCount > 0) {
    badges.push(<Badge key="gaps" isRead>{node.gapCount} gaps</Badge>);
  }

  return {
    id: node.path || node.name,
    name: (
      <span className="app-tree-node">
        {node.name}
        {badges.length > 0 && <span className="app-tree-badges">{badges}</span>}
      </span>
    ),
    icon,
    children: node.children?.map(child => nodeToTreeItem(child, onSelect, selectedPath)),
    defaultExpanded: node.type === 'component' || node.type === 'repo',
    action: undefined,
  };
};

export const FileTree: React.FC<FileTreeProps> = ({ tree, onSelect, selectedPath }) => {
  const [filter, setFilter] = useState('');

  const filteredTree = useMemo(() => {
    if (!filter) return tree;
    const lower = filter.toLowerCase();

    const filterNode = (node: TreeNode): TreeNode | null => {
      if (node.name.toLowerCase().includes(lower) || node.path?.toLowerCase().includes(lower)) {
        return node;
      }
      if (node.children) {
        const filtered = node.children.map(filterNode).filter(Boolean) as TreeNode[];
        if (filtered.length > 0) return { ...node, children: filtered };
      }
      return null;
    };

    return tree.map(filterNode).filter(Boolean) as TreeNode[];
  }, [tree, filter]);

  const treeItems = useMemo(
    () => filteredTree.map(node => nodeToTreeItem(node, onSelect, selectedPath)),
    [filteredTree, onSelect, selectedPath],
  );

  const handleSelect = (_event: React.MouseEvent, item: TreeViewDataItem) => {
    const findNode = (nodes: TreeNode[], id: string): TreeNode | undefined => {
      for (const node of nodes) {
        if ((node.path || node.name) === id) return node;
        if (node.children) {
          const found = findNode(node.children, id);
          if (found) return found;
        }
      }
      return undefined;
    };

    const node = findNode(tree, item.id as string);
    if (node) onSelect(node);
  };

  return (
    <div className="app-file-tree">
      <Toolbar isSticky>
        <ToolbarContent>
          <ToolbarItem>
            <SearchInput
              placeholder="Filter files..."
              value={filter}
              onChange={(_e, val) => setFilter(val)}
              onClear={() => setFilter('')}
            />
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <div className="app-file-tree-content">
        <TreeView data={treeItems} onSelect={handleSelect} hasGuides />
      </div>
    </div>
  );
};
