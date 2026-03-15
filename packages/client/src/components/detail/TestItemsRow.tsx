import React from 'react';
import {
  Button,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  Tooltip,
} from '@patternfly/react-core';
import { Tr, Td } from '@patternfly/react-table';
import { WrenchIcon, BugIcon, LinkIcon } from '@patternfly/react-icons';
import type { TestItem, PublicConfig } from '@cnv-monitor/shared';
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
  group, isGroupMode, launchCount, config,
  isExpanded, visibleColumnCount, isColumnVisible,
  onToggleExpand, onNavigate, onTriage, onCreateJira, onLinkJira,
}) => {
  const { representative: item, allRpIds, occurrences } = group;
  const shortName = item.name.split('.').pop() || item.name;

  return (
    <React.Fragment key={item.unique_id ?? item.rp_id}>
      <Tr>
        <Td expand={{ isExpanded, onToggle: () => onToggleExpand(item.rp_id), rowIndex: item.rp_id }} />
        {isColumnVisible('testName') && (
          <Td dataLabel="Test Name" className="app-cell-truncate">
            <Tooltip content={item.name}>
              {item.unique_id
                ? <Button variant="link" isInline size="sm" onClick={(event) => { event.stopPropagation(); onNavigate(`/test/${encodeURIComponent(item.unique_id!)}`); }}>{shortName}</Button>
                : <span>{shortName}</span>}
            </Tooltip>
          </Td>
        )}
        {isGroupMode && (
          <Td dataLabel="Occurrences" className="app-cell-nowrap">
            {occurrences > 1 && <Tooltip content={`Failed in ${occurrences} of ${launchCount} launches`}><Label color="orange" isCompact>{occurrences}x</Label></Tooltip>}
          </Td>
        )}
        {isColumnVisible('status') && <Td dataLabel="Status" className="app-cell-nowrap"><StatusBadge status={item.status} /></Td>}
        {isColumnVisible('error') && (
          <Td dataLabel="Error" className="app-cell-truncate">
            {item.error_message && <Tooltip content={item.error_message}><span className="app-text-xs app-text-muted">{item.error_message.split('\n')[0]}</span></Tooltip>}
          </Td>
        )}
        {isColumnVisible('polarion') && (
          <Td dataLabel="Polarion" className="app-cell-nowrap">
            {item.polarion_id && <Label color="blue" isCompact>{config?.polarionUrl ? <a href={`${config.polarionUrl}${item.polarion_id}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{item.polarion_id}</a> : item.polarion_id}</Label>}
          </Td>
        )}
        {isColumnVisible('defect') && (
          <Td dataLabel="AI" className="app-cell-nowrap">
            {item.ai_prediction && <Label isCompact color={item.ai_prediction.includes('Product') ? 'red' : item.ai_prediction.includes('System') ? 'orange' : 'grey'}>{item.ai_prediction.replace('Predicted ', '')} {item.ai_confidence}%</Label>}
          </Td>
        )}
        {isColumnVisible('jira') && (
          <Td dataLabel="Jira" className="app-cell-nowrap">
            {item.jira_key && <Label color="blue" isCompact>{config?.jiraUrl ? <a href={`${config.jiraUrl}/browse/${item.jira_key}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>{item.jira_key}</a> : item.jira_key}{' '}({item.jira_status})</Label>}
          </Td>
        )}
        {isColumnVisible('actions') && (
          <Td dataLabel="Actions" className="app-cell-nowrap">
            <Flex flexWrap={{ default: 'nowrap' }}>
              <FlexItem><Button variant="link" isInline icon={<WrenchIcon />} onClick={() => onTriage(allRpIds)}>Classify{occurrences > 1 ? ` (${occurrences})` : ''}</Button></FlexItem>
              <FlexItem><Button variant="link" isInline icon={<BugIcon />} onClick={() => onCreateJira(item)}>Bug</Button></FlexItem>
              <FlexItem><Button variant="link" isInline icon={<LinkIcon />} onClick={() => onLinkJira(item.rp_id)}>Link</Button></FlexItem>
            </Flex>
          </Td>
        )}
      </Tr>
      {isExpanded && (
        <Tr isExpanded>
          <Td colSpan={visibleColumnCount + (isGroupMode ? 2 : 1)} noPadding={false}>
            <ExpandableSection toggleText="Error Logs" isIndented><LogViewer itemId={item.rp_id} /></ExpandableSection>
            {item.unique_id && <ExpandableSection toggleText="Similar Failures History" isIndented><SimilarFailuresPanel uniqueId={item.unique_id} /></ExpandableSection>}
          </Td>
        </Tr>
      )}
    </React.Fragment>
  );
};
