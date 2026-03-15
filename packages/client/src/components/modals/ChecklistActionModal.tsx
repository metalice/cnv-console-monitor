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
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Label,
  Spinner,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { SearchableSelect } from '../common/SearchableSelect';
import { fetchChecklistDetail, transitionChecklistTask } from '../../api/releases';

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
  const statusColor = (s: string): 'blue' | 'green' | 'orange' | 'grey' => {
    if (s === 'Closed') return 'green';
    if (s === 'In Progress' || s === 'Testing') return 'blue';
    if (s === 'To Do' || s === 'New') return 'orange';
    return 'grey';
  };

  return (
    <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={onClose}>
      <ModalHeader title={`Update ${issueKey}`} />
      <ModalBody>
        {isLoading || !detail ? (
          <Spinner aria-label="Loading" />
        ) : (
          <>
            <DescriptionList isHorizontal style={{ marginBottom: 24 }}>
              <DescriptionListGroup>
                <DescriptionListTerm>Summary</DescriptionListTerm>
                <DescriptionListDescription>{detail.summary}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Status</DescriptionListTerm>
                <DescriptionListDescription><Label color={statusColor(detail.status)}>{detail.status}</Label></DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Assignee</DescriptionListTerm>
                <DescriptionListDescription>{detail.assignee || 'Unassigned'}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Fix Version</DescriptionListTerm>
                <DescriptionListDescription>{detail.fixVersions.join(', ') || 'None'}</DescriptionListDescription>
              </DescriptionListGroup>
              <DescriptionListGroup>
                <DescriptionListTerm>Subtasks</DescriptionListTerm>
                <DescriptionListDescription>
                  {detail.subtasksDone}/{detail.subtaskCount} done
                  {detail.subtasks.length > 0 && (
                    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsXs' }} style={{ marginTop: 8 }}>
                      {detail.subtasks.map(st => (
                        <FlexItem key={st.key}>
                          <Label color={st.status === 'Closed' ? 'green' : 'grey'} isCompact>{st.key}</Label>{' '}
                          <span style={{ fontSize: 13 }}>{st.summary.substring(0, 80)}</span>
                        </FlexItem>
                      ))}
                    </Flex>
                  )}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>

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
