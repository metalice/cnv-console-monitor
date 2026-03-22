import React, { useState } from 'react';
import {
  Button, Flex, FlexItem, Label,
  Progress, ProgressSize, ProgressMeasureLocation,
  Tooltip, ExpandableSection,
} from '@patternfly/react-core';
import { TimesIcon, CheckCircleIcon, ExclamationTriangleIcon, SyncAltIcon, BanIcon, ClockIcon, RedoIcon } from '@patternfly/react-icons';
import { useQuery } from '@tanstack/react-query';
import { fetchPollStatus, cancelPipeline, resumePhase, type PhaseState, type PipelineState, type PipelineLogEntry } from '../../api/poll';
import { useAuth } from '../../context/AuthContext';

const PHASE_LABELS: Record<string, string> = {
  launches: 'Launches',
  items: 'Failed Test Items',
  jenkins: 'Jenkins Enrichment',
};

const formatDuration = (ms: number): string => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return s % 60 > 0 ? `${m}m ${s % 60}s` : `${m}m`;
};

const computeEta = (state: PhaseState): string => {
  if (!state.startedAt || state.total === 0 || state.succeeded === 0) return '';
  if (state.succeeded < state.total * 0.01) return 'Estimating...';
  const elapsed = Date.now() - state.startedAt;
  const remaining = (elapsed / state.succeeded) * (state.total - state.succeeded);
  if (remaining < 60_000) return `~${Math.max(1, Math.round(remaining / 1000))}s`;
  return `~${Math.round(remaining / 60_000)}m`;
};

const PipelinePhaseRow: React.FC<{
  name: string;
  state: PhaseState;
  onCancel?: () => void;
  cancelling?: boolean;
  onRetry?: () => void;
  retrying?: boolean;
}> = ({ name, state, onCancel, cancelling, onRetry, retrying }) => {
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const label = PHASE_LABELS[name] || name;
  const pct = state.total > 0 ? Math.round((state.succeeded / state.total) * 100) : 0;
  const isActive = state.status === 'running' || state.status === 'retrying';
  const eta = isActive ? computeEta(state) : '';
  const retryableErrors = state.errors.filter(e => !e.permanent);
  const permanentErrors = state.errors.filter(e => e.permanent);

  return (
    <div className="app-pipeline-phase">
      <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem><span className="app-font-13 app-font-bold">{label}</span></FlexItem>
            {state.status === 'idle' && !onRetry && <FlexItem><Label color="grey" isCompact icon={<ClockIcon />}>Waiting</Label></FlexItem>}
            {state.status === 'running' && <FlexItem><Label color="blue" isCompact>Fetching</Label></FlexItem>}
            {state.status === 'retrying' && <FlexItem><Label color="orange" isCompact icon={<SyncAltIcon />}>Retrying {retryableErrors.length} (round {state.retryRound})</Label></FlexItem>}
            {state.status === 'complete' && (
              <FlexItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem><Label color="green" isCompact icon={<CheckCircleIcon />}>{state.succeeded.toLocaleString()}</Label></FlexItem>
                  {onRetry && (
                    <FlexItem>
                      <Button variant="link" size="sm" icon={<RedoIcon />} isDisabled={retrying} isLoading={retrying} onClick={onRetry}>
                        Retry
                      </Button>
                    </FlexItem>
                  )}
                </Flex>
              </FlexItem>
            )}
            {state.status === 'cancelled' && (
              <FlexItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <FlexItem><Label color="grey" isCompact icon={<BanIcon />}>Cancelled</Label></FlexItem>
                  {onRetry && (
                    <FlexItem>
                      <Button variant="link" size="sm" icon={<RedoIcon />} isDisabled={retrying} isLoading={retrying} onClick={onRetry}>
                        Retry
                      </Button>
                    </FlexItem>
                  )}
                </Flex>
              </FlexItem>
            )}
            {state.status === 'idle' && onRetry && (
              <FlexItem>
                <Button variant="link" size="sm" icon={<RedoIcon />} isDisabled={retrying} isLoading={retrying} onClick={onRetry}>
                  Run
                </Button>
              </FlexItem>
            )}
            {state.status === 'skipped' && <FlexItem><Label color="grey" isCompact>Skipped</Label></FlexItem>}
            {state.failed > 0 && (
              <FlexItem>
                <Tooltip content={`${retryableErrors.length} retryable, ${permanentErrors.length} permanent (404)`}>
                  <Label color="red" isCompact icon={<ExclamationTriangleIcon />}>{state.failed} failed</Label>
                </Tooltip>
              </FlexItem>
            )}
            {state.permanentFailures > 0 && state.status === 'complete' && (
              <FlexItem><Label color="grey" isCompact>{state.permanentFailures} unavailable</Label></FlexItem>
            )}
          </Flex>
        </FlexItem>
        {isActive && (
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <span className="app-text-xs app-text-muted">
                  {state.succeeded.toLocaleString()} / {state.total.toLocaleString()}
                  {eta && <span className="app-opacity-dim"> &middot; {eta}</span>}
                </span>
              </FlexItem>
              {onCancel && (
                <FlexItem>
                  <Button variant="plain" size="sm" aria-label="Cancel" isDisabled={cancelling} onClick={onCancel}><TimesIcon /></Button>
                </FlexItem>
              )}
            </Flex>
          </FlexItem>
        )}
      </Flex>
      {isActive && state.total > 0 && (
        <Progress value={pct} size={ProgressSize.sm} measureLocation={ProgressMeasureLocation.outside} aria-label={`${label} progress`} className="app-mt-xs" />
      )}
      {state.errors.length > 0 && (state.status === 'complete' || state.status === 'retrying') && (
        <ExpandableSection toggleText={`${state.errors.length} error details`} isExpanded={errorsExpanded} onToggle={(_e, v) => setErrorsExpanded(v)} className="app-mt-xs">
          <div className="app-max-h-200 app-text-xs app-text-muted">
            {state.errors.slice(0, 20).map((err, i) => (
              <div key={i} className="app-activity-item">
                {err.permanent ? '(permanent) ' : ''}{err.name} — {err.reason} (attempt {err.attempts})
              </div>
            ))}
            {state.errors.length > 20 && <div>...and {state.errors.length - 20} more</div>}
          </div>
        </ExpandableSection>
      )}
    </div>
  );
};

const PipelineLog: React.FC<{ log: PipelineLogEntry[]; totalEntries?: number }> = ({ log, totalEntries }) => {
  const [expanded, setExpanded] = useState(false);
  if (log.length === 0) return null;

  const all = [...log].reverse();
  const total = totalEntries ?? log.length;
  const levelColor = (level: string) => level === 'error' ? 'app-text-danger' : level === 'warn' ? '' : 'app-text-muted';

  return (
    <ExpandableSection toggleText={`Activity Log (${total > log.length ? `${log.length} of ${total}` : log.length})`} isExpanded={expanded} onToggle={(_e, v) => setExpanded(v)} className="app-mt-sm">
      <div className="app-max-h-300 app-text-xs app-mono-sm">
        {all.map((entry, i) => (
          <div key={i} className={levelColor(entry.level)}>
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
    queryKey: ['pollStatus'],
    queryFn: fetchPollStatus,
    refetchInterval: (query) => query.state.data?.pipeline?.active ? 3_000 : 15_000,
  });
  const pipeline = pollStatus?.pipeline;

  if (!pipeline || (!pipeline.active && Object.keys(pipeline.phases).length === 0)) return null;

  const handleCancel = async () => {
    setCancelling(true);
    try { await cancelPipeline(); } catch {}
    setCancelling(false);
  };

  const handleResume = async (phaseName: string) => {
    setResuming(phaseName);
    try { await resumePhase(phaseName); } catch {}
    setResuming(null);
  };

  const canResumePhase = (name: string, phase: PhaseState): boolean => {
    if (!isAdmin || pipeline.active || !RESUMABLE_PHASES.has(name)) return false;
    if (phase.status === 'cancelled' || phase.status === 'idle') return true;
    if (phase.status === 'complete' && (phase.total === 0 || phase.failed > 0)) return true;
    return false;
  };

  return (
    <div className="app-enrichment-card">
      {pipeline.active && (
        <div className="app-pipeline-header">
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <span className="app-font-13 app-font-bold">
                Pipeline {pipeline.trigger === 'backfill' ? '(Full Fetch)' : pipeline.trigger === 'scheduled' ? '(Scheduled)' : ''}
              </span>
            </FlexItem>
            {pipeline.startedAt && (
              <FlexItem><span className="app-text-xs app-text-muted">Started {new Date(pipeline.startedAt).toLocaleTimeString()}</span></FlexItem>
            )}
          </Flex>
        </div>
      )}
      {!pipeline.active && pipeline.completedAt && (
        <div className="app-pipeline-header">
          <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
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
          key={name}
          name={name}
          state={phase}
          onCancel={isAdmin && (phase.status === 'running' || phase.status === 'retrying') ? handleCancel : undefined}
          cancelling={cancelling}
          onRetry={canResumePhase(name, phase) ? () => handleResume(name) : undefined}
          retrying={resuming === name}
        />
      ))}

      {pipeline.log.length > 0 && <PipelineLog log={pipeline.log} totalEntries={(pipeline as Record<string, unknown>).totalLogEntries as number | undefined} />}
    </div>
  );
};
