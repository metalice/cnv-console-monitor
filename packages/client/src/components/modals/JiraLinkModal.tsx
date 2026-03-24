import React, { useCallback, useRef, useState } from 'react';

import {
  Alert,
  Button,
  Form,
  FormGroup,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextInput,
} from '@patternfly/react-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
  const [searchResults, setSearchResults] = useState<
    { key: string; summary: string; status: string }[]
  >([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const mutation = useMutation({
    mutationFn: () => linkJiraIssue({ jiraKey, testItemId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['report'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
      void queryClient.invalidateQueries({ queryKey: ['testItems'] });
      void queryClient.invalidateQueries({ queryKey: ['untriaged'] });
      void queryClient.invalidateQueries({ queryKey: ['testProfile'] });
      onClose();
      setJiraKey('');
      setSearchQuery('');
      setSearchResults([]);
    },
  });

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    clearTimeout(debounceRef.current);

    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchJiraIssues(query);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  return (
    <Modal isOpen={isOpen} variant={ModalVariant.medium} onClose={onClose}>
      <ModalHeader title="Link Jira Issue" />
      <ModalBody>
        <Form>
          <FormGroup label="Jira Issue Key">
            <TextInput
              placeholder="e.g. CNV-12345"
              value={jiraKey}
              onChange={(_e, inputValue) => setJiraKey(inputValue)}
            />
          </FormGroup>
          <FormGroup label="Or search">
            <TextInput
              placeholder="Search Jira issues..."
              value={searchQuery}
              onChange={(_e, inputValue) => handleSearch(inputValue)}
            />
            {searchResults.length > 0 && (
              <div className="app-jira-search-results">
                {searchResults.map(result => (
                  <div
                    className={`app-jira-search-item${jiraKey === result.key ? ' app-jira-search-item--selected' : ''}`}
                    key={result.key}
                    onClick={() => setJiraKey(result.key)}
                  >
                    <strong>{result.key}</strong> — {result.summary}{' '}
                    <Label isCompact>{result.status}</Label>
                  </div>
                ))}
              </div>
            )}
          </FormGroup>
          {mutation.isError && <Alert isInline title={mutation.error.message} variant="danger" />}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          isDisabled={!jiraKey}
          isLoading={mutation.isPending}
          variant="primary"
          onClick={() => mutation.mutate()}
        >
          Link
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
