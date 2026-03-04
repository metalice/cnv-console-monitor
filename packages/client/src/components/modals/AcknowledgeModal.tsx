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
  TextInput,
  TextArea,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { submitAcknowledgment } from '../../api/acknowledgment';

interface AcknowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AcknowledgeModal: React.FC<AcknowledgeModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [reviewer, setReviewer] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () => submitAcknowledgment({ reviewer, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acknowledgment'] });
      onClose();
      setReviewer('');
      setNotes('');
    },
  });

  return (
    <Modal variant={ModalVariant.small} isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Acknowledge Today's Report" />
      <ModalBody>
        <Form>
          <FormGroup label="Your Name" isRequired>
            <TextInput value={reviewer} onChange={(_e, val) => setReviewer(val)} placeholder="e.g. Matan" />
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
        <Button variant="primary" onClick={() => mutation.mutate()} isDisabled={!reviewer} isLoading={mutation.isPending}>
          Acknowledge
        </Button>
        <Button variant="link" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};
