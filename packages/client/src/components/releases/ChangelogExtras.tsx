import {
  Alert,
  Content,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  Progress,
  ProgressMeasureLocation,
  ProgressSize,
} from '@patternfly/react-core';

import type { ChangelogResult } from '../../api/ai';

type ContributorsProps = {
  contributors?: { name: string; count: number }[];
};

export const Contributors = ({ contributors }: ContributorsProps) => {
  if (!contributors?.length) {
    return null;
  }
  return (
    <ExpandableSection className="app-mt-md" toggleText={`Contributors (${contributors.length})`}>
      <div className="app-report-workload">
        {contributors.map(contributor => (
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            className="app-mb-xs"
            key={contributor.name}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem style={{ minWidth: 140 }}>
              <span className="app-text-xs">{contributor.name}</span>
            </FlexItem>
            <FlexItem flex={{ default: 'flex_1' }}>
              <Progress
                measureLocation={ProgressMeasureLocation.none}
                size={ProgressSize.sm}
                value={(contributor.count / contributors[0].count) * 100}
              />
            </FlexItem>
            <FlexItem>
              <span className="app-text-xs app-text-muted">{contributor.count}</span>
            </FlexItem>
          </Flex>
        ))}
      </div>
    </ExpandableSection>
  );
};

type EpicStatusProps = {
  epicStatus?: ChangelogResult['changelog']['epicStatus'];
};

export const EpicStatus = ({ epicStatus }: EpicStatusProps) => {
  if (!epicStatus?.length) {
    return null;
  }
  return (
    <ExpandableSection className="app-mb-sm" toggleText={`Epic Status (${epicStatus.length})`}>
      {epicStatus.map((epic, idx) => (
        // eslint-disable-next-line react/no-array-index-key
        <div className="app-changelog-item" key={idx}>
          <a
            className="app-changelog-key"
            href={`https://issues.redhat.com/browse/${epic.key}`}
            rel="noreferrer"
            target="_blank"
          >
            {epic.key}
          </a>
          <span className="app-changelog-title">{epic.title}</span>
          <Label
            isCompact
            className="app-ml-xs"
            color={
              epic.status === 'complete' ? 'green' : epic.status === 'blocked' ? 'red' : 'orange'
            }
          >
            {epic.childrenDone}/{epic.childrenTotal} done
          </Label>
        </div>
      ))}
    </ExpandableSection>
  );
};

type ConcernsProps = {
  concerns?: string[];
};

export const Concerns = ({ concerns }: ConcernsProps) => {
  if (!concerns?.length) {
    return null;
  }
  return (
    <Alert isInline className="app-mb-md" title={`${concerns.length} Concerns`} variant="warning">
      <ul className="app-text-xs">
        {concerns.map((concern, idx) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={idx}>{typeof concern === 'string' ? concern : JSON.stringify(concern)}</li>
        ))}
      </ul>
    </Alert>
  );
};

type TestImpactProps = {
  testImpact?: ChangelogResult['changelog']['testImpact'];
};

export const TestImpact = ({ testImpact }: TestImpactProps) => {
  if (!testImpact || (testImpact.newlyPassing <= 0 && testImpact.newlyFailing <= 0)) {
    return null;
  }
  return (
    <div className="app-mb-md">
      <Content className="app-mb-xs" component="h5">
        Test Impact
      </Content>
      <Flex spaceItems={{ default: 'spaceItemsMd' }}>
        {testImpact.newlyPassing > 0 && (
          <FlexItem>
            <Label isCompact color="green">
              {testImpact.newlyPassing} newly passing
            </Label>
          </FlexItem>
        )}
        {testImpact.newlyFailing > 0 && (
          <FlexItem>
            <Label isCompact color="red">
              {testImpact.newlyFailing} newly failing
            </Label>
          </FlexItem>
        )}
      </Flex>
      {testImpact.details && testImpact.details.length > 0 && (
        <ul className="app-text-xs app-mt-xs">
          {testImpact.details.map((detail, idx) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={idx}>{detail}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
