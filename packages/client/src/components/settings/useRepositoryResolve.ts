import { type Dispatch, type SetStateAction, useCallback, useState } from 'react';

import { apiFetch } from '../../api/client';

import { deriveApiUrl, deriveProjectId } from './repositoryUrlUtils';

type ResolveProjectResult = { projectId: string; name: string; defaultBranch: string };

type ResolveSetters = {
  setProjectId: Dispatch<SetStateAction<string>>;
  setName: Dispatch<SetStateAction<string>>;
  setSelectedBranches: Dispatch<SetStateAction<Set<string>>>;
  setAvailableBranches: Dispatch<SetStateAction<string[]>>;
  name: string;
};

export const useRepositoryResolve = (setters: ResolveSetters) => {
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const [needsToken, setNeedsToken] = useState(false);

  const loadBranches = useCallback(
    (api: string, project: string, prov: string, selectedBranches: Set<string>, token?: string) => {
      if (!api || !project) {
        return;
      }
      setBranchesLoading(true);
      const body: Record<string, string> = { apiBaseUrl: api, projectId: project, provider: prov };
      if (token) {
        body.token = token;
      }
      void apiFetch<{ branches: string[] }>('/repositories/resolve-branches', {
        body: JSON.stringify(body),
        method: 'POST',
      })
        .then(result => {
          setters.setAvailableBranches(result.branches);
          setNeedsToken(false);
          if (
            selectedBranches.size === 0 ||
            (selectedBranches.size === 1 && selectedBranches.has('main'))
          ) {
            const defaultBranch = result.branches.includes('main') ? 'main' : result.branches[0];
            if (defaultBranch) {
              setters.setSelectedBranches(new Set<string>([defaultBranch]));
            }
          }
          return undefined;
        })
        .catch(() => {
          setNeedsToken(true);
        })
        .finally(() => setBranchesLoading(false));
    },
    [setters],
  );

  const resolveGitLabProject = useCallback(
    (derived: string, repoUrl: string, token?: string) => {
      setResolving(true);
      const resolveBody: Record<string, string> = {
        apiBaseUrl: derived,
        provider: 'gitlab',
        repoUrl,
      };
      if (token) {
        resolveBody.token = token;
      }
      void apiFetch<ResolveProjectResult>('/repositories/resolve-project', {
        body: JSON.stringify(resolveBody),
        method: 'POST',
      })
        .then(result => {
          setters.setProjectId(result.projectId);
          if (!setters.name && result.name) {
            setters.setName(result.name);
          }
          if (result.defaultBranch) {
            setters.setSelectedBranches(new Set<string>([result.defaultBranch]));
          }
          setResolveError('');
          setNeedsToken(false);
          return result;
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : 'Could not resolve project';
          if (msg.includes('token') || msg.includes('Token')) {
            setNeedsToken(true);
            setResolveError('');
          } else {
            setResolveError(msg);
          }
        })
        .finally(() => setResolving(false));
    },
    [setters],
  );

  const handleTokenConnect = useCallback(
    (url: string, provider: string, inlineToken: string, selectedBranches: Set<string>) => {
      if (!url) {
        return;
      }
      const derived = deriveApiUrl(provider, url);
      if (provider === 'gitlab' && derived) {
        resolveGitLabProject(derived, url, inlineToken);
      } else if (provider === 'github') {
        const proj = deriveProjectId(provider, url);
        if (proj && derived) {
          setters.setProjectId(proj);
          setNeedsToken(false);
          loadBranches(derived, proj, provider, selectedBranches, inlineToken);
        }
      }
    },
    [resolveGitLabProject, loadBranches, setters],
  );

  return {
    branchesLoading,
    handleTokenConnect,
    loadBranches,
    needsToken,
    resolveError,
    resolveGitLabProject,
    resolving,
    setResolveError,
  } as const;
};
