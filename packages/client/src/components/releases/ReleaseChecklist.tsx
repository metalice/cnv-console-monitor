import React, { useEffect, useMemo, useState } from 'react';

import type { ChecklistTask, ReleaseInfo } from '@cnv-monitor/shared';

import {
  Alert,
  Card,
  CardBody,
  CardTitle,
  Content,
  MenuToggle,
  Pagination,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  ToggleGroup,
  ToggleGroupItem,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { SortByDirection, Table, Tbody, Thead } from '@patternfly/react-table';

import { useComponentFilter } from '../../context/ComponentFilterContext';
import { type ColumnDef, useColumnManagement } from '../../hooks/useColumnManagement';
import { useTableSort } from '../../hooks/useTableSort';
import { TableToolbar } from '../common/TableToolbar';
import { ChecklistActionModal } from '../modals/ChecklistActionModal';

import { ChecklistHeader, ChecklistRow } from './ChecklistRow';

const CHECKLIST_COLUMNS: ColumnDef[] = [
  { id: 'dueDate', title: 'Due Date' },
  { id: 'version', title: 'Version' },
  { id: 'key', title: 'Key' },
  { id: 'summary', title: 'Summary' },
  { id: 'status', title: 'Status' },
  { id: 'component', isDefault: false, title: 'Component' },
  { id: 'assignee', title: 'Assignee' },
  { id: 'priority', title: 'Priority' },
  { id: 'subtasks', title: 'Subtasks' },
  { id: 'updated', title: 'Updated' },
  { id: 'actions', title: 'Actions' },
];

const toMajorMinor = (v: string): string => {
  const stripped = v
    .replace(/^cnv[\s\-_]*v?/i, '')
    .trim()
    .toLowerCase();
  const match = /(\d{1,20}\.\d{1,20})/.exec(stripped);
  return match ? match[1] : stripped;
};

const buildDueDateMap = (releases: ReleaseInfo[] | undefined): Map<string, string> => {
  const map = new Map<string, string>();
  if (!releases) {
    return map;
  }
  for (const release of releases) {
    if (!release.nextRelease) {
      continue;
    }
    const key = toMajorMinor(release.shortname);
    if (key) {
      map.set(key, release.nextRelease.date);
    }
  }
  return map;
};

const getDueDate = (task: ChecklistTask, dueDateMap: Map<string, string>): string | null => {
  for (const fv of task.fixVersions) {
    const mm = toMajorMinor(fv);
    const date = dueDateMap.get(mm);
    if (date) {
      return date;
    }
  }
  return null;
};

const buildSortAccessors = (
  dueDateMap: Map<string, string>,
): Record<number, (t: ChecklistTask) => string | number | null> => ({
  0: task => {
    const d = getDueDate(task, dueDateMap);
    return d ? new Date(d).getTime() : Infinity;
  },
  1: task => task.fixVersions[0] || '',
  2: task => task.key,
  3: task => task.summary,
  4: task => task.status,
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data
  5: task => task.components?.[0] || '',
  6: task => task.assignee,
  7: task => task.priority,
  8: task => (task.subtaskCount > 0 ? task.subtasksDone / task.subtaskCount : 0),
  9: task => new Date(task.updated).getTime(),
});

type ReleaseChecklistProps = {
  checklist: ChecklistTask[] | undefined;
  isLoading: boolean;
  error: Error | null;
  checklistStatus: 'open' | 'all';
  onStatusChange: (status: 'open' | 'all') => void;
  releases: ReleaseInfo[] | undefined;
  activeVersion?: string | null;
};

export const ReleaseChecklist: React.FC<ReleaseChecklistProps> = ({
  activeVersion,
  checklist,
  checklistStatus,
  error,
  isLoading,
  onStatusChange,
  releases,
}) => {
  const { selectedComponents } = useComponentFilter();
  const [search, setSearch] = useState('');
  const [selectedVersions, setSelectedVersions] = useState(new Set<string>());

  useEffect(() => {
    if (!activeVersion || !checklist) {
      setSelectedVersions(new Set());
      return;
    }
    const ver = activeVersion.replace('cnv-', '');
    const matching = checklist
      .flatMap(t => t.fixVersions)
      .filter(fv => fv.toLowerCase().includes(ver.toLowerCase()));
    setSelectedVersions(new Set(matching));
  }, [activeVersion, checklist]);
  const [versionFilterOpen, setVersionFilterOpen] = useState(false);
  const [modalKey, setModalKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const colMgmt = useColumnManagement('releaseChecklist', CHECKLIST_COLUMNS);

  const availableVersions = useMemo(() => {
    if (!checklist) {
      return [];
    }
    const set = new Set<string>();
    for (const task of checklist) {
      const version = task.fixVersions[0];
      if (version) {
        set.add(version);
      }
    }
    return [...set].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [checklist]);

  const toggleVersion = (ver: string): void => {
    setSelectedVersions(prev => {
      const next = new Set(prev);
      if (next.has(ver)) {
        next.delete(ver);
      } else {
        next.add(ver);
      }
      return next;
    });
  };

  const versionFilterLabel =
    selectedVersions.size === 0
      ? 'All Versions'
      : selectedVersions.size === 1
        ? [...selectedVersions][0]
        : `${selectedVersions.size} versions`;

  const filtered = useMemo(() => {
    if (!checklist) {
      return [];
    }
    let result = checklist;
    if (selectedVersions.size > 0) {
      result = result.filter(task =>
        task.fixVersions.some(version => selectedVersions.has(version)),
      );
    }
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(
        task =>
          task.key.toLowerCase().includes(term) ||
          task.summary.toLowerCase().includes(term) ||
          task.assignee?.toLowerCase().includes(term) ||
          task.fixVersions.some(version => version.toLowerCase().includes(term)),
      );
    }
    setPage(1);
    return result;
  }, [checklist, selectedVersions, search]);

  const dueDateMap = useMemo(() => buildDueDateMap(releases), [releases]);
  const sortAccessors = useMemo(() => buildSortAccessors(dueDateMap), [dueDateMap]);
  const { getSortParams, sorted } = useTableSort(filtered, sortAccessors, {
    direction: SortByDirection.desc,
    index: 0,
  });
  const showComponentCol = colMgmt.isColumnVisible('component') && selectedComponents.size !== 1;

  const startIdx = (page - 1) * perPage;
  const paginatedRows = sorted.slice(startIdx, startIdx + perPage);

  return (
    <Card>
      <CardTitle>
        Release Checklist{' '}
        <Tooltip content="Jira tasks labeled CNV-Release-Checklist. Shows tasks that need to be completed before a release can ship. Due dates are computed from the release schedule.">
          <OutlinedQuestionCircleIcon className="app-help-icon" />
        </Tooltip>
      </CardTitle>
      <CardBody>
        <TableToolbar
          columns={CHECKLIST_COLUMNS}
          resultCount={sorted.length}
          searchPlaceholder="Search by key, summary, assignee, version..."
          searchValue={search}
          totalCount={(checklist ?? []).length}
          visibleIds={colMgmt.visibleIds}
          onResetColumns={colMgmt.resetColumns}
          onSaveColumns={colMgmt.setColumns}
          onSearchChange={setSearch}
        >
          <ToolbarItem>
            <ToggleGroup>
              <ToggleGroupItem
                isSelected={checklistStatus === 'open'}
                text="Open"
                onChange={() => onStatusChange('open')}
              />
              <ToggleGroupItem
                isSelected={checklistStatus === 'all'}
                text="All"
                onChange={() => onStatusChange('all')}
              />
            </ToggleGroup>
          </ToolbarItem>
          {availableVersions.length > 0 && (
            <ToolbarItem>
              <Select
                isOpen={versionFilterOpen}
                role="menu"
                // eslint-disable-next-line react/no-unstable-nested-components
                toggle={ref => (
                  <MenuToggle
                    isExpanded={versionFilterOpen}
                    ref={ref}
                    onClick={() => setVersionFilterOpen(!versionFilterOpen)}
                  >
                    {versionFilterLabel}
                  </MenuToggle>
                )}
                onOpenChange={setVersionFilterOpen}
                onSelect={(_e, val) => toggleVersion(val as string)}
              >
                <SelectList>
                  {availableVersions.map(ver => (
                    <SelectOption
                      hasCheckbox
                      isSelected={selectedVersions.has(ver)}
                      key={ver}
                      value={ver}
                    >
                      {ver}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            </ToolbarItem>
          )}
        </TableToolbar>

        {error ? (
          <Alert
            isInline
            className="app-mb-md"
            title="Failed to load release checklist"
            variant="danger"
          >
            {error.message || 'Jira may be unavailable. Check your VPN connection and try again.'}
          </Alert>
        ) : isLoading ? (
          <div className="app-page-spinner">
            <Spinner aria-label="Loading checklist" />
          </div>
        ) : !checklist || checklist.length === 0 ? (
          <Content className="app-p-lg app-text-muted" component="p">
            No checklist tasks found.
          </Content>
        ) : (
          <>
            <div className="app-table-scroll app-table-wide">
              <Table aria-label="Release checklist" variant="compact">
                <Thead>
                  <ChecklistHeader
                    getSortParams={getSortParams}
                    isColumnVisible={colMgmt.isColumnVisible}
                    showComponentCol={showComponentCol}
                  />
                </Thead>
                <Tbody>
                  {paginatedRows.map(task => (
                    <ChecklistRow
                      dueDateMap={dueDateMap}
                      isColumnVisible={colMgmt.isColumnVisible}
                      key={task.key}
                      showComponentCol={showComponentCol}
                      task={task}
                      onEdit={setModalKey}
                    />
                  ))}
                </Tbody>
              </Table>
            </div>
            <Pagination
              itemCount={sorted.length}
              page={page}
              perPage={perPage}
              perPageOptions={[
                { title: '10', value: 10 },
                { title: '20', value: 20 },
                { title: '50', value: 50 },
                { title: '100', value: 100 },
              ]}
              variant="bottom"
              onPerPageSelect={(_e, pp) => {
                setPerPage(pp);
                setPage(1);
              }}
              onSetPage={(_e, p) => setPage(p)}
            />
          </>
        )}
      </CardBody>
      {modalKey && (
        <ChecklistActionModal
          isOpen={Boolean(modalKey)}
          issueKey={modalKey}
          onClose={() => setModalKey(null)}
        />
      )}
    </Card>
  );
};
