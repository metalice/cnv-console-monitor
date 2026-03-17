import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  PageSection,
  Content,
  Card,
  CardBody,
  Button,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';
import { fetchUntriagedForRange, fetchStreaks } from '../api/testItems';
import { fetchReportForRange } from '../api/launches';
import { apiFetch } from '../api/client';
import { useDate } from '../context/DateContext';
import { useComponentFilter } from '../context/ComponentFilterContext';
import { FailuresTable } from '../components/failures/FailuresTable';
import { TriageModal } from '../components/modals/TriageModal';
import { JiraCreateModal } from '../components/modals/JiraCreateModal';
import type { TestItem, PublicConfig } from '@cnv-monitor/shared';
import { aggregateTestItems } from '../utils/aggregation';
import { exportCsv } from '../utils/csvExport';

export const FailuresPage: React.FC = () => {
  const navigate = useNavigate();
  const { lookbackMode, since, until, isRangeMode } = useDate();
  const { selectedComponent: component } = useComponentFilter();
  const [triageIds, setTriageIds] = useState<number[]>([]);
  const [jiraCreateItem, setJiraCreateItem] = useState<TestItem | null>(null);

  useEffect(() => { document.title = 'Untriaged Failures | CNV Console Monitor'; }, []);

  const { data: config } = useQuery({ queryKey: ['config'], queryFn: () => apiFetch<PublicConfig>('/config'), staleTime: Infinity });
  const { data: items, isLoading } = useQuery({ queryKey: ['untriaged', lookbackMode, since, until, component], queryFn: () => fetchUntriagedForRange(since, until, component) });
  const { data: report } = useQuery({ queryKey: ['report', lookbackMode, since, until], queryFn: () => fetchReportForRange(since, until) });

  const aggregated = useMemo(() => aggregateTestItems(items ?? []), [items]);
  const uniqueIds = useMemo(() => aggregated.map(item => item.representative.unique_id).filter((uid): uid is string => !!uid), [aggregated]);
  const { data: streaks } = useQuery({ queryKey: ['streaks', uniqueIds], queryFn: () => fetchStreaks(uniqueIds), enabled: uniqueIds.length > 0, staleTime: 5 * 60 * 1000 });

  const newFailureIds = useMemo(() => {
    if (!report || !Array.isArray(report.newFailures)) return new Set<string>();
    return new Set<string>(report.newFailures.map((failure) => failure.unique_id).filter((uid): uid is string => !!uid));
  }, [report]);

  return (
    <>
      <PageSection>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Content component="h1">Untriaged Failures</Content>
            <Content component="small">Test items that need classification</Content>
          </FlexItem>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <Button variant="secondary" icon={<DownloadIcon />} isDisabled={!aggregated.length} onClick={() => {
                  exportCsv('untriaged-failures.csv',
                    ['Test Name', 'Occurrences', 'Status', 'Error', 'Polarion', 'AI Prediction', 'Jira'],
                    aggregated.map(({ representative: item, occurrences }) => [
                      item.name, occurrences, item.status,
                      item.error_message?.split('\n')[0] ?? '', item.polarion_id ?? '', item.ai_prediction ?? '', item.jira_key ?? '',
                    ]),
                  );
                }}>Export</Button>
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>

      <PageSection>
        <Card>
          <CardBody>
            <FailuresTable
              aggregated={aggregated}
              rawCount={items?.length ?? 0}
              isLoading={isLoading}
              isRangeMode={isRangeMode}
              config={config}
              newFailureIds={newFailureIds}
              streaks={streaks}
              onNavigate={navigate}
              onTriageSelected={setTriageIds}
              onCreateJira={setJiraCreateItem}
            />
          </CardBody>
        </Card>
      </PageSection>

      <TriageModal isOpen={triageIds.length > 0} onClose={() => setTriageIds([])} itemIds={triageIds} />
      {jiraCreateItem && (
        <JiraCreateModal isOpen onClose={() => setJiraCreateItem(null)} testItemId={jiraCreateItem.rp_id} testName={jiraCreateItem.name} polarionId={jiraCreateItem.polarion_id} />
      )}
    </>
  );
};
