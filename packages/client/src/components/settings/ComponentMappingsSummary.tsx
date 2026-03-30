import { Flex, FlexItem, Label, Progress, ProgressSize } from '@patternfly/react-core';

type MappingSummary = {
  totalLaunches: number;
  mappedLaunches: number;
  unmappedLaunches: number;
  componentCount: number;
  coveragePercent: number;
};

type ComponentMappingsSummaryProps = {
  summary: MappingSummary;
};

export const ComponentMappingsSummary = ({ summary }: ComponentMappingsSummaryProps) => (
  <Flex
    alignItems={{ default: 'alignItemsCenter' }}
    className="app-mb-md"
    flexWrap={{ default: 'wrap' }}
    spaceItems={{ default: 'spaceItemsMd' }}
  >
    <FlexItem>
      <Label isCompact>{summary.totalLaunches.toLocaleString()} launches</Label>
    </FlexItem>
    <FlexItem>
      <Label isCompact color="green">
        {summary.mappedLaunches.toLocaleString()} mapped
      </Label>
    </FlexItem>
    <FlexItem>
      <Label isCompact color={summary.unmappedLaunches > 0 ? 'orange' : 'green'}>
        {summary.unmappedLaunches.toLocaleString()} unmapped
      </Label>
    </FlexItem>
    <FlexItem>
      <Label isCompact color="blue">
        {summary.componentCount} components
      </Label>
    </FlexItem>
    <FlexItem className="app-poll-progress-bar">
      <Progress
        aria-label={`${summary.coveragePercent}% mapping coverage`}
        size={ProgressSize.sm}
        title=""
        value={summary.coveragePercent}
      />
    </FlexItem>
  </Flex>
);
