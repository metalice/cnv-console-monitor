import { useState } from 'react';

import { Flex, FlexItem } from '@patternfly/react-core';
import { useQuery } from '@tanstack/react-query';

import { cancelPipeline, fetchPollStatus, resumePhase } from '../../api/poll';
import { useAuth } from '../../context/AuthContext';

import { canResumePhase, formatDuration } from './pipelineHelpers';
import { PipelineLog } from './PipelineLog';
import { PipelinePhaseRow } from './PipelinePhaseRow';

export const DataPipeline = () => {
  const { isAdmin } = useAuth();
  const [cancelling, setCancelling] = useState(false);
  const [resuming, setResuming] = useState<string | null>(null);

  const { data: pollStatus } = useQuery({
    queryFn: fetchPollStatus,
    queryKey: ['pollStatus'],
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data
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
          onRetry={
            canResumePhase(name, phase, isAdmin, pipeline.active)
              ? () => handleResume(name)
              : undefined
          }
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
