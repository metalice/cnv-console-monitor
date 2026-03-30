import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { suggestTriage } from '../../api/ai';
import { fetchDefectTypes } from '../../api/defectTypes';
import { bulkClassifyDefect, classifyDefect } from '../../api/triage';

type TriageContext = {
  testName: string;
  component?: string;
  errorMessage?: string;
  consecutiveFailures?: number;
};

type AiSuggestion = {
  suggestedType?: string;
  suggestedLabel?: string;
  confidence?: string;
  reasoning?: string;
};

export const useTriageForm = (
  itemIds: number[],
  onClose: () => void,
  testContext?: TriageContext,
) => {
  const queryClient = useQueryClient();
  const [defectType, setDefectType] = useState('');
  const [comment, setComment] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);

  const { data: defectTypes } = useQuery({
    queryFn: fetchDefectTypes,
    queryKey: ['defectTypes'],
    staleTime: Infinity,
  });

  const options: { value: string; label: string }[] = [];
  if (defectTypes) {
    for (const [category, types] of Object.entries(defectTypes)) {
      for (const defectTypeItem of types) {
        if (!category.startsWith('TO_INVESTIGATE') || defectTypeItem.locator === 'ti001') {
          options.push({
            label: `${defectTypeItem.longName} (${defectTypeItem.shortName})`,
            value: defectTypeItem.locator,
          });
        }
      }
    }
  }

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
          option =>
            option.value === data.suggestion.suggestedType ||
            option.label
              .toLowerCase()
              .includes((data.suggestion.suggestedLabel ?? '').toLowerCase()),
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

  return {
    aiMutation,
    aiSuggestion,
    comment,
    defectType,
    mutation,
    options,
    setComment,
    setDefectType,
  };
};
