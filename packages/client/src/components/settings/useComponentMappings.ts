import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteComponentMapping,
  fetchComponentMappings,
  previewPattern,
  triggerAutoMap,
  upsertComponentMapping,
} from '../../api/componentMappings';
import type { SearchableSelectOption } from '../common/SearchableSelect';

import type { MappingDraft } from './MappingsTable';

export const useComponentMappings = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryFn: fetchComponentMappings,
    queryKey: ['componentMappings'],
  });

  const [editingPattern, setEditingPattern] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<MappingDraft>({ component: '', pattern: '' });
  const [newDraft, setNewDraft] = useState<MappingDraft | null>(null);
  const [previewResult, setPreviewResult] = useState<{
    matches: string[];
    totalCount: number;
    nameCount: number;
    conflicts?: { pattern: string; component: string }[];
  } | null>(null);
  const [unmappedExpanded, setUnmappedExpanded] = useState(false);

  const activePattern = newDraft?.pattern || (editingPattern ? editDraft.pattern : '');
  const includeDeleted = newDraft?.includeDeleted ?? false;

  useEffect(() => {
    if (!activePattern || activePattern.length < 2) {
      setPreviewResult(null);
      return;
    }
    const timer = setTimeout(() => {
      previewPattern(activePattern, includeDeleted)
        .then(setPreviewResult)
        .catch(() => setPreviewResult(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [activePattern, includeDeleted]);

  const componentOptions = useMemo((): SearchableSelectOption[] => {
    const jiraComps = data?.jiraComponents ?? [];
    const mappedComps = (data?.mappings ?? []).map(item => item.component);
    return [...new Set([...jiraComps, ...mappedComps])]
      .toSorted((nameA, nameB) => nameA.localeCompare(nameB))
      .map(comp => ({ label: comp, value: comp }));
  }, [data?.jiraComponents, data?.mappings]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['componentMappings'] });
  };

  const upsertMutation = useMutation({
    mutationFn: (draft: MappingDraft) =>
      upsertComponentMapping(draft.pattern, draft.component, 'manual', draft.includeDeleted),
    onSuccess: () => {
      invalidate();
      setNewDraft(null);
      setEditingPattern(null);
      setPreviewResult(null);
    },
  });

  const deleteMutation = useMutation({ mutationFn: deleteComponentMapping, onSuccess: invalidate });
  const autoMapMutation = useMutation({ mutationFn: triggerAutoMap, onSuccess: invalidate });

  const startNewRow = (prefill = '') => {
    setNewDraft({ component: '', pattern: prefill });
    setEditingPattern(null);
  };

  const startEdit = (pattern: string, component: string) => {
    setEditingPattern(pattern);
    setEditDraft({ component, pattern });
    setNewDraft(null);
  };

  const mappings = data?.mappings ?? [];
  const allUnmapped = useMemo(() => data?.unmapped ?? [], [data?.unmapped]);
  const activeLaunches = useMemo(
    () => allUnmapped.filter(entry => !entry.jobDeleted),
    [allUnmapped],
  );
  const deletedLaunches = useMemo(
    () => allUnmapped.filter(entry => entry.jobDeleted),
    [allUnmapped],
  );
  const hasData = (data?.launchCount ?? 0) > 0;
  const summary = data?.summary;

  return {
    activeLaunches,
    autoMapMutation,
    componentOptions,
    deletedLaunches,
    deleteMutation,
    editDraft,
    editingPattern,
    hasData,
    isLoading,
    mappings,
    newDraft,
    previewResult,
    setEditDraft,
    setEditingPattern,
    setNewDraft,
    setPreviewResult,
    setUnmappedExpanded,
    startEdit,
    startNewRow,
    summary,
    unmappedExpanded,
    upsertMutation,
  };
};
