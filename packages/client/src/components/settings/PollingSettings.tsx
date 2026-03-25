import React from 'react';

import {
  Content,
  ExpandableSection,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Label,
  TextInput,
} from '@patternfly/react-core';
import { BanIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';

import { fetchPipelineHistory, type PipelineRunRecord } from '../../api/poll';
import { HelpLabel } from '../common/HelpLabel';
import { SearchableSelect } from '../common/SearchableSelect';

import type { SettingsSectionProps } from './types';
import { LOOKBACK_OPTIONS, POLL_INTERVAL_OPTIONS } from './types';

const formatDuration = (millis: number | null): string => {
  if (!millis) {
    return '';
  }
  const seconds = Math.round(millis / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  return seconds % 60 > 0 ? `${minutes}m ${seconds % 60}s` : `${minutes}m`;
};

const RunRow: React.FC<{ run: PipelineRunRecord }> = ({ run }) => {
  const date = new Date(run.started_at);
  const hasErrors = Object.values(run.phases).some(phase => phase.failed > 0);

  return (
    <div className="app-poll-summary-row">
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
      >
        <FlexItem>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem className="app-text-sm">
              {date.toLocaleDateString()}{' '}
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </FlexItem>
            <FlexItem>
              <Label isCompact color={run.trigger === 'backfill' ? 'blue' : 'grey'}>
                {run.trigger === 'backfill'
                  ? 'Full'
                  : run.trigger === 'scheduled'
                    ? 'Auto'
                    : 'Manual'}
              </Label>
            </FlexItem>
            {run.duration_ms && (
              <FlexItem className="app-text-xs app-text-muted">
                {formatDuration(run.duration_ms)}
              </FlexItem>
            )}
          </Flex>
        </FlexItem>
        <FlexItem>
          {run.cancelled ? (
            <Label isCompact color="grey" icon={<BanIcon />}>
              Cancelled
            </Label>
          ) : hasErrors ? (
            <Label isCompact color="orange" icon={<ExclamationTriangleIcon />}>
              Errors
            </Label>
          ) : (
            <Label isCompact color="green" icon={<CheckCircleIcon />}>
              Complete
            </Label>
          )}
        </FlexItem>
      </Flex>
      {run.summary && <div className="app-text-xs app-text-muted app-mt-xs">{run.summary}</div>}
    </div>
  );
};

export const PollingSettings: React.FC<SettingsSectionProps> = ({ adminOnly, set, val }) => {
  const { data: history } = useQuery({
    queryFn: () => fetchPipelineHistory(10),
    queryKey: ['pipelineHistory'],
    staleTime: 30_000,
  });

  return (
    <>
      <Content className="app-text-muted app-mb-md" component="small">
        How often the server fetches new data from ReportPortal.
      </Content>
      <Form>
        <FormGroup
          fieldId="poll-interval"
          label={
            <HelpLabel
              help="How often the server automatically fetches new launches from ReportPortal. Shorter intervals mean fresher data but more API calls."
              label="Poll Interval"
            />
          }
        >
          <SearchableSelect
            id="poll-interval"
            isDisabled={adminOnly}
            options={POLL_INTERVAL_OPTIONS}
            placeholder="Select interval"
            value={val('schedule.pollIntervalMinutes')}
            onChange={value => set('schedule.pollIntervalMinutes', value)}
          />
        </FormGroup>
        <FormGroup
          fieldId="lookback"
          label={
            <HelpLabel
              help="How far back to fetch from ReportPortal when using 'Clear All Data'. This does NOT affect the dashboard date filter (24h/7d/6M buttons) — those control what data is displayed, not what is fetched."
              label="History Range"
            />
          }
        >
          <SearchableSelect
            id="lookback"
            isDisabled={adminOnly}
            options={LOOKBACK_OPTIONS}
            placeholder="Select range"
            value={val('schedule.initialLookbackDays')}
            onChange={value => set('schedule.initialLookbackDays', value)}
          />
        </FormGroup>
      </Form>

      {history && history.length > 0 && (
        <ExpandableSection className="app-mt-md" toggleText={`Run History (${history.length})`}>
          <div className="app-enrichment-card">
            {history.map(run => (
              <RunRow key={run.id} run={run} />
            ))}
          </div>
        </ExpandableSection>
      )}

      {!adminOnly && (
        <ExpandableSection className="app-mt-md" toggleText="Advanced">
          <Content className="app-text-muted app-mb-md" component="small">
            Control parallel connections and batch sizes. Higher values are faster but may trigger
            rate limiting.
          </Content>
          <Form>
            <FormGroup
              fieldId="rp-page-size"
              label={
                <HelpLabel
                  help="Number of launches fetched per API call to ReportPortal. Larger pages = fewer requests, smoother progress. Range: 10–1000."
                  label="RP Page Size"
                />
              }
            >
              <div className="app-max-w-120">
                <TextInput
                  id="rp-page-size"
                  isDisabled={adminOnly}
                  max={1000}
                  min={10}
                  type="number"
                  value={val('schedule.rpPageSize') || '100'}
                  onChange={(_e, value) => set('schedule.rpPageSize', value)}
                />
              </div>
            </FormGroup>
            <FormGroup
              fieldId="rp-concurrency"
              label={
                <HelpLabel
                  help="Number of parallel requests to ReportPortal when fetching test items and logs. Range: 1–100."
                  label="RP Concurrency"
                />
              }
            >
              <div className="app-max-w-120">
                <TextInput
                  id="rp-concurrency"
                  isDisabled={adminOnly}
                  max={100}
                  min={1}
                  type="number"
                  value={val('schedule.rpConcurrency') || '20'}
                  onChange={(_e, value) => set('schedule.rpConcurrency', value)}
                />
              </div>
            </FormGroup>
            <FormGroup
              fieldId="jenkins-concurrency"
              label={
                <HelpLabel
                  help="Number of parallel requests to Jenkins when enriching launches. Range: 1–100."
                  label="Jenkins Concurrency"
                />
              }
            >
              <div className="app-max-w-120">
                <TextInput
                  id="jenkins-concurrency"
                  isDisabled={adminOnly}
                  max={100}
                  min={1}
                  type="number"
                  value={val('schedule.jenkinsConcurrency') || '20'}
                  onChange={(_e, value) => set('schedule.jenkinsConcurrency', value)}
                />
              </div>
            </FormGroup>
          </Form>
        </ExpandableSection>
      )}
    </>
  );
};
