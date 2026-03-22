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
  TextArea,
  HelperText,
  HelperTextItem,
  Label, Alert, Tooltip,
} from '@patternfly/react-core';
import { MagicIcon } from '@patternfly/react-icons';
import { fetchDefectTypes } from '../../api/defectTypes';
import { classifyDefect, bulkClassifyDefect } from '../../api/triage';
import { suggestTriage } from '../../api/ai';
import { SearchableSelect } from '../common/SearchableSelect';

type TriageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  itemIds: number[];
  testContext?: { testName: string; component?: string; errorMessage?: string; consecutiveFailures?: number };
};

export const TriageModal: React.FC<TriageModalProps> = ({ isOpen, onClose, itemIds, testContext }) => {
  const queryClient = useQueryClient();
  const [defectType, setDefectType] = useState('');
  const [comment, setComment] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<{ suggestedType?: string; suggestedLabel?: string; confidence?: string; reasoning?: string } | null>(null);

  const { data: defectTypes } = useQuery({
    queryKey: ['defectTypes'],
    queryFn: fetchDefectTypes,
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (itemIds.length === 1) {
        return classifyDefect(itemIds[0], { defectType, comment });
      }
      return bulkClassifyDefect({ itemIds, defectType, comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['untriaged'] });
      queryClient.invalidateQueries({ queryKey: ['activity'] });
      queryClient.invalidateQueries({ queryKey: ['testItems'] });
      queryClient.invalidateQueries({ queryKey: ['testProfile'] });
      queryClient.invalidateQueries({ queryKey: ['streaks'] });
      queryClient.invalidateQueries({ queryKey: ['flakyTests'] });
      onClose();
      setDefectType('');
      setComment('');
    },
  });

  const options: Array<{ value: string; label: string }> = [];
  if (defectTypes) {
    for (const [category, types] of Object.entries(defectTypes)) {
      for (const dt of types) {
        if (!category.startsWith('TO_INVESTIGATE') || dt.locator === 'ti001') {
          options.push({ value: dt.locator, label: `${dt.longName} (${dt.shortName})` });
        }
      }
    }
  }

  const isBulk = itemIds.length > 1;

  const aiMutation = useMutation({
    mutationFn: () => suggestTriage({
      testName: testContext?.testName ?? '',
      component: testContext?.component,
      errorMessage: testContext?.errorMessage ?? '',
      consecutiveFailures: testContext?.consecutiveFailures,
    }),
    onSuccess: (data) => {
      setAiSuggestion(data.suggestion);
      if (data.suggestion.suggestedType) {
        const match = options.find(o => o.value === data.suggestion.suggestedType || o.label.toLowerCase().includes((data.suggestion.suggestedLabel ?? '').toLowerCase()));
        if (match) setDefectType(match.value);
      }
      if (data.suggestion.reasoning) setComment(data.suggestion.reasoning);
    },
  });

  return (
    <Modal
      variant={ModalVariant.medium}
      isOpen={isOpen}
      onClose={onClose}
    >
      <ModalHeader title={isBulk ? `Classify ${itemIds.length} Items` : 'Classify Defect'} />
      <ModalBody>
        <Form>
          {testContext && !isBulk && (
            <FormGroup>
              <Tooltip content="AI analyzes the error message and test context to suggest the most likely defect classification (Product Bug, Automation Bug, System Issue, etc.)">
                <Button variant="secondary" icon={<MagicIcon />} onClick={() => aiMutation.mutate()} isLoading={aiMutation.isPending} isDisabled={aiMutation.isPending} size="sm">
                  AI Suggest
                </Button>
              </Tooltip>
              {aiSuggestion && (
                <Alert variant="info" isInline isPlain className="app-mt-sm"
                  title={`AI suggests: ${aiSuggestion.suggestedLabel ?? aiSuggestion.suggestedType} (${aiSuggestion.confidence} confidence)`}
                />
              )}
            </FormGroup>
          )}
          <FormGroup label="Defect Type" isRequired>
            <SearchableSelect
              id="defect-type"
              value={defectType}
              options={options}
              onChange={setDefectType}
              placeholder="Select a defect type..."
              noResultsText="No defect types"
            />
          </FormGroup>
          <FormGroup label="Comment">
            <TextArea value={comment} onChange={(_e, val) => setComment(val)} placeholder="Reason for classification..." />
          </FormGroup>
          {mutation.isError && (
            <HelperText>
              <HelperTextItem variant="error">{(mutation.error as Error).message}</HelperTextItem>
            </HelperText>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={() => mutation.mutate()} isDisabled={!defectType} isLoading={mutation.isPending}>
          Classify
        </Button>
        <Button variant="link" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </Modal>
  );
};
