import React, { useState } from 'react';

import {
  Alert,
  Button,
  Form,
  FormGroup,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  TextArea,
  Tooltip,
} from '@patternfly/react-core';
import { MagicIcon } from '@patternfly/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { suggestTriage } from '../../api/ai';
import { fetchDefectTypes } from '../../api/defectTypes';
import { bulkClassifyDefect, classifyDefect } from '../../api/triage';
import { SearchableSelect } from '../common/SearchableSelect';

type TriageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  itemIds: number[];
  testContext?: {
    testName: string;
    component?: string;
    errorMessage?: string;
    consecutiveFailures?: number;
  };
};

export const TriageModal: React.FC<TriageModalProps> = ({
  isOpen,
  itemIds,
  onClose,
  testContext,
}) => {
  const queryClient = useQueryClient();
  const [defectType, setDefectType] = useState('');
  const [comment, setComment] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<{
    suggestedType?: string;
    suggestedLabel?: string;
    confidence?: string;
    reasoning?: string;
  } | null>(null);

  const { data: defectTypes } = useQuery({
    queryFn: fetchDefectTypes,
    queryKey: ['defectTypes'],
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (itemIds.length === 1) {
        return classifyDefect(itemIds[0], { comment, defectType });
      }
      return bulkClassifyDefect({ comment, defectType, itemIds });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['report'] });
      void queryClient.invalidateQueries({ queryKey: ['untriaged'] });
      void queryClient.invalidateQueries({ queryKey: ['activity'] });
      void queryClient.invalidateQueries({ queryKey: ['testItems'] });
      void queryClient.invalidateQueries({ queryKey: ['testProfile'] });
      void queryClient.invalidateQueries({ queryKey: ['streaks'] });
      void queryClient.invalidateQueries({ queryKey: ['flakyTests'] });
      onClose();
      setDefectType('');
      setComment('');
    },
  });

  const options: { value: string; label: string }[] = [];
  if (defectTypes) {
    for (const [category, types] of Object.entries(defectTypes)) {
      for (const dt of types) {
        if (!category.startsWith('TO_INVESTIGATE') || dt.locator === 'ti001') {
          options.push({ label: `${dt.longName} (${dt.shortName})`, value: dt.locator });
        }
      }
    }
  }

  const isBulk = itemIds.length > 1;

  const aiMutation = useMutation({
    mutationFn: () =>
      suggestTriage({
        component: testContext?.component,
        consecutiveFailures: testContext?.consecutiveFailures,
        errorMessage: testContext?.errorMessage ?? '',
        testName: testContext?.testName ?? '',
      }),
    onSuccess: data => {
      setAiSuggestion(data.suggestion);
      if (data.suggestion.suggestedType) {
        const match = options.find(
          o =>
            o.value === data.suggestion.suggestedType ||
            o.label.toLowerCase().includes((data.suggestion.suggestedLabel ?? '').toLowerCase()),
        );
        if (match) {
          setDefectType(match.value);
        }
      }
      if (data.suggestion.reasoning) {
        setComment(data.suggestion.reasoning);
      }
    },
  });

  return (
    <Modal isOpen={isOpen} variant={ModalVariant.medium} onClose={onClose}>
      <ModalHeader title={isBulk ? `Classify ${itemIds.length} Items` : 'Classify Defect'} />
      <ModalBody>
        <Form>
          {testContext && !isBulk && (
            <FormGroup>
              <Tooltip content="AI analyzes the error message and test context to suggest the most likely defect classification (Product Bug, Automation Bug, System Issue, etc.)">
                <Button
                  icon={<MagicIcon />}
                  isDisabled={aiMutation.isPending}
                  isLoading={aiMutation.isPending}
                  size="sm"
                  variant="secondary"
                  onClick={() => aiMutation.mutate()}
                >
                  AI Suggest
                </Button>
              </Tooltip>
              {aiSuggestion && (
                <Alert
                  isInline
                  isPlain
                  className="app-mt-sm"
                  title={`AI suggests: ${aiSuggestion.suggestedLabel ?? aiSuggestion.suggestedType} (${aiSuggestion.confidence} confidence)`}
                  variant="info"
                />
              )}
            </FormGroup>
          )}
          <FormGroup isRequired label="Defect Type">
            <SearchableSelect
              id="defect-type"
              noResultsText="No defect types"
              options={options}
              placeholder="Select a defect type..."
              value={defectType}
              onChange={setDefectType}
            />
          </FormGroup>
          <FormGroup label="Comment">
            <TextArea
              placeholder="Reason for classification..."
              value={comment}
              onChange={(_e, val) => setComment(val)}
            />
          </FormGroup>
          {mutation.isError && (
            <HelperText>
              <HelperTextItem variant="error">{mutation.error.message}</HelperTextItem>
            </HelperText>
          )}
        </Form>
      </ModalBody>
      <ModalFooter>
        <Button
          isDisabled={!defectType}
          isLoading={mutation.isPending}
          variant="primary"
          onClick={() => mutation.mutate()}
        >
          Classify
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};
