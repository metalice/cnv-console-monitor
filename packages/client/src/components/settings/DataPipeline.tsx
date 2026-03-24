import React, { useState } from 'react';

import {
  Button,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  Progress,
  ProgressMeasureLocation,
  ProgressSize,
  Tooltip,
} from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  RedoIcon,
  SyncAltIcon,
  TimesIcon,
} from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';

import {
  cancelPipeline,
  fetchPollStatus,
  type PhaseState,
  type PipelineLogEntry,
  resumePhase,
} from '../../api/poll';
import { useAuth } from '../../context/AuthContext';

const PHASE_LABELS: Record<string, string> = {
  items: 'Failed Test Items',
  jenkins: 'Jenkins Enrichment',
  launches: 'Launches',
};

const formatDuration = (ms: number): string => {
  const s = Math.round(ms / 1000);
  if (s < 60) {
    return `${s}s`;
  }
  const m = Math.floor(s / 60);
  return s % 60 > 0 ? `${m}m ${s % 60}s` : `${m}m`;
};

const computeEta = (state: PhaseState): string => {
  if (!state.startedAt || state.total === 0 || state.succeeded === 0) {
    return '';
  }
  if (state.succeeded < state.total * 0.01) {
    return 'Estimating...';
  }
  const elapsed = Date.now() - state.startedAt;
  const remaining = (elapsed / state.succeeded) * (state.total - state.succeeded);
  if (remaining < 60_000) {
    return `~${Math.max(1, Math.round(remaining / 1000))}s`;
  }
  return `~${Math.round(remaining / 60_000)}m`;
};

const PipelinePhaseRow: React.FC<{
  name: string;
  state: PhaseState;
  onCancel?: () => void;
  cancelling?: boolean;
  onRetry?: () => void;
  retrying?: boolean;
}> = ({ cancelling, name, onCancel, onRetry, retrying, state }) => {
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const label = PHASE_LABELS[name] || name;
  const pct = state.total > 0 ? Math.round((state.succeeded / state.total) * 100) : 0;
  const isActive = state.status === 'running' || state.status === 'retrying';
  const eta = isActive ? computeEta(state) : '';
  const retryableErrors = state.errors.filter(e => !e.permanent);
  const permanentErrors = state.errors.filter(e => e.permanent);

  return (
    <div className="app-pipeline-phase">
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
      >
        <FlexItem>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <span className="app-font-13 app-font-bold">{label}</span>
            </FlexItem>
            {state.status === 'idle' && !onRetry && (
              <FlexItem>
                <Label isCompact color="grey" icon={<ClockIcon />}>
                  Waiting
                </Label>
              </FlexItem>
            )}
            {state.status === 'running' && (
              <FlexItem>
                <Label isCompact color="blue">
                  Fetching
                </Label>
              </FlexItem>
            )}
            {state.status === 'retrying' && (
              <FlexItem>
                <Label isCompact color="orange" icon={<SyncAltIcon />}>
                  Retrying {retryableErrors.length} (round {state.retryRound})
                </Label>
              </FlexItem>
            )}
            {state.status === 'complete' && (
              <FlexItem>
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  spaceItems={{ default: 'spaceItemsSm' }}
                >
                  <FlexItem>
                    <Label isCompact color="green" icon={<CheckCircleIcon />}>
                      {state.succeeded.toLocaleString()}
                    </Label>
                  </FlexItem>
                  {onRetry && (
                    <FlexItem>
                      <Button
                        icon={<RedoIcon />}
                        isDisabled={retrying}
                        isLoading={retrying}
                        size="sm"
                        variant="link"
                        onClick={onRetry}
                      >
                        Retry
                      </Button>
                    </FlexItem>
                  )}
                </Flex>
              </FlexItem>
            )}
            {state.status === 'cancelled' && (
              <FlexItem>
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  spaceItems={{ default: 'spaceItemsSm' }}
                >
                  <FlexItem>
                    <Label isCompact color="grey" icon={<BanIcon />}>
                      Cancelled
                    </Label>
                  </FlexItem>
                  {onRetry && (
                    <FlexItem>
                      <Button
                        icon={<RedoIcon />}
                        isDisabled={retrying}
                        isLoading={retrying}
                        size="sm"
                        variant="link"
                        onClick={onRetry}
                      >
                        Retry
                      </Button>
                    </FlexItem>
                  )}
                </Flex>
              </FlexItem>
            )}
            {state.status === 'idle' && onRetry && (
              <FlexItem>
                <Button
                  icon={<RedoIcon />}
                  isDisabled={retrying}
                  isLoading={retrying}
                  size="sm"
                  variant="link"
                  onClick={onRetry}
                >
                  Run
                </Button>
              </FlexItem>
            )}
            {state.status === 'skipped' && (
              <FlexItem>
                <Label isCompact color="grey">
                  Skipped
                </Label>
              </FlexItem>
            )}
            {state.failed > 0 && (
              <FlexItem>
                <Tooltip
                  content={`${retryableErrors.length} retryable, ${permanentErrors.length} permanent (404)`}
                >
                  <Label isCompact color="red" icon={<ExclamationTriangleIcon />}>
                    {state.failed} failed
                  </Label>
                </Tooltip>
              </FlexItem>
            )}
            {state.permanentFailures > 0 && state.status === 'complete' && (
              <FlexItem>
                <Label isCompact color="grey">
                  {state.permanentFailures} unavailable
                </Label>
              </FlexItem>
            )}
          </Flex>
        </FlexItem>
        {isActive && (
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <FlexItem>
                <span className="app-text-xs app-text-muted">
                  {state.succeeded.toLocaleString()} / {state.total.toLocaleString()}
                  {eta && <span className="app-opacity-dim"> &middot; {eta}</span>}
                </span>
              </FlexItem>
              {onCancel && (
                <FlexItem>
                  <Button
                    aria-label="Cancel"
                    isDisabled={cancelling}
                    size="sm"
                    variant="plain"
                    onClick={onCancel}
                  >
                    <TimesIcon />
                  </Button>
                </FlexItem>
              )}
            </Flex>
          </FlexItem>
        )}
      </Flex>
      {isActive && state.total > 0 && (
        <Progress
          aria-label={`${label} progress`}
          className="app-mt-xs"
          measureLocation={ProgressMeasureLocation.outside}
          size={ProgressSize.sm}
          value={pct}
        />
      )}
      {state.errors.length > 0 && (state.status === 'complete' || state.status === 'retrying') && (
        <ExpandableSection
          className="app-mt-xs"
          isExpanded={errorsExpanded}
          toggleText={`${state.errors.length} error details`}
          onToggle={(_e, v) => setErrorsExpanded(v)}
        >
          <div className="app-max-h-200 app-text-xs app-text-muted">
            {state.errors.slice(0, 20).map((err, i) => (
              <div className="app-activity-item" key={i}>
                {err.permanent ? '(permanent) ' : ''}
                {err.name} — {err.reason} (attempt {err.attempts})
              </div>
            ))}
            {state.errors.length > 20 && <div>...and {state.errors.length - 20} more</div>}
          </div>
        </ExpandableSection>
      )}
    </div>
  );
};

const PipelineLog: React.FC<{ log: PipelineLogEntry[]; totalEntries?: number }> = ({
  log,
  totalEntries,
}) => {
  const [expanded, setExpanded] = useState(false);
  if (log.length === 0) {
    return null;
  }

  const all = [...log].reverse();
  const total = totalEntries ?? log.length;
  const levelColor = (level: string) =>
    level === 'error' ? 'app-text-danger' : level === 'warn' ? '' : 'app-text-muted';

  return (
    <ExpandableSection
      className="app-mt-sm"
      isExpanded={expanded}
      toggleText={`Activity Log (${total > log.length ? `${log.length} of ${total}` : log.length})`}
      onToggle={(_e, v) => setExpanded(v)}
    >
      <div className="app-max-h-300 app-text-xs app-mono-sm">
        {all.map((entry, i) => (
          <div className={levelColor(entry.level)} key={i}>
            {new Date(entry.timestamp).toLocaleTimeString()} [{entry.phase}] {entry.message}
          </div>
        ))}
      </div>
    </ExpandableSection>
  );
};

const RESUMABLE_PHASES = new Set(['items', 'jenkins']);

export const DataPipeline: React.FC = () => {
  const { isAdmin } = useAuth();
  const [cancelling, setCancelling] = useState(false);
  const [resuming, setResuming] = useState<string | null>(null);

  const { data: pollStatus } = useQuery({
    queryFn: fetchPollStatus,
    queryKey: ['pollStatus'],
    refetchInterval: query => (query.state.data?.pipeline?.active ? 3_000 : 15_000),
  });
  const pipeline = pollStatus?.pipeline;

  if (!pipeline || (!pipeline.active && Object.keys(pipeline.phases).length === 0)) {
    return null;
  }

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await cancelPipeline();
    } catch {
      /* cancellation may fail if pipeline already stopped */
    }
    setCancelling(false);
  };

  const handleResume = async (phaseName: string) => {
    setResuming(phaseName);
    try {
      await resumePhase(phaseName);
    } catch {
      /* resume may fail if phase is no longer resumable */
    }
    setResuming(null);
  };

  const canResumePhase = (name: string, phase: PhaseState): boolean => {
    if (!isAdmin || pipeline.active || !RESUMABLE_PHASES.has(name)) {
      return false;
    }
    if (phase.status === 'cancelled' || phase.status === 'idle') {
      return true;
    }
    if (phase.status === 'complete' && (phase.total === 0 || phase.failed > 0)) {
      return true;
    }
    return false;
  };

  return (
    <div className="app-enrichment-card">
      {pipeline.active && (
        <div className="app-pipeline-header">
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
          >
            <FlexItem>
              <span className="app-font-13 app-font-bold">
                Pipeline{' '}
                {pipeline.trigger === 'backfill'
                  ? '(Full Fetch)'
                  : pipeline.trigger === 'scheduled'
                    ? '(Scheduled)'
                    : ''}
              </span>
            </FlexItem>
            {pipeline.startedAt && (
              <FlexItem>
                <span className="app-text-xs app-text-muted">
                  Started {new Date(pipeline.startedAt).toLocaleTimeString()}
                </span>
              </FlexItem>
            )}
          </Flex>
        </div>
      )}
      {!pipeline.active && pipeline.completedAt && (
        <div className="app-pipeline-header">
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
          >
            <FlexItem>
              <span className="app-font-13">
                Last run: {new Date(pipeline.completedAt).toLocaleString()}
                {pipeline.durationMs && ` (${formatDuration(pipeline.durationMs)})`}
                {pipeline.cancelled && ' — Cancelled'}
              </span>
            </FlexItem>
          </Flex>
        </div>
      )}

      {Object.entries(pipeline.phases).map(([name, phase]) => (
        <PipelinePhaseRow
          cancelling={cancelling}
          key={name}
          name={name}
          retrying={resuming === name}
          state={phase}
          onCancel={
            isAdmin && (phase.status === 'running' || phase.status === 'retrying')
              ? handleCancel
              : undefined
          }
          onRetry={canResumePhase(name, phase) ? () => handleResume(name) : undefined}
        />
      ))}

      {pipeline.log.length > 0 && (
        <PipelineLog
          log={pipeline.log}
          totalEntries={(pipeline as Record<string, unknown>).totalLogEntries as number | undefined}
        />
      )}
    </div>
  );
};
