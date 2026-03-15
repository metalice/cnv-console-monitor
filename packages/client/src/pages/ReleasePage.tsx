import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  CardTitle,
  Label,
  Flex,
  FlexItem,
  Spinner,
  ExpandableSection,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  Truncate,
  Alert,
  Button,
  Select,
  SelectList,
  SelectOption,
  MenuToggle,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td, SortByDirection } from '@patternfly/react-table';
import { ExternalLinkAltIcon, EditAltIcon } from '@patternfly/react-icons';
import { apiFetch } from '../api/client';
import { useTableSort } from '../hooks/useTableSort';
import { fetchReleases, fetchChecklist } from '../api/releases';
import { usePreferences } from '../context/PreferencesContext';
import { ComponentMultiSelect } from '../components/common/ComponentMultiSelect';
import { TableToolbar } from '../components/common/TableToolbar';
import { ChecklistActionModal } from '../components/modals/ChecklistActionModal';
import { useColumnManagement, type ColumnDef } from '../hooks/useColumnManagement';
import type { ReleaseInfo, ChecklistTask } from '@cnv-monitor/shared';

const TIMELINE_COLUMNS: ColumnDef[] = [
  { id: 'version', title: 'Version' },
  { id: 'phase', title: 'Phase' },
  { id: 'gaDate', title: 'GA Date' },
  { id: 'zStream', title: 'Current Z-Stream' },
  { id: 'lastReleased', title: 'Last Released' },
  { id: 'nextRelease', title: 'Next Release' },
  { id: 'countdown', title: 'Countdown' },
  { id: 'history', title: 'History' },
];

const CHECKLIST_COLUMNS: ColumnDef[] = [
  { id: 'version', title: 'Version' },
  { id: 'key', title: 'Key' },
  { id: 'summary', title: 'Summary' },
  { id: 'status', title: 'Status' },
  { id: 'component', title: 'Component', isDefault: false },
  { id: 'assignee', title: 'Assignee' },
  { id: 'priority', title: 'Priority' },
  { id: 'subtasks', title: 'Subtasks' },
  { id: 'updated', title: 'Updated' },
  { id: 'actions', title: 'Actions' },
];

function phaseBadge(phase: string): React.ReactNode {
  const color = phase.includes('Concept') ? 'purple'
    : phase.includes('Planning') || phase.includes('Development') ? 'blue'
    : phase === 'Maintenance' ? 'green'
    : 'grey';
  return <Label color={color} isCompact>{phase}</Label>;
}

function countdownBadge(days: number | null): React.ReactNode {
  if (days === null) return <Label color="grey" isCompact>No upcoming</Label>;
  if (days <= 3) return <Label color="red" isCompact>{days}d</Label>;
  if (days <= 7) return <Label color="orange" isCompact>{days}d</Label>;
  if (days <= 14) return <Label color="yellow" isCompact>{days}d</Label>;
  return <Label color="grey" isCompact>{days}d</Label>;
}

function statusBadge(status: string): React.ReactNode {
  const color = status === 'Closed' ? 'green'
    : status === 'In Progress' || status === 'Testing' ? 'blue'
    : status === 'To Do' || status === 'New' ? 'orange'
    : 'grey';
  return <Label color={color} isCompact>{status}</Label>;
}

function progressBar(done: number, total: number): React.ReactNode {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <Tooltip content={`${done}/${total} done`}>
      <div style={{ width: 80, height: 8, background: 'var(--pf-t--global--border--color--default)', borderRadius: 4, display: 'inline-block', verticalAlign: 'middle' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--pf-t--global--color--status--success--default)' : 'var(--pf-t--global--color--brand--default)', borderRadius: 4 }} />
      </div>
    </Tooltip>
  );
}

export const ReleasePage: React.FC = () => {
  useEffect(() => { document.title = 'Releases | CNV Console Monitor'; }, []);

  const { data: releases, isLoading: relLoading } = useQuery({
    queryKey: ['releases'],
    queryFn: fetchReleases,
    staleTime: 5 * 60 * 1000,
  });

  const { data: jiraComponents } = useQuery({
    queryKey: ['jiraComponents'],
    queryFn: async () => {
      const meta = await apiFetch<{ components: string[] }>('/settings/jira-meta');
      return meta.components || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { preferences, loaded: prefsLoaded, setPreference } = usePreferences();
  const [selectedChecklistComps, setSelectedChecklistCompsState] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (prefsLoaded && preferences.dashboardComponents?.length) {
      setSelectedChecklistCompsState(new Set(preferences.dashboardComponents));
    }
  }, [prefsLoaded, preferences.dashboardComponents]);

  const setSelectedChecklistComps = (val: Set<string>) => { setSelectedChecklistCompsState(val); setPreference('dashboardComponents', [...val]); };
  const checklistComp = selectedChecklistComps.size === 1 ? [...selectedChecklistComps][0] : undefined;
  const [checklistStatus, setChecklistStatus] = useState<'open' | 'all'>('open');
  const [selectedVersions, setSelectedVersions] = useState<Set<string>>(new Set());
  const [versionFilterOpen, setVersionFilterOpen] = useState(false);
  const [modalKey, setModalKey] = useState<string | null>(null);
  const [timelineSearch, setTimelineSearch] = useState('');
  const [checklistSearch, setChecklistSearch] = useState('');
  const timelineColMgmt = useColumnManagement('releaseTimeline', TIMELINE_COLUMNS);
  const checklistColMgmt = useColumnManagement('releaseChecklist', CHECKLIST_COLUMNS);

  const { data: checklist, isLoading: clLoading, error: clError } = useQuery({
    queryKey: ['checklist', checklistComp, checklistStatus],
    queryFn: () => fetchChecklist(checklistComp, checklistStatus),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const availableVersions = useMemo(() => {
    if (!checklist) return [];
    const set = new Set<string>();
    for (const t of checklist) {
      const v = t.fixVersions[0];
      if (v) set.add(v);
    }
    return [...set].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  }, [checklist]);

  const toggleVersion = (ver: string): void => {
    setSelectedVersions(prev => {
      const next = new Set(prev);
      if (next.has(ver)) next.delete(ver); else next.add(ver);
      return next;
    });
  };


  const versionFilterLabel = selectedVersions.size === 0
    ? 'All Versions'
    : selectedVersions.size === 1
      ? [...selectedVersions][0]
      : `${selectedVersions.size} versions`;

  const CHECKLIST_SORT_ACCESSORS: Record<number, (t: ChecklistTask) => string | number | null> = useMemo(() => ({
    0: (t) => t.fixVersions[0] || '',
    1: (t) => t.key,
    2: (t) => t.summary,
    3: (t) => t.status,
    4: (t) => t.components?.[0] || '',
    5: (t) => t.assignee,
    6: (t) => t.priority,
    7: (t) => t.subtaskCount > 0 ? t.subtasksDone / t.subtaskCount : 0,
    8: (t) => new Date(t.updated).getTime(),
  }), []);

  const filteredChecklist = useMemo(() => {
    if (!checklist) return [];
    let result = checklist;
    if (selectedVersions.size > 0) {
      result = result.filter(t => t.fixVersions.some(v => selectedVersions.has(v)));
    }
    if (checklistSearch) {
      const q = checklistSearch.toLowerCase();
      result = result.filter(t =>
        t.key.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        (t.assignee && t.assignee.toLowerCase().includes(q)) ||
        t.fixVersions.some(v => v.toLowerCase().includes(q)),
      );
    }
    return result;
  }, [checklist, selectedVersions, checklistSearch]);

  const { sorted: sortedChecklist, getSortParams: getClSortParams } = useTableSort(
    filteredChecklist,
    CHECKLIST_SORT_ACCESSORS,
    { index: 0, direction: SortByDirection.desc },
  );

  const RELEASE_SORT_ACCESSORS: Record<number, (r: ReleaseInfo) => string | number | null> = useMemo(() => ({
    0: (r) => r.shortname,
    1: (r) => r.phase,
    2: (r) => r.gaDate ? new Date(r.gaDate).getTime() : null,
    3: (r) => r.currentZStream,
    4: (r) => r.currentZStreamDate ? new Date(r.currentZStreamDate).getTime() : null,
    5: (r) => r.nextRelease ? new Date(r.nextRelease.date).getTime() : null,
    6: (r) => r.daysUntilNext,
  }), []);

  const filteredReleases = useMemo(() => {
    const list = releases || [];
    if (!timelineSearch) return list;
    const q = timelineSearch.toLowerCase();
    return list.filter(r =>
      r.shortname.toLowerCase().includes(q) ||
      r.phase.toLowerCase().includes(q),
    );
  }, [releases, timelineSearch]);

  const { sorted: sortedReleases, getSortParams: getRelSortParams } = useTableSort(
    filteredReleases,
    RELEASE_SORT_ACCESSORS,
    { index: 0, direction: SortByDirection.desc },
  );

  const upcomingReleases = useMemo(() => {
    if (!releases) return [];
    return releases
      .filter(r => r.daysUntilNext !== null && r.daysUntilNext <= 14)
      .sort((a, b) => (a.daysUntilNext ?? Infinity) - (b.daysUntilNext ?? Infinity));
  }, [releases]);

  return (
    <>
      <PageSection>
        <Content component="h1">Release Schedule</Content>
        <Content component="small">CNV version lifecycle, z-stream schedule, and release checklist tasks</Content>
      </PageSection>

      {upcomingReleases.length > 0 && (
        <PageSection>
          <Card>
            <CardTitle>Upcoming Releases (next 14 days)</CardTitle>
            <CardBody>
              <Flex spaceItems={{ default: 'spaceItemsMd' }} flexWrap={{ default: 'wrap' }}>
                {upcomingReleases.map(r => (
                  <FlexItem key={r.shortname}>
                    <Label color={r.daysUntilNext! <= 3 ? 'red' : r.daysUntilNext! <= 7 ? 'orange' : 'yellow'}>
                      {r.shortname} &mdash; {r.nextRelease?.name} &mdash; {r.nextRelease?.date} ({r.daysUntilNext}d)
                    </Label>
                  </FlexItem>
                ))}
              </Flex>
            </CardBody>
          </Card>
        </PageSection>
      )}

      <PageSection>
        <Card>
          <CardTitle>Version Timeline</CardTitle>
          <CardBody>
            <TableToolbar
              searchValue={timelineSearch}
              onSearchChange={setTimelineSearch}
              searchPlaceholder="Search by version or phase..."
              resultCount={sortedReleases.length}
              totalCount={(releases || []).length}
              columns={TIMELINE_COLUMNS}
              visibleIds={timelineColMgmt.visibleIds}
              onSaveColumns={timelineColMgmt.setColumns}
              onResetColumns={timelineColMgmt.resetColumns}
            />
            {relLoading ? <Spinner aria-label="Loading releases" /> : (
              <div className="app-table-scroll app-table-wide">
              <Table aria-label="Release timeline" variant="compact">
                <Thead>
                  <Tr>
                    {timelineColMgmt.isColumnVisible('version') && <Th sort={getRelSortParams(0)}>Version</Th>}
                    {timelineColMgmt.isColumnVisible('phase') && <Th sort={getRelSortParams(1)}>Phase</Th>}
                    {timelineColMgmt.isColumnVisible('gaDate') && <Th sort={getRelSortParams(2)}>GA Date</Th>}
                    {timelineColMgmt.isColumnVisible('zStream') && <Th sort={getRelSortParams(3)}>Current Z-Stream</Th>}
                    {timelineColMgmt.isColumnVisible('lastReleased') && <Th sort={getRelSortParams(4)}>Last Released</Th>}
                    {timelineColMgmt.isColumnVisible('nextRelease') && <Th sort={getRelSortParams(5)}>Next Release</Th>}
                    {timelineColMgmt.isColumnVisible('countdown') && <Th sort={getRelSortParams(6)}>Countdown</Th>}
                    {timelineColMgmt.isColumnVisible('history') && <Th>History</Th>}
                  </Tr>
                </Thead>
                <Tbody>
                  {sortedReleases.map(r => (
                    <ReleaseRow key={r.shortname} release={r} isColumnVisible={timelineColMgmt.isColumnVisible} />
                  ))}
                </Tbody>
              </Table>
              </div>
            )}
          </CardBody>
        </Card>
      </PageSection>

      <PageSection>
        <Card>
          <CardTitle>Release Checklist</CardTitle>
          <CardBody>
            <Toolbar>
              <ToolbarContent>
                <ToolbarItem>
                  <ComponentMultiSelect
                    id="cl-component"
                    selected={selectedChecklistComps}
                    options={jiraComponents ?? []}
                    onChange={setSelectedChecklistComps}
                  />
                </ToolbarItem>
                <ToolbarItem>
                  <ToggleGroup>
                    <ToggleGroupItem text="Open" isSelected={checklistStatus === 'open'} onChange={() => setChecklistStatus('open')} />
                    <ToggleGroupItem text="All" isSelected={checklistStatus === 'all'} onChange={() => setChecklistStatus('all')} />
                  </ToggleGroup>
                </ToolbarItem>
                {availableVersions.length > 0 && (
                  <ToolbarItem>
                    <Select
                      role="menu"
                      isOpen={versionFilterOpen}
                      onOpenChange={setVersionFilterOpen}
                      onSelect={(_e, val) => toggleVersion(val as string)}
                      toggle={(ref) => (
                        <MenuToggle ref={ref} onClick={() => setVersionFilterOpen(!versionFilterOpen)} isExpanded={versionFilterOpen}>
                          {versionFilterLabel}
                        </MenuToggle>
                      )}
                    >
                      <SelectList>
                        {availableVersions.map(ver => (
                          <SelectOption key={ver} value={ver} hasCheckbox isSelected={selectedVersions.has(ver)}>
                            {ver}
                          </SelectOption>
                        ))}
                      </SelectList>
                    </Select>
                  </ToolbarItem>
                )}
              </ToolbarContent>
            </Toolbar>

            <TableToolbar
              searchValue={checklistSearch}
              onSearchChange={setChecklistSearch}
              searchPlaceholder="Search by key, summary, assignee, version..."
              resultCount={sortedChecklist.length}
              totalCount={(checklist || []).length}
              columns={CHECKLIST_COLUMNS}
              visibleIds={checklistColMgmt.visibleIds}
              onSaveColumns={checklistColMgmt.setColumns}
              onResetColumns={checklistColMgmt.resetColumns}
            />

            {clError ? (
              <Alert variant="danger" isInline title="Failed to load release checklist" className="app-mb-md">
                {(clError as Error).message || 'Jira may be unavailable. Check your VPN connection and try again.'}
              </Alert>
            ) : clLoading ? (
              <Spinner aria-label="Loading checklist" />
            ) : !checklist || checklist.length === 0 ? (
              <Content component="p" className="app-p-lg app-text-muted">No checklist tasks found.</Content>
            ) : (
              <>
                <Content component="small" className="app-mb-sm">
                  {filteredChecklist.length === checklist.length
                    ? `${checklist.length} tasks`
                    : `${filteredChecklist.length} of ${checklist.length} tasks`}
                </Content>
                <div className="app-table-scroll app-table-wide">
                <Table aria-label="Release checklist" variant="compact">
                  <Thead>
                    <Tr>
                      {checklistColMgmt.isColumnVisible('version') && <Th sort={getClSortParams(0)}>Version</Th>}
                      {checklistColMgmt.isColumnVisible('key') && <Th sort={getClSortParams(1)}>Key</Th>}
                      {checklistColMgmt.isColumnVisible('summary') && <Th sort={getClSortParams(2)}>Summary</Th>}
                      {checklistColMgmt.isColumnVisible('status') && <Th sort={getClSortParams(3)}>Status</Th>}
                      {checklistColMgmt.isColumnVisible('component') && selectedChecklistComps.size !== 1 && <Th sort={getClSortParams(4)}>Component</Th>}
                      {checklistColMgmt.isColumnVisible('assignee') && <Th sort={getClSortParams(5)}>Assignee</Th>}
                      {checklistColMgmt.isColumnVisible('priority') && <Th sort={getClSortParams(6)}>Priority</Th>}
                      {checklistColMgmt.isColumnVisible('subtasks') && <Th sort={getClSortParams(7)}>Subtasks</Th>}
                      {checklistColMgmt.isColumnVisible('updated') && <Th sort={getClSortParams(8)}>Updated</Th>}
                      {checklistColMgmt.isColumnVisible('actions') && <Th>Actions</Th>}
                    </Tr>
                  </Thead>
                  <Tbody>
                    {sortedChecklist.map(t => (
                      <Tr key={t.key}>
                        {checklistColMgmt.isColumnVisible('version') && <Td className="app-cell-nowrap"><Label color="blue" isCompact>{t.fixVersions[0] || '--'}</Label></Td>}
                        {checklistColMgmt.isColumnVisible('key') && (
                          <Td className="app-cell-nowrap">
                            <a href={`https://issues.redhat.com/browse/${t.key}`} target="_blank" rel="noreferrer" aria-label="Open in Jira">
                              {t.key} <ExternalLinkAltIcon className="app-text-xs" />
                            </a>
                          </Td>
                        )}
                        {checklistColMgmt.isColumnVisible('summary') && <Td style={{ maxWidth: 350 }}><Tooltip content={t.summary}><Truncate content={t.summary} trailingNumChars={0} /></Tooltip></Td>}
                        {checklistColMgmt.isColumnVisible('status') && <Td className="app-cell-nowrap">{statusBadge(t.status)}</Td>}
                        {checklistColMgmt.isColumnVisible('component') && selectedChecklistComps.size !== 1 && <Td className="app-cell-nowrap">{t.components?.[0] || <span className="app-text-muted">--</span>}</Td>}
                        {checklistColMgmt.isColumnVisible('assignee') && <Td className="app-cell-nowrap">{t.assignee || <span className="app-text-muted">Unassigned</span>}</Td>}
                        {checklistColMgmt.isColumnVisible('priority') && <Td className="app-cell-nowrap">{t.priority}</Td>}
                        {checklistColMgmt.isColumnVisible('subtasks') && <Td className="app-cell-nowrap">{progressBar(t.subtasksDone, t.subtaskCount)} {t.subtasksDone}/{t.subtaskCount}</Td>}
                        {checklistColMgmt.isColumnVisible('updated') && (
                          <Td className="app-cell-nowrap">
                            <Tooltip content={new Date(t.updated).toLocaleString()}>
                              <span>{new Date(t.updated).toLocaleDateString()}</span>
                            </Tooltip>
                          </Td>
                        )}
                        {checklistColMgmt.isColumnVisible('actions') && (
                          <Td>
                            <Button variant="plain" size="sm" icon={<EditAltIcon />} onClick={() => setModalKey(t.key)} aria-label="Update" />
                          </Td>
                        )}
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </PageSection>

      {modalKey && (
        <ChecklistActionModal issueKey={modalKey} isOpen={!!modalKey} onClose={() => setModalKey(null)} />
      )}
    </>
  );
};

const ReleaseRow: React.FC<{ release: ReleaseInfo; isColumnVisible: (id: string) => boolean }> = ({ release: r, isColumnVisible }) => {
  const [expanded, setExpanded] = useState(false);
  const pastMilestones = r.milestones.filter(m => m.isPast);
  const displayDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--';

  return (
    <>
      <Tr>
        {isColumnVisible('version') && <Td className="app-cell-nowrap"><strong>{r.shortname.replace('cnv-', 'CNV ')}</strong></Td>}
        {isColumnVisible('phase') && <Td className="app-cell-nowrap">{phaseBadge(r.phase)}</Td>}
        {isColumnVisible('gaDate') && <Td className="app-cell-nowrap">{displayDate(r.gaDate)}</Td>}
        {isColumnVisible('zStream') && <Td className="app-cell-nowrap">{r.currentZStream ? <Label color="blue" isCompact>{r.currentZStream}</Label> : '--'}</Td>}
        {isColumnVisible('lastReleased') && (
          <Td className="app-cell-nowrap">
            {r.currentZStreamDate ? (
              <Tooltip content={`${r.daysSinceLastRelease ?? 0} days ago`}>
                <span>{displayDate(r.currentZStreamDate)}</span>
              </Tooltip>
            ) : '--'}
          </Td>
        )}
        {isColumnVisible('nextRelease') && <Td className="app-cell-nowrap">{r.nextRelease ? `${r.nextRelease.name.replace(/Batch |GA Stable Release|GA Release/g, '').trim()} (${displayDate(r.nextRelease.date)})` : '--'}</Td>}
        {isColumnVisible('countdown') && <Td className="app-cell-nowrap">{countdownBadge(r.daysUntilNext)}</Td>}
        {isColumnVisible('history') && (
          <Td>
            {pastMilestones.length > 0 && (
              <ExpandableSection
                toggleText={`${pastMilestones.length} releases`}
                isExpanded={expanded}
                onToggle={(_e, val) => setExpanded(val)}
              >
                <div style={{ fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
                  {pastMilestones.map((m, i) => (
                    <div key={i}>{displayDate(m.date)} &mdash; {m.name}</div>
                  ))}
                </div>
              </ExpandableSection>
            )}
          </Td>
        )}
      </Tr>
    </>
  );
};
