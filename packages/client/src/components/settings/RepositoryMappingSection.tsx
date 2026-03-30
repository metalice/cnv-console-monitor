import { useState } from 'react';

import type { Repository } from '@cnv-monitor/shared';

import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Spinner,
  Split,
  SplitItem,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteRepositoryApi,
  fetchRepositories,
  testRepositoryConnection,
} from '../../api/repositories';

import { RepositoryCard } from './RepositoryCard';
import { RepositoryModal } from './RepositoryModal';

export const RepositoryMappingSection = () => {
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
                  <RepositoryCard
                    isTestPending={testMutation.isPending}
                    repo={repo}
                    onDelete={() => deleteMutation.mutate(repo.id)}
                    onEdit={() => handleEdit(repo)}
                    onTest={() => testMutation.mutate(repo.id)}
                  />
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
