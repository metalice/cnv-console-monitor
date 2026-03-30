import React from 'react';

import type { PublicConfig, TestItem } from '@cnv-monitor/shared';

import { Button, ExpandableSection, Label, Tooltip } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';

import type { AggregatedItem } from '../../utils/aggregation';

import { LogViewer } from './LogViewer';
import { SimilarFailuresPanel } from './SimilarFailuresPanel';
import {
  ActionsCell,
  DefectCell,
  ErrorCell,
  JiraCell,
  PolarionCell,
  StatusCell,
} from './TestItemCells';

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

export const TestItemsRow = ({
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
}: TestItemsRowProps) => {
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
        {isColumnVisible('status') && <StatusCell item={item} />}
        {isColumnVisible('error') && <ErrorCell item={item} />}
        {isColumnVisible('polarion') && <PolarionCell config={config} item={item} />}
        {isColumnVisible('defect') && <DefectCell item={item} />}
        {isColumnVisible('jira') && <JiraCell config={config} item={item} />}
        {isColumnVisible('actions') && (
          <ActionsCell
            allRpIds={allRpIds}
            item={item}
            occurrences={occurrences}
            onCreateJira={onCreateJira}
            onLinkJira={onLinkJira}
            onTriage={onTriage}
          />
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
