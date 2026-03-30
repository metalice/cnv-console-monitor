import { useState } from 'react';

import {
  Alert,
  Card,
  CardBody,
  CardTitle,
  Content,
  Pagination,
  Spinner,
  Tooltip,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { SortByDirection, Table, Tbody, Thead } from '@patternfly/react-table';

import { useComponentFilter } from '../../context/ComponentFilterContext';
import { useColumnManagement } from '../../hooks/useColumnManagement';
import { useTableSort } from '../../hooks/useTableSort';
import { TableToolbar } from '../common/TableToolbar';
import { ChecklistActionModal } from '../modals/ChecklistActionModal';

import { ChecklistHeader } from './ChecklistHeader';
import {
  CHECKLIST_COLUMNS,
  PER_PAGE_OPTIONS,
  type ReleaseChecklistProps,
} from './checklistHelpers';
import { ChecklistRow } from './ChecklistRow';
import { ChecklistVersionFilter } from './ChecklistVersionFilter';
import { useChecklistFilters } from './useChecklistFilters';

const DEFAULT_PER_PAGE = 10;

export const ReleaseChecklist = ({
  activeVersion,
  checklist,
  checklistStatus,
  error,
  isLoading,
  onStatusChange,
  releases,
}: ReleaseChecklistProps) => {
  const { selectedComponents } = useComponentFilter();
  const filters = useChecklistFilters(checklist, releases, activeVersion);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [modalKey, setModalKey] = useState<string | null>(null);
  const colMgmt = useColumnManagement('releaseChecklist', CHECKLIST_COLUMNS);

  const { getSortParams, sorted } = useTableSort(filters.filtered, filters.sortAccessors, {
    direction: SortByDirection.desc,
    index: 0,
  });
  const showComponentCol = colMgmt.isColumnVisible('component') && selectedComponents.size !== 1;

  const startIdx = (filters.page - 1) * perPage;
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
          searchValue={filters.search}
          totalCount={(checklist ?? []).length}
          visibleIds={colMgmt.visibleIds}
          onResetColumns={colMgmt.resetColumns}
          onSaveColumns={colMgmt.setColumns}
          onSearchChange={filters.setSearch}
        >
          <ChecklistVersionFilter
            availableVersions={filters.availableVersions}
            checklistStatus={checklistStatus}
            selectedVersions={filters.selectedVersions}
            onStatusChange={onStatusChange}
            onToggleVersion={filters.toggleVersion}
          />
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
                      dueDateMap={filters.dueDateMap}
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
              page={filters.page}
              perPage={perPage}
              perPageOptions={PER_PAGE_OPTIONS as unknown as { title: string; value: number }[]}
              variant="bottom"
              onPerPageSelect={(_e, newPerPage) => {
                setPerPage(newPerPage);
                filters.setPage(1);
              }}
              onSetPage={(_e, newPage) => filters.setPage(newPage)}
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
