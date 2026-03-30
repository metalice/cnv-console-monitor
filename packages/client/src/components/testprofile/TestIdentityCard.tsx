import { type PublicConfig } from '@cnv-monitor/shared';

import {
  Button,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Label,
} from '@patternfly/react-core';
import { BugIcon, LinkIcon, WrenchIcon } from '@patternfly/react-icons';

import { type TestProfile } from '../../api/testProfile';

type TestIdentityCardProps = {
  identity: TestProfile['identity'];
  config?: PublicConfig;
  latestFailedRpId: number | null;
  onClassify: (ids: number[]) => void;
  onCreateBug: (info: { rpId: number; name: string; polarionId?: string }) => void;
  onLinkJira: (rpId: number) => void;
};

export const TestIdentityCard = ({
  config,
  identity,
  latestFailedRpId,
  onClassify,
  onCreateBug,
  onLinkJira,
}: TestIdentityCardProps) => (
  <Card>
    <CardTitle>Test Identity</CardTitle>
    <CardBody>
      <DescriptionList isCompact>
        {identity.polarionId && (
          <DescriptionListGroup>
            <DescriptionListTerm>Polarion</DescriptionListTerm>
            <DescriptionListDescription>
              <Label isCompact color="blue">
                {config?.polarionUrl ? (
                  <a
                    href={`${config.polarionUrl}${identity.polarionId}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {identity.polarionId}
                  </a>
                ) : (
                  identity.polarionId
                )}
              </Label>
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}
        {identity.component && (
          <DescriptionListGroup>
            <DescriptionListTerm>Component</DescriptionListTerm>
            <DescriptionListDescription>
              <Label isCompact color="grey">
                {identity.component}
              </Label>
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}
        {identity.jiraKeys.length > 0 && (
          <DescriptionListGroup>
            <DescriptionListTerm>Jira Issues</DescriptionListTerm>
            <DescriptionListDescription>
              <Flex spaceItems={{ default: 'spaceItemsXs' }}>
                {identity.jiraKeys.map(key => (
                  <FlexItem key={key}>
                    <Label isCompact color="blue">
                      {config?.jiraUrl ? (
                        <a
                          href={`${config.jiraUrl}/browse/${key}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {key}
                        </a>
                      ) : (
                        key
                      )}
                    </Label>
                  </FlexItem>
                ))}
              </Flex>
            </DescriptionListDescription>
          </DescriptionListGroup>
        )}
      </DescriptionList>
      <Flex className="app-section-heading" spaceItems={{ default: 'spaceItemsXs' }}>
        {latestFailedRpId && (
          <>
            <FlexItem>
              <Button
                icon={<WrenchIcon />}
                size="sm"
                variant="secondary"
                onClick={() => onClassify([latestFailedRpId])}
              >
                Classify
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                icon={<BugIcon />}
                size="sm"
                variant="secondary"
                onClick={() =>
                  onCreateBug({
                    name: identity.name,
                    polarionId: identity.polarionId ?? undefined,
                    rpId: latestFailedRpId,
                  })
                }
              >
                Bug
              </Button>
            </FlexItem>
            <FlexItem>
              <Button
                icon={<LinkIcon />}
                size="sm"
                variant="secondary"
                onClick={() => onLinkJira(latestFailedRpId)}
              >
                Link Jira
              </Button>
            </FlexItem>
          </>
        )}
      </Flex>
    </CardBody>
  </Card>
);
