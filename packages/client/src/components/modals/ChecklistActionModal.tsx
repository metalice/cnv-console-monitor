import React, { useState } from 'react';

import {
  Button,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Spinner,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchChecklistDetail, transitionChecklistTask } from '../../api/releases';
import { SearchableSelect } from '../common/SearchableSelect';

import { IssueDetailSection } from './IssueDetailSection';

type ChecklistActionModalProps = {
  issueKey: string;
  isOpen: boolean;
  onClose: () => void;
};

export const ChecklistActionModal: React.FC<ChecklistActionModalProps> = ({
  isOpen,
  issueKey,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [selectedTransition, setSelectedTransition] = useState('');
  const [comment, setComment] = useState('');
  const [assignee, setAssignee] = useState('');

  const { data: detail, isLoading } = useQuery({
    enabled: isOpen && Boolean(issueKey),
    queryFn: () => fetchChecklistDetail(issueKey),
    queryKey: ['checklistDetail', issueKey],
  });

  const mutation = useMutation({
    mutationFn: () =>
      transitionChecklistTask(issueKey, {
        assignee: assignee.trim() || undefined,
        comment: comment.trim() || undefined,
        transitionId: selectedTransition,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['checklist'] });
      void queryClient.invalidateQueries({ queryKey: ['checklistDetail', issueKey] });
      onClose();
      setSelectedTransition('');
      setComment('');
      setAssignee('');
    },
  });

  const transitionOptions = (detail?.transitions || []).map(t => ({ label: t.name, value: t.id }));

  return (
    <Modal isOpen={isOpen} variant={ModalVariant.medium} onClose={onClose}>
      <ModalHeader title={`Update ${issueKey}`} />
      <ModalBody>
        {isLoading || !detail ? (
          <Spinner aria-label="Loading" />
        ) : (
          <>
            <IssueDetailSection
              assignee={detail.assignee}
              fixVersions={detail.fixVersions}
              status={detail.status}
              subtaskCount={detail.subtaskCount}
              subtasks={detail.subtasks}
              subtasksDone={detail.subtasksDone}
              summary={detail.summary}
            />
            <Form>
              <FormGroup isRequired fieldId="transition" label="Transition to">
                <SearchableSelect
                  id="transition"
                  options={transitionOptions}
                  placeholder="Select status"
                  value={selectedTransition}
                  onChange={setSelectedTransition}
                />
              </FormGroup>
              <FormGroup fieldId="assignee" label="Reassign to">
                <TextInput
                  id="assignee"
                  placeholder={detail.assignee || 'Username (e.g., jdoe)'}
                  value={assignee}
                  onChange={(_e, v) => setAssignee(v)}
                />
              </FormGroup>
              <FormGroup fieldId="comment" label="Comment">
                <TextArea
                  id="comment"
                  placeholder="Add a comment..."
                  rows={3}
                  value={comment}
                  onChange={(_e, v) => setComment(v)}
                />
              </FormGroup>
              {mutation.isError && (
                <HelperText>
                  <HelperTextItem variant="error">{mutation.error.message}</HelperTextItem>
                </HelperText>
              )}
            </Form>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          isDisabled={!selectedTransition}
          isLoading={mutation.isPending}
          variant="primary"
          onClick={() => mutation.mutate()}
        >
          Submit
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
