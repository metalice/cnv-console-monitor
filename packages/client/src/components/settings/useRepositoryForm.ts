import { useMemo, useState } from 'react';

import type { Repository, RepositoryProvider } from '@cnv-monitor/shared';

import { useQuery } from '@tanstack/react-query';

import { fetchComponentMappings } from '../../api/componentMappings';

import { deriveApiUrl, deriveDisplayName } from './repositoryUrlUtils';
import { useFormReset } from './useFormReset';
import { useRepositoryHandlers } from './useRepositoryHandlers';
import { useRepositoryMutation } from './useRepositoryMutation';
import { useRepositoryResolve } from './useRepositoryResolve';

const STALE_TIME_MS = 5 * 60_000;

export const useRepositoryForm = (isOpen: boolean, existing?: Repository) => {
  const [provider, setProvider] = useState<RepositoryProvider>('gitlab');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [projectId, setProjectId] = useState('');
  const [selectedBranches, setSelectedBranches] = useState(new Set<string>(['main']));
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [globalTokenKey, setGlobalTokenKey] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [cacheTtlMin, setCacheTtlMin] = useState(5);
  const [enabled, setEnabled] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inlineToken, setInlineToken] = useState('');

  useFormReset(isOpen, existing, {
    setApiBaseUrl,
    setAvailableBranches,
    setCacheTtlMin,
    setEnabled,
    setGlobalTokenKey,
    setInlineToken,
    setName,
    setProjectId,
    setProvider,
    setSelectedBranches,
    setSelectedComponent,
    setShowAdvanced,
    setUrl,
  });

  const resolve = useRepositoryResolve({
    name,
    setAvailableBranches,
    setName,
    setProjectId,
    setSelectedBranches,
  });

  const handlers = useRepositoryHandlers({
    existing,
    inlineToken,
    name,
    provider,
    resolve,
    selectedBranches,
    setApiBaseUrl,
    setGlobalTokenKey,
    setName,
    setProjectId,
    setProvider,
    setUrl,
    url,
  });

  const effectiveApiUrl = apiBaseUrl || deriveApiUrl(provider, url);
  const effectiveTokenKey = globalTokenKey || `${provider}.token`;

  const { data: mappingsData } = useQuery({
    queryFn: fetchComponentMappings,
    queryKey: ['componentMappings'],
    staleTime: STALE_TIME_MS,
  });

  const componentOptions = useMemo(() => {
    const jiraComps = mappingsData?.jiraComponents ?? [];
    const mappedComps = (mappingsData?.mappings ?? []).map(mapping => mapping.component);
    return [...new Set([...jiraComps, ...mappedComps])].toSorted((nameA, nameB) =>
      nameA.localeCompare(nameB),
    );
  }, [mappingsData]);

  const canSubmit = useMemo(
    () => Boolean(name || deriveDisplayName(url)) && url && projectId && selectedBranches.size > 0,
    [name, url, projectId, selectedBranches],
  );

  const mutation = useRepositoryMutation({
    cacheTtlMin,
    effectiveApiUrl,
    effectiveTokenKey,
    enabled,
    existing,
    inlineToken,
    name,
    projectId,
    provider,
    selectedBranches,
    selectedComponent,
    url,
  });

  return {
    apiBaseUrl,
    availableBranches,
    branchesLoading: resolve.branchesLoading,
    cacheTtlMin,
    canSubmit,
    componentOptions,
    effectiveApiUrl,
    effectiveTokenKey,
    enabled,
    globalTokenKey,
    ...handlers,
    inlineToken,
    mutation,
    name,
    needsToken: resolve.needsToken,
    projectId,
    provider,
    resolveError: resolve.resolveError,
    resolving: resolve.resolving,
    selectedBranches,
    selectedComponent,
    setApiBaseUrl,
    setCacheTtlMin,
    setEnabled,
    setGlobalTokenKey,
    setInlineToken,
    setName,
    setProjectId,
    setSelectedBranches,
    setSelectedComponent,
    setShowAdvanced,
    showAdvanced,
    url,
  } as const;
};

export type RepositoryFormReturn = ReturnType<typeof useRepositoryForm>;
