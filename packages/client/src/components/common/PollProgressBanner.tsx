import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Progress, ProgressSize, Icon, Spinner, Button, Stack, StackItem } from '@patternfly/react-core';
import { CheckCircleIcon, TimesIcon } from '@patternfly/react-icons';
import { usePollProgress, useJenkinsProgress } from '../../hooks/useWebSocket';
import { fetchPollStatus, cancelPoll, PollStatus } from '../../api/poll';
import type { ProgressInfo } from '../../hooks/useWebSocket';

const AUTO_HIDE_DELAY_MS = 5000;
const HTTP_POLL_MS = 2000;

const ProgressLine: React.FC<{ info: ProgressInfo; onCancel?: () => void; cancelling?: boolean }> = ({ info, onCancel, cancelling }) => {
  const percentage = info.total > 0 ? Math.round((info.current / info.total) * 100) : undefined;

  if (info.phase === 'complete') {
    return (
      <span className="app-poll-status app-poll-status--success">
        <Icon size="sm" status="success"><CheckCircleIcon /></Icon>
        <span className="app-text-xs">{info.message}</span>
      </span>
    );
  }

  return (
    <span className="app-poll-status">
      {info.total === 0 && <Spinner size="sm" />}
      <span className="app-text-xs app-text-muted">{info.message}</span>
      {info.total > 0 && <Progress value={percentage} size={ProgressSize.sm} className="app-poll-progress-bar" aria-label="Progress" />}
      {onCancel && (
        <Button variant="plain" size="sm" onClick={onCancel} isDisabled={cancelling} aria-label="Cancel" className="app-poll-cancel">
          <TimesIcon />
        </Button>
      )}
    </span>
  );
};

export const PollProgressBanner: React.FC = () => {
  const wsPoll = usePollProgress();
  const wsJenkins = useJenkinsProgress();
  const [httpStatus, setHttpStatus] = useState<PollStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const activeRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const pollHttp = useCallback(async () => {
    if (!activeRef.current) return;
    try {
      const result = await fetchPollStatus();
      if (activeRef.current) setHttpStatus(result);
      if (result.active) timerRef.current = setTimeout(pollHttp, HTTP_POLL_MS);
      else if (result.phase) timerRef.current = setTimeout(pollHttp, HTTP_POLL_MS * 3);
    } catch {
      if (activeRef.current) timerRef.current = setTimeout(pollHttp, HTTP_POLL_MS * 2);
    }
  }, []);

  useEffect(() => { activeRef.current = true; pollHttp(); return () => { activeRef.current = false; clearTimeout(timerRef.current); }; }, [pollHttp]);

  useEffect(() => {
    if (wsPoll) { setHttpStatus(wsPoll); if (wsPoll.active) { clearTimeout(timerRef.current); timerRef.current = setTimeout(pollHttp, HTTP_POLL_MS); } }
  }, [wsPoll, pollHttp]);

  const pollInfo = httpStatus ? { phase: httpStatus.phase, current: httpStatus.current, total: httpStatus.total, message: httpStatus.message } : null;
  const jenkinsInfo = wsJenkins;
  const hasPoll = pollInfo && (pollInfo.phase === 'fetching' || pollInfo.phase === 'starting');
  const hasPollDone = pollInfo && pollInfo.phase === 'complete';
  const hasJenkins = jenkinsInfo && jenkinsInfo.phase === 'enriching';
  const hasJenkinsDone = jenkinsInfo && jenkinsInfo.phase === 'complete';

  useEffect(() => {
    const allDone = (!hasPoll && !hasJenkins) && (hasPollDone || hasJenkinsDone);
    if (allDone) {
      const timer = setTimeout(() => setDismissed(true), AUTO_HIDE_DELAY_MS);
      return () => clearTimeout(timer);
    }
    if (hasPoll || hasJenkins) setDismissed(false);
  }, [hasPoll, hasJenkins, hasPollDone, hasJenkinsDone]);

  const handleCancel = async () => { setCancelling(true); try { await cancelPoll(); } catch { /* */ } setCancelling(false); };

  if (dismissed) return null;
  if (!hasPoll && !hasPollDone && !hasJenkins && !hasJenkinsDone) return null;

  return (
    <Stack hasGutter className="app-poll-banner">
      {(hasPoll || hasPollDone) && pollInfo && <StackItem><ProgressLine info={pollInfo} onCancel={hasPoll ? handleCancel : undefined} cancelling={cancelling} /></StackItem>}
      {(hasJenkins || hasJenkinsDone) && jenkinsInfo && <StackItem><ProgressLine info={jenkinsInfo} /></StackItem>}
    </Stack>
  );
};
