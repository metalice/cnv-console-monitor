import { Button, Flex, FlexItem, Label, PageSection, Tooltip } from '@patternfly/react-core';
import { ClockIcon, SyncAltIcon } from '@patternfly/react-icons';
import { useMutation, useQuery } from '@tanstack/react-query';

import { fetchPollStatus, type PollStatus } from '../../api/poll';
import { testJenkinsConnection, testJiraConnection, testRpConnection } from '../../api/settings';
import { useToast } from '../../context/ToastContext';

import { DataPipeline } from './DataPipeline';
import { SystemHealth } from './SystemHealth';
import { formatUptime } from './types';

const POLL_REFETCH_MS = 15_000;
const MS_PER_MINUTE = 60_000;

const timeAgo = (timestampMs: number | null): string => {
  if (!timestampMs) return 'Never';
  const diff = Math.round((Date.now() - timestampMs) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

type SystemStatusBannerProps = {
  uptime: number;
};

export const SystemStatusBanner = ({ uptime }: SystemStatusBannerProps) => {
  const { addToast } = useToast();

  const { data: pollStatus } = useQuery<PollStatus>({
    queryFn: fetchPollStatus,
    queryKey: ['pollStatus'],
    refetchInterval: POLL_REFETCH_MS,
  });

  const testAllMutation = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled([
        testRpConnection(),
        testJiraConnection(),
        testJenkinsConnection(),
      ]);
      const services = ['ReportPortal', 'Jira', 'Jenkins'];
      const summary = results.map(
        (result, index) => `${services[index]}: ${result.status === 'fulfilled' ? 'OK' : 'Failed'}`,
      );
      const allOk = results.every(result => result.status === 'fulfilled');
      return { allOk, summary: summary.join(' | ') };
    },
    onError: () => addToast('danger', 'Connection test failed'),
    onSuccess: result => addToast(result.allOk ? 'success' : 'warning', result.summary),
  });

  const nextPollIn =
    pollStatus?.lastPollAt && pollStatus.pollIntervalMinutes
      ? Math.max(
          0,
          Math.round(
            (pollStatus.lastPollAt + pollStatus.pollIntervalMinutes * MS_PER_MINUTE - Date.now()) /
              MS_PER_MINUTE,
          ),
        )
      : null;

  return (
    <PageSection className="app-status-banner">
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        flexWrap={{ default: 'wrap' }}
        spaceItems={{ default: 'spaceItemsLg' }}
      >
        <FlexItem>
          <Tooltip content="Server uptime since last restart">
            <Label isCompact icon={<ClockIcon />}>
              Uptime: {formatUptime(uptime)}
            </Label>
          </Tooltip>
        </FlexItem>
        <FlexItem>
          <SystemHealth />
        </FlexItem>
        {pollStatus && (
          <>
            <FlexItem>
              <Tooltip
                content={
                  pollStatus.lastPollAt
                    ? new Date(pollStatus.lastPollAt).toLocaleString()
                    : 'No polls yet'
                }
              >
                <Label isCompact color={pollStatus.active ? 'blue' : 'grey'} icon={<SyncAltIcon />}>
                  {pollStatus.active
                    ? `Polling: ${pollStatus.message}`
                    : `Last poll: ${timeAgo(pollStatus.lastPollAt)}`}
                </Label>
              </Tooltip>
            </FlexItem>
            {nextPollIn !== null && !pollStatus.active && (
              <FlexItem>
                <Label isCompact>Next: {nextPollIn}m</Label>
              </FlexItem>
            )}
          </>
        )}
        <FlexItem>
          <Button
            icon={<SyncAltIcon />}
            isLoading={testAllMutation.isPending}
            size="sm"
            variant="link"
            onClick={() => testAllMutation.mutate()}
          >
            Test All Connections
          </Button>
        </FlexItem>
      </Flex>
      <DataPipeline />
    </PageSection>
  );
};
