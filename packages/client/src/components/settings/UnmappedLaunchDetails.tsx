import {
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Label,
  Spinner,
} from '@patternfly/react-core';

import type { LaunchDetails } from '../../api/componentMappings';

const formatDate = (timestamp?: number): string => {
  if (!timestamp) {
    return '—';
  }
  return new Date(timestamp).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const DetailItem = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value || value === '-') {
    return null;
  }
  return (
    <DescriptionListGroup>
      <DescriptionListTerm>{label}</DescriptionListTerm>
      <DescriptionListDescription>{value}</DescriptionListDescription>
    </DescriptionListGroup>
  );
};

type UnmappedLaunchDetailsProps = {
  loading: boolean;
  details: LaunchDetails | null;
};

export const UnmappedLaunchDetails = ({ details, loading }: UnmappedLaunchDetailsProps) => {
  if (loading) {
    return <Spinner size="md" />;
  }

  if (!details?.found) {
    return (
      <Content className="app-text-muted" component="small">
        No details available
      </Content>
    );
  }

  return (
    <DescriptionList isCompact isHorizontal>
      <DescriptionListGroup>
        <DescriptionListTerm>Runs</DescriptionListTerm>
        <DescriptionListDescription>
          <Flex spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              <strong>{details.totalRuns}</strong> total
            </FlexItem>
            {(details.passed ?? 0) > 0 && (
              <FlexItem>
                <Label isCompact color="green">
                  {details.passed} passed
                </Label>
              </FlexItem>
            )}
            {(details.failed ?? 0) > 0 && (
              <FlexItem>
                <Label isCompact color="red">
                  {details.failed} failed
                </Label>
              </FlexItem>
            )}
            {(details.inProgress ?? 0) > 0 && (
              <FlexItem>
                <Label isCompact color="blue">
                  {details.inProgress} running
                </Label>
              </FlexItem>
            )}
          </Flex>
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DetailItem
        label="Period"
        value={`${formatDate(details.firstRun)} — ${formatDate(details.lastRun)}`}
      />
      <DetailItem label="CNV Version" value={details.cnvVersion} />
      <DetailItem label="Tier" value={details.tier} />
      <DetailItem label="Jenkins Team" value={details.jenkinsTeam} />
      {details.jenkinsMetadata && (
        <>
          <DetailItem label="Job Owner" value={details.jenkinsMetadata.owner as string} />
          <DetailItem label="Description" value={details.jenkinsMetadata.name as string} />
          {details.jenkinsMetadata.labels && (
            <DescriptionListGroup>
              <DescriptionListTerm>Labels</DescriptionListTerm>
              <DescriptionListDescription>
                <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                  {(details.jenkinsMetadata.labels as string[]).map(label => (
                    <FlexItem key={label}>
                      <Label isCompact>{label}</Label>
                    </FlexItem>
                  ))}
                </Flex>
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
        </>
      )}
      {details.artifactsUrl && (
        <DescriptionListGroup>
          <DescriptionListTerm>Jenkins</DescriptionListTerm>
          <DescriptionListDescription>
            <a
              href={details.artifactsUrl.replace(/\/artifact\/?$/, '')}
              rel="noreferrer"
              target="_blank"
            >
              Open Latest Build
            </a>
          </DescriptionListDescription>
        </DescriptionListGroup>
      )}
    </DescriptionList>
  );
};
