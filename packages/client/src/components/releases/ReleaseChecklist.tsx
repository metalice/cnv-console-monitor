import React, { useMemo, useState } from 'react';
import { Alert, Card, CardBody, CardTitle, Content, MenuToggle, Select, SelectList, SelectOption, Spinner, ToggleGroup, ToggleGroupItem, ToolbarItem } from '@patternfly/react-core';
import { Table, Thead, Tbody, SortByDirection } from '@patternfly/react-table';
import { useTableSort } from '../../hooks/useTableSort';
import { useColumnManagement, type ColumnDef } from '../../hooks/useColumnManagement';
import { ComponentMultiSelect } from '../common/ComponentMultiSelect';
import { TableToolbar } from '../common/TableToolbar';
import { ChecklistActionModal } from '../modals/ChecklistActionModal';
import { ChecklistHeader, ChecklistRow } from './ChecklistRow';
import type { ChecklistTask } from '@cnv-monitor/shared';

const CHECKLIST_COLUMNS: ColumnDef[] = [
  { id: 'version', title: 'Version' }, { id: 'key', title: 'Key' },
  { id: 'summary', title: 'Summary' }, { id: 'status', title: 'Status' },
  { id: 'component', title: 'Component', isDefault: false }, { id: 'assignee', title: 'Assignee' },
  { id: 'priority', title: 'Priority' }, { id: 'subtasks', title: 'Subtasks' },
  { id: 'updated', title: 'Updated' }, { id: 'actions', title: 'Actions' },
];

const SORT_ACCESSORS: Record<number, (t: ChecklistTask) => string | number | null> = {
  0: (task) => task.fixVersions[0] || '',
  1: (task) => task.key,
  2: (task) => task.summary,
  3: (task) => task.status,
  4: (task) => task.components?.[0] || '',
  5: (task) => task.assignee,
  6: (task) => task.priority,
  7: (task) => task.subtaskCount > 0 ? task.subtasksDone / task.subtaskCount : 0,
  8: (task) => new Date(task.updated).getTime(),
};

type ReleaseChecklistProps = {
  checklist: ChecklistTask[] | undefined;
  isLoading: boolean;
  error: Error | null;
  checklistStatus: 'open' | 'all';
  onStatusChange: (status: 'open' | 'all') => void;
  selectedComponents: Set<string>;
  jiraComponents: string[];
  onComponentsChange: (components: Set<string>) => void;
};

export const ReleaseChecklist: React.FC<ReleaseChecklistProps> = ({
  checklist, isLoading, error, checklistStatus, onStatusChange,
  selectedComponents, jiraComponents, onComponentsChange,
}) => {
  const [search, setSearch] = useState('');
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());
  const [versionFilterOpen, setVersionFilterOpen] = useState(false);
  const [modalKey, setModalKey] = useState<string | null>(null);
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
    return result;
  }, [checklist, selectedVersions, search]);

  const { sorted, getSortParams } = useTableSort(filtered, SORT_ACCESSORS, { index: 0, direction: SortByDirection.desc });
  const showComponentCol = colMgmt.isColumnVisible('component') && selectedComponents.size !== 1;

  return (
    <Card>
      <CardTitle>Release Checklist</CardTitle>
      <CardBody>
        <TableToolbar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search by key, summary, assignee, version..."
          resultCount={sorted.length} totalCount={(checklist || []).length} columns={CHECKLIST_COLUMNS}
          visibleIds={colMgmt.visibleIds} onSaveColumns={colMgmt.setColumns} onResetColumns={colMgmt.resetColumns}>
          <ToolbarItem><ComponentMultiSelect id="cl-component" selected={selectedComponents} options={jiraComponents} onChange={onComponentsChange} /></ToolbarItem>
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
          <Spinner aria-label="Loading checklist" />
        ) : !checklist || checklist.length === 0 ? (
          <Content component="p" className="app-p-lg app-text-muted">No checklist tasks found.</Content>
        ) : (
          <>
            <Content component="small" className="app-mb-sm">
              {filtered.length === checklist.length ? `${checklist.length} tasks` : `${filtered.length} of ${checklist.length} tasks`}
            </Content>
            <div className="app-table-scroll app-table-wide">
              <Table aria-label="Release checklist" variant="compact">
                <Thead><ChecklistHeader isColumnVisible={colMgmt.isColumnVisible} showComponentCol={showComponentCol} getSortParams={getSortParams} /></Thead>
                <Tbody>
                  {sorted.map(task => <ChecklistRow key={task.key} task={task} isColumnVisible={colMgmt.isColumnVisible} showComponentCol={showComponentCol} onEdit={setModalKey} />)}
                </Tbody>
              </Table>
            </div>
          </>
        )}
      </CardBody>
      {modalKey && <ChecklistActionModal issueKey={modalKey} isOpen={!!modalKey} onClose={() => setModalKey(null)} />}
    </Card>
  );
};
