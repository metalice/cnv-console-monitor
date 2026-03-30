import { useEffect, useMemo, useState } from 'react';

import { type ActivityFilterPreset } from '@cnv-monitor/shared';

import { SortByDirection } from '@patternfly/react-table';
import { useQuery } from '@tanstack/react-query';

import { fetchAckStats } from '../../api/acknowledgment';
import {
  fetchActivity,
  fetchActivityMeta,
  fetchActivitySummary,
  fetchPinnedActivity,
} from '../../api/activity';
import { useAuth } from '../../context/AuthContext';
import { LOOKBACK_HOURS, useDate } from '../../context/DateContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useActivityFilters } from '../../hooks/useActivityFilters';
import { useTableSort } from '../../hooks/useTableSort';

import { computeReviewerStreak, REVIEWER_ACCESSORS } from './reviewerUtils';

const PAGE_SIZE = 25;

export const useActivityPageData = () => {
  const [page, setPage] = useState(1);
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
    staleTime: 60_000,
  });
  const { data: ackStats } = useQuery({
    queryFn: () => fetchAckStats(calendarDays),
    queryKey: ['ackStats', calendarDays],
  });

  const enrichedApprovers = useMemo(
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

  return {
    ackStats,
    activityData,
    calendarDays,
    clearAll,
    getApproverSortParams,
    handleLoadPreset,
    handleSavePreset,
    hasActiveLocalFilters,
    isLoading,
    localFilters,
    meta,
    page,
    pageSize: PAGE_SIZE,
    pinnedEntries,
    presets,
    prevSummary,
    setLocalFilters,
    setPage,
    setShowComparison,
    showComparison,
    sortedApprovers,
    summary,
    user,
  };
};
