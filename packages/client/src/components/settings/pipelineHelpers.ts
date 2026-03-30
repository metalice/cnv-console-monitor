import { type PhaseState } from '../../api/poll';

export const PHASE_LABELS: Record<string, string> = {
  items: 'Failed Test Items',
  jenkins: 'Jenkins Enrichment',
  launches: 'Launches',
};

const RESUMABLE_PHASES = new Set(['items', 'jenkins']);

export const formatDuration = (millis: number): string => {
  const seconds = Math.round(millis / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  return seconds % 60 > 0 ? `${minutes}m ${seconds % 60}s` : `${minutes}m`;
};

export const levelColor = (level: string) =>
  level === 'error' ? 'app-text-danger' : level === 'warn' ? '' : 'app-text-muted';

export const computeEta = (state: PhaseState): string => {
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

export const canResumePhase = (
  name: string,
  phase: PhaseState,
  isAdmin: boolean,
  pipelineActive: boolean,
): boolean => {
  if (!isAdmin || pipelineActive || !RESUMABLE_PHASES.has(name)) {
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
