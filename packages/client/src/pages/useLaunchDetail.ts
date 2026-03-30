import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { type PublicConfig, type TestItem } from '@cnv-monitor/shared';

import { useMutation, useQuery } from '@tanstack/react-query';

import {
  triggerAutoAnalysis,
  triggerPatternAnalysis,
  triggerUniqueErrorAnalysis,
} from '../api/analysis';
import { apiFetch } from '../api/client';
import { fetchTestItems, fetchTestItemsForLaunches } from '../api/testItems';
import { aggregateTestItems } from '../utils/aggregation';

export const useLaunchDetail = () => {
  const { launchId } = useParams<{ launchId: string }>();
  const [searchParams] = useSearchParams();

  const launchRpId = parseInt(launchId || '0');
  const launchIdsParam = searchParams.get('launches');
  const groupVersion = searchParams.get('version');
  const groupTier = searchParams.get('tier');

  const launchIds = useMemo(() => {
    if (!launchIdsParam) {
      return [launchRpId];
    }
    return launchIdsParam
      .split(',')
      .map(segment => parseInt(segment.trim()))
      .filter(parsed => !isNaN(parsed));
  }, [launchIdsParam, launchRpId]);

  const isGroupMode = launchIds.length > 1;
  const title = isGroupMode
    ? `${groupVersion ?? 'Unknown'} ${groupTier ?? ''} — ${launchIds.length} launches`
    : `Launch #${launchRpId}`;

  const [triageItemIds, setTriageItemIds] = useState<number[] | null>(null);
  const [jiraCreateItem, setJiraCreateItem] = useState<TestItem | null>(null);
  const [jiraLinkItemId, setJiraLinkItemId] = useState<number | null>(null);

  useEffect(() => {
    document.title = `${title} | CNV Console Monitor`;
  }, [title]);

  const { data: config } = useQuery({
    queryFn: () => apiFetch<PublicConfig>('/config'),
    queryKey: ['config'],
    staleTime: Infinity,
  });
  const { data: items, isLoading } = useQuery({
    enabled: launchIds.length > 0,
    queryFn: () =>
      isGroupMode ? fetchTestItemsForLaunches(launchIds) : fetchTestItems(launchRpId),
    queryKey: isGroupMode ? ['testItems', 'group', ...launchIds] : ['testItems', launchRpId],
  });

  const autoAnalysis = useMutation({ mutationFn: () => triggerAutoAnalysis(launchRpId) });
  const patternAnalysis = useMutation({ mutationFn: () => triggerPatternAnalysis(launchRpId) });
  const uniqueAnalysis = useMutation({ mutationFn: () => triggerUniqueErrorAnalysis(launchRpId) });

  const failedItems = useMemo(() => items?.filter(item => item.status === 'FAILED') ?? [], [items]);
  const passedItems = useMemo(() => items?.filter(item => item.status === 'PASSED') ?? [], [items]);
  const skippedItems = useMemo(
    () => items?.filter(item => item.status === 'SKIPPED') ?? [],
    [items],
  );

  const showAllItems = failedItems.length === 0 && (items?.length ?? 0) > 0;

  const displayItems = useMemo(() => {
    const source = showAllItems ? (items ?? []) : failedItems;
    if (isGroupMode) {
      return aggregateTestItems(source);
    }
    return source.map(item => ({ allRpIds: [item.rp_id], occurrences: 1, representative: item }));
  }, [isGroupMode, failedItems, showAllItems, items]);

  return {
    autoAnalysis,
    config,
    displayItems,
    failedItems,
    isGroupMode,
    isLoading,
    items,
    jiraCreateItem,
    jiraLinkItemId,
    launchIds,
    launchRpId,
    passedItems,
    patternAnalysis,
    setJiraCreateItem,
    setJiraLinkItemId,
    setTriageItemIds,
    skippedItems,
    title,
    triageItemIds,
    uniqueAnalysis,
  };
};
