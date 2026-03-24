import React, { useEffect, useMemo, useState } from 'react';

import type { LaunchGroup, TestNote } from '@cnv-monitor/shared';

import {
  Button,
  Content,
  HelperText,
  HelperTextItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { submitAcknowledgment } from '../../api/acknowledgment';
import { useAuth } from '../../context/AuthContext';

type AcknowledgeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  groups: LaunchGroup[];
  component?: string;
};

export const AcknowledgeModal: React.FC<AcknowledgeModalProps> = ({
  component,
  groups,
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const failingTests = useMemo(() => {
    const seen = new Set<string>();
    const tests: { name: string; shortName: string; jiraKey?: string; polarionId?: string }[] = [];
    for (const group of groups) {
      for (const item of group.failedItems ?? []) {
        const key = item.unique_id || `${item.name}-${item.rp_id}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        tests.push({
          jiraKey: item.jira_key ?? undefined,
          name: item.name,
          polarionId: item.polarion_id ?? undefined,
          shortName: item.name.split('.').pop() || item.name,
        });
      }
    }
    return tests;
  }, [groups]);

  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const initial: Record<string, string> = {};
    for (const test of failingTests) {
      initial[test.name] = test.jiraKey ? `Tracked in ${test.jiraKey}` : '';
    }
    setNotes(initial);
  }, [isOpen, failingTests]);

  const allFilled =
    failingTests.length === 0 ||
    failingTests.every(test => (notes[test.name] || '').trim().length > 0);

  const mutation = useMutation({
    mutationFn: () => {
      const testNotes: TestNote[] = failingTests.map(test => ({
        jiraKey: test.jiraKey,
        note: notes[test.name] || '',
        testName: test.shortName,
      }));
      return submitAcknowledgment({ component, reviewer: user.name, testNotes });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['acknowledgment'] });
      onClose();
    },
  });

  return (
    <Modal isOpen={isOpen} variant={ModalVariant.large} onClose={onClose}>
      <ModalHeader title="Acknowledge Today's Report" />
      <ModalBody>
        <Content className="app-section-subheading" component="p">
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
              {failingTests.map(test => (
                <Tr key={test.name}>
                  <Td dataLabel="Test">
                    <span className="app-font-13">{test.shortName}</span>
                    {test.polarionId && (
                      <div>
                        <Label isCompact color="blue">
                          {test.polarionId}
                        </Label>
                      </div>
                    )}
                  </Td>
                  <Td dataLabel="Jira">
                    {test.jiraKey && (
                      <Label isCompact color="blue">
                        {test.jiraKey}
                      </Label>
                    )}
                  </Td>
                  <Td dataLabel="Note">
                    <TextInput
                      aria-label={`Note for ${test.shortName}`}
                      placeholder="Why is this failing? What action is being taken?"
                      validated={!(notes[test.name] || '').trim() ? 'error' : 'default'}
                      value={notes[test.name] || ''}
                      onChange={(_e, noteValue) =>
                        setNotes(prev => ({ ...prev, [test.name]: noteValue }))
                      }
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}

        {mutation.isError && (
          <HelperText className="app-mt-sm">
            <HelperTextItem variant="error">{mutation.error.message}</HelperTextItem>
          </HelperText>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          isDisabled={!allFilled}
          isLoading={mutation.isPending}
          variant="primary"
          onClick={() => mutation.mutate()}
        >
          Acknowledge{failingTests.length > 0 ? ` (${failingTests.length} tests)` : ''}
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
