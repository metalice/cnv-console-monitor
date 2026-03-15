import React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  Label,
  Tooltip,
} from '@patternfly/react-core';
import { Tr, Td } from '@patternfly/react-table';
import { WrenchIcon, BugIcon } from '@patternfly/react-icons';
import type { TestItem, PublicConfig } from '@cnv-monitor/shared';
import type { StreakInfo } from '../../api/testItems';
import type { AggregatedItem } from '../../utils/aggregation';
import { StatusBadge } from '../common/StatusBadge';

type FailuresRowProps = {
  group: AggregatedItem;
  config: PublicConfig | undefined;
  isNew: boolean;
  streak: StreakInfo | undefined;
  isSelected: boolean;
  isColumnVisible: (id: string) => boolean;
  onSelect: (rpIds: number[], checked: boolean) => void;
  onNavigate: (path: string) => void;
  onTriageSelected: (itemIds: number[]) => void;
  onCreateJira: (item: TestItem) => void;
};

export const FailuresRow: React.FC<FailuresRowProps> = ({
  group, config, isNew, streak, isSelected,
  isColumnVisible, onSelect, onNavigate, onTriageSelected, onCreateJira,
}) => {
  const { representative: item, allRpIds, occurrences } = group;
  const shortName = item.name.split('.').pop() || item.name;

  return (
    <Tr key={item.unique_id ?? item.rp_id}>
      {isColumnVisible('select') && <Td select={{ isSelected, onSelect: (_event, checked) => onSelect(allRpIds, checked), rowIndex: item.rp_id }} />}
      {isColumnVisible('testName') && (
        <Td dataLabel="Test Name" className="app-cell-truncate">
          <Tooltip content={item.name}>
            {item.unique_id
              ? <Button variant="link" isInline size="sm" onClick={() => onNavigate(`/test/${encodeURIComponent(item.unique_id!)}`)}>{shortName}</Button>
              : <span>{shortName}</span>}
          </Tooltip>
          {isNew && <Label color="teal" isCompact className="app-ml-xs">New</Label>}
        </Td>
      )}
      {isColumnVisible('occurrences') && (
        <Td dataLabel="Occurrences" className="app-cell-nowrap">
          {occurrences > 1 && <Tooltip content={`Failed in ${occurrences} launches. Classifying applies to all.`}><Label color="orange" isCompact>{occurrences}x</Label></Tooltip>}
          {streak && streak.consecutiveFailures > 0 && (
            <>
              {' '}<Tooltip content={`Failed in the last ${streak.consecutiveFailures} of ${streak.totalRuns} runs`}><Label color="red" isCompact>{streak.consecutiveFailures}/{streak.totalRuns} failing</Label></Tooltip>
              {streak.lastPassDate && <span className="app-text-xs app-text-muted app-ml-xs">Last pass: {new Date(streak.lastPassDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
            </>
          )}
        </Td>
      )}
      {isColumnVisible('status') && <Td dataLabel="Status" className="app-cell-nowrap"><StatusBadge status={item.status} /></Td>}
      {isColumnVisible('error') && (
        <Td dataLabel="Error" className="app-cell-truncate">
          {item.error_message && <Tooltip content={<div className="app-error-tooltip">{item.error_message}</div>}><span className="app-text-xs app-text-muted">{item.error_message.split('\n')[0]}</span></Tooltip>}
        </Td>
      )}
      {isColumnVisible('polarion') && (
        <Td dataLabel="Polarion" className="app-cell-nowrap">
          {item.polarion_id && <Label color="blue" isCompact>{config?.polarionUrl ? <a href={`${config.polarionUrl}${item.polarion_id}`} target="_blank" rel="noreferrer">{item.polarion_id}</a> : item.polarion_id}</Label>}
        </Td>
      )}
      {isColumnVisible('aiPrediction') && (
        <Td dataLabel="AI" className="app-cell-nowrap">
          {item.ai_prediction && <Label isCompact color={item.ai_prediction.includes('Product') ? 'red' : 'orange'}>{item.ai_prediction.replace('Predicted ', '')} {item.ai_confidence}%</Label>}
        </Td>
      )}
      {isColumnVisible('jira') && (
        <Td dataLabel="Jira" className="app-cell-nowrap">
          {item.jira_key && <Label color="blue" isCompact>{config?.jiraUrl ? <a href={`${config.jiraUrl}/browse/${item.jira_key}`} target="_blank" rel="noreferrer">{item.jira_key}</a> : item.jira_key}{' '}({item.jira_status})</Label>}
        </Td>
      )}
      {isColumnVisible('actions') && (
        <Td dataLabel="Actions" className="app-cell-nowrap">
          <Flex flexWrap={{ default: 'nowrap' }}>
            <FlexItem><Button variant="link" isInline icon={<WrenchIcon />} onClick={() => onTriageSelected(allRpIds)}>Classify{occurrences > 1 ? ` (${occurrences})` : ''}</Button></FlexItem>
            <FlexItem><Button variant="link" isInline icon={<BugIcon />} onClick={() => onCreateJira(item)}>Bug</Button></FlexItem>
          </Flex>
        </Td>
      )}
    </Tr>
  );
};
