import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Label,
  TextInput,
  HelperText,
  HelperTextItem,
  Content,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { submitAcknowledgment } from '../../api/acknowledgment';
import { useAuth } from '../../context/AuthContext';
import type { LaunchGroup, TestNote } from '@cnv-monitor/shared';

type AcknowledgeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  groups: LaunchGroup[];
  component?: string;
};

export const AcknowledgeModal: React.FC<AcknowledgeModalProps> = ({ isOpen, onClose, groups, component }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const failingTests = useMemo(() => {
    const seen = new Set<string>();
    const tests: Array<{ name: string; shortName: string; jiraKey?: string; polarionId?: string }> = [];
    for (const group of groups) {
      for (const item of (group.failedItems ?? [])) {
        const key = item.unique_id || `${item.name}-${item.rp_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        tests.push({
          name: item.name,
          shortName: item.name.split('.').pop() || item.name,
          jiraKey: item.jira_key ?? undefined,
          polarionId: item.polarion_id ?? undefined,
        });
      }
    }
    return tests;
  }, [groups]);

  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    const initial: Record<string, string> = {};
    for (const test of failingTests) {
      initial[test.name] = test.jiraKey ? `Tracked in ${test.jiraKey}` : '';
    }
    setNotes(initial);
  }, [isOpen, failingTests]);

  const allFilled = failingTests.length === 0 || failingTests.every(test => (notes[test.name] || '').trim().length > 0);

  const mutation = useMutation({
    mutationFn: () => {
      const testNotes: TestNote[] = failingTests.map(test => ({
        testName: test.shortName,
        jiraKey: test.jiraKey,
        note: notes[test.name] || '',
      }));
      return submitAcknowledgment({ reviewer: user.name, testNotes, component });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acknowledgment'] });
      onClose();
    },
  });

  return (
    <Modal variant={ModalVariant.large} isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Acknowledge Today's Report" />
      <ModalBody>
        <Content component="p" className="app-section-subheading">
          Acknowledging as <strong>{user.name}</strong> ({user.email}).
          {failingTests.length > 0
            ? ` Please provide a note for each of the ${failingTests.length} failing test(s).`
            : ' No failing tests to document.'}
        </Content>

        {failingTests.length > 0 && (
          <Table aria-label="Failing tests acknowledgment" variant="compact">
            <Thead>
              <Tr>
                <Th width={35}>Test</Th>
                <Th width={15}>Jira</Th>
                <Th width={50}>Note (required)</Th>
              </Tr>
            </Thead>
            <Tbody>
              {failingTests.map((test) => (
                <Tr key={test.name}>
                  <Td dataLabel="Test">
                    <span className="app-font-13">{test.shortName}</span>
                    {test.polarionId && (
                      <div><Label color="blue" isCompact>{test.polarionId}</Label></div>
                    )}
                  </Td>
                  <Td dataLabel="Jira">
                    {test.jiraKey && <Label color="blue" isCompact>{test.jiraKey}</Label>}
                  </Td>
                  <Td dataLabel="Note">
                    <TextInput
                      value={notes[test.name] || ''}
                      onChange={(_e, noteValue) => setNotes(prev => ({ ...prev, [test.name]: noteValue }))}
                      placeholder="Why is this failing? What action is being taken?"
                      aria-label={`Note for ${test.shortName}`}
                      validated={!(notes[test.name] || '').trim() ? 'error' : 'default'}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}

        {mutation.isError && (
          <HelperText className="app-mt-sm">
            <HelperTextItem variant="error">{(mutation.error as Error).message}</HelperTextItem>
          </HelperText>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={() => mutation.mutate()}
          isDisabled={!allFilled}
          isLoading={mutation.isPending}
        >
          Acknowledge{failingTests.length > 0 ? ` (${failingTests.length} tests)` : ''}
        </Button>
        <Button variant="link" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};
