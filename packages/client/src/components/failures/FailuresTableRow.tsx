import { type PublicConfig, type TestItem } from '@cnv-monitor/shared';

import { Button, Flex, FlexItem, Label, Tooltip } from '@patternfly/react-core';
import { BugIcon, WrenchIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';

import { type StreakInfo } from '../../api/testItems';
import { StatusBadge } from '../common/StatusBadge';
import { AiPredictionCell, ErrorCell, JiraCell, PolarionCell } from '../common/TestItemCells';

import { OccurrencesCell } from './OccurrencesCell';

type FailuresTableRowProps = {
  item: TestItem;
  allRpIds: number[];
  occurrences: number;
  isNew: boolean;
  streak: StreakInfo | undefined;
  config: PublicConfig | undefined;
  isColumnVisible: (id: string) => boolean;
  isGroupSelected: boolean;
  onSelect: (rpIds: number[], checked: boolean) => void;
  onNavigate: (path: string) => void;
  onTriageSelected: (itemIds: number[]) => void;
  onCreateJira: (item: TestItem) => void;
};

export const FailuresTableRow = ({
  allRpIds,
  config,
  isColumnVisible,
  isGroupSelected,
  isNew,
  item,
  occurrences,
  onCreateJira,
  onNavigate,
  onSelect,
  onTriageSelected,
  streak,
}: FailuresTableRowProps) => {
  const shortName = item.name.split('.').pop() || item.name;

  return (
    <Tr key={item.unique_id ?? item.rp_id}>
      {isColumnVisible('select') && (
        <Td
          select={{
            isSelected: isGroupSelected,
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
                onClick={() => {
                  const uid = item.unique_id;
                  if (uid) {
                    onNavigate(`/test/${encodeURIComponent(uid)}`);
                  }
                }}
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
        <OccurrencesCell occurrences={occurrences} streak={streak} />
      )}
      {isColumnVisible('status') && (
        <Td className="app-cell-nowrap" dataLabel="Status">
          <StatusBadge status={item.status} />
        </Td>
      )}
      <ErrorCell
        useRichTooltip
        errorMessage={item.error_message}
        visible={isColumnVisible('error')}
      />
      <PolarionCell
        config={config}
        polarionId={item.polarion_id}
        visible={isColumnVisible('polarion')}
      />
      <AiPredictionCell
        confidence={item.ai_confidence}
        prediction={item.ai_prediction}
        visible={isColumnVisible('aiPrediction')}
      />
      <JiraCell
        config={config}
        jiraKey={item.jira_key}
        jiraStatus={item.jira_status}
        visible={isColumnVisible('jira')}
      />
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
