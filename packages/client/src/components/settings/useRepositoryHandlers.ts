import { type Dispatch, type SetStateAction, useCallback } from 'react';

import type { Repository, RepositoryProvider } from '@cnv-monitor/shared';

import {
  cleanRepoUrl,
  deriveApiUrl,
  deriveDisplayName,
  deriveProjectId,
} from './repositoryUrlUtils';
import type { useRepositoryResolve } from './useRepositoryResolve';

type HandlerDeps = {
  provider: RepositoryProvider;
  url: string;
  name: string;
  inlineToken: string;
  selectedBranches: Set<string>;
  existing?: Repository;
  setProvider: Dispatch<SetStateAction<RepositoryProvider>>;
  setUrl: Dispatch<SetStateAction<string>>;
  setName: Dispatch<SetStateAction<string>>;
  setApiBaseUrl: Dispatch<SetStateAction<string>>;
  setProjectId: Dispatch<SetStateAction<string>>;
  setGlobalTokenKey: Dispatch<SetStateAction<string>>;
  resolve: ReturnType<typeof useRepositoryResolve>;
};

export const useRepositoryHandlers = (deps: HandlerDeps) => {
  const handleProviderChange = useCallback(
    (_e: React.FormEvent, val: string) => {
      const prov = val as RepositoryProvider;
      deps.setProvider(prov);
      if (!deps.existing) {
        deps.setGlobalTokenKey(`${prov}.token`);
        if (deps.url) {
          deps.setApiBaseUrl(deriveApiUrl(prov, deps.url));
          if (prov === 'github') {
            deps.setProjectId(deriveProjectId(prov, deps.url));
          }
        } else if (prov === 'github') {
          deps.setApiBaseUrl('https://api.github.com');
        } else {
          deps.setApiBaseUrl('');
        }
      }
    },
    [deps],
  );

  const handleUrlChange = useCallback(
    (_e: React.FormEvent, val: string) => {
      const { repoRoot } = cleanRepoUrl(val);
      deps.setUrl(repoRoot);
      deps.resolve.setResolveError('');
      if (!deps.existing && repoRoot) {
        const derived = deriveApiUrl(deps.provider, repoRoot);
        if (derived) {
          deps.setApiBaseUrl(derived);
        }
        const derivedName = deriveDisplayName(repoRoot);
        if (derivedName && !deps.name) {
          deps.setName(derivedName);
        }
        if (deps.provider === 'github') {
          const derivedProject = deriveProjectId(deps.provider, repoRoot);
          if (derivedProject) {
            deps.setProjectId(derivedProject);
          }
          if (derivedProject && derived) {
            deps.resolve.loadBranches(
              derived,
              derivedProject,
              deps.provider,
              deps.selectedBranches,
            );
          }
        }
        if (deps.provider === 'gitlab' && derived) {
          deps.resolve.resolveGitLabProject(derived, val, deps.inlineToken || undefined);
        }
      }
    },
    [deps],
  );

  const handleTokenConnect = useCallback(
    () =>
      deps.resolve.handleTokenConnect(
        deps.url,
        deps.provider,
        deps.inlineToken,
        deps.selectedBranches,
      ),
    [deps],
  );

  return { handleProviderChange, handleTokenConnect, handleUrlChange } as const;
};
