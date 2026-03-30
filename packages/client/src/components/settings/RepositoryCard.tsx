import type { Repository } from '@cnv-monitor/shared';

import {
  Button,
  Card,
  CardBody,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  Label,
  LabelGroup,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { SyncAltIcon, TrashIcon } from '@patternfly/react-icons';

type RepositoryCardProps = {
  repo: Repository;
  isTestPending: boolean;
  onEdit: () => void;
  onTest: () => void;
  onDelete: () => void;
};

export const RepositoryCard = ({
  isTestPending,
  onDelete,
  onEdit,
  onTest,
  repo,
}: RepositoryCardProps) => (
  <Card isCompact>
    <CardBody>
      <Split hasGutter>
        <SplitItem isFilled>
          <strong>{repo.name}</strong>
          <DescriptionList isCompact isHorizontal className="app-mt-sm">
            <DescriptionListGroup>
              <DescriptionListTerm>Provider</DescriptionListTerm>
              <DescriptionListDescription>
                <Label>{repo.provider}</Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Branches</DescriptionListTerm>
              <DescriptionListDescription>
                <LabelGroup>
                  {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data */}
                  {(repo.branches || []).map((branch: string) => (
                    <Label isCompact key={branch}>
                      {branch}
                    </Label>
                  ))}
                </LabelGroup>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Components</DescriptionListTerm>
              <DescriptionListDescription>
                <LabelGroup>
                  {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: runtime data */}
                  {(repo.components || []).map((comp: string) => (
                    <Label isCompact color="blue" key={comp}>
                      {comp}
                    </Label>
                  ))}
                </LabelGroup>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Status</DescriptionListTerm>
              <DescriptionListDescription>
                <Label color={repo.enabled ? 'green' : 'grey'}>
                  {repo.enabled ? 'Enabled' : 'Disabled'}
                </Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </SplitItem>
        <SplitItem>
          <Flex spaceItems={{ default: 'spaceItemsSm' }}>
            <Button size="sm" variant="secondary" onClick={onEdit}>
              Edit
            </Button>
            <Button
              icon={<SyncAltIcon />}
              isLoading={isTestPending}
              size="sm"
              variant="secondary"
              onClick={onTest}
            >
              Test
            </Button>
            <Button icon={<TrashIcon />} size="sm" variant="danger" onClick={onDelete}>
              Delete
            </Button>
          </Flex>
        </SplitItem>
      </Split>
    </CardBody>
  </Card>
);
