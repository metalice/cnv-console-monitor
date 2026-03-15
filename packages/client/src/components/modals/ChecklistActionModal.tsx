import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Spinner,
} from '@patternfly/react-core';
import { SearchableSelect } from '../common/SearchableSelect';
import { fetchChecklistDetail, transitionChecklistTask } from '../../api/releases';
import { IssueDetailSection } from './IssueDetailSection';

type ChecklistActionModalProps = {
  issueKey: string;
  isOpen: boolean;
  onClose: () => void;
};

export const ChecklistActionModal: React.FC<ChecklistActionModalProps> = ({ issueKey, isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [selectedTransition, setSelectedTransition] = useState('');
  const [comment, setComment] = useState('');
  const [assignee, setAssignee] = useState('');

  const { data: detail, isLoading } = useQuery({
    queryKey: ['checklistDetail', issueKey],
    queryFn: () => fetchChecklistDetail(issueKey),
    enabled: isOpen && !!issueKey,
  });

  const mutation = useMutation({
    mutationFn: () => transitionChecklistTask(issueKey, {
      transitionId: selectedTransition,
      comment: comment.trim() || undefined,
      assignee: assignee.trim() || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist'] });
      queryClient.invalidateQueries({ queryKey: ['checklistDetail', issueKey] });
      onClose();
      setSelectedTransition('');
      setComment('');
      setAssignee('');
    },
  });

  const transitionOptions = (detail?.transitions || []).map(t => ({ value: t.id, label: t.name }));

  return (
    <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={onClose}>
      <ModalHeader title={`Update ${issueKey}`} />
      <ModalBody>
        {isLoading || !detail ? (
          <Spinner aria-label="Loading" />
        ) : (
          <>
            <IssueDetailSection
              summary={detail.summary}
              status={detail.status}
              assignee={detail.assignee}
              fixVersions={detail.fixVersions}
              subtasks={detail.subtasks}
              subtasksDone={detail.subtasksDone}
              subtaskCount={detail.subtaskCount}
            />
            <Form>
              <FormGroup label="Transition to" isRequired fieldId="transition">
                <SearchableSelect
                  id="transition"
                  value={selectedTransition}
                  options={transitionOptions}
                  onChange={setSelectedTransition}
                  placeholder="Select status"
                />
              </FormGroup>
              <FormGroup label="Reassign to" fieldId="assignee">
                <TextInput
                  id="assignee"
                  value={assignee}
                  onChange={(_e, v) => setAssignee(v)}
                  placeholder={detail.assignee || 'Username (e.g., jdoe)'}
                />
              </FormGroup>
              <FormGroup label="Comment" fieldId="comment">
                <TextArea
                  id="comment"
                  value={comment}
                  onChange={(_e, v) => setComment(v)}
                  placeholder="Add a comment..."
                  rows={3}
                />
              </FormGroup>
              {mutation.isError && (
                <HelperText>
                  <HelperTextItem variant="error">{(mutation.error as Error).message}</HelperTextItem>
                </HelperText>
              )}
            </Form>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={() => mutation.mutate()} isDisabled={!selectedTransition} isLoading={mutation.isPending}>
          Submit
        </Button>
        <Button variant="link" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};
