import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PageSection, Content, Card, CardBody, CardTitle,
  Drawer, DrawerContent, DrawerContentBody,
  EmptyState, EmptyStateBody, Grid, GridItem, Tooltip,
  Button, Flex, FlexItem, Label,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Tbody, Td, SortByDirection } from '@patternfly/react-table';
import { ExchangeAltIcon, ArrowUpIcon, ArrowDownIcon } from '@patternfly/react-icons';
import { timeAgo, type ApproverStat, type ActivityEntry, type ActivityFilterPreset } from '@cnv-monitor/shared';
import { fetchActivity, fetchActivityMeta, fetchActivitySummary, fetchPinnedActivity, type ActivitySummary } from '../api/activity';
import { fetchAckStats } from '../api/acknowledgment';
import { useDate, LOOKBACK_HOURS, type LookbackMode } from '../context/DateContext';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useActivityFilters } from '../hooks/useActivityFilters';
import { useTableSort } from '../hooks/useTableSort';
import { ThWithHelp } from '../components/common/ThWithHelp';
import { ActivityTable } from '../components/activity/ActivityTable';
import { ActivityToolbar } from '../components/activity/ActivityToolbar';
import { ActivityDrawerPanel } from '../components/activity/ActivityDrawer';
import { ReviewCalendar } from '../components/activity/ReviewCalendar';
import { ComponentChart } from '../components/activity/ComponentChart';

const PAGE_SIZE = 25;

const computeReviewerStreak = (dates: string[], totalDays: number): { current: number; longest: number; coverage: number } => {
  if (dates.length === 0) return { current: 0, longest: 0, coverage: 0 };
  const set = new Set(dates);
  const today = new Date();
  const toStr = (d: Date) => d.toISOString().split('T')[0];

  let current = 0;
  const d = new Date(today);
  if (!set.has(toStr(d))) d.setDate(d.getDate() - 1);
  while (set.has(toStr(d))) { current++; d.setDate(d.getDate() - 1); }

  let longest = 0, streak = 0;
  for (let i = totalDays - 1; i >= 0; i--) {
    const check = new Date(today);
    check.setDate(check.getDate() - i);
    if (set.has(toStr(check))) { streak++; if (streak > longest) longest = streak; } else { streak = 0; }
  }

  let weekdays = 0;
  for (let i = 0; i < totalDays; i++) {
    const check = new Date(today);
    check.setDate(check.getDate() - i);
    if (check.getDay() !== 0 && check.getDay() !== 6) weekdays++;
  }

  return { current, longest, coverage: weekdays > 0 ? Math.round((dates.length / weekdays) * 100) : 0 };
};

const TrendSparkline: React.FC<{ dates: string[] }> = ({ dates }) => {
  const set = new Set(dates);
  const today = new Date();
  const dots: boolean[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dots.push(set.has(d.toISOString().split('T')[0]));
  }
  return (
    <svg width="60" height="12" viewBox="0 0 60 12" className="app-sparkline">
      {dots.map((active, i) => (
        <circle key={i} cx={i * 2 + 1} cy={6} r={0.8} fill={active ? 'var(--pf-t--global--color--status--success--default)' : 'var(--pf-t--global--border--color--default)'} />
      ))}
    </svg>
  );
};

type EnrichedApprover = ApproverStat & { current: number; longest: number; coverage: number };

const REVIEWER_ACCESSORS: Record<number, (a: EnrichedApprover) => string | number | null> = {
  0: (a) => a.reviewer,
  1: (a) => a.totalReviews,
  2: (a) => a.coverage,
  3: (a) => a.current,
  4: (a) => a.lastReviewDate,
};

const DeltaStat: React.FC<{ label: string; value: number; prev?: number }> = ({ label, value, prev }) => {
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

export const ActivityPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<ActivityEntry | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const { since, until, lookbackMode } = useDate();
  const { user } = useAuth();
  const { preferences, setPreference } = usePreferences();
  const { tableFilters, statsFilters, localFilters, setLocalFilters, clearAll, hasActiveLocalFilters } = useActivityFilters();

  useEffect(() => { document.title = 'Activity | CNV Console Monitor'; }, []);
  useEffect(() => { setPreference('lastActivityViewedAt', Date.now()); }, [setPreference]);
  useEffect(() => { setPage(1); }, [tableFilters]);

  const calendarDays = useMemo(() => {
    if (lookbackMode === 'range') return Math.max(30, Math.ceil((until - since) / (24 * 60 * 60 * 1000)));
    const hours = LOOKBACK_HOURS[lookbackMode as Exclude<LookbackMode, 'range'>] ?? 24;
    return Math.max(30, Math.ceil(hours / 24));
  }, [lookbackMode, since, until]);

  const { data: activityData, isLoading } = useQuery({
    queryKey: ['activity', page, tableFilters],
    queryFn: () => fetchActivity(PAGE_SIZE, (page - 1) * PAGE_SIZE, tableFilters),
  });

  const { data: summary } = useQuery({
    queryKey: ['activitySummary', statsFilters.component, statsFilters.since, statsFilters.until],
    queryFn: () => fetchActivitySummary(statsFilters),
  });

  const prevSince = useMemo(() => {
    const range = until - since;
    return new Date(since - range).toISOString();
  }, [since, until]);

  const { data: prevSummary } = useQuery({
    queryKey: ['activitySummary', 'prev', statsFilters.component, prevSince, statsFilters.since],
    queryFn: () => fetchActivitySummary({ component: statsFilters.component, since: prevSince, until: statsFilters.since }),
    enabled: showComparison,
  });

  const { data: meta } = useQuery({ queryKey: ['activityMeta'], queryFn: fetchActivityMeta, staleTime: 5 * 60 * 1000 });
  const { data: pinnedEntries } = useQuery({ queryKey: ['pinnedActivity'], queryFn: fetchPinnedActivity, staleTime: 60 * 1000 });
  const { data: ackStats } = useQuery({ queryKey: ['ackStats', calendarDays], queryFn: () => fetchAckStats(calendarDays) });

  const enrichedApprovers: EnrichedApprover[] = useMemo(() =>
    (ackStats?.approvers ?? []).map(a => ({ ...a, ...computeReviewerStreak(a.reviewedDates, calendarDays) })),
    [ackStats, calendarDays],
  );

  const { sorted: sortedApprovers, getSortParams: getApproverSortParams } = useTableSort(
    enrichedApprovers, REVIEWER_ACCESSORS, { index: 1, direction: SortByDirection.desc },
  );

  const presets = preferences.activityPresets ?? [];
  const handleSavePreset = (name: string) => {
    const preset: ActivityFilterPreset = { name, filters: localFilters as Record<string, string | undefined>, dateRange: lookbackMode };
    setPreference('activityPresets', [...presets.filter(p => p.name !== name), preset]);
  };
  const handleLoadPreset = (preset: ActivityFilterPreset) => { setLocalFilters(preset.filters as typeof localFilters); setPage(1); };

  const actionTotal = (key: string) => summary?.byAction[key] ?? 0;
  const prevActionTotal = (key: string) => prevSummary?.byAction[key] ?? 0;

  const drawerContent = (
    <>
      <PageSection>
        <Content component="h1">
          Activity Feed
          <Button
            variant={showComparison ? 'primary' : 'secondary'}
            icon={<ExchangeAltIcon />}
            onClick={() => setShowComparison(v => !v)}
            size="sm"
            className="app-ml-md"
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
              <ReviewCalendar history={ackStats.history} days={calendarDays} />
            </GridItem>
          )}

          {summary && (
            <GridItem span={12}>
              <div className="app-digest-grid">
                <DeltaStat label="Classifications" value={actionTotal('classify_defect') + actionTotal('bulk_classify_defect')} prev={showComparison ? prevActionTotal('classify_defect') + prevActionTotal('bulk_classify_defect') : undefined} />
                <DeltaStat label="Jira Actions" value={actionTotal('create_jira') + actionTotal('link_jira')} prev={showComparison ? prevActionTotal('create_jira') + prevActionTotal('link_jira') : undefined} />
                <DeltaStat label="Comments" value={actionTotal('add_comment')} prev={showComparison ? prevActionTotal('add_comment') : undefined} />
                <DeltaStat label="Acknowledgments" value={actionTotal('acknowledge')} prev={showComparison ? prevActionTotal('acknowledge') : undefined} />
                {summary.byUser[0] && (
                  <DeltaStat label={`Top: ${(summary.byUser[0][0] as string).split('@')[0]}`} value={summary.byUser[0][1] as number} />
                )}
              </div>
            </GridItem>
          )}

          {ackStats && sortedApprovers.length > 0 && (
            <GridItem span={12} md={6}>
              <Card>
                <CardTitle>Reviewer Stats</CardTitle>
                <CardBody>
                  <div className="app-table-scroll">
                  <Table aria-label="Approver stats" variant="compact">
                    <Thead><Tr>
                      <ThWithHelp label="Reviewer" help="Person who acknowledged daily test results." sort={getApproverSortParams(0)} />
                      <ThWithHelp label="Reviews" help="Total acknowledgments." sort={getApproverSortParams(1)} />
                      <ThWithHelp label="Coverage" help="Percentage of weekdays covered." sort={getApproverSortParams(2)} />
                      <ThWithHelp label="Streak" help="Current consecutive days reviewing." sort={getApproverSortParams(3)} />
                      <ThWithHelp label="Trend" help="Last 30 days. Filled = reviewed." />
                      <ThWithHelp label="Last" help="Most recent acknowledgment." sort={getApproverSortParams(4)} />
                    </Tr></Thead>
                    <Tbody>{sortedApprovers.map((a) => (
                      <Tr key={a.reviewer}>
                        <Td dataLabel="Reviewer"><strong>{a.reviewer.split('@')[0]}</strong></Td>
                        <Td dataLabel="Reviews">{a.totalReviews}</Td>
                        <Td dataLabel="Coverage">{a.coverage}%</Td>
                        <Td dataLabel="Streak">
                          <Tooltip content={`Current: ${a.current}d, Best: ${a.longest}d`}>
                            <span>{a.current}d{a.longest > a.current ? ` / ${a.longest}d` : ''}</span>
                          </Tooltip>
                        </Td>
                        <Td dataLabel="Trend"><TrendSparkline dates={a.reviewedDates} /></Td>
                        <Td dataLabel="Last">
                          <Tooltip content={a.lastReviewDate}>
                            <span>{timeAgo(new Date(a.lastReviewDate).getTime())}</span>
                          </Tooltip>
                        </Td>
                      </Tr>
                    ))}</Tbody>
                  </Table>
                  </div>
                </CardBody>
              </Card>
            </GridItem>
          )}

          {summary && summary.byComponent.length > 0 && (
            <GridItem span={12} md={6}>
              <ComponentChart
                data={summary.byComponent}
                onComponentClick={(comp) => setLocalFilters(f => ({ ...f, component: comp }))}
              />
            </GridItem>
          )}

          <GridItem span={12}>
            <ActivityTable
              entries={activityData?.entries}
              pinnedEntries={pinnedEntries}
              total={activityData?.total ?? 0}
              isLoading={isLoading}
              page={page}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              onRowClick={setSelectedEntry}
              selectedId={selectedEntry?.id}
              toolbar={
                <ActivityToolbar
                  filters={localFilters}
                  onFiltersChange={(f) => { setLocalFilters(f); setPage(1); }}
                  onClearAll={() => { clearAll(); setPage(1); }}
                  hasActiveFilters={hasActiveLocalFilters}
                  users={meta?.users ?? []}
                  currentUser={user?.name}
                  entries={activityData?.entries}
                  presets={presets}
                  onSavePreset={handleSavePreset}
                  onLoadPreset={handleLoadPreset}
                />
              }
            />
          </GridItem>
        </Grid>
      </PageSection>
    </>
  );

  return (
    <Drawer isExpanded={!!selectedEntry} onExpand={() => {}}>
      <DrawerContent panelContent={selectedEntry ? <ActivityDrawerPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} /> : undefined}>
        <DrawerContentBody>{drawerContent}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};
