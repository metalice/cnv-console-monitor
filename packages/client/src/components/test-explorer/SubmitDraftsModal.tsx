import { createTwoFilesPatch } from 'diff';
import React, { useEffect, useMemo, useState } from 'react';

import { timeAgo } from '@cnv-monitor/shared';

import {
  Alert,
  Button,
  Checkbox,
  Content,
  ExpandableSection,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Spinner,
  TextArea,
  TextInput,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExternalLinkAltIcon } from '@patternfly/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type DraftInfo, fetchUserDrafts, submitDraftsApi } from '../../api/testExplorer';

type SubmitDraftsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type SubmitResult = {
  prUrl: string;
  prNumber: number;
  filesCommitted: number;
};

const statusColor = (status: string): 'blue' | 'green' | 'orange' | 'grey' => {
  switch (status) {
    case 'modified':
      return 'blue';
    case 'saved':
      return 'green';
    case 'new':
      return 'orange';
    default:
      return 'grey';
  }
};

const DiffView: React.FC<{ draft: DraftInfo }> = ({ draft }) => {
  const patch = useMemo(
    () =>
      createTwoFilesPatch(
        draft.file_path,
        draft.file_path,
        draft.original_content,
        draft.draft_content,
        'original',
        'modified',
      ),
    [draft.file_path, draft.original_content, draft.draft_content],
  );

  const lines = patch.split('\n');

  return (
    <pre className="app-text-mono app-font-12" style={{ margin: 0, overflowX: 'auto' }}>
      {lines.map((line, i) => {
        let cls = 'app-diff-line--context';
        if (line.startsWith('+') && !line.startsWith('+++')) {
          cls = 'app-diff-line--add';
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          cls = 'app-diff-line--del';
        }

        return (
          // eslint-disable-next-line react/no-array-index-key
          <div className={cls} key={i}>
            {line}
          </div>
        );
      })}
    </pre>
  );
};

const generateTitle = (drafts: DraftInfo[]): string => {
  const names = drafts.map(draft => draft.file_path.split('/').pop() ?? draft.file_path);
  if (names.length <= 3) {
    return `docs: update ${names.join(', ')}`;
  }
  return `docs: update ${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
};

const generateDescription = (drafts: DraftInfo[]): string => {
  const lines = ['Updated files:', '', ...drafts.map(draft => `- ${draft.file_path}`)];
  return lines.join('\n');
};

export const SubmitDraftsModal: React.FC<SubmitDraftsModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(new Set<string>());
  const [prTitle, setPrTitle] = useState('');
  const [prDescription, setPrDescription] = useState('');
  const [result, setResult] = useState<SubmitResult | null>(null);

  const { data: drafts, isLoading } = useQuery({
    enabled: isOpen,
    queryFn: fetchUserDrafts,
    queryKey: ['userDrafts'],
  });

  useEffect(() => {
    if (drafts?.length) {
      setSelected(new Set(drafts.map(draft => draft.id)));
      setPrTitle(generateTitle(drafts));
      setPrDescription(generateDescription(drafts));
    }
  }, [drafts]);

  const selectedDrafts = useMemo(
    () => (drafts ?? []).filter(draft => selected.has(draft.id)),
    [drafts, selected],
  );

  useEffect(() => {
    if (selectedDrafts.length) {
      setPrTitle(generateTitle(selectedDrafts));
      setPrDescription(generateDescription(selectedDrafts));
    }
  }, [selectedDrafts]);

  const mutation = useMutation({
    mutationFn: () =>
      submitDraftsApi({
        draftIds: Array.from(selected),
        prDescription: prDescription.trim() || undefined,
        prTitle,
      }),
    onSuccess: data => {
      void queryClient.invalidateQueries({ queryKey: ['userDrafts'] });
      void queryClient.invalidateQueries({ queryKey: ['draftCount'] });
      void queryClient.invalidateQueries({ queryKey: ['draftPaths'] });
      setResult(data);
    },
  });

  const handleClose = () => {
    setResult(null);
    setSelected(new Set());
    setPrTitle('');
    setPrDescription('');
    mutation.reset();
    onClose();
  };

  const toggleDraft = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (result) {
    return (
      <Modal isOpen={isOpen} variant={ModalVariant.medium} onClose={handleClose}>
        <ModalHeader title="Pull Request Created" />
        <ModalBody>
          <Alert
            isInline
            className="app-mb-md"
            title="Drafts submitted successfully"
            variant="success"
          />
          <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
            <FlexItem>
              <Content component="p">
                <Label isCompact className="app-mr-sm" color="green" icon={<CheckCircleIcon />}>
                  PR #{result.prNumber}
                </Label>
                {result.filesCommitted} file{result.filesCommitted !== 1 ? 's' : ''} committed
              </Content>
            </FlexItem>
            <FlexItem>
              <Button
                isInline
                component="a"
                href={result.prUrl}
                icon={<ExternalLinkAltIcon />}
                rel="noreferrer"
                target="_blank"
                variant="link"
              >
                View Pull Request
              </Button>
            </FlexItem>
          </Flex>
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={handleClose}>
            Done
          </Button>
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} variant={ModalVariant.large} onClose={handleClose}>
      <ModalHeader
        description="Select drafts to include in a pull request."
        title="Submit Drafts"
      />
      <ModalBody>
        {isLoading ? (
          <div className="app-card-spinner">
            <Spinner aria-label="Loading drafts" />
          </div>
        ) : !drafts?.length ? (
          <Content className="app-text-muted app-text-center" component="p">
            No drafts to submit.
          </Content>
        ) : (
          <Form>
            <FormGroup fieldId="draft-list" label="Drafts">
              {drafts.map(draft => (
                <div className="app-mb-sm" key={draft.id}>
                  <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                    <FlexItem>
                      <Checkbox
                        id={`draft-${draft.id}`}
                        isChecked={selected.has(draft.id)}
                        onChange={() => toggleDraft(draft.id)}
                      />
                    </FlexItem>
                    <FlexItem grow={{ default: 'grow' }}>
                      <span className="app-text-mono app-font-13">{draft.file_path}</span>
                    </FlexItem>
                    <FlexItem>
                      <span className="app-text-muted app-font-12">
                        {timeAgo(new Date(draft.updated_at).getTime())}
                      </span>
                    </FlexItem>
                    <FlexItem>
                      <Label isCompact color={statusColor(draft.status)}>
                        {draft.status}
                      </Label>
                    </FlexItem>
                  </Flex>
                  <ExpandableSection className="app-mt-xs" toggleText="Show diff">
                    <DiffView draft={draft} />
                  </ExpandableSection>
                </div>
              ))}
            </FormGroup>

            <FormGroup isRequired fieldId="pr-title" label="PR Title">
              <TextInput id="pr-title" value={prTitle} onChange={(_e, val) => setPrTitle(val)} />
            </FormGroup>

            <FormGroup fieldId="pr-desc" label="PR Description">
              <TextArea
                id="pr-desc"
                resizeOrientation="vertical"
                rows={5}
                value={prDescription}
                onChange={(_e, val) => setPrDescription(val)}
              />
            </FormGroup>

            {mutation.isError && (
              <Alert isInline title="Failed to submit drafts" variant="danger">
                {mutation.error.message}
              </Alert>
            )}
          </Form>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          isDisabled={selected.size === 0 || !prTitle.trim() || mutation.isPending}
          isLoading={mutation.isPending}
          variant="primary"
          onClick={() => mutation.mutate()}
        >
          Open Pull Request
        </Button>
        <Button variant="link" onClick={handleClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
