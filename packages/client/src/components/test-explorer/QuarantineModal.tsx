import React, { useState } from 'react';
import {
  Modal,
  ModalVariant,
  Button,
  Form,
  FormGroup,
  TextInput,
  TextArea,
  NumberInput,
  Checkbox,
  Alert,
  ActionGroup,
} from '@patternfly/react-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createQuarantineApi, resolveQuarantineApi } from '../../api/quarantine';

interface CreateQuarantineModalProps {
  isOpen: boolean;
  onClose: () => void;
  testName: string;
  testFilePath?: string;
  repoId?: string;
  component?: string;
}

export const CreateQuarantineModal: React.FC<CreateQuarantineModalProps> = ({ isOpen, onClose, testName, testFilePath, repoId, component }) => {
  const [reason, setReason] = useState('');
  const [slaDays, setSlaDays] = useState(14);
  const [createJira, setCreateJira] = useState(true);
  const [createSkipPr, setCreateSkipPr] = useState(true);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createQuarantineApi({
      testName,
      testFilePath,
      repoId,
      component,
      reason,
      slaDays,
      createJira,
      createSkipPr,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarantines'] });
      queryClient.invalidateQueries({ queryKey: ['quarantineStats'] });
      onClose();
      setReason('');
    },
  });

  return (
    <Modal
      variant={ModalVariant.medium}
      title={`Quarantine: ${testName.split('.').pop()}`}
      isOpen={isOpen}
      onClose={onClose}
    >
      <Form>
        <FormGroup label="Test" fieldId="test-name">
          <TextInput id="test-name" value={testName} isDisabled />
        </FormGroup>
        <FormGroup label="Reason" isRequired fieldId="reason">
          <TextArea id="reason" value={reason} onChange={(_e, val) => setReason(val)} placeholder="Why is this test being quarantined?" />
        </FormGroup>
        <FormGroup label="SLA (days)" fieldId="sla">
          <NumberInput value={slaDays} onChange={(e) => setSlaDays(Number((e.target as HTMLInputElement).value))} onMinus={() => setSlaDays(Math.max(1, slaDays - 1))} onPlus={() => setSlaDays(slaDays + 1)} min={1} max={90} />
        </FormGroup>
        <Checkbox id="create-jira" label="Create Jira ticket (uses your personal token)" isChecked={createJira} onChange={(_e, checked) => setCreateJira(checked)} />
        <Checkbox id="create-skip-pr" label="Create skip annotation PR (uses your personal token)" isChecked={createSkipPr} onChange={(_e, checked) => setCreateSkipPr(checked)} />
        {mutation.isError && <Alert variant="danger" isInline title="Failed to create quarantine">{(mutation.error as Error).message}</Alert>}
        <ActionGroup>
          <Button variant="primary" onClick={() => mutation.mutate()} isDisabled={!reason || mutation.isPending} isLoading={mutation.isPending}>Quarantine</Button>
          <Button variant="link" onClick={onClose}>Cancel</Button>
        </ActionGroup>
      </Form>
    </Modal>
  );
};

interface ResolveQuarantineModalProps {
  isOpen: boolean;
  onClose: () => void;
  quarantineId: string;
  testName: string;
}

export const ResolveQuarantineModal: React.FC<ResolveQuarantineModalProps> = ({ isOpen, onClose, quarantineId, testName }) => {
  const [fixDescription, setFixDescription] = useState('');
  const [fixCommitUrl, setFixCommitUrl] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => resolveQuarantineApi(quarantineId, { fixDescription, fixCommitUrl: fixCommitUrl || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quarantines'] });
      queryClient.invalidateQueries({ queryKey: ['quarantineStats'] });
      onClose();
      setFixDescription('');
      setFixCommitUrl('');
    },
  });

  return (
    <Modal
      variant={ModalVariant.medium}
      title={`Unquarantine: ${testName.split('.').pop()}`}
      isOpen={isOpen}
      onClose={onClose}
    >
      <Form>
        <FormGroup label="Fix Description" isRequired fieldId="fix-desc">
          <TextArea id="fix-desc" value={fixDescription} onChange={(_e, val) => setFixDescription(val)} placeholder="What was fixed?" />
        </FormGroup>
        <FormGroup label="Fix Commit/PR URL" fieldId="fix-url">
          <TextInput id="fix-url" value={fixCommitUrl} onChange={(_e, val) => setFixCommitUrl(val)} placeholder="https://..." />
        </FormGroup>
        {mutation.isError && <Alert variant="danger" isInline title="Failed to resolve">{(mutation.error as Error).message}</Alert>}
        <ActionGroup>
          <Button variant="primary" onClick={() => mutation.mutate()} isDisabled={!fixDescription || mutation.isPending} isLoading={mutation.isPending}>Unquarantine</Button>
          <Button variant="link" onClick={onClose}>Cancel</Button>
        </ActionGroup>
      </Form>
    </Modal>
  );
};
