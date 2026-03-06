import React, { useEffect, useMemo, useState } from 'react';
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
  MenuToggle,
  Select,
  SelectOption,
  SelectList,
  Tooltip,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Tbody, Td } from '@patternfly/react-table';
import { SyncAltIcon, ExternalLinkAltIcon, RedoIcon } from '@patternfly/react-icons';
import { apiFetch } from '../api/client';
import { fetchReportForRange } from '../api/launches';
import { triggerPollNow } from '../api/poll';
import type { LaunchGroup, PublicConfig } from '@cnv-monitor/shared';
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

const SORT_ACCESSORS: Record<number, (g: LaunchGroup) => string | number | null> = {
  0: (g) => g.cnvVersion,
  1: (g) => g.tier,
  2: (g) => g.latestLaunch.status,
  3: (g) => g.passRate,
  4: (g) => g.totalTests,
  5: (g) => g.failedTests,
  6: (g) => g.latestLaunch.start_time,
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { lookbackMode, since, until, displayLabel } = useDate();
  const [versionFilter, setVersionFilter] = useState<string>('all');
  const [versionOpen, setVersionOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

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

  const versions = useMemo(() => {
    if (!report) return [];
    const set = new Set(report.groups.map((g) => g.cnvVersion));
    return ['all', ...Array.from(set).sort()];
  }, [report]);

  const filteredGroups = useMemo(() => {
    if (!report) return [];
    let groups = report.groups;
    if (versionFilter !== 'all') groups = groups.filter((g) => g.cnvVersion === versionFilter);
    if (statusFilter) groups = groups.filter((g) => g.latestLaunch.status === statusFilter);
    return groups;
  }, [report, versionFilter, statusFilter]);

  const { sorted: sortedGroups, getSortParams } = useTableSort(filteredGroups, SORT_ACCESSORS, { index: 6, direction: SortByDirection.desc });

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
                {versions.length > 2 && (
                  <ToolbarItem>
                    <Select
                      isOpen={versionOpen}
                      onOpenChange={setVersionOpen}
                      onSelect={(_e, val) => { setVersionFilter(val as string); setVersionOpen(false); }}
                      selected={versionFilter}
                      toggle={(ref) => (
                        <MenuToggle ref={ref} onClick={() => setVersionOpen(!versionOpen)} isExpanded={versionOpen}>
                          {versionFilter === 'all' ? 'All Versions' : `CNV ${versionFilter}`}
                        </MenuToggle>
                      )}
                    >
                      <SelectList>
                        {versions.map((v) => (
                          <SelectOption key={v} value={v}>{v === 'all' ? 'All Versions' : `CNV ${v}`}</SelectOption>
                        ))}
                      </SelectList>
                    </Select>
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
        <AckBanner />
        <HealthBanner
          health={report.overallHealth}
          passed={report.passedLaunches}
          failed={report.failedLaunches}
          inProgress={report.inProgressLaunches}
        />

        <Gallery hasGutter minWidths={{ default: '130px' }} style={{ marginBottom: 24 }}>
          <GalleryItem>
            <StatCard
              value={report.totalLaunches}
              label="Total"
              help="Total number of launches (test runs) in the selected time range. Click to clear filters."
              onClick={() => setStatusFilter(null)}
              isActive={statusFilter === null}
            />
          </GalleryItem>
          <GalleryItem>
            <StatCard
              value={report.passedLaunches}
              label="Passed"
              help="Launches where all tests passed. Click to filter the table to only passed launches."
              color="var(--pf-t--global--color--status--success--default)"
              onClick={() => setStatusFilter(statusFilter === 'PASSED' ? null : 'PASSED')}
              isActive={statusFilter === 'PASSED'}
            />
          </GalleryItem>
          <GalleryItem>
            <StatCard
              value={report.failedLaunches}
              label="Failed"
              help="Launches with at least one failed test. Click to filter the table to only failed launches."
              color="var(--pf-t--global--color--status--danger--default)"
              onClick={() => setStatusFilter(statusFilter === 'FAILED' ? null : 'FAILED')}
              isActive={statusFilter === 'FAILED'}
            />
          </GalleryItem>
          <GalleryItem>
            <StatCard
              value={report.inProgressLaunches}
              label="In Progress"
              help="Launches that are still running and have not finished yet."
              color="var(--pf-t--global--color--status--warning--default)"
              onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? null : 'IN_PROGRESS')}
              isActive={statusFilter === 'IN_PROGRESS'}
            />
          </GalleryItem>
          <GalleryItem>
            <StatCard
              value={report.newFailures.length}
              label="New Failures"
              help="Tests that failed in the current window but were NOT failing in the equivalent previous window. For example, in 7d view these are tests that failed this week but didn't fail last week."
              color="var(--pf-t--global--color--status--danger--default)"
              onClick={() => navigate('/failures')}
            />
          </GalleryItem>
          <GalleryItem>
            <StatCard
              value={report.untriagedCount}
              label="Untriaged"
              help="Failed tests that have not been classified yet (no defect type set). Click to go to the triage page."
              color="var(--pf-t--global--color--status--warning--default)"
              onClick={() => navigate('/failures')}
            />
          </GalleryItem>
        </Gallery>

        <Card>
          <CardBody>
            <Table aria-label="Launch status table">
              <Thead>
                <Tr>
                  <ThWithHelp label="Version" help="CNV version (e.g. 4.18, 4.19, 4.20). Extracted from launch attributes or name." sort={getSortParams(0)} />
                  <ThWithHelp label="Tier" help="Test tier (T1, T2) and variant (gating, ocs, ocs-nonpriv). Higher tiers = more tests." sort={getSortParams(1)} />
                  <ThWithHelp label="Status" help="Launch status: PASSED (all tests ok), FAILED (has failures), IN_PROGRESS (still running), STOPPED, INTERRUPTED." sort={getSortParams(2)} />
                  <ThWithHelp label="Pass Rate" help="Aggregated pass rate across all launches for this version/tier in the selected window. Hover the bar for breakdown: launch count, passed/failed/skipped totals. Green >= 95%, Yellow >= 80%, Red < 80%." sort={getSortParams(3)} />
                  <ThWithHelp label="Tests" help="Passed / Total test count aggregated across all launches for this version/tier in the selected window." sort={getSortParams(4)} />
                  <ThWithHelp label="Failed" help="Total failed test items aggregated across all launches for this version/tier in the selected window." sort={getSortParams(5)} />
                  <ThWithHelp label="Last Run" help="Date and time the latest launch started. Hover for full timestamp." sort={getSortParams(6)} />
                  <ThWithHelp label="RP" help="Direct link to this launch in ReportPortal." />
                </Tr>
              </Thead>
              <Tbody>
                {sortedGroups.map((g) => (
                  <Tr
                    key={`${g.cnvVersion}-${g.tier}`}
                    isClickable
                    onRowClick={() => {
                      if (g.launches.length > 1) {
                        const ids = g.launches.map(l => l.rp_id).join(',');
                        navigate(`/launch/${g.latestLaunch.rp_id}?launches=${ids}&version=${encodeURIComponent(g.cnvVersion)}&tier=${encodeURIComponent(g.tier)}`);
                      } else {
                        navigate(`/launch/${g.latestLaunch.rp_id}`);
                      }
                    }}
                  >
                    <Td dataLabel="Version"><strong>{g.cnvVersion}</strong></Td>
                    <Td dataLabel="Tier">{g.tier}</Td>
                    <Td dataLabel="Status"><StatusBadge status={g.latestLaunch.status} /></Td>
                    <Td dataLabel="Pass Rate">
                      <PassRateBar
                        rate={g.passRate}
                        passed={g.passedTests}
                        total={g.totalTests}
                        failed={g.failedTests}
                        skipped={g.skippedTests}
                        launchName={g.latestLaunch.name}
                        startTime={g.latestLaunch.start_time}
                        launchCount={g.launches.length}
                      />
                    </Td>
                    <Td dataLabel="Tests">{g.passedTests}/{g.totalTests}</Td>
                    <Td dataLabel="Failed">{g.failedTests}</Td>
                    <Td dataLabel="Last Run">
                      <Tooltip content={new Date(g.latestLaunch.start_time).toLocaleString()}>
                        <span style={{ cursor: 'help' }}>
                          {new Date(g.latestLaunch.start_time).toLocaleDateString()} {new Date(g.latestLaunch.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </Tooltip>
                    </Td>
                    <Td dataLabel="RP" onClick={(e) => e.stopPropagation()}>
                      {config && (
                        <a href={`${config.rpLaunchBaseUrl}/${g.latestLaunch.rp_id}`} target="_blank" rel="noreferrer">
                          <ExternalLinkAltIcon />
                        </a>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </CardBody>
        </Card>
      </PageSection>

    </>
  );
};
