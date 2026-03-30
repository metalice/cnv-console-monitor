import type { Repository } from '@cnv-monitor/shared';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createRepositoryApi, updateRepositoryApi } from '../../api/repositories';

import { deriveDisplayName } from './repositoryUrlUtils';

const INVALIDATION_DELAY_MS = 5000;

type MutationParams = {
  effectiveApiUrl: string;
  effectiveTokenKey: string;
  selectedBranches: Set<string>;
  cacheTtlMin: number;
  selectedComponent: string;
  enabled: boolean;
  name: string;
  projectId: string;
  provider: string;
  url: string;
  inlineToken: string;
  existing?: Repository;
};

export const useRepositoryMutation = (params: MutationParams) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const data: Record<string, unknown> = {
        apiBaseUrl: params.effectiveApiUrl,
        branches: [...params.selectedBranches],
        cacheTtlMin: params.cacheTtlMin,
        components: params.selectedComponent ? [params.selectedComponent] : [],
        docPaths: [],
        enabled: params.enabled,
        globalTokenKey: params.effectiveTokenKey,
        name: params.name || deriveDisplayName(params.url),
        projectId: params.projectId,
        provider: params.provider,
        testPaths: [],
        url: params.url,
      };
      if (params.inlineToken && !params.existing) {
        data.token = params.inlineToken;
      }
      return params.existing
        ? updateRepositoryApi(params.existing.id, data)
        : createRepositoryApi(data as Parameters<typeof createRepositoryApi>[0]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['repositories'] });
      void queryClient.invalidateQueries({ queryKey: ['testExplorerTree'] });
      void queryClient.invalidateQueries({ queryKey: ['testExplorerStats'] });
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ['testExplorerTree'] });
        void queryClient.invalidateQueries({ queryKey: ['testExplorerStats'] });
      }, INVALIDATION_DELAY_MS);
    },
  });
};
