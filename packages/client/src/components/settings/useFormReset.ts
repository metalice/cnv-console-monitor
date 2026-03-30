import { type Dispatch, type SetStateAction, useEffect } from 'react';

import type { Repository, RepositoryProvider } from '@cnv-monitor/shared';

type FormSetters = {
  setProvider: Dispatch<SetStateAction<RepositoryProvider>>;
  setUrl: Dispatch<SetStateAction<string>>;
  setName: Dispatch<SetStateAction<string>>;
  setApiBaseUrl: Dispatch<SetStateAction<string>>;
  setProjectId: Dispatch<SetStateAction<string>>;
  setSelectedBranches: Dispatch<SetStateAction<Set<string>>>;
  setAvailableBranches: Dispatch<SetStateAction<string[]>>;
  setGlobalTokenKey: Dispatch<SetStateAction<string>>;
  setSelectedComponent: Dispatch<SetStateAction<string>>;
  setCacheTtlMin: Dispatch<SetStateAction<number>>;
  setEnabled: Dispatch<SetStateAction<boolean>>;
  setShowAdvanced: Dispatch<SetStateAction<boolean>>;
  setInlineToken: Dispatch<SetStateAction<string>>;
};

export const useFormReset = (
  isOpen: boolean,
  existing: Repository | undefined,
  setters: FormSetters,
) => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (existing) {
      const rec = existing as unknown as Record<string, unknown>;
      setters.setProvider((rec.provider || 'gitlab') as RepositoryProvider);
      setters.setUrl((rec.url || '') as string);
      setters.setName((rec.name || '') as string);
      setters.setApiBaseUrl((rec.apiBaseUrl || rec.api_base_url || '') as string);
      setters.setProjectId((rec.projectId || rec.project_id || '') as string);
      const branches = (rec.branches || []) as string[];
      setters.setSelectedBranches(new Set<string>(branches));
      setters.setAvailableBranches(branches);
      setters.setGlobalTokenKey((rec.globalTokenKey || rec.global_token_key || '') as string);
      const components = (rec.components || []) as string[];
      setters.setSelectedComponent(components[0] || '');
      setters.setCacheTtlMin((rec.cacheTtlMin || rec.cache_ttl_min || 5) as number);
      setters.setEnabled((rec.enabled !== undefined ? rec.enabled : true) as boolean);
      setters.setShowAdvanced(false);
    } else {
      setters.setProvider('gitlab');
      setters.setUrl('');
      setters.setName('');
      setters.setApiBaseUrl('');
      setters.setProjectId('');
      setters.setSelectedBranches(new Set<string>(['main']));
      setters.setAvailableBranches([]);
      setters.setGlobalTokenKey('');
      setters.setSelectedComponent('');
      setters.setCacheTtlMin(5);
      setters.setEnabled(true);
      setters.setShowAdvanced(false);
      setters.setInlineToken('');
    }
    // Intentionally depend only on identity/open state to reset form
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, isOpen]);
};
