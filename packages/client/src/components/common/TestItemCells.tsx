import React from 'react';

import type { PublicConfig } from '@cnv-monitor/shared';

import { Label, Tooltip } from '@patternfly/react-core';
import { Td } from '@patternfly/react-table';

type CellProps = { visible: boolean };

export const PolarionCell: React.FC<
  CellProps & { polarionId?: string | null; config?: PublicConfig; stopPropagation?: boolean }
> = ({ config, polarionId, stopPropagation, visible }) => {
  if (!visible) {
    return null;
  }
  return (
    <Td className="app-cell-nowrap" dataLabel="Polarion">
      {polarionId && (
        <Label isCompact color="blue">
          {config?.polarionUrl ? (
            <a
              href={`${config.polarionUrl}${polarionId}`}
              rel="noreferrer"
              target="_blank"
              onClick={stopPropagation ? event => event.stopPropagation() : undefined}
            >
              {polarionId}
            </a>
          ) : (
            polarionId
          )}
        </Label>
      )}
    </Td>
  );
};

export const AiPredictionCell: React.FC<
  CellProps & { prediction?: string | null; confidence?: number | null }
> = ({ confidence, prediction, visible }) => {
  if (!visible) {
    return null;
  }
  const color = prediction?.includes('Product')
    ? ('red' as const)
    : prediction?.includes('System')
      ? ('orange' as const)
      : ('grey' as const);
  return (
    <Td className="app-cell-nowrap" dataLabel="AI">
      {prediction && (
        <Label isCompact color={color}>
          {prediction.replace('Predicted ', '')} {confidence}%
        </Label>
      )}
    </Td>
  );
};

export const JiraCell: React.FC<
  CellProps & {
    jiraKey?: string | null;
    jiraStatus?: string | null;
    config?: PublicConfig;
    stopPropagation?: boolean;
  }
> = ({ config, jiraKey, jiraStatus, stopPropagation, visible }) => {
  if (!visible) {
    return null;
  }
  return (
    <Td className="app-cell-nowrap" dataLabel="Jira">
      {jiraKey && (
        <Label isCompact color="blue">
          {config?.jiraUrl ? (
            <a
              href={`${config.jiraUrl}/browse/${jiraKey}`}
              rel="noreferrer"
              target="_blank"
              onClick={stopPropagation ? event => event.stopPropagation() : undefined}
            >
              {jiraKey}
            </a>
          ) : (
            jiraKey
          )}{' '}
          ({jiraStatus})
        </Label>
      )}
    </Td>
  );
};

export const ErrorCell: React.FC<
  CellProps & { errorMessage?: string | null; useRichTooltip?: boolean }
> = ({ errorMessage, useRichTooltip, visible }) => {
  if (!visible) {
    return null;
  }
  return (
    <Td className="app-cell-truncate" dataLabel="Error">
      {errorMessage && (
        <Tooltip
          content={
            useRichTooltip ? <div className="app-error-tooltip">{errorMessage}</div> : errorMessage
          }
        >
          <span className="app-text-xs app-text-muted">{errorMessage.split('\n')[0]}</span>
        </Tooltip>
      )}
    </Td>
  );
};
