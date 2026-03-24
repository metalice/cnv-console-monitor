import React from 'react';

import type { PublicConfig, TestItem } from '@cnv-monitor/shared';

import { Button, ExpandableSection, Flex, FlexItem, Label, Tooltip } from '@patternfly/react-core';
import { BugIcon, LinkIcon, WrenchIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';

import type { AggregatedItem } from '../../utils/aggregation';
import { StatusBadge } from '../common/StatusBadge';

import { LogViewer } from './LogViewer';
import { SimilarFailuresPanel } from './SimilarFailuresPanel';

type TestItemsRowProps = {
  group: AggregatedItem;
  isGroupMode: boolean;
  launchCount: number;
  config: PublicConfig | undefined;
  isExpanded: boolean;
  visibleColumnCount: number;
  isColumnVisible: (id: string) => boolean;
  onToggleExpand: (itemId: number) => void;
  onNavigate: (path: string) => void;
  onTriage: (rpIds: number[]) => void;
  onCreateJira: (item: TestItem) => void;
  onLinkJira: (rpId: number) => void;
};

export const TestItemsRow: React.FC<TestItemsRowProps> = ({
  config,
  group,
  isColumnVisible,
  isExpanded,
  isGroupMode,
  launchCount,
  onCreateJira,
  onLinkJira,
  onNavigate,
  onToggleExpand,
  onTriage,
  visibleColumnCount,
}) => {
  const { allRpIds, occurrences, representative: item } = group;
  const shortName = item.name.split('.').pop() || item.name;

  return (
    <React.Fragment key={item.unique_id ?? item.rp_id}>
      <Tr>
        <Td
          expand={{ isExpanded, onToggle: () => onToggleExpand(item.rp_id), rowIndex: item.rp_id }}
        />
        {isColumnVisible('testName') && (
          <Td className="app-cell-truncate" dataLabel="Test Name">
            <Tooltip content={item.name}>
              {item.unique_id ? (
                <Button
                  isInline
                  size="sm"
                  variant="link"
                  onClick={event => {
                    event.stopPropagation();
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    onNavigate(`/test/${encodeURIComponent(item.unique_id!)}`);
                  }}
                >
                  {shortName}
                </Button>
              ) : (
                <span>{shortName}</span>
              )}
            </Tooltip>
          </Td>
        )}
        {isGroupMode && (
          <Td className="app-cell-nowrap" dataLabel="Occurrences">
            {occurrences > 1 && (
              <Tooltip content={`Failed in ${occurrences} of ${launchCount} launches`}>
                <Label isCompact color="orange">
                  {occurrences}x
                </Label>
              </Tooltip>
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
              <Tooltip content={item.error_message}>
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
                    onClick={event => event.stopPropagation()}
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
        {isColumnVisible('defect') && (
          <Td className="app-cell-nowrap" dataLabel="AI">
            {item.ai_prediction && (
              <Label
                isCompact
                color={
                  item.ai_prediction.includes('Product')
                    ? 'red'
                    : item.ai_prediction.includes('System')
                      ? 'orange'
                      : 'grey'
                }
              >
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
                    onClick={event => event.stopPropagation()}
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
                  onClick={() => onTriage(allRpIds)}
                >
                  Classify{occurrences > 1 ? ` (${occurrences})` : ''}
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  isInline
                  icon={<BugIcon />}
                  variant="link"
                  onClick={() => onCreateJira(item)}
                >
                  Bug
                </Button>
              </FlexItem>
              <FlexItem>
                <Button
                  isInline
                  icon={<LinkIcon />}
                  variant="link"
                  onClick={() => onLinkJira(item.rp_id)}
                >
                  Link
                </Button>
              </FlexItem>
            </Flex>
          </Td>
        )}
      </Tr>
      {isExpanded && (
        <Tr isExpanded>
          <Td colSpan={visibleColumnCount + (isGroupMode ? 2 : 1)} noPadding={false}>
            <ExpandableSection isIndented toggleText="Error Logs">
              <LogViewer itemId={item.rp_id} />
            </ExpandableSection>
            {item.unique_id && (
              <ExpandableSection isIndented toggleText="Similar Failures History">
                <SimilarFailuresPanel uniqueId={item.unique_id} />
              </ExpandableSection>
            )}
          </Td>
        </Tr>
      )}
    </React.Fragment>
  );
};
