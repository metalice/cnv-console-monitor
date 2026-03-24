import React, { useEffect, useRef } from 'react';

import type { TreeNode } from '@cnv-monitor/shared';

import { Divider, Menu, MenuContent, MenuItem, MenuList } from '@patternfly/react-core';
import {
  BanIcon,
  CodeIcon,
  CogIcon,
  CopyIcon,
  ExternalLinkAltIcon,
  FilterIcon,
  LightbulbIcon,
  LinkIcon,
  OutlinedFileAltIcon,
  PencilAltIcon,
  SearchIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';

export type ContextMenuAction = {
  onEdit?: (node: TreeNode) => void;
  onQuarantine?: (node: TreeNode) => void;
  onViewCounterpart?: (path: string) => void;
  onSyncRepo?: (repoId: string) => void;
  onEditRepoSettings?: (repoId: string) => void;
  onFilterComponent?: (component: string) => void;
  onAiAnalyze?: (node: TreeNode) => void;
};

type TreeContextMenuProps = {
  node: TreeNode | null;
  position: { x: number; y: number };
  onClose: () => void;
  actions: ContextMenuAction;
};

export const TreeContextMenu: React.FC<TreeContextMenuProps> = ({
  actions,
  node,
  onClose,
  position,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  if (!node) {
    return null;
  }

  const handleAction = (fn: () => void) => {
    fn();
    onClose();
  };

  const copyPath = () => navigator.clipboard.writeText(node.path || node.name);
  const copyLink = () => {
    const url = new URL(window.location.href);
    url.pathname = '/test-explorer';
    if (node.path) {
      url.searchParams.set('file', node.path);
    }
    if (node.repoId) {
      url.searchParams.set('repo', node.repoId);
    }
    void navigator.clipboard.writeText(url.toString());
  };
  const openInRepo = () => {
    if (node.repoUrl) {
      window.open(node.repoUrl, '_blank');
    }
  };

  return (
    <div className="app-context-menu" ref={menuRef} style={{ left: position.x, top: position.y }}>
      <Menu isPlain>
        <MenuContent>
          <MenuList>
            {node.repoUrl && (
              <MenuItem icon={<ExternalLinkAltIcon />} onClick={() => handleAction(openInRepo)}>
                Open in {node.repoUrl.includes('github') ? 'GitHub' : 'GitLab'}
              </MenuItem>
            )}

            {(node.type === 'doc' || node.type === 'test') && (
              <>
                <MenuItem
                  icon={<PencilAltIcon />}
                  onClick={() => handleAction(() => actions.onEdit?.(node))}
                >
                  Edit
                </MenuItem>
                <MenuItem icon={<CopyIcon />} onClick={() => handleAction(copyPath)}>
                  Copy path
                </MenuItem>
                <MenuItem icon={<LinkIcon />} onClick={() => handleAction(copyLink)}>
                  Copy link
                </MenuItem>
              </>
            )}

            {(node.type === 'doc' || node.type === 'test') &&
              node.hasCounterpart &&
              node.counterpartPath && (
                <>
                  <Divider />
                  <MenuItem
                    icon={node.type === 'doc' ? <CodeIcon /> : <OutlinedFileAltIcon />}
                    onClick={() =>
                      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                      handleAction(() => actions.onViewCounterpart?.(node.counterpartPath!))
                    }
                  >
                    View {node.type === 'doc' ? 'test file' : 'documentation'}
                  </MenuItem>
                </>
              )}

            {node.type === 'test' && (
              <>
                <Divider />
                <MenuItem
                  icon={<BanIcon />}
                  onClick={() => handleAction(() => actions.onQuarantine?.(node))}
                >
                  Quarantine
                </MenuItem>
                <MenuItem
                  icon={<LightbulbIcon />}
                  onClick={() => handleAction(() => actions.onAiAnalyze?.(node))}
                >
                  AI: Analyze test
                </MenuItem>
              </>
            )}

            {node.type === 'doc' && (
              <>
                <Divider />
                <MenuItem
                  icon={<LightbulbIcon />}
                  onClick={() => handleAction(() => actions.onAiAnalyze?.(node))}
                >
                  AI: Analyze gaps
                </MenuItem>
              </>
            )}

            {node.type === 'folder' && (
              <>
                <MenuItem icon={<CopyIcon />} onClick={() => handleAction(copyPath)}>
                  Copy path
                </MenuItem>
                <MenuItem
                  icon={<SearchIcon />}
                  onClick={() => handleAction(() => actions.onAiAnalyze?.(node))}
                >
                  View gaps in folder
                </MenuItem>
              </>
            )}

            {node.type === 'repo' && (
              <>
                <MenuItem
                  icon={<SyncAltIcon />}
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  onClick={() => handleAction(() => actions.onSyncRepo?.(node.repoId!))}
                >
                  Sync repository
                </MenuItem>
                {node.repoUrl && (
                  <MenuItem icon={<ExternalLinkAltIcon />} onClick={() => handleAction(openInRepo)}>
                    Open repository
                  </MenuItem>
                )}
                <MenuItem
                  icon={<CogIcon />}
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  onClick={() => handleAction(() => actions.onEditRepoSettings?.(node.repoId!))}
                >
                  Edit settings
                </MenuItem>
              </>
            )}

            {node.type === 'component' && (
              <MenuItem
                icon={<FilterIcon />}
                onClick={() => handleAction(() => actions.onFilterComponent?.(node.name))}
              >
                Filter by {node.name}
              </MenuItem>
            )}
          </MenuList>
        </MenuContent>
      </Menu>
    </div>
  );
};
