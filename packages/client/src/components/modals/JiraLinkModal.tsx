import React, { useState, useRef, useCallback } from 'react';
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
  Label,
  Alert,
} from '@patternfly/react-core';
import { linkJiraIssue, searchJiraIssues } from '../../api/jira';

type JiraLinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  testItemId: number;
};

const SEARCH_DEBOUNCE_MS = 300;

export const JiraLinkModal: React.FC<JiraLinkModalProps> = ({ isOpen, onClose, testItemId }) => {
  const queryClient = useQueryClient();
  const [jiraKey, setJiraKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ key: string; summary: string; status: string }>>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const mutation = useMutation({
    mutationFn: () => linkJiraIssue({ testItemId, jiraKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      onClose();
      setJiraKey('');
      setSearchQuery('');
      setSearchResults([]);
    },
  });

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    clearTimeout(debounceRef.current);

    if (q.length < 3) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchJiraIssues(q);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  return (
    <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={onClose}>
      <ModalHeader title="Link Jira Issue" />
      <ModalBody>
        <Form>
          <FormGroup label="Jira Issue Key">
            <TextInput
              value={jiraKey}
              onChange={(_e, val) => setJiraKey(val)}
              placeholder="e.g. CNV-12345"
            />
          </FormGroup>
          <FormGroup label="Or search">
            <TextInput
              value={searchQuery}
              onChange={(_e, val) => handleSearch(val)}
              placeholder="Search Jira issues..."
            />
            {searchResults.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 200, overflow: 'auto' }}>
                {searchResults.map((r) => (
                  <div
                    key={r.key}
                    onClick={() => setJiraKey(r.key)}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--pf-t--global--border--color--default)',
                      background: jiraKey === r.key ? 'var(--pf-t--global--background--color--primary--default)' : undefined,
                    }}
                  >
                    <strong>{r.key}</strong> — {r.summary}{' '}
                    <Label isCompact>{r.status}</Label>
                  </div>
                ))}
              </div>
            )}
          </FormGroup>
          {mutation.isError && (
            <Alert variant="danger" title={(mutation.error as Error).message} isInline />
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={() => mutation.mutate()} isDisabled={!jiraKey} isLoading={mutation.isPending}>
          Link
        </Button>
        <Button variant="link" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};
