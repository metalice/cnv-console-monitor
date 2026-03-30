import { Content, ExpandableSection, Form, FormGroup } from '@patternfly/react-core';
import { useQuery } from '@tanstack/react-query';

import { fetchPipelineHistory } from '../../api/poll';
import { HelpLabel } from '../common/HelpLabel';
import { SearchableSelect } from '../common/SearchableSelect';

import { PollingAdvancedSettings } from './PollingAdvancedSettings';
import { PollRunRow } from './PollRunRow';
import { type SettingsSectionProps } from './types';
import { LOOKBACK_OPTIONS, POLL_INTERVAL_OPTIONS } from './types';

export const PollingSettings = ({ adminOnly, set, val }: SettingsSectionProps) => {
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
              <PollRunRow key={run.id} run={run} />
            ))}
          </div>
        </ExpandableSection>
      )}

      {!adminOnly && (
        <ExpandableSection className="app-mt-md" toggleText="Advanced">
          <PollingAdvancedSettings adminOnly={adminOnly} set={set} val={val} />
        </ExpandableSection>
      )}
    </>
  );
};
