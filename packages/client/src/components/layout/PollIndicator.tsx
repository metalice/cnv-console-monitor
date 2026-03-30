import React from 'react';

import {
  Button,
  Content,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  ToolbarItem,
  Tooltip,
} from '@patternfly/react-core';
import { SyncAltIcon } from '@patternfly/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchPollStatus, triggerPollNow } from '../../api/poll';
import { useJenkinsProgress, usePollProgress } from '../../hooks/useWebSocket';

import { formatTimeAgo, formatTimeUntil } from './mastheadHelpers';

export const PollIndicator = () => {
  const queryClient = useQueryClient();
  const wsPoll = usePollProgress();
  const wsJenkins = useJenkinsProgress();
  const { data: httpPoll } = useQuery({
    queryFn: fetchPollStatus,
    queryKey: ['pollStatus'],
    refetchInterval: query => (query.state.data?.active ? 2000 : 30000),
  });
  const pollNow = useMutation({
    mutationFn: () => triggerPollNow(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['report'] });
      void queryClient.invalidateQueries({ queryKey: ['pollStatus'] });
    },
  });

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setTick(prevTick => prevTick + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const poll = wsPoll ?? httpPoll;
  const jenkinsActive =
    wsJenkins && (wsJenkins.phase === 'enriching' || wsJenkins.phase === 'mapping');
  const pollActive =
    poll &&
    (poll.active ||
      poll.phase === 'fetching' ||
      poll.phase === 'starting' ||
      poll.phase === 'enriching');
  const isActive = pollActive || jenkinsActive;

  const lastPoll = httpPoll?.lastPollAt;
  const interval = httpPoll?.pollIntervalMinutes;

  let nextPollAt: number | null = null;
  if (lastPoll && interval) {
    const intervalMs = interval * 60000;
    let next = lastPoll + intervalMs;
    const now = Date.now();
    while (next <= now) {
      next += intervalMs;
    }
    nextPollAt = next;
  }

  let statusText: string;
  let tooltipText: string;

  if (isActive) {
    const activePoll = (jenkinsActive ? wsJenkins : poll) ?? { current: 0, message: '', total: 0 };
    const percentage =
      activePoll.total > 0 ? Math.round((activePoll.current / activePoll.total) * 100) : 0;
    statusText = activePoll.total > 0 ? `Syncing ${percentage}%` : 'Syncing...';
    tooltipText =
      activePoll.message ||
      (jenkinsActive ? 'Jenkins enrichment...' : 'Syncing with ReportPortal...');
  } else if (lastPoll) {
    statusText = `Synced ${formatTimeAgo(lastPoll)}`;
    tooltipText = [
      new Date(lastPoll).toLocaleString(),
      nextPollAt ? `Next sync ${formatTimeUntil(nextPollAt)}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  } else {
    statusText = 'Not synced';
    tooltipText = 'Click to sync now';
  }

  return (
    <>
      <ToolbarItem>
        <Tooltip content={<span className="app-tooltip-pre">{tooltipText}</span>}>
          <button
            className={`app-poll-indicator${isActive ? '' : ' app-poll-indicator--idle'}`}
            disabled={Boolean(isActive)}
            type="button"
            onClick={() => !isActive && setConfirmOpen(true)}
          >
            <SyncAltIcon className={isActive ? 'app-spin' : undefined} />
            <span className="app-poll-indicator-time">{statusText}</span>
          </button>
        </Tooltip>
      </ToolbarItem>
      <Modal
        isOpen={confirmOpen}
        variant={ModalVariant.small}
        onClose={() => setConfirmOpen(false)}
      >
        <ModalHeader title="Sync Now" />
        <ModalBody>
          <Content component="p">
            This will trigger a full sync with ReportPortal — fetching new launches and test items,
            then storing them locally. This may take 10–30 seconds.
          </Content>
          {lastPoll && (
            <Content className="app-text-muted" component="small">
              Last synced: {new Date(lastPoll).toLocaleString()}
            </Content>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            isLoading={pollNow.isPending}
            variant="primary"
            onClick={() => {
              pollNow.mutate();
              setConfirmOpen(false);
            }}
          >
            Sync Now
          </Button>
          <Button variant="link" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
};
