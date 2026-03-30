import { Button, Content, Flex, FlexItem, PageSection } from '@patternfly/react-core';
import { DownloadIcon } from '@patternfly/react-icons';

import { type AggregatedItem } from '../utils/aggregation';
import { exportCsv } from '../utils/csvExport';

type FailuresHeaderProps = {
  aggregated: AggregatedItem[];
};

const CSV_HEADERS = [
  'Test Name',
  'Occurrences',
  'Status',
  'Error',
  'Polarion',
  'AI Prediction',
  'Jira',
];

export const FailuresHeader = ({ aggregated }: FailuresHeaderProps) => {
  const handleExport = () => {
    exportCsv(
      'untriaged-failures.csv',
      CSV_HEADERS,
      aggregated.map(({ occurrences, representative: item }) => [
        item.name,
        occurrences,
        item.status,
        item.error_message?.split('\n')[0] ?? '',
        item.polarion_id ?? '',
        item.ai_prediction ?? '',
        item.jira_key ?? '',
      ]),
    );
  };

  return (
    <PageSection>
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
      >
        <FlexItem>
          <Content component="h1">Untriaged Failures</Content>
          <Content component="small">Test items that need classification</Content>
        </FlexItem>
        <FlexItem>
          <Button
            icon={<DownloadIcon />}
            isDisabled={!aggregated.length}
            variant="secondary"
            onClick={handleExport}
          >
            Export
          </Button>
        </FlexItem>
      </Flex>
    </PageSection>
  );
};
