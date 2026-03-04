import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Content,
  Alert,
} from '@patternfly/react-core';
import { createJiraBug } from '../../api/jira';

interface JiraCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  testItemId: number;
  testName: string;
  polarionId?: string | null;
}

export const JiraCreateModal: React.FC<JiraCreateModalProps> = ({
  isOpen,
  onClose,
  testItemId,
  testName,
  polarionId,
}) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createJiraBug({ testItemId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
    },
  });

  const shortName = testName.split('.').pop() || testName;

  return (
    <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Create Jira Bug" />
      <ModalBody>
        <Content component="p">
          This will create a Jira bug for the following test failure:
        </Content>
        <Content component="dl">
          <Content component="dt">Test</Content>
          <Content component="dd">{shortName}</Content>
          {polarionId && (
            <>
              <Content component="dt">Polarion ID</Content>
              <Content component="dd">{polarionId}</Content>
            </>
          )}
        </Content>
        <Content component="p" style={{ marginTop: 16, color: 'var(--pf-t--global--color--nonstatus--gray--text--on-gray--default)' }}>
          If a matching issue already exists, it will be linked instead of creating a duplicate.
        </Content>

        {mutation.isSuccess && mutation.data && (
          <Alert
            variant={mutation.data.existing ? 'info' : 'success'}
            title={mutation.data.existing ? `Found existing issue: ${mutation.data.issue.key}` : `Created: ${mutation.data.issue.key}`}
            style={{ marginTop: 16 }}
          />
        )}
        {mutation.isError && (
          <Alert variant="danger" title={(mutation.error as Error).message} style={{ marginTop: 16 }} />
        )}
      </ModalBody>
      <ModalFooter>
        {!mutation.isSuccess ? (
          <Button variant="primary" onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            Create Bug
          </Button>
        ) : (
          <Button variant="primary" onClick={onClose}>Done</Button>
        )}
        <Button variant="link" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};
