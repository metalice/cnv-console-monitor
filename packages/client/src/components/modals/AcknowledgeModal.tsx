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
};

export const AcknowledgeModal: React.FC<AcknowledgeModalProps> = ({ isOpen, onClose, groups }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const failingTests = useMemo(() => {
    const seen = new Set<string>();
    const tests: Array<{ name: string; shortName: string; jiraKey?: string; polarionId?: string }> = [];
    for (const g of groups) {
      for (const item of g.failedItems) {
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
    for (const t of failingTests) {
      initial[t.name] = t.jiraKey ? `Tracked in ${t.jiraKey}` : '';
    }
    setNotes(initial);
  }, [isOpen, failingTests]);

  const allFilled = failingTests.length === 0 || failingTests.every(t => (notes[t.name] || '').trim().length > 0);

  const mutation = useMutation({
    mutationFn: () => {
      const testNotes: TestNote[] = failingTests.map(t => ({
        testName: t.shortName,
        jiraKey: t.jiraKey,
        note: notes[t.name] || '',
      }));
      return submitAcknowledgment({ reviewer: user.name, testNotes });
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
        <Content component="p" style={{ marginBottom: 12 }}>
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
              {failingTests.map((t) => (
                <Tr key={t.name}>
                  <Td dataLabel="Test">
                    <span style={{ fontSize: 13 }}>{t.shortName}</span>
                    {t.polarionId && (
                      <div><Label color="blue" isCompact>{t.polarionId}</Label></div>
                    )}
                  </Td>
                  <Td dataLabel="Jira">
                    {t.jiraKey && <Label color="blue" isCompact>{t.jiraKey}</Label>}
                  </Td>
                  <Td dataLabel="Note">
                    <TextInput
                      value={notes[t.name] || ''}
                      onChange={(_e, val) => setNotes(prev => ({ ...prev, [t.name]: val }))}
                      placeholder="Why is this failing? What action is being taken?"
                      aria-label={`Note for ${t.shortName}`}
                      validated={!(notes[t.name] || '').trim() ? 'error' : 'default'}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}

        {mutation.isError && (
          <HelperText style={{ marginTop: 8 }}>
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
          Acknowledge ({failingTests.length} tests)
        </Button>
        <Button variant="link" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};
