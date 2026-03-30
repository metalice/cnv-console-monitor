import { useState } from 'react';

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
import { ExclamationTriangleIcon } from '@patternfly/react-icons';

import { type PhaseState } from '../../api/poll';

import { PhaseStatusLabel } from './PhaseStatusLabel';
import { computeEta, PHASE_LABELS } from './pipelineHelpers';

type PipelinePhaseRowProps = {
  name: string;
  state: PhaseState;
  onCancel?: () => void;
  cancelling?: boolean;
  onRetry?: () => void;
  retrying?: boolean;
};

export const PipelinePhaseRow = ({
  cancelling,
  name,
  onCancel,
  onRetry,
  retrying,
  state,
}: PipelinePhaseRowProps) => {
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const label = PHASE_LABELS[name] || name;
  const pct = state.total > 0 ? Math.round((state.succeeded / state.total) * 100) : 0;
  const isActive = state.status === 'running' || state.status === 'retrying';
  const eta = isActive ? computeEta(state) : '';
  const retryableErrors = state.errors.filter(err => !err.permanent);
  const permanentErrors = state.errors.filter(err => err.permanent);

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
            <FlexItem>
              <PhaseStatusLabel retrying={retrying} state={state} onRetry={onRetry} />
            </FlexItem>
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
                    <span>&times;</span>
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
          onToggle={(_e, value) => setErrorsExpanded(value)}
        >
          <div className="app-max-h-200 app-text-xs app-text-muted">
            {state.errors.slice(0, 20).map((err, idx) => (
              // eslint-disable-next-line react/no-array-index-key
              <div className="app-activity-item" key={idx}>
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
