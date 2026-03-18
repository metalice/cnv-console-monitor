import React from 'react';
import {
  Form, FormGroup, Content, TextInput, ExpandableSection,
  Flex, FlexItem, Label, Button,
} from '@patternfly/react-core';
import { SyncAltIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SearchableSelect } from '../common/SearchableSelect';
import { HelpLabel } from '../common/HelpLabel';
import type { SettingsSectionProps } from './types';
import { POLL_INTERVAL_OPTIONS, LOOKBACK_OPTIONS } from './types';
import { fetchPollStatus, triggerJenkinsEnrichment, retryFailedItems, type PollPhaseSummaryData } from '../../api/poll';
import { useToast } from '../../context/ToastContext';

const formatDuration = (ms: number): string => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return s % 60 > 0 ? `${m}m ${s % 60}s` : `${m}m`;
};

const PhaseRow: React.FC<{ label: string; data: PollPhaseSummaryData; extra?: string; onRetry?: () => void; retrying?: boolean }> = ({ label, data, extra, onRetry, retrying }) => {
  const hasErrors = data.failed > 0;
  const errorEntries = Object.entries(data.errors);
  return (
    <div className="app-poll-summary-row">
      <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem><span className="app-font-13">{label}</span></FlexItem>
            <FlexItem><Label color="green" isCompact icon={<CheckCircleIcon />}>{data.succeeded.toLocaleString()}</Label></FlexItem>
            {hasErrors && <FlexItem><Label color="red" isCompact icon={<ExclamationTriangleIcon />}>{data.failed.toLocaleString()} failed</Label></FlexItem>}
            {extra && <FlexItem><Label color="grey" isCompact>{extra}</Label></FlexItem>}
          </Flex>
        </FlexItem>
        {hasErrors && onRetry && (
          <FlexItem>
            <Button variant="link" size="sm" icon={<SyncAltIcon />} onClick={onRetry} isLoading={retrying}>Retry {data.failed}</Button>
          </FlexItem>
        )}
      </Flex>
      {errorEntries.length > 0 && (
        <div className="app-text-xs app-text-muted app-mt-xs">
          {errorEntries.map(([reason, count]) => <span key={reason} className="app-mr-sm">{reason}: {count}</span>)}
        </div>
      )}
    </div>
  );
};

export const PollingSettings: React.FC<SettingsSectionProps> = ({ val, set, adminOnly }) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { data: pollStatus } = useQuery({ queryKey: ['pollStatus'], queryFn: fetchPollStatus, refetchInterval: 10_000 });
  const summary = pollStatus?.lastPollSummary;

  const retryItemsMutation = useMutation({
    mutationFn: retryFailedItems,
    onSuccess: (r) => { addToast('success', `Retried: ${r.succeeded} succeeded, ${r.stillFailed} failed`); queryClient.invalidateQueries({ queryKey: ['pollStatus'] }); },
    onError: () => addToast('danger', 'Retry failed'),
  });
  const retryJenkinsMutation = useMutation({
    mutationFn: triggerJenkinsEnrichment,
    onSuccess: () => { addToast('success', 'Jenkins retry started'); queryClient.invalidateQueries({ queryKey: ['pollStatus'] }); },
    onError: () => addToast('danger', 'Retry failed'),
  });

  return (
    <>
      <Content component="small" className="app-text-muted app-mb-md">
        How often the server fetches new data from ReportPortal.
      </Content>
      <Form>
        <FormGroup
          label={<HelpLabel label="Poll Interval" help="How often the server automatically fetches new launches from ReportPortal. Shorter intervals mean fresher data but more API calls." />}
          fieldId="poll-interval"
        >
          <SearchableSelect id="poll-interval" value={val('schedule.pollIntervalMinutes')} options={POLL_INTERVAL_OPTIONS}
            onChange={(v) => set('schedule.pollIntervalMinutes', v)} placeholder="Select interval" isDisabled={adminOnly} />
        </FormGroup>
        <FormGroup
          label={<HelpLabel label="History Range" help="How far back to fetch from ReportPortal when using 'Clear All Data'. This does NOT affect the dashboard date filter (24h/7d/6M buttons) — those control what data is displayed, not what is fetched." />}
          fieldId="lookback"
        >
          <SearchableSelect id="lookback" value={val('schedule.initialLookbackDays')} options={LOOKBACK_OPTIONS}
            onChange={(v) => set('schedule.initialLookbackDays', v)} placeholder="Select range" isDisabled={adminOnly} />
        </FormGroup>
      </Form>

      {summary && (
        <ExpandableSection toggleText={`Last Poll — ${new Date(summary.timestamp).toLocaleString()} (${formatDuration(summary.durationMs)})${summary.cancelled ? ' — Cancelled' : ''}`} className="app-mt-md">
          <div className="app-enrichment-card">
            <PhaseRow label="Launches" data={summary.launches} />
            <PhaseRow label="Test Items" data={summary.testItems} onRetry={() => retryItemsMutation.mutate()} retrying={retryItemsMutation.isPending} />
            <PhaseRow
              label="Jenkins"
              data={summary.jenkins}
              extra={[
                summary.jenkins.authRequired > 0 ? `${summary.jenkins.authRequired} auth` : '',
                summary.jenkins.deleted > 0 ? `${summary.jenkins.deleted} deleted` : '',
              ].filter(Boolean).join(', ') || undefined}
              onRetry={() => retryJenkinsMutation.mutate()}
              retrying={retryJenkinsMutation.isPending}
            />
          </div>
        </ExpandableSection>
      )}

      {!adminOnly && (
        <ExpandableSection toggleText="Advanced" className="app-mt-md">
          <Content component="small" className="app-text-muted app-mb-md">
            Control parallel connections and batch sizes. Higher values are faster but may trigger rate limiting.
          </Content>
          <Form>
            <FormGroup
              label={<HelpLabel label="RP Page Size" help="Number of launches fetched per API call to ReportPortal. Each page is a single request that returns launch metadata (not test items). Larger pages = fewer requests, smoother progress. Range: 10–1000." />}
              fieldId="rp-page-size"
            >
              <div className="app-max-w-120">
                <TextInput id="rp-page-size" type="number" value={val('schedule.rpPageSize') || '100'}
                  onChange={(_e, v) => set('schedule.rpPageSize', v)} isDisabled={adminOnly} min={10} max={1000} />
              </div>
            </FormGroup>
            <FormGroup
              label={<HelpLabel label="RP Concurrency" help="Number of parallel requests to ReportPortal when fetching test items and logs. Higher values speed up polling but may cause 429 rate limit errors. Range: 1–100." />}
              fieldId="rp-concurrency"
            >
              <div className="app-max-w-120">
                <TextInput id="rp-concurrency" type="number" value={val('schedule.rpConcurrency') || '20'}
                  onChange={(_e, v) => set('schedule.rpConcurrency', v)} isDisabled={adminOnly} min={1} max={100} />
              </div>
            </FormGroup>
            <FormGroup
              label={<HelpLabel label="Jenkins Concurrency" help="Number of parallel requests to Jenkins when enriching launches with build metadata. Higher values speed up enrichment but may overload Jenkins. Range: 1–100." />}
              fieldId="jenkins-concurrency"
            >
              <div className="app-max-w-120">
                <TextInput id="jenkins-concurrency" type="number" value={val('schedule.jenkinsConcurrency') || '20'}
                  onChange={(_e, v) => set('schedule.jenkinsConcurrency', v)} isDisabled={adminOnly} min={1} max={100} />
              </div>
            </FormGroup>
          </Form>
        </ExpandableSection>
      )}
    </>
  );
};
