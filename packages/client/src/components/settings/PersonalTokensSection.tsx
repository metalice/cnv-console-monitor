import { useState } from 'react';

import type { UserTokenInfo } from '@cnv-monitor/shared';

import {
  Alert,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  Spinner,
} from '@patternfly/react-core';
import { KeyIcon } from '@patternfly/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteUserTokenApi,
  fetchUserTokens,
  saveUserTokenApi,
  testUserTokenApi,
} from '../../api/userTokens';

import { TokenRow } from './TokenRow';

const providerLabels: Record<string, string> = {
  github: 'GitHub Access Token',
  gitlab: 'GitLab Access Token',
  jira: 'Jira API Token',
};

export const PersonalTokensSection = () => {
  const queryClient = useQueryClient();
  const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({});

  const { data: tokens, isLoading } = useQuery({
    queryFn: fetchUserTokens,
    queryKey: ['userTokens'],
  });

  const saveMutation = useMutation({
    mutationFn: ({ provider, token }: { provider: string; token: string }) =>
      saveUserTokenApi(provider, token),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['userTokens'] });
      setTokenInputs(prev => ({ ...prev, [vars.provider]: '' }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (provider: string) => deleteUserTokenApi(provider),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['userTokens'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (provider: string) => testUserTokenApi(provider),
  });

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <Card>
      <CardTitle>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <KeyIcon />
          <span>Your Personal Tokens</span>
        </Flex>
      </CardTitle>
      <CardBody>
        <p className="app-mb-md">
          Used for creating PRs and Jira tickets when quarantining tests. Write access required.
          Actions are attributed to you.
        </p>

        {saveMutation.isError && (
          <Alert isInline className="app-mb-md" title="Save failed" variant="danger">
            {saveMutation.error.message}
          </Alert>
        )}

        <DescriptionList isHorizontal>
          {(tokens ?? []).map((tokenInfo: UserTokenInfo) => (
            <DescriptionListGroup key={tokenInfo.provider}>
              <DescriptionListTerm>
                {providerLabels[tokenInfo.provider] || tokenInfo.provider}
              </DescriptionListTerm>
              <DescriptionListDescription>
                <TokenRow
                  inputValue={tokenInputs[tokenInfo.provider] || ''}
                  isSaving={saveMutation.isPending}
                  isTesting={testMutation.isPending}
                  providerLabel={providerLabels[tokenInfo.provider] || tokenInfo.provider}
                  tokenInfo={tokenInfo}
                  onDelete={() => deleteMutation.mutate(tokenInfo.provider)}
                  onInputChange={val =>
                    setTokenInputs(prev => ({ ...prev, [tokenInfo.provider]: val }))
                  }
                  onSave={() =>
                    saveMutation.mutate({
                      provider: tokenInfo.provider,
                      token: tokenInputs[tokenInfo.provider] || '',
                    })
                  }
                  onTest={() => testMutation.mutate(tokenInfo.provider)}
                />
              </DescriptionListDescription>
            </DescriptionListGroup>
          ))}
        </DescriptionList>

        {testMutation.isSuccess && (
          <Alert isInline className="app-mt-md" title="Token valid" variant="success">
            Connected as {String((testMutation.data as Record<string, unknown>).username)}
          </Alert>
        )}
      </CardBody>
    </Card>
  );
};
