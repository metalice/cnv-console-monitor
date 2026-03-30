import { Fragment, useMemo, useState } from 'react';

import { Card, CardBody, CardTitle, Spinner, Tooltip } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { SortByDirection, Table, Tbody, Thead } from '@patternfly/react-table';

import { useColumnManagement } from '../../hooks/useColumnManagement';
import { useTableSort } from '../../hooks/useTableSort';
import { TableToolbar } from '../common/TableToolbar';

import { TimelineExpandedRow } from './TimelineExpandedRow';
import { type ReleaseTimelineProps, SORT_ACCESSORS, TIMELINE_COLUMNS } from './timelineHelpers';
import { TimelineTableHeader } from './TimelineTableHeader';
import { TimelineTableRow } from './TimelineTableRow';

export const ReleaseTimeline = ({
  isLoading,
  onSelectVersion,
  releases,
  selectedVersion,
}: ReleaseTimelineProps) => {
  const [search, setSearch] = useState('');
  const [expandedVersions, setExpandedVersions] = useState(new Set<string>());
  const colMgmt = useColumnManagement('releaseTimeline', TIMELINE_COLUMNS);

  const filtered = useMemo(() => {
    const list = releases ?? [];
    if (!search) {
      return list;
    }
    const term = search.toLowerCase();
    return list.filter(
      release =>
        release.shortname.toLowerCase().includes(term) ||
        release.phase.toLowerCase().includes(term),
    );
  }, [releases, search]);

  const { getSortParams, sorted } = useTableSort(filtered, SORT_ACCESSORS, {
    direction: SortByDirection.desc,
    index: 0,
  });

  const handleRowClick = (shortname: string) => {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(shortname)) {
        next.delete(shortname);
      } else {
        next.add(shortname);
      }
      return next;
    });
    onSelectVersion?.(shortname);
  };

  const colCount = TIMELINE_COLUMNS.filter(col => colMgmt.isColumnVisible(col.id)).length;

  return (
    <Card>
      <CardTitle>
        Version Timeline{' '}
        <Tooltip content="Table view of all CNV versions. Click a row to expand and see the full release history.">
          <OutlinedQuestionCircleIcon className="app-help-icon" />
        </Tooltip>
      </CardTitle>
      <CardBody>
        <TableToolbar
          columns={TIMELINE_COLUMNS}
          resultCount={sorted.length}
          searchPlaceholder="Search by version or phase..."
          searchValue={search}
          totalCount={(releases ?? []).length}
          visibleIds={colMgmt.visibleIds}
          onResetColumns={colMgmt.resetColumns}
          onSaveColumns={colMgmt.setColumns}
          onSearchChange={setSearch}
        />
        {isLoading ? (
          <Spinner aria-label="Loading releases" />
        ) : (
          <div className="app-table-scroll app-table-wide">
            <Table aria-label="Release timeline" variant="compact">
              <Thead>
                <TimelineTableHeader
                  getSortParams={getSortParams}
                  isColumnVisible={colMgmt.isColumnVisible}
                />
              </Thead>
              <Tbody>
                {sorted.map(release => (
                  <Fragment key={release.shortname}>
                    <TimelineTableRow
                      isColumnVisible={colMgmt.isColumnVisible}
                      isExpanded={expandedVersions.has(release.shortname)}
                      isSelected={selectedVersion === release.shortname}
                      release={release}
                      onRowClick={() => handleRowClick(release.shortname)}
                    />
                    {expandedVersions.has(release.shortname) && (
                      <TimelineExpandedRow colCount={colCount} release={release} />
                    )}
                  </Fragment>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
