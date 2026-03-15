import React from 'react';
import { Label, Tooltip } from '@patternfly/react-core';
import { Td } from '@patternfly/react-table';
import type { PublicConfig } from '@cnv-monitor/shared';

type CellProps = { visible: boolean };

export const PolarionCell: React.FC<CellProps & { polarionId?: string | null; config?: PublicConfig; stopPropagation?: boolean }> = ({ visible, polarionId, config, stopPropagation }) => {
  if (!visible) return null;
  return (
    <Td dataLabel="Polarion" className="app-cell-nowrap">
      {polarionId && (
        <Label color="blue" isCompact>
          {config?.polarionUrl
            ? <a href={`${config.polarionUrl}${polarionId}`} target="_blank" rel="noreferrer" onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}>{polarionId}</a>
            : polarionId}
        </Label>
      )}
    </Td>
  );
};

export const AiPredictionCell: React.FC<CellProps & { prediction?: string | null; confidence?: number | null }> = ({ visible, prediction, confidence }) => {
  if (!visible) return null;
  const color = prediction?.includes('Product') ? 'red' as const : prediction?.includes('System') ? 'orange' as const : 'grey' as const;
  return (
    <Td dataLabel="AI" className="app-cell-nowrap">
      {prediction && <Label isCompact color={color}>{prediction.replace('Predicted ', '')} {confidence}%</Label>}
    </Td>
  );
};

export const JiraCell: React.FC<CellProps & { jiraKey?: string | null; jiraStatus?: string | null; config?: PublicConfig; stopPropagation?: boolean }> = ({ visible, jiraKey, jiraStatus, config, stopPropagation }) => {
  if (!visible) return null;
  return (
    <Td dataLabel="Jira" className="app-cell-nowrap">
      {jiraKey && (
        <Label color="blue" isCompact>
          {config?.jiraUrl
            ? <a href={`${config.jiraUrl}/browse/${jiraKey}`} target="_blank" rel="noreferrer" onClick={stopPropagation ? (event) => event.stopPropagation() : undefined}>{jiraKey}</a>
            : jiraKey}
          {' '}({jiraStatus})
        </Label>
      )}
    </Td>
  );
};

export const ErrorCell: React.FC<CellProps & { errorMessage?: string | null; useRichTooltip?: boolean }> = ({ visible, errorMessage, useRichTooltip }) => {
  if (!visible) return null;
  return (
    <Td dataLabel="Error" className="app-cell-truncate">
      {errorMessage && (
        <Tooltip content={useRichTooltip ? <div className="app-error-tooltip">{errorMessage}</div> : errorMessage}>
          <span className="app-text-xs app-text-muted">{errorMessage.split('\n')[0]}</span>
        </Tooltip>
      )}
    </Td>
  );
};
