import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  Button,
  Icon,
  Progress,
  ProgressSize,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { CheckCircleIcon, TimesIcon } from '@patternfly/react-icons';

import { cancelPoll, fetchPollStatus, type PollStatusLegacy } from '../../api/poll';
import type { ProgressInfo } from '../../hooks/useWebSocket';
import { useJenkinsProgress, usePollProgress } from '../../hooks/useWebSocket';

const AUTO_HIDE_DELAY_MS = 5000;
const HTTP_POLL_MS = 2000;

const ProgressLine: React.FC<{
  info: ProgressInfo;
  onCancel?: () => void;
  cancelling?: boolean;
}> = ({ cancelling, info, onCancel }) => {
  const percentage = info.total > 0 ? Math.round((info.current / info.total) * 100) : undefined;

  if (info.phase === 'complete') {
    return (
      <span className="app-poll-status app-poll-status--success">
        <Icon size="sm" status="success">
          <CheckCircleIcon />
        </Icon>
        <span className="app-text-xs">{info.message}</span>
      </span>
    );
  }

  return (
    <span className="app-poll-status">
      {info.total === 0 && <Spinner size="sm" />}
      <span className="app-text-xs app-text-muted">{info.message}</span>
      {info.total > 0 && (
        <Progress
          aria-label="Progress"
          className="app-poll-progress-bar"
          size={ProgressSize.sm}
          value={percentage}
        />
      )}
      {onCancel && (
        <Button
          aria-label="Cancel"
          className="app-poll-cancel"
          isDisabled={cancelling}
          size="sm"
          variant="plain"
          onClick={onCancel}
        >
          <TimesIcon />
        </Button>
      )}
    </span>
  );
};

export const PollProgressBanner: React.FC = () => {
  const wsPoll = usePollProgress();
  const wsJenkins = useJenkinsProgress();
  const [httpStatus, setHttpStatus] = useState<PollStatusLegacy | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const activeRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const pollHttp = useCallback(async () => {
    if (!activeRef.current) {
      return;
    }
    try {
      const result = await fetchPollStatus();
      /* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: ref mutates at runtime */
      if (activeRef.current) {
        setHttpStatus({
          active: result.active,
          current: result.current,
          lastPollAt: result.lastPollAt,
          message: result.message,
          phase: result.phase,
          startedAt: result.startedAt,
          total: result.total,
        });
      }
      /* eslint-enable @typescript-eslint/no-unnecessary-condition */
      if (result.active) {
        timerRef.current = setTimeout(pollHttp, HTTP_POLL_MS);
      } else if (result.phase) {
        timerRef.current = setTimeout(pollHttp, HTTP_POLL_MS * 3);
      }
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: ref mutates at runtime
      if (activeRef.current) {
        timerRef.current = setTimeout(pollHttp, HTTP_POLL_MS * 2);
      }
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    void pollHttp();
    return () => {
      activeRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, [pollHttp]);

  useEffect(() => {
    if (wsPoll) {
      setHttpStatus(wsPoll);
      if (wsPoll.active) {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(pollHttp, HTTP_POLL_MS);
      }
    }
  }, [wsPoll, pollHttp]);

  const pollInfo = httpStatus
    ? {
        current: httpStatus.current,
        message: httpStatus.message,
        phase: httpStatus.phase,
        total: httpStatus.total,
      }
    : null;
  const jenkinsInfo = wsJenkins;
  const hasPoll = pollInfo && (pollInfo.phase === 'fetching' || pollInfo.phase === 'starting');
  const hasPollDone = pollInfo?.phase === 'complete';
  const hasJenkins = jenkinsInfo?.phase === 'enriching';
  const hasJenkinsDone = jenkinsInfo?.phase === 'complete';

  useEffect(() => {
    const allDone = !hasPoll && !hasJenkins && (hasPollDone || hasJenkinsDone);
    if (allDone) {
      const timer = setTimeout(() => setDismissed(true), AUTO_HIDE_DELAY_MS);
      return () => clearTimeout(timer);
    }
    if (hasPoll || hasJenkins) {
      setDismissed(false);
    }
  }, [hasPoll, hasJenkins, hasPollDone, hasJenkinsDone]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelPoll();
    } catch {
      /* */
    }
    setCancelling(false);
  };

  if (dismissed) {
    return null;
  }
  if (!hasPoll && !hasPollDone && !hasJenkins && !hasJenkinsDone) {
    return null;
  }

  return (
    <Stack hasGutter className="app-poll-banner">
      {/* eslint-disable @typescript-eslint/no-unnecessary-condition -- defensive: runtime data */}
      {(hasPoll || hasPollDone) && pollInfo && (
        <StackItem>
          <ProgressLine
            cancelling={cancelling}
            info={pollInfo}
            onCancel={hasPoll ? handleCancel : undefined}
          />
        </StackItem>
      )}
      {(hasJenkins || hasJenkinsDone) && jenkinsInfo && (
        /* eslint-enable @typescript-eslint/no-unnecessary-condition */
        <StackItem>
          <ProgressLine info={jenkinsInfo} />
        </StackItem>
      )}
    </Stack>
  );
};
