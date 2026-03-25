import React, { useEffect, useMemo, useState } from 'react';

import {
  type ActivityEntry,
  type ActivityFilterPreset,
  type ApproverStat,
  timeAgo,
} from '@cnv-monitor/shared';

import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Grid,
  GridItem,
  PageSection,
  Tooltip,
} from '@patternfly/react-core';
import { ArrowDownIcon, ArrowUpIcon, ExchangeAltIcon } from '@patternfly/react-icons';
import {
  SortByDirection,
  Table,
  Tbody,
  Td,
  Thead,
  type ThProps,
  Tr,
} from '@patternfly/react-table';
import { useQuery } from '@tanstack/react-query';

import { fetchAckStats } from '../api/acknowledgment';
import {
  fetchActivity,
  fetchActivityMeta,
  fetchActivitySummary,
  fetchPinnedActivity,
} from '../api/activity';
import { ActivityDrawerPanel } from '../components/activity/ActivityDrawer';
import { ActivityTable } from '../components/activity/ActivityTable';
import { ActivityToolbar } from '../components/activity/ActivityToolbar';
import { ComponentChart } from '../components/activity/ComponentChart';
import { ReviewCalendar } from '../components/activity/ReviewCalendar';
import { ThWithHelp } from '../components/common/ThWithHelp';
import { useAuth } from '../context/AuthContext';
import { LOOKBACK_HOURS, useDate } from '../context/DateContext';
import { usePreferences } from '../context/PreferencesContext';
import { useActivityFilters } from '../hooks/useActivityFilters';
import { useTableSort } from '../hooks/useTableSort';

const PAGE_SIZE = 25;

const computeReviewerStreak = (
  dates: string[],
  totalDays: number,
): { current: number; longest: number; coverage: number } => {
  if (dates.length === 0) {
    return { coverage: 0, current: 0, longest: 0 };
  }
  const set = new Set(dates);
  const today = new Date();
  const toStr = (date: Date) => date.toISOString().split('T')[0];

  let current = 0;
  const cursorDate = new Date(today);
  if (!set.has(toStr(cursorDate))) {
    cursorDate.setDate(cursorDate.getDate() - 1);
  }
  while (set.has(toStr(cursorDate))) {
    current++;
    cursorDate.setDate(cursorDate.getDate() - 1);
  }

  let longest = 0,
    streak = 0;
  for (let i = totalDays - 1; i >= 0; i--) {
    const check = new Date(today);
    check.setDate(check.getDate() - i);
    if (set.has(toStr(check))) {
      streak++;
      if (streak > longest) {
        longest = streak;
      }
    } else {
      streak = 0;
    }
  }

  let weekdays = 0;
  for (let i = 0; i < totalDays; i++) {
    const check = new Date(today);
    check.setDate(check.getDate() - i);
    if (check.getDay() !== 0 && check.getDay() !== 6) {
      weekdays++;
    }
  }

  return {
    coverage: weekdays > 0 ? Math.round((dates.length / weekdays) * 100) : 0,
    current,
    longest,
  };
};

const TrendSparkline: React.FC<{ dates: string[] }> = ({ dates }) => {
  const set = new Set(dates);
  const today = new Date();
  const dots: boolean[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayDate = new Date(today);
    dayDate.setDate(dayDate.getDate() - i);
    dots.push(set.has(dayDate.toISOString().split('T')[0]));
  }
  return (
    <svg className="app-sparkline" height="12" viewBox="0 0 60 12" width="60">
      {dots.map((active, i) => (
        <circle
          cx={i * 2 + 1}
          cy={6}
          fill={
            active
              ? 'var(--pf-t--global--color--status--success--default)'
              : 'var(--pf-t--global--border--color--default)'
          }
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          r={0.8}
        />
      ))}
    </svg>
  );
};

type EnrichedApprover = ApproverStat & { current: number; longest: number; coverage: number };

const REVIEWER_ACCESSORS: Record<number, (approver: EnrichedApprover) => string | number | null> = {
  0: approver => approver.reviewer,
  1: approver => approver.totalReviews,
  2: approver => approver.coverage,
  3: approver => approver.current,
  4: approver => approver.lastReviewDate,
};

const DeltaStat: React.FC<{ label: string; value: number; prev?: number }> = ({
  label,
  prev,
  value,
}) => {
  const diff = prev != null ? value - prev : 0;
  return (
    <div className="app-digest-stat">
      <span className="app-digest-value">{value.toLocaleString()}</span>
      <span className="app-text-xs app-text-muted">{label}</span>
      {prev != null && diff !== 0 && (
        <span className={`app-text-xs ${diff > 0 ? 'app-text-success' : 'app-text-danger'}`}>
          {diff > 0 ? <ArrowUpIcon /> : <ArrowDownIcon />} {Math.abs(diff)}
        </span>
      )}
    </div>
  );
};

type ReviewerStatsSectionProps = {
  getApproverSortParams: (columnIndex: number) => ThProps['sort'];
  sortedApprovers: EnrichedApprover[];
};

const ReviewerStatsSection = ({
  getApproverSortParams,
  sortedApprovers,
}: ReviewerStatsSectionProps) => (
  <GridItem md={6} span={12}>
    <Card>
      <CardTitle>Reviewer Stats</CardTitle>
      <CardBody>
        <div className="app-table-scroll">
          <Table aria-label="Approver stats" variant="compact">
            <Thead>
              <Tr>
                <ThWithHelp
                  help="Person who acknowledged daily test results."
                  label="Reviewer"
                  sort={getApproverSortParams(0)}
                />
                <ThWithHelp
                  help="Total acknowledgments."
                  label="Reviews"
                  sort={getApproverSortParams(1)}
                />
                <ThWithHelp
                  help="Percentage of weekdays covered."
                  label="Coverage"
                  sort={getApproverSortParams(2)}
                />
                <ThWithHelp
                  help="Current consecutive days reviewing."
                  label="Streak"
                  sort={getApproverSortParams(3)}
                />
                <ThWithHelp help="Last 30 days. Filled = reviewed." label="Trend" />
                <ThWithHelp
                  help="Most recent acknowledgment."
                  label="Last"
                  sort={getApproverSortParams(4)}
                />
              </Tr>
            </Thead>
            <Tbody>
              {sortedApprovers.map(approver => (
                <Tr key={approver.reviewer}>
                  <Td dataLabel="Reviewer">
                    <strong>{approver.reviewer.split('@')[0]}</strong>
                  </Td>
                  <Td dataLabel="Reviews">{approver.totalReviews}</Td>
                  <Td dataLabel="Coverage">{approver.coverage}%</Td>
                  <Td dataLabel="Streak">
                    <Tooltip content={`Current: ${approver.current}d, Best: ${approver.longest}d`}>
                      <span>
                        {approver.current}d
                        {approver.longest > approver.current ? ` / ${approver.longest}d` : ''}
                      </span>
                    </Tooltip>
                  </Td>
                  <Td dataLabel="Trend">
                    <TrendSparkline dates={approver.reviewedDates} />
                  </Td>
                  <Td dataLabel="Last">
                    <Tooltip content={approver.lastReviewDate}>
                      <span>{timeAgo(new Date(approver.lastReviewDate).getTime())}</span>
                    </Tooltip>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  </GridItem>
);

export const ActivityPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<ActivityEntry | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const { lookbackMode, since, until } = useDate();
  const { user } = useAuth();
  const { preferences, setPreference } = usePreferences();
  const {
    clearAll,
    hasActiveLocalFilters,
    localFilters,
    setLocalFilters,
    statsFilters,
    tableFilters,
  } = useActivityFilters();

  useEffect(() => {
    document.title = 'Activity | CNV Console Monitor';
  }, []);
  useEffect(() => {
    setPreference('lastActivityViewedAt', Date.now());
  }, [setPreference]);
  useEffect(() => {
    setPage(1);
  }, [tableFilters]);

  const calendarDays = useMemo(() => {
    if (lookbackMode === 'range') {
      return Math.max(30, Math.ceil((until - since) / (24 * 60 * 60 * 1000)));
    }
    const hours = LOOKBACK_HOURS[lookbackMode];
    return Math.max(30, Math.ceil(hours / 24));
  }, [lookbackMode, since, until]);

  const { data: activityData, isLoading } = useQuery({
    queryFn: () => fetchActivity(PAGE_SIZE, (page - 1) * PAGE_SIZE, tableFilters),
    queryKey: ['activity', page, tableFilters],
  });

  const { data: summary } = useQuery({
    queryFn: () => fetchActivitySummary(statsFilters),
    queryKey: ['activitySummary', statsFilters],
  });

  const prevSince = useMemo(() => {
    const range = until - since;
    return new Date(since - range).toISOString();
  }, [since, until]);

  const { data: prevSummary } = useQuery({
    enabled: showComparison,
    queryFn: () =>
      fetchActivitySummary({
        component: statsFilters.component,
        since: prevSince,
        until: statsFilters.since,
      }),
    queryKey: ['activitySummary', 'prev', statsFilters.component, prevSince, statsFilters.since],
  });

  const { data: meta } = useQuery({
    queryFn: fetchActivityMeta,
    queryKey: ['activityMeta'],
    staleTime: 5 * 60 * 1000,
  });
  const { data: pinnedEntries } = useQuery({
    queryFn: fetchPinnedActivity,
    queryKey: ['pinnedActivity'],
    staleTime: 60 * 1000,
  });
  const { data: ackStats } = useQuery({
    queryFn: () => fetchAckStats(calendarDays),
    queryKey: ['ackStats', calendarDays],
  });

  const enrichedApprovers: EnrichedApprover[] = useMemo(
    () =>
      (ackStats?.approvers ?? []).map(approver => ({
        ...approver,
        ...computeReviewerStreak(approver.reviewedDates, calendarDays),
      })),
    [ackStats, calendarDays],
  );

  const { getSortParams: getApproverSortParams, sorted: sortedApprovers } = useTableSort(
    enrichedApprovers,
    REVIEWER_ACCESSORS,
    { direction: SortByDirection.desc, index: 1 },
  );

  const presets = preferences.activityPresets ?? [];
  const handleSavePreset = (name: string) => {
    const preset: ActivityFilterPreset = {
      dateRange: lookbackMode,
      filters: localFilters as Record<string, string | undefined>,
      name,
    };
    setPreference('activityPresets', [
      ...presets.filter(presetItem => presetItem.name !== name),
      preset,
    ]);
  };
  const handleLoadPreset = (preset: ActivityFilterPreset) => {
    setLocalFilters(preset.filters as typeof localFilters);
    setPage(1);
  };

  const actionTotal = (key: string) => summary?.byAction[key] ?? 0;
  const prevActionTotal = (key: string) => prevSummary?.byAction[key] ?? 0;

  const drawerContent = (
    <>
      <PageSection>
        <Content component="h1">
          Activity Feed
          <Button
            className="app-ml-md"
            icon={<ExchangeAltIcon />}
            size="sm"
            variant={showComparison ? 'primary' : 'secondary'}
            onClick={() => setShowComparison(wasShowing => !wasShowing)}
          >
            Compare
          </Button>
        </Content>
        <Content component="small">
          {summary ? `${summary.total.toLocaleString()} actions` : 'Loading...'}
        </Content>
      </PageSection>

      <PageSection>
        <Grid hasGutter>
          {ackStats && (
            <GridItem span={12}>
              <ReviewCalendar days={calendarDays} history={ackStats.history} />
            </GridItem>
          )}

          {summary && (
            <GridItem span={12}>
              <div className="app-digest-grid">
                <DeltaStat
                  label="Classifications"
                  prev={
                    showComparison
                      ? prevActionTotal('classify_defect') + prevActionTotal('bulk_classify_defect')
                      : undefined
                  }
                  value={actionTotal('classify_defect') + actionTotal('bulk_classify_defect')}
                />
                <DeltaStat
                  label="Jira Actions"
                  prev={
                    showComparison
                      ? prevActionTotal('create_jira') + prevActionTotal('link_jira')
                      : undefined
                  }
                  value={actionTotal('create_jira') + actionTotal('link_jira')}
                />
                <DeltaStat
                  label="Comments"
                  prev={showComparison ? prevActionTotal('add_comment') : undefined}
                  value={actionTotal('add_comment')}
                />
                <DeltaStat
                  label="Acknowledgments"
                  prev={showComparison ? prevActionTotal('acknowledge') : undefined}
                  value={actionTotal('acknowledge')}
                />
                {summary.byUser[0] && (
                  <DeltaStat
                    label={`Top: ${summary.byUser[0][0].split('@')[0]}`}
                    value={summary.byUser[0][1]}
                  />
                )}
              </div>
            </GridItem>
          )}

          {ackStats && sortedApprovers.length > 0 && (
            <ReviewerStatsSection
              getApproverSortParams={getApproverSortParams}
              sortedApprovers={sortedApprovers}
            />
          )}

          {summary && summary.byComponent.length > 0 && (
            <GridItem md={6} span={12}>
              <ComponentChart
                data={summary.byComponent}
                onComponentClick={comp =>
                  setLocalFilters(prevFilters => ({ ...prevFilters, component: comp }))
                }
              />
            </GridItem>
          )}

          <GridItem span={12}>
            <ActivityTable
              entries={activityData?.entries}
              isLoading={isLoading}
              page={page}
              pageSize={PAGE_SIZE}
              pinnedEntries={pinnedEntries}
              selectedId={selectedEntry?.id}
              toolbar={
                <ActivityToolbar
                  currentUser={user.name}
                  entries={activityData?.entries}
                  filters={localFilters}
                  hasActiveFilters={hasActiveLocalFilters}
                  presets={presets}
                  users={meta?.users ?? []}
                  onClearAll={() => {
                    clearAll();
                    setPage(1);
                  }}
                  onFiltersChange={nextFilters => {
                    setLocalFilters(nextFilters);
                    setPage(1);
                  }}
                  onLoadPreset={handleLoadPreset}
                  onSavePreset={handleSavePreset}
                />
              }
              total={activityData?.total ?? 0}
              onPageChange={setPage}
              onRowClick={setSelectedEntry}
            />
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );

  return (
    <Drawer
      isExpanded={Boolean(selectedEntry)}
      onExpand={() => {
        // no-op
      }}
    >
      <DrawerContent
        panelContent={
          selectedEntry ? (
            <ActivityDrawerPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
          ) : undefined
        }
      >
        <DrawerContentBody>{drawerContent}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};
