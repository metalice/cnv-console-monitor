import React, { useMemo, useState } from 'react';
import { Alert, Card, CardBody, CardTitle, Content, MenuToggle, Pagination, Select, SelectList, SelectOption, Spinner, ToggleGroup, ToggleGroupItem, ToolbarItem } from '@patternfly/react-core';
import { Table, Thead, Tbody, SortByDirection } from '@patternfly/react-table';
import { useTableSort } from '../../hooks/useTableSort';
import { useColumnManagement, type ColumnDef } from '../../hooks/useColumnManagement';
import { useComponentFilter } from '../../context/ComponentFilterContext';
import { TableToolbar } from '../common/TableToolbar';
import { ChecklistActionModal } from '../modals/ChecklistActionModal';
import { ChecklistHeader, ChecklistRow } from './ChecklistRow';
import type { ChecklistTask, ReleaseInfo } from '@cnv-monitor/shared';

const CHECKLIST_COLUMNS: ColumnDef[] = [
  { id: 'dueDate', title: 'Due Date' },
  { id: 'version', title: 'Version' }, { id: 'key', title: 'Key' },
  { id: 'summary', title: 'Summary' }, { id: 'status', title: 'Status' },
  { id: 'component', title: 'Component', isDefault: false }, { id: 'assignee', title: 'Assignee' },
  { id: 'priority', title: 'Priority' }, { id: 'subtasks', title: 'Subtasks' },
  { id: 'updated', title: 'Updated' }, { id: 'actions', title: 'Actions' },
];

const toMajorMinor = (v: string): string => {
  const stripped = v.replace(/^cnv[\s\-_]*v?/i, '').trim().toLowerCase();
  const match = stripped.match(/(\d+\.\d+)/);
  return match ? match[1] : stripped;
};

const buildDueDateMap = (releases: ReleaseInfo[] | undefined): Map<string, string> => {
  const map = new Map<string, string>();
  if (!releases) return map;
  for (const release of releases) {
    if (!release.nextRelease) continue;
    const key = toMajorMinor(release.shortname);
    if (key) map.set(key, release.nextRelease.date);
  }
  return map;
};

const getDueDate = (task: ChecklistTask, dueDateMap: Map<string, string>): string | null => {
  for (const fv of task.fixVersions) {
    const mm = toMajorMinor(fv);
    const date = dueDateMap.get(mm);
    if (date) return date;
  }
  return null;
};

const buildSortAccessors = (dueDateMap: Map<string, string>): Record<number, (t: ChecklistTask) => string | number | null> => ({
  0: (task) => { const d = getDueDate(task, dueDateMap); return d ? new Date(d).getTime() : Infinity; },
  1: (task) => task.fixVersions[0] || '',
  2: (task) => task.key,
  3: (task) => task.summary,
  4: (task) => task.status,
  5: (task) => task.components?.[0] || '',
  6: (task) => task.assignee,
  7: (task) => task.priority,
  8: (task) => task.subtaskCount > 0 ? task.subtasksDone / task.subtaskCount : 0,
  9: (task) => new Date(task.updated).getTime(),
});

type ReleaseChecklistProps = {
  checklist: ChecklistTask[] | undefined;
  isLoading: boolean;
  error: Error | null;
  checklistStatus: 'open' | 'all';
  onStatusChange: (status: 'open' | 'all') => void;
  releases: ReleaseInfo[] | undefined;
};

export const ReleaseChecklist: React.FC<ReleaseChecklistProps> = ({
  checklist, isLoading, error, checklistStatus, onStatusChange, releases,
}) => {
  const { selectedComponents } = useComponentFilter();
  const [search, setSearch] = useState('');
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());
  const [versionFilterOpen, setVersionFilterOpen] = useState(false);
  const [modalKey, setModalKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const colMgmt = useColumnManagement('releaseChecklist', CHECKLIST_COLUMNS);

  const availableVersions = useMemo(() => {
    if (!checklist) return [];
    const set = new Set<string>();
    for (const task of checklist) { const version = task.fixVersions[0]; if (version) set.add(version); }
    return [...set].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [checklist]);

  const toggleVersion = (ver: string): void => {
    setSelectedVersions(prev => { const next = new Set(prev); if (next.has(ver)) next.delete(ver); else next.add(ver); return next; });
  };

  const versionFilterLabel = selectedVersions.size === 0 ? 'All Versions'
    : selectedVersions.size === 1 ? [...selectedVersions][0] : `${selectedVersions.size} versions`;

  const filtered = useMemo(() => {
    if (!checklist) return [];
    let result = checklist;
    if (selectedVersions.size > 0) result = result.filter(task => task.fixVersions.some(version => selectedVersions.has(version)));
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(task =>
        task.key.toLowerCase().includes(term) || task.summary.toLowerCase().includes(term) ||
        (task.assignee && task.assignee.toLowerCase().includes(term)) || task.fixVersions.some(version => version.toLowerCase().includes(term)),
      );
    }
    setPage(1);
    return result;
  }, [checklist, selectedVersions, search]);

  const dueDateMap = useMemo(() => buildDueDateMap(releases), [releases]);
  const sortAccessors = useMemo(() => buildSortAccessors(dueDateMap), [dueDateMap]);
  const { sorted, getSortParams } = useTableSort(filtered, sortAccessors, { index: 0, direction: SortByDirection.desc });
  const showComponentCol = colMgmt.isColumnVisible('component') && selectedComponents.size !== 1;

  const startIdx = (page - 1) * perPage;
  const paginatedRows = sorted.slice(startIdx, startIdx + perPage);

  return (
    <Card>
      <CardTitle>Release Checklist</CardTitle>
      <CardBody>
        <TableToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by key, summary, assignee, version..."
          resultCount={sorted.length} totalCount={(checklist || []).length} columns={CHECKLIST_COLUMNS}
          visibleIds={colMgmt.visibleIds} onSaveColumns={colMgmt.setColumns} onResetColumns={colMgmt.resetColumns}>
          <ToolbarItem>
            <ToggleGroup>
              <ToggleGroupItem text="Open" isSelected={checklistStatus === 'open'} onChange={() => onStatusChange('open')} />
              <ToggleGroupItem text="All" isSelected={checklistStatus === 'all'} onChange={() => onStatusChange('all')} />
            </ToggleGroup>
          </ToolbarItem>
          {availableVersions.length > 0 && (
            <ToolbarItem>
              <Select role="menu" isOpen={versionFilterOpen} onOpenChange={setVersionFilterOpen}
                onSelect={(_e, val) => toggleVersion(val as string)}
                toggle={(ref) => (<MenuToggle ref={ref} onClick={() => setVersionFilterOpen(!versionFilterOpen)} isExpanded={versionFilterOpen}>{versionFilterLabel}</MenuToggle>)}>
                <SelectList>
                  {availableVersions.map(ver => (<SelectOption key={ver} value={ver} hasCheckbox isSelected={selectedVersions.has(ver)}>{ver}</SelectOption>))}
                </SelectList>
              </Select>
            </ToolbarItem>
          )}
        </TableToolbar>

        {error ? (
          <Alert variant="danger" isInline title="Failed to load release checklist" className="app-mb-md">
            {error.message || 'Jira may be unavailable. Check your VPN connection and try again.'}
          </Alert>
        ) : isLoading ? (
          <div className="app-page-spinner"><Spinner aria-label="Loading checklist" /></div>
        ) : !checklist || checklist.length === 0 ? (
          <Content component="p" className="app-p-lg app-text-muted">No checklist tasks found.</Content>
        ) : (
          <>
            <div className="app-table-scroll app-table-wide">
              <Table aria-label="Release checklist" variant="compact">
                <Thead><ChecklistHeader isColumnVisible={colMgmt.isColumnVisible} showComponentCol={showComponentCol} getSortParams={getSortParams} /></Thead>
                <Tbody>
                  {paginatedRows.map(task => <ChecklistRow key={task.key} task={task} isColumnVisible={colMgmt.isColumnVisible} showComponentCol={showComponentCol} onEdit={setModalKey} dueDateMap={dueDateMap} />)}
                </Tbody>
              </Table>
            </div>
            <Pagination
              itemCount={sorted.length}
              perPage={perPage}
              page={page}
              onSetPage={(_e, p) => setPage(p)}
              onPerPageSelect={(_e, pp) => { setPerPage(pp); setPage(1); }}
              perPageOptions={[{ title: '50', value: 50 }, { title: '100', value: 100 }, { title: '200', value: 200 }, { title: '500', value: 500 }]}
              variant="bottom"
            />
          </>
        )}
      </CardBody>
      {modalKey && <ChecklistActionModal issueKey={modalKey} isOpen={!!modalKey} onClose={() => setModalKey(null)} />}
    </Card>
  );
};
