import type { PublicConfig, TestItem } from '@cnv-monitor/shared';

import { Button, Flex, FlexItem, Label, Tooltip } from '@patternfly/react-core';
import { BugIcon, LinkIcon, WrenchIcon } from '@patternfly/react-icons';
import { Td } from '@patternfly/react-table';

import { StatusBadge } from '../common/StatusBadge';

type CellProps = {
  item: TestItem;
  config?: PublicConfig;
};

export const PolarionCell = ({ config, item }: CellProps) => (
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
);

export const DefectCell = ({ item }: { item: TestItem }) => (
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
);

export const JiraCell = ({ config, item }: CellProps) => (
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
);

export const StatusCell = ({ item }: { item: TestItem }) => (
  <Td className="app-cell-nowrap" dataLabel="Status">
    <StatusBadge status={item.status} />
  </Td>
);

export const ErrorCell = ({ item }: { item: TestItem }) => (
  <Td className="app-cell-truncate" dataLabel="Error">
    {item.error_message && (
      <Tooltip content={item.error_message}>
        <span className="app-text-xs app-text-muted">{item.error_message.split('\n')[0]}</span>
      </Tooltip>
    )}
  </Td>
);

type ActionsCellProps = {
  allRpIds: number[];
  occurrences: number;
  item: TestItem;
  onTriage: (rpIds: number[]) => void;
  onCreateJira: (item: TestItem) => void;
  onLinkJira: (rpId: number) => void;
};

export const ActionsCell = ({
  allRpIds,
  item,
  occurrences,
  onCreateJira,
  onLinkJira,
  onTriage,
}: ActionsCellProps) => (
  <Td className="app-cell-nowrap" dataLabel="Actions">
    <Flex flexWrap={{ default: 'nowrap' }}>
      <FlexItem>
        <Button isInline icon={<WrenchIcon />} variant="link" onClick={() => onTriage(allRpIds)}>
          Classify{occurrences > 1 ? ` (${occurrences})` : ''}
        </Button>
      </FlexItem>
      <FlexItem>
        <Button isInline icon={<BugIcon />} variant="link" onClick={() => onCreateJira(item)}>
          Bug
        </Button>
      </FlexItem>
      <FlexItem>
        <Button isInline icon={<LinkIcon />} variant="link" onClick={() => onLinkJira(item.rp_id)}>
          Link
        </Button>
      </FlexItem>
    </Flex>
  </Td>
);
