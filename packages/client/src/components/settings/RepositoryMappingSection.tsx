import React, { useState } from 'react';

import type { Repository } from '@cnv-monitor/shared';

import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
  Spinner,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { PlusCircleIcon, SyncAltIcon, TrashIcon } from '@patternfly/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteRepositoryApi,
  fetchRepositories,
  testRepositoryConnection,
} from '../../api/repositories';

import { RepositoryModal } from './RepositoryModal';

export const RepositoryMappingSection: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRepo, setEditingRepo] = useState<Repository | undefined>();
  const queryClient = useQueryClient();

  const { data: repos, isLoading } = useQuery({
    queryFn: fetchRepositories,
    queryKey: ['repositories'],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRepositoryApi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['repositories'] }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => testRepositoryConnection(id),
  });

  const handleEdit = (repo: Repository) => {
    setEditingRepo(repo);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingRepo(undefined);
    setIsModalOpen(true);
  };

  return (
    <>
      <Card>
        <CardTitle>
          <Split hasGutter>
            <SplitItem isFilled>Repository Mapping</SplitItem>
            <SplitItem>
              <Button icon={<PlusCircleIcon />} variant="primary" onClick={handleAdd}>
                Add Repository
              </Button>
            </SplitItem>
          </Split>
        </CardTitle>
        <CardBody>
          <Content className="app-text-muted app-mb-md" component="small">
            Connect Git repositories for test documentation and quarantine management. Configure
            access tokens in the Git tab above.
          </Content>

          {isLoading ? (
            <Spinner />
          ) : repos && repos.length > 0 ? (
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
              {repos.map(repo => (
                <FlexItem key={repo.id}>
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
                                  {(repo.branches || []).map((b: string) => (
                                    <Label isCompact key={b}>
                                      {b}
                                    </Label>
                                  ))}
                                </LabelGroup>
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Components</DescriptionListTerm>
                              <DescriptionListDescription>
                                <LabelGroup>
                                  {(repo.components || []).map((c: string) => (
                                    <Label isCompact color="blue" key={c}>
                                      {c}
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
                            <Button size="sm" variant="secondary" onClick={() => handleEdit(repo)}>
                              Edit
                            </Button>
                            <Button
                              icon={<SyncAltIcon />}
                              isLoading={testMutation.isPending}
                              size="sm"
                              variant="secondary"
                              onClick={() => testMutation.mutate(repo.id)}
                            >
                              Test
                            </Button>
                            <Button
                              icon={<TrashIcon />}
                              size="sm"
                              variant="danger"
                              onClick={() => deleteMutation.mutate(repo.id)}
                            >
                              Delete
                            </Button>
                          </Flex>
                        </SplitItem>
                      </Split>
                    </CardBody>
                  </Card>
                </FlexItem>
              ))}
            </Flex>
          ) : (
            <EmptyState variant="sm">
              <EmptyStateBody>
                No repositories configured. Add a repository to enable the Test Explorer.
              </EmptyStateBody>
            </EmptyState>
          )}
        </CardBody>
      </Card>

      <RepositoryModal
        existing={editingRepo}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRepo(undefined);
        }}
      />
    </>
  );
};
