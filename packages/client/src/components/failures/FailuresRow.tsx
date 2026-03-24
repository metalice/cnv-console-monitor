import React from 'react';

import type { PublicConfig, TestItem } from '@cnv-monitor/shared';

import { Button, Flex, FlexItem, Label, Tooltip } from '@patternfly/react-core';
import { BugIcon, WrenchIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';

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
  config,
  group,
  isColumnVisible,
  isNew,
  isSelected,
  onCreateJira,
  onNavigate,
  onSelect,
  onTriageSelected,
  streak,
}) => {
  const { allRpIds, occurrences, representative: item } = group;
  const shortName = item.name.split('.').pop() || item.name;

  return (
    <Tr key={item.unique_id ?? item.rp_id}>
      {isColumnVisible('select') && (
        <Td
          select={{
            isSelected,
            onSelect: (_event, checked) => onSelect(allRpIds, checked),
            rowIndex: item.rp_id,
          }}
        />
      )}
      {isColumnVisible('testName') && (
        <Td className="app-cell-truncate" dataLabel="Test Name">
          <Tooltip content={item.name}>
            {item.unique_id ? (
              <Button
                isInline
                size="sm"
                variant="link"
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                onClick={() => onNavigate(`/test/${encodeURIComponent(item.unique_id!)}`)}
              >
                {shortName}
              </Button>
            ) : (
              <span>{shortName}</span>
            )}
          </Tooltip>
          {isNew && (
            <Label isCompact className="app-ml-xs" color="teal">
              New
            </Label>
          )}
        </Td>
      )}
      {isColumnVisible('occurrences') && (
        <Td className="app-cell-nowrap" dataLabel="Occurrences">
          {occurrences > 1 && (
            <Tooltip content={`Failed in ${occurrences} launches. Classifying applies to all.`}>
              <Label isCompact color="orange">
                {occurrences}x
              </Label>
            </Tooltip>
          )}
          {streak && streak.consecutiveFailures > 0 && (
            <>
              {' '}
              <Tooltip
                content={`Failed in the last ${streak.consecutiveFailures} of ${streak.totalRuns} runs`}
              >
                <Label isCompact color="red">
                  {streak.consecutiveFailures}/{streak.totalRuns} failing
                </Label>
              </Tooltip>
              {streak.lastPassDate && (
                <span className="app-text-xs app-text-muted app-ml-xs">
                  Last pass:{' '}
                  {new Date(streak.lastPassDate).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              )}
            </>
          )}
        </Td>
      )}
      {isColumnVisible('status') && (
        <Td className="app-cell-nowrap" dataLabel="Status">
          <StatusBadge status={item.status} />
        </Td>
      )}
      {isColumnVisible('error') && (
        <Td className="app-cell-truncate" dataLabel="Error">
          {item.error_message && (
            <Tooltip content={<div className="app-error-tooltip">{item.error_message}</div>}>
              <span className="app-text-xs app-text-muted">
                {item.error_message.split('\n')[0]}
              </span>
            </Tooltip>
          )}
        </Td>
      )}
      {isColumnVisible('polarion') && (
        <Td className="app-cell-nowrap" dataLabel="Polarion">
          {item.polarion_id && (
            <Label isCompact color="blue">
              {config?.polarionUrl ? (
                <a
                  href={`${config.polarionUrl}${item.polarion_id}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  {item.polarion_id}
                </a>
              ) : (
                item.polarion_id
              )}
            </Label>
          )}
        </Td>
      )}
      {isColumnVisible('aiPrediction') && (
        <Td className="app-cell-nowrap" dataLabel="AI">
          {item.ai_prediction && (
            <Label isCompact color={item.ai_prediction.includes('Product') ? 'red' : 'orange'}>
              {item.ai_prediction.replace('Predicted ', '')} {item.ai_confidence}%
            </Label>
          )}
        </Td>
      )}
      {isColumnVisible('jira') && (
        <Td className="app-cell-nowrap" dataLabel="Jira">
          {item.jira_key && (
            <Label isCompact color="blue">
              {config?.jiraUrl ? (
                <a
                  href={`${config.jiraUrl}/browse/${item.jira_key}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  {item.jira_key}
                </a>
              ) : (
                item.jira_key
              )}{' '}
              ({item.jira_status})
            </Label>
          )}
        </Td>
      )}
      {isColumnVisible('actions') && (
        <Td className="app-cell-nowrap" dataLabel="Actions">
          <Flex flexWrap={{ default: 'nowrap' }}>
            <FlexItem>
              <Button
                isInline
                icon={<WrenchIcon />}
                variant="link"
                onClick={() => onTriageSelected(allRpIds)}
              >
                Classify{occurrences > 1 ? ` (${occurrences})` : ''}
              </Button>
            </FlexItem>
            <FlexItem>
              <Button isInline icon={<BugIcon />} variant="link" onClick={() => onCreateJira(item)}>
                Bug
              </Button>
            </FlexItem>
          </Flex>
        </Td>
      )}
    </Tr>
  );
};
