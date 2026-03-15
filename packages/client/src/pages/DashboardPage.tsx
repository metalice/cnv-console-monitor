import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Gallery,
  GalleryItem,
  Flex,
  FlexItem,
  Button,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Spinner,
  Tooltip,
  Alert,
  Label,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Tbody, Td } from '@patternfly/react-table';
import { SyncAltIcon, ExternalLinkAltIcon, RedoIcon } from '@patternfly/react-icons';
import { apiFetch } from '../api/client';
import { fetchReportForRange } from '../api/launches';
import { fetchReleases } from '../api/releases';
import { triggerPollNow } from '../api/poll';
import type { LaunchGroup, PublicConfig, ReleaseInfo } from '@cnv-monitor/shared';
import { useDate } from '../context/DateContext';
import { SortByDirection } from '@patternfly/react-table';
import { useTableSort } from '../hooks/useTableSort';
import { StatusBadge } from '../components/common/StatusBadge';
import { PassRateBar } from '../components/common/PassRateBar';
import { HealthBanner } from '../components/common/HealthBanner';
import { AckBanner } from '../components/common/AckBanner';
import { ExportButton } from '../components/common/ExportButton';
import { StatCard } from '../components/common/StatCard';
import { ThWithHelp } from '../components/common/ThWithHelp';
import { AcknowledgeModal } from '../components/modals/AcknowledgeModal';
import { LaunchProgress } from '../components/common/LaunchProgress';
import { ComponentMultiSelect } from '../components/common/ComponentMultiSelect';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { TableToolbar } from '../components/common/TableToolbar';
import { usePreferences } from '../context/PreferencesContext';
import { useColumnManagement, type ColumnDef } from '../hooks/useColumnManagement';

const DASHBOARD_COLUMNS: ColumnDef[] = [
  { id: 'version', title: 'Version' },
  { id: 'tier', title: 'Tier' },
  { id: 'component', title: 'Component', isDefault: false },
  { id: 'status', title: 'Status' },
  { id: 'passRate', title: 'Pass Rate' },
  { id: 'tests', title: 'Tests' },
  { id: 'failed', title: 'Failed' },
  { id: 'lastRun', title: 'Last Run' },
  { id: 'rp', title: 'RP' },
];

const SORT_ACCESSORS: Record<number, (g: LaunchGroup) => string | number | null> = {
  0: (g) => g.cnvVersion,
  1: (g) => g.tier,
  2: (g) => g.component ?? '',
  3: (g) => g.latestLaunch.status,
  4: (g) => g.passRate,
  5: (g) => g.totalTests,
  6: (g) => g.failedTests,
  7: (g) => g.latestLaunch.start_time,
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lookbackMode, since, until, displayLabel } = useDate();
  const [ackModalOpen, setAckModalOpen] = useState(false);
  const { preferences, loaded: prefsLoaded, setPreference } = usePreferences();
  const [selectedComponents, setSelectedComponentsState] = useState<Set<string>>(new Set());
  const [versionFilter, setVersionFilterState] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const prefsAppliedRef = useRef(false);
  useEffect(() => {
    if (prefsLoaded && !prefsAppliedRef.current) {
      prefsAppliedRef.current = true;
      if (preferences.dashboardComponents?.length) setSelectedComponentsState(new Set(preferences.dashboardComponents));
      if (preferences.dashboardVersion) setVersionFilterState(preferences.dashboardVersion);
    }
  }, [prefsLoaded, preferences.dashboardComponents, preferences.dashboardVersion]);

  const setSelectedComponents = (val: Set<string>) => { setSelectedComponentsState(val); setPreference('dashboardComponents', [...val]); };
  const setVersionFilter = (val: string) => { setVersionFilterState(val); setPreference('dashboardVersion', val); };
  const [tableSearch, setTableSearch] = useState('');
  const colMgmt = useColumnManagement('dashboard', DASHBOARD_COLUMNS);

  useEffect(() => { document.title = 'Dashboard | CNV Console Monitor'; }, []);

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => apiFetch<PublicConfig>('/config'),
    staleTime: Infinity,
  });

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['report', lookbackMode, since, until],
    queryFn: () => fetchReportForRange(since, until),
  });

  const pollNow = useMutation({
    mutationFn: triggerPollNow,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['report'] }),
  });

  const { data: releases } = useQuery({
    queryKey: ['releases'],
    queryFn: fetchReleases,
    staleTime: 10 * 60 * 1000,
  });

  const upcomingReleases = useMemo(() => {
    if (!releases) return [];
    return releases
      .filter((r: ReleaseInfo) => r.daysUntilNext !== null && r.daysUntilNext <= 7)
      .sort((a: ReleaseInfo, b: ReleaseInfo) => (a.daysUntilNext ?? Infinity) - (b.daysUntilNext ?? Infinity));
  }, [releases]);

  const availableComponents = useMemo(() => {
    return report?.components ?? [];
  }, [report]);

  const versions = useMemo(() => {
    if (!report) return [];
    let groups = report.groups;
    if (selectedComponents.size > 0) groups = groups.filter((g) => selectedComponents.has(g.component ?? ''));
    const set = new Set(groups.map((g) => g.cnvVersion));
    return ['all', ...Array.from(set).sort()];
  }, [report, selectedComponents]);

  const filteredGroups = useMemo(() => {
    if (!report) return [];
    let groups = report.groups;
    if (selectedComponents.size > 0) groups = groups.filter((g) => selectedComponents.has(g.component ?? ''));
    if (versionFilter !== 'all') groups = groups.filter((g) => g.cnvVersion === versionFilter);
    if (statusFilter) groups = groups.filter((g) => g.latestLaunch.status === statusFilter);
    return groups;
  }, [report, selectedComponents, versionFilter, statusFilter]);

  const scopedStats = useMemo(() => {
    const allLaunches = filteredGroups.flatMap((g) => g.launches);
    return {
      total: allLaunches.length,
      passed: allLaunches.filter((l) => l.status === 'PASSED').length,
      failed: allLaunches.filter((l) => l.status === 'FAILED').length,
      inProgress: allLaunches.filter((l) => l.status === 'IN_PROGRESS').length,
      newFailures: report?.newFailures.filter((f) => {
        if (selectedComponents.size === 0) return true;
        return filteredGroups.some((g) => g.failedItems.some((i) => i.rp_id === f.rp_id));
      }).length ?? 0,
      untriaged: selectedComponents.size === 0 ? (report?.untriagedCount ?? 0) : filteredGroups.flatMap(g => g.failedItems).filter(i => !i.defect_type || i.defect_type === 'ti001' || i.defect_type?.startsWith('ti_')).length,
    };
  }, [filteredGroups, report, selectedComponents]);

  const scopedHealth = scopedStats.failed > 0 ? 'red' : scopedStats.inProgress > 0 ? 'yellow' : 'green' as const;

  const { sorted: sortedGroupsRaw, getSortParams } = useTableSort(filteredGroups, SORT_ACCESSORS, { index: 7, direction: SortByDirection.desc });

  const sortedGroups = useMemo(() => {
    if (!tableSearch.trim()) return sortedGroupsRaw;
    const s = tableSearch.toLowerCase();
    return sortedGroupsRaw.filter(g =>
      g.cnvVersion.toLowerCase().includes(s)
      || g.tier.toLowerCase().includes(s)
      || (g.component ?? '').toLowerCase().includes(s)
      || g.latestLaunch.status.toLowerCase().includes(s)
    );
  }, [sortedGroupsRaw, tableSearch]);

  const showComponentCol = availableComponents.length > 1 || colMgmt.isColumnVisible('component');

  if (isLoading || !report) {
    return (
      <PageSection isFilled>
        <Spinner aria-label="Loading dashboard" />
      </PageSection>
    );
  }

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">Dashboard</Content>
          </FlexItem>
          <FlexItem>
            <Toolbar>
              <ToolbarContent>
                {availableComponents.length > 0 && (
                  <ToolbarItem>
                    <ComponentMultiSelect
                      id="component-filter"
                      selected={selectedComponents}
                      options={availableComponents}
                      onChange={(val) => { setSelectedComponents(val); setVersionFilter('all'); }}
                    />
                  </ToolbarItem>
                )}
                {versions.length > 2 && (
                  <ToolbarItem>
                    <SearchableSelect
                      id="version-filter"
                      value={versionFilter}
                      options={versions.map((v) => ({
                        value: v,
                        label: v === 'all' ? 'All Versions' : `CNV ${v}`,
                      }))}
                      onChange={(val) => setVersionFilter(val)}
                      placeholder="All Versions"
                    />
                  </ToolbarItem>
                )}
                <ToolbarItem>
                  <ExportButton groups={filteredGroups} date={displayLabel} />
                </ToolbarItem>
                <ToolbarItem>
                  <Button variant="secondary" icon={<SyncAltIcon />} onClick={() => refetch()}>Refresh</Button>
                </ToolbarItem>
                <ToolbarItem>
                  <Button variant="secondary" icon={<RedoIcon />} onClick={() => pollNow.mutate()} isLoading={pollNow.isPending}>Poll Now</Button>
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <AckBanner onAcknowledge={() => setAckModalOpen(true)} />
        {upcomingReleases.length > 0 && (
          <Alert variant="warning" isInline title="Upcoming Releases" className="app-mb-md">
            {upcomingReleases.map(r => (
              <Label key={r.shortname} color={r.daysUntilNext! <= 3 ? 'red' : 'orange'} className="app-mr-sm">
                {r.shortname.replace('cnv-', 'CNV ')} &mdash; {r.nextRelease?.date} ({r.daysUntilNext}d)
              </Label>
            ))}
          </Alert>
        )}
        <HealthBanner
          health={scopedHealth}
          passed={scopedStats.passed}
          failed={scopedStats.failed}
          inProgress={scopedStats.inProgress}
        />

        <Gallery hasGutter minWidths={{ default: '130px' }} className="app-mb-xl">
          <GalleryItem>
            <StatCard
              value={scopedStats.total}
              label="Total"
              help="Total number of launches (test runs) in the selected time range. Click to clear filters."
              onClick={() => setStatusFilter(null)}
              isActive={statusFilter === null}
            />
          </GalleryItem>
          <GalleryItem>
            <StatCard
              value={scopedStats.passed}
              label="Passed"
              help="Launches where all tests passed. Click to filter the table to only passed launches."
              color="var(--pf-t--global--color--status--success--default)"
              onClick={() => setStatusFilter(statusFilter === 'PASSED' ? null : 'PASSED')}
              isActive={statusFilter === 'PASSED'}
            />
          </GalleryItem>
          <GalleryItem>
            <StatCard
              value={scopedStats.failed}
              label="Failed"
              help="Launches with at least one failed test. Click to filter the table to only failed launches."
              color="var(--pf-t--global--color--status--danger--default)"
              onClick={() => setStatusFilter(statusFilter === 'FAILED' ? null : 'FAILED')}
              isActive={statusFilter === 'FAILED'}
            />
          </GalleryItem>
          <GalleryItem>
            <StatCard
              value={scopedStats.inProgress}
              label="In Progress"
              help="Launches that are still running and have not finished yet."
              color="var(--pf-t--global--color--status--warning--default)"
              onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? null : 'IN_PROGRESS')}
              isActive={statusFilter === 'IN_PROGRESS'}
            />
          </GalleryItem>
          <GalleryItem>
            <StatCard
              value={scopedStats.newFailures}
              label="New Failures"
              help="Tests that failed in the current window but were NOT failing in the equivalent previous window."
              color="var(--pf-t--global--color--status--danger--default)"
              onClick={() => navigate('/failures')}
            />
          </GalleryItem>
          <GalleryItem>
            <StatCard
              value={scopedStats.untriaged}
              label="Untriaged"
              help="Failed tests that have not been classified yet (no defect type set). Click to go to the triage page."
              color="var(--pf-t--global--color--status--warning--default)"
              onClick={() => navigate('/failures')}
            />
          </GalleryItem>
        </Gallery>

        <Card>
          <CardBody>
            <TableToolbar
              searchValue={tableSearch}
              onSearchChange={setTableSearch}
              searchPlaceholder="Search by version, tier, component..."
              resultCount={sortedGroups.length}
              totalCount={filteredGroups.length}
              columns={DASHBOARD_COLUMNS}
              visibleIds={colMgmt.visibleIds}
              onSaveColumns={colMgmt.setColumns}
              onResetColumns={colMgmt.resetColumns}
            />
            <div className="app-table-scroll">
              <Table aria-label="Launch status table" variant="compact" isStickyHeader>
                <Thead>
                  <Tr>
                    {colMgmt.isColumnVisible('version') && <ThWithHelp label="Version" help="CNV version" sort={getSortParams(0)} />}
                    {colMgmt.isColumnVisible('tier') && <ThWithHelp label="Tier" help="Test tier and variant" sort={getSortParams(1)} />}
                    {showComponentCol && colMgmt.isColumnVisible('component') && <ThWithHelp label="Component" help="Jira component mapped from Jenkins team" sort={getSortParams(2)} />}
                    {colMgmt.isColumnVisible('status') && <ThWithHelp label="Status" help="Launch status" sort={getSortParams(3)} />}
                    {colMgmt.isColumnVisible('passRate') && <ThWithHelp label="Pass Rate" help="Aggregated pass rate" sort={getSortParams(4)} />}
                    {colMgmt.isColumnVisible('tests') && <ThWithHelp label="Tests" help="Passed / Total" sort={getSortParams(5)} />}
                    {colMgmt.isColumnVisible('failed') && <ThWithHelp label="Failed" help="Failed test count" sort={getSortParams(6)} />}
                    {colMgmt.isColumnVisible('lastRun') && <ThWithHelp label="Last Run" help="Start time of the latest launch" sort={getSortParams(7)} />}
                    {colMgmt.isColumnVisible('rp') && <ThWithHelp label="RP" help="Link to ReportPortal" />}
                  </Tr>
                </Thead>
                <Tbody>
                  {sortedGroups.length === 0 && (
                    <Tr><Td colSpan={colMgmt.visibleColumns.length}><EmptyState variant="sm"><EmptyStateBody>No launches match the selected filters.</EmptyStateBody></EmptyState></Td></Tr>
                  )}
                  {sortedGroups.map((g) => (
                    <Tr
                      key={`${g.cnvVersion}-${g.tier}-${g.component}`}
                      isClickable
                      isHoverable
                      onRowClick={() => {
                        if (g.launches.length > 1) {
                          const ids = g.launches.map(l => l.rp_id).join(',');
                          navigate(`/launch/${g.latestLaunch.rp_id}?launches=${ids}&version=${encodeURIComponent(g.cnvVersion)}&tier=${encodeURIComponent(g.tier)}`);
                        } else {
                          navigate(`/launch/${g.latestLaunch.rp_id}`);
                        }
                      }}
                    >
                      {colMgmt.isColumnVisible('version') && <Td dataLabel="Version" className="app-cell-nowrap"><strong>{g.cnvVersion}</strong></Td>}
                      {colMgmt.isColumnVisible('tier') && <Td dataLabel="Tier" className="app-cell-nowrap">{g.tier}</Td>}
                      {showComponentCol && colMgmt.isColumnVisible('component') && <Td dataLabel="Component" className="app-cell-nowrap"><Label color="grey" isCompact>{g.component || '--'}</Label></Td>}
                      {colMgmt.isColumnVisible('status') && (
                        <Td dataLabel="Status" className="app-cell-nowrap">
                          {g.latestLaunch.status === 'IN_PROGRESS' ? (
                            <LaunchProgress launchRpId={g.latestLaunch.rp_id} />
                          ) : (
                            <StatusBadge status={g.latestLaunch.status} />
                          )}
                        </Td>
                      )}
                      {colMgmt.isColumnVisible('passRate') && (
                        <Td dataLabel="Pass Rate" className="app-cell-nowrap">
                          <PassRateBar rate={g.passRate} passed={g.passedTests} total={g.totalTests} failed={g.failedTests} skipped={g.skippedTests} launchName={g.latestLaunch.name} startTime={g.latestLaunch.start_time} launchCount={g.launches.length} />
                        </Td>
                      )}
                      {colMgmt.isColumnVisible('tests') && <Td dataLabel="Tests" className="app-cell-nowrap">{g.passedTests}/{g.totalTests}</Td>}
                      {colMgmt.isColumnVisible('failed') && <Td dataLabel="Failed" className="app-cell-nowrap">{g.failedTests}</Td>}
                      {colMgmt.isColumnVisible('lastRun') && (
                        <Td dataLabel="Last Run" className="app-cell-nowrap">
                          <Tooltip content={new Date(g.latestLaunch.start_time).toLocaleString()}>
                            <span className="app-cursor-help">
                              {new Date(g.latestLaunch.start_time).toLocaleDateString()} {new Date(g.latestLaunch.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </Tooltip>
                        </Td>
                      )}
                      {colMgmt.isColumnVisible('rp') && (
                        <Td dataLabel="RP" onClick={(e) => e.stopPropagation()}>
                          {config && (
                            <a href={`${config.rpLaunchBaseUrl}/${g.latestLaunch.rp_id}`} target="_blank" rel="noreferrer" aria-label="Open in ReportPortal">
                              <ExternalLinkAltIcon />
                            </a>
                          )}
                        </Td>
                      )}
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          </CardBody>
        </Card>
      </PageSection>

      <AcknowledgeModal
        isOpen={ackModalOpen}
        onClose={() => setAckModalOpen(false)}
        groups={report.groups}
      />
    </>
  );
};
