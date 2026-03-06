import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  TextArea,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { submitAcknowledgment } from '../../api/acknowledgment';
import { useAuth } from '../../context/AuthContext';

type AcknowledgeModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const AcknowledgeModal: React.FC<AcknowledgeModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => submitAcknowledgment({ reviewer: user.name, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acknowledgment'] });
      onClose();
      setNotes('');
    },
  });

  return (
    <Modal variant={ModalVariant.small} isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Acknowledge Today's Report" />
      <ModalBody>
        <Form>
          <FormGroup label="Acknowledging as">
            <span style={{ fontWeight: 600 }}>{user.name}</span>
            <span style={{ marginLeft: 8, color: 'var(--pf-t--global--color--nonstatus--gray--text--default)' }}>({user.email})</span>
          </FormGroup>
          <FormGroup label="Notes (optional)">
            <TextArea value={notes} onChange={(_e, val) => setNotes(val)} placeholder="e.g. All known issues, tracking in JIRA-1234" />
          </FormGroup>
          {mutation.isError && (
            <HelperText>
              <HelperTextItem variant="error">{(mutation.error as Error).message}</HelperTextItem>
            </HelperText>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
          Acknowledge
        </Button>
        <Button variant="link" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};
