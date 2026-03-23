import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  TextInput,
  TextArea,
  FormGroup,
  Form,
  Alert,
  Checkbox,
  Label,
  Spinner,
  Content,
  ExpandableSection,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { ExternalLinkAltIcon, CheckCircleIcon } from '@patternfly/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timeAgo } from '@cnv-monitor/shared';
import { createTwoFilesPatch } from 'diff';
import { fetchUserDrafts, submitDraftsApi, type DraftInfo } from '../../api/testExplorer';

interface SubmitDraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SubmitResult {
  prUrl: string;
  prNumber: number;
  filesCommitted: number;
}

const statusColor = (status: string): 'blue' | 'green' | 'orange' | 'grey' => {
  switch (status) {
    case 'modified': return 'blue';
    case 'saved': return 'green';
    case 'new': return 'orange';
    default: return 'grey';
  }
};

const DiffView: React.FC<{ draft: DraftInfo }> = ({ draft }) => {
  const patch = useMemo(
    () => createTwoFilesPatch(draft.file_path, draft.file_path, draft.original_content, draft.draft_content, 'original', 'modified'),
    [draft.file_path, draft.original_content, draft.draft_content],
  );

  const lines = patch.split('\n');

  return (
    <pre className="app-text-mono app-font-12" style={{ margin: 0, overflowX: 'auto' }}>
      {lines.map((line, i) => {
        let cls = 'app-diff-line--context';
        if (line.startsWith('+') && !line.startsWith('+++')) cls = 'app-diff-line--add';
        else if (line.startsWith('-') && !line.startsWith('---')) cls = 'app-diff-line--del';

        return (
          <div key={i} className={cls}>
            {line}
          </div>
        );
      })}
    </pre>
  );
};

const generateTitle = (drafts: DraftInfo[]): string => {
  const names = drafts.map(d => d.file_path.split('/').pop() ?? d.file_path);
  if (names.length <= 3) return `docs: update ${names.join(', ')}`;
  return `docs: update ${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
};

const generateDescription = (drafts: DraftInfo[]): string => {
  const lines = ['Updated files:', '', ...drafts.map(d => `- ${d.file_path}`)];
  return lines.join('\n');
};

export const SubmitDraftsModal: React.FC<SubmitDraftsModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [prTitle, setPrTitle] = useState('');
  const [prDescription, setPrDescription] = useState('');
  const [result, setResult] = useState<SubmitResult | null>(null);

  const { data: drafts, isLoading } = useQuery({
    queryKey: ['userDrafts'],
    queryFn: fetchUserDrafts,
    enabled: isOpen,
  });

  useEffect(() => {
    if (drafts?.length) {
      setSelected(new Set(drafts.map(d => d.id)));
      setPrTitle(generateTitle(drafts));
      setPrDescription(generateDescription(drafts));
    }
  }, [drafts]);

  const selectedDrafts = useMemo(
    () => (drafts ?? []).filter(d => selected.has(d.id)),
    [drafts, selected],
  );

  useEffect(() => {
    if (selectedDrafts.length) {
      setPrTitle(generateTitle(selectedDrafts));
      setPrDescription(generateDescription(selectedDrafts));
    }
  }, [selectedDrafts]);

  const mutation = useMutation({
    mutationFn: () => submitDraftsApi({
      draftIds: Array.from(selected),
      prTitle,
      prDescription: prDescription.trim() || undefined,
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userDrafts'] });
      queryClient.invalidateQueries({ queryKey: ['draftCount'] });
      queryClient.invalidateQueries({ queryKey: ['draftPaths'] });
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (result) {
    return (
      <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={handleClose}>
        <ModalHeader title="Pull Request Created" />
        <ModalBody>
          <Alert variant="success" isInline title="Drafts submitted successfully" className="app-mb-md" />
          <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }}>
            <FlexItem>
              <Content component="p">
                <Label color="green" icon={<CheckCircleIcon />} isCompact className="app-mr-sm">
                  PR #{result.prNumber}
                </Label>
                {result.filesCommitted} file{result.filesCommitted !== 1 ? 's' : ''} committed
              </Content>
            </FlexItem>
            <FlexItem>
              <Button
                variant="link"
                component="a"
                href={result.prUrl}
                target="_blank"
                rel="noreferrer"
                icon={<ExternalLinkAltIcon />}
                isInline
              >
                View Pull Request
              </Button>
            </FlexItem>
          </Flex>
        </ModalBody>
        <ModalFooter>
          <Button variant="primary" onClick={handleClose}>Done</Button>
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <Modal variant={ModalVariant.large} isOpen={isOpen} onClose={handleClose}>
      <ModalHeader title="Submit Drafts" description="Select drafts to include in a pull request." />
      <ModalBody>
        {isLoading ? (
          <div className="app-card-spinner"><Spinner aria-label="Loading drafts" /></div>
        ) : !drafts?.length ? (
          <Content component="p" className="app-text-muted app-text-center">No drafts to submit.</Content>
        ) : (
          <Form>
            <FormGroup label="Drafts" fieldId="draft-list">
              {drafts.map(draft => (
                <div key={draft.id} className="app-mb-sm">
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
                      <span className="app-text-muted app-font-12">{timeAgo(new Date(draft.updated_at).getTime())}</span>
                    </FlexItem>
                    <FlexItem>
                      <Label color={statusColor(draft.status)} isCompact>{draft.status}</Label>
                    </FlexItem>
                  </Flex>
                  <ExpandableSection toggleText="Show diff" className="app-mt-xs">
                    <DiffView draft={draft} />
                  </ExpandableSection>
                </div>
              ))}
            </FormGroup>

            <FormGroup label="PR Title" isRequired fieldId="pr-title">
              <TextInput
                id="pr-title"
                value={prTitle}
                onChange={(_e, val) => setPrTitle(val)}
              />
            </FormGroup>

            <FormGroup label="PR Description" fieldId="pr-desc">
              <TextArea
                id="pr-desc"
                value={prDescription}
                onChange={(_e, val) => setPrDescription(val)}
                rows={5}
                resizeOrientation="vertical"
              />
            </FormGroup>

            {mutation.isError && (
              <Alert variant="danger" isInline title="Failed to submit drafts">
                {(mutation.error as Error).message}
              </Alert>
            )}
          </Form>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={() => mutation.mutate()}
          isDisabled={selected.size === 0 || !prTitle.trim() || mutation.isPending}
          isLoading={mutation.isPending}
        >
          Open Pull Request
        </Button>
        <Button variant="link" onClick={handleClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};
