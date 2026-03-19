import React from 'react';
import {
  Form, FormGroup, Content, TextInput, ExpandableSection,
  Flex, FlexItem, Label,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationTriangleIcon, BanIcon } from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';
import { SearchableSelect } from '../common/SearchableSelect';
import { HelpLabel } from '../common/HelpLabel';
import type { SettingsSectionProps } from './types';
import { POLL_INTERVAL_OPTIONS, LOOKBACK_OPTIONS } from './types';
import { fetchPipelineHistory, type PipelineRunRecord } from '../../api/poll';

const formatDuration = (ms: number | null): string => {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return s % 60 > 0 ? `${m}m ${s % 60}s` : `${m}m`;
};

const RunRow: React.FC<{ run: PipelineRunRecord }> = ({ run }) => {
  const date = new Date(run.started_at);
  const hasErrors = Object.values(run.phases).some(p => p.failed > 0);

  return (
    <div className="app-poll-summary-row">
      <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem className="app-text-sm">{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</FlexItem>
            <FlexItem><Label isCompact color={run.trigger === 'backfill' ? 'blue' : 'grey'}>{run.trigger === 'backfill' ? 'Full' : run.trigger === 'scheduled' ? 'Auto' : 'Manual'}</Label></FlexItem>
            {run.duration_ms && <FlexItem className="app-text-xs app-text-muted">{formatDuration(run.duration_ms)}</FlexItem>}
          </Flex>
        </FlexItem>
        <FlexItem>
          {run.cancelled ? (
            <Label color="grey" isCompact icon={<BanIcon />}>Cancelled</Label>
          ) : hasErrors ? (
            <Label color="orange" isCompact icon={<ExclamationTriangleIcon />}>Errors</Label>
          ) : (
            <Label color="green" isCompact icon={<CheckCircleIcon />}>Complete</Label>
          )}
        </FlexItem>
      </Flex>
      {run.summary && <div className="app-text-xs app-text-muted app-mt-xs">{run.summary}</div>}
    </div>
  );
};

export const PollingSettings: React.FC<SettingsSectionProps> = ({ val, set, adminOnly }) => {
  const { data: history } = useQuery({ queryKey: ['pipelineHistory'], queryFn: () => fetchPipelineHistory(10), staleTime: 30_000 });

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

      {history && history.length > 0 && (
        <ExpandableSection toggleText={`Run History (${history.length})`} className="app-mt-md">
          <div className="app-enrichment-card">
            {history.map(run => <RunRow key={run.id} run={run} />)}
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
              label={<HelpLabel label="RP Page Size" help="Number of launches fetched per API call to ReportPortal. Larger pages = fewer requests, smoother progress. Range: 10–1000." />}
              fieldId="rp-page-size"
            >
              <div className="app-max-w-120">
                <TextInput id="rp-page-size" type="number" value={val('schedule.rpPageSize') || '100'}
                  onChange={(_e, v) => set('schedule.rpPageSize', v)} isDisabled={adminOnly} min={10} max={1000} />
              </div>
            </FormGroup>
            <FormGroup
              label={<HelpLabel label="RP Concurrency" help="Number of parallel requests to ReportPortal when fetching test items and logs. Range: 1–100." />}
              fieldId="rp-concurrency"
            >
              <div className="app-max-w-120">
                <TextInput id="rp-concurrency" type="number" value={val('schedule.rpConcurrency') || '20'}
                  onChange={(_e, v) => set('schedule.rpConcurrency', v)} isDisabled={adminOnly} min={1} max={100} />
              </div>
            </FormGroup>
            <FormGroup
              label={<HelpLabel label="Jenkins Concurrency" help="Number of parallel requests to Jenkins when enriching launches. Range: 1–100." />}
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
