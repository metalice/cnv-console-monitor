import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { PublicConfig, TestItem } from '@cnv-monitor/shared';

import { Card, CardBody, PageSection } from '@patternfly/react-core';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { fetchReportForRange } from '../api/launches';
import { fetchStreaks, fetchUntriagedForRange } from '../api/testItems';
import { FailuresTable } from '../components/failures/FailuresTable';
import { JiraCreateModal } from '../components/modals/JiraCreateModal';
import { TriageModal } from '../components/modals/TriageModal';
import { useComponentFilter } from '../context/ComponentFilterContext';
import { useDate } from '../context/DateContext';
import { aggregateTestItems } from '../utils/aggregation';

import { FailuresHeader } from './FailuresHeader';

export const FailuresPage = () => {
  const navigate = useNavigate();
  const { isRangeMode, lookbackMode, since, until } = useDate();
  const { selectedComponent: component } = useComponentFilter();
  const [triageIds, setTriageIds] = useState<number[]>([]);
  const [jiraCreateItem, setJiraCreateItem] = useState<TestItem | null>(null);

  useEffect(() => {
    document.title = 'Untriaged Failures | CNV Console Monitor';
  }, []);

  const { data: config } = useQuery({
    queryFn: () => apiFetch<PublicConfig>('/config'),
    queryKey: ['config'],
    staleTime: Infinity,
  });
  const { data: items, isLoading } = useQuery({
    queryFn: () => fetchUntriagedForRange(since, until, component),
    queryKey: ['untriaged', lookbackMode, since, until, component],
  });
  const { data: report } = useQuery({
    queryFn: () => fetchReportForRange(since, until),
    queryKey: ['report', lookbackMode, since, until],
  });

  const aggregated = useMemo(() => aggregateTestItems(items ?? []), [items]);
  const uniqueIds = useMemo(
    () =>
      aggregated
        .map(item => item.representative.unique_id)
        .filter((uid): uid is string => Boolean(uid)),
    [aggregated],
  );
  const { data: streaks } = useQuery({
    enabled: uniqueIds.length > 0,
    queryFn: () => fetchStreaks(uniqueIds),
    queryKey: ['streaks', uniqueIds],
    staleTime: 5 * 60 * 1000,
  });

  const newFailureIds = useMemo(() => {
    if (!report || !Array.isArray(report.newFailures)) {
      return new Set<string>();
    }
    return new Set<string>(
      report.newFailures
        .map(failure => failure.unique_id)
        .filter((uid): uid is string => Boolean(uid)),
    );
  }, [report]);

  return (
    <>
      <FailuresHeader aggregated={aggregated} />

      <PageSection>
        <Card>
          <CardBody>
            <FailuresTable
              aggregated={aggregated}
              config={config}
              isLoading={isLoading}
              isRangeMode={isRangeMode}
              newFailureIds={newFailureIds}
              rawCount={items?.length ?? 0}
              streaks={streaks}
              onCreateJira={setJiraCreateItem}
              onNavigate={navigate}
              onTriageSelected={setTriageIds}
            />
          </CardBody>
        </Card>
      </PageSection>

      <TriageModal
        isOpen={triageIds.length > 0}
        itemIds={triageIds}
        onClose={() => setTriageIds([])}
      />
      {jiraCreateItem && (
        <JiraCreateModal
          isOpen
          polarionId={jiraCreateItem.polarion_id}
          testItemId={jiraCreateItem.rp_id}
          testName={jiraCreateItem.name}
          onClose={() => setJiraCreateItem(null)}
        />
      )}
    </>
  );
};
