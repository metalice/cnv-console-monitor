import React from 'react';
import {
  Form, FormGroup, Content,
  Button, Flex, FlexItem, Label,
} from '@patternfly/react-core';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SearchableSelect } from '../common/SearchableSelect';
import { PollProgressBanner } from '../common/PollProgressBanner';
import type { SettingsSectionProps } from './types';
import { POLL_INTERVAL_OPTIONS, LOOKBACK_OPTIONS } from './types';
import { triggerBackfill, fetchPollStatus, triggerJenkinsEnrichment } from '../../api/poll';
import { useToast } from '../../context/ToastContext';

export const PollingSettings: React.FC<SettingsSectionProps> = ({ val, set, adminOnly }) => {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = React.useState(false);
  const { data: pollStatus } = useQuery({ queryKey: ['pollStatus'], queryFn: fetchPollStatus, refetchInterval: 10_000 });
  const enrichMutation = useMutation({
    mutationFn: triggerJenkinsEnrichment,
    onSuccess: () => { addToast('success', 'Jenkins enrichment started'); queryClient.invalidateQueries({ queryKey: ['pollStatus'] }); },
    onError: () => addToast('danger', 'Failed to start enrichment'),
  });

  const enrichment = pollStatus?.enrichment;
  const totalLaunches = enrichment?.total ?? 0;
  const enrichedCount = (enrichment?.success ?? 0) + (enrichment?.mapped ?? 0);
  const actionableCount = (enrichment?.pending ?? 0) + (enrichment?.failed ?? 0);

  const handleBackfill = async () => {
    setLoading(true);
    try { await triggerBackfill(); } catch (error) { addToast('danger', error instanceof Error ? error.message : 'Backfill failed'); }
    setLoading(false);
  };

  return (
    <>
      <Content component="small" className="app-text-muted app-mb-md">
        How often the server fetches new data from ReportPortal.
      </Content>
      <Form>
        <FormGroup label="Poll Interval" fieldId="poll-interval">
          <SearchableSelect id="poll-interval" value={val('schedule.pollIntervalMinutes')} options={POLL_INTERVAL_OPTIONS}
            onChange={(v) => set('schedule.pollIntervalMinutes', v)} placeholder="Select interval" isDisabled={adminOnly} />
        </FormGroup>
        <FormGroup label="History Range" fieldId="lookback">
          <SearchableSelect id="lookback" value={val('schedule.initialLookbackDays')} options={LOOKBACK_OPTIONS}
            onChange={(v) => set('schedule.initialLookbackDays', v)} placeholder="Select range" isDisabled={adminOnly} />
        </FormGroup>
        {!adminOnly && (
          <FormGroup label="Data Fetch" fieldId="backfill">
            <Button variant="secondary" onClick={handleBackfill} isLoading={loading} isDisabled={loading}>
              Fetch Full History
            </Button>
            <Content component="small" className="app-text-muted app-mt-sm">
              Clears all data, fetches launches from the last {val('schedule.initialLookbackDays') || '180'} days, then enriches from Jenkins.
            </Content>
          </FormGroup>
        )}
        {totalLaunches > 0 && (
          <FormGroup label={`Jenkins Enrichment (${totalLaunches.toLocaleString()} launches)`} fieldId="enrichment-stats">
            <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }} flexWrap={{ default: 'wrap' }}>
              <FlexItem><Label color="green" isCompact>{enrichedCount.toLocaleString()} enriched</Label></FlexItem>
              {actionableCount > 0 && <FlexItem><Label color="blue" isCompact>{actionableCount.toLocaleString()} remaining</Label></FlexItem>}
            </Flex>
            {!adminOnly && actionableCount > 0 && (
              <Flex spaceItems={{ default: 'spaceItemsSm' }} className="app-mt-sm">
                <FlexItem>
                  <Button variant="secondary" size="sm" onClick={() => enrichMutation.mutate()} isLoading={enrichMutation.isPending}>
                    Enrich Remaining ({actionableCount.toLocaleString()})
                  </Button>
                </FlexItem>
              </Flex>
            )}
            <PollProgressBanner />
          </FormGroup>
        )}
      </Form>
    </>
  );
};
