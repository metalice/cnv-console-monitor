import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  CardTitle,
  Button,
  Label,
  LabelGroup,
  EmptyState,
  EmptyStateBody,
  Spinner,
  Flex,
  FlexItem,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Split,
  SplitItem,
  Content,
} from '@patternfly/react-core';
import { PlusCircleIcon, TrashIcon, SyncAltIcon, CheckCircleIcon, TimesCircleIcon } from '@patternfly/react-icons';
import type { Repository } from '@cnv-monitor/shared';
import { fetchRepositories, deleteRepositoryApi, testRepositoryConnection } from '../../api/repositories';
import { RepositoryModal } from './RepositoryModal';

export const RepositoryMappingSection: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRepo, setEditingRepo] = useState<Repository | undefined>();
  const queryClient = useQueryClient();

  const { data: repos, isLoading } = useQuery({
    queryKey: ['repositories'],
    queryFn: fetchRepositories,
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
            <SplitItem><Button variant="primary" icon={<PlusCircleIcon />} onClick={handleAdd}>Add Repository</Button></SplitItem>
          </Split>
        </CardTitle>
        <CardBody>
          <Content component="small" className="app-text-muted app-mb-md">
            Connect Git repositories for test documentation and quarantine management. Configure access tokens in the Git tab above.
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
                          <DescriptionList isHorizontal isCompact className="app-mt-sm">
                            <DescriptionListGroup>
                              <DescriptionListTerm>Provider</DescriptionListTerm>
                              <DescriptionListDescription><Label>{repo.provider}</Label></DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Branches</DescriptionListTerm>
                              <DescriptionListDescription>
                                <LabelGroup>{(repo.branches || []).map((b: string) => <Label key={b} isCompact>{b}</Label>)}</LabelGroup>
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Components</DescriptionListTerm>
                              <DescriptionListDescription>
                                <LabelGroup>{(repo.components || []).map((c: string) => <Label key={c} isCompact color="blue">{c}</Label>)}</LabelGroup>
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                            <DescriptionListGroup>
                              <DescriptionListTerm>Status</DescriptionListTerm>
                              <DescriptionListDescription>
                                <Label color={repo.enabled ? 'green' : 'grey'}>{repo.enabled ? 'Enabled' : 'Disabled'}</Label>
                              </DescriptionListDescription>
                            </DescriptionListGroup>
                          </DescriptionList>
                        </SplitItem>
                        <SplitItem>
                          <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                            <Button variant="secondary" size="sm" onClick={() => handleEdit(repo)}>Edit</Button>
                            <Button variant="secondary" size="sm" icon={<SyncAltIcon />} onClick={() => testMutation.mutate(repo.id)} isLoading={testMutation.isPending}>Test</Button>
                            <Button variant="danger" size="sm" icon={<TrashIcon />} onClick={() => deleteMutation.mutate(repo.id)}>Delete</Button>
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
              <EmptyStateBody>No repositories configured. Add a repository to enable the Test Explorer.</EmptyStateBody>
            </EmptyState>
          )}
        </CardBody>
      </Card>

      <RepositoryModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingRepo(undefined); }}
        existing={editingRepo}
      />
    </>
  );
};
