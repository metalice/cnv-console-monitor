import { useState } from 'react';

import type { UserTokenInfo } from '@cnv-monitor/shared';

import {
  Alert,
  Button,
  Card,
  CardBody,
  CardTitle,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Spinner,
} from '@patternfly/react-core';
import { KeyIcon, SyncAltIcon } from '@patternfly/react-icons';
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

type TestState = {
  error?: string;
  provider: string;
  status: 'idle' | 'testing' | 'success' | 'error';
  username?: string;
};

export const PersonalTokensSection = () => {
  const queryClient = useQueryClient();
  const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({});
  const [testStates, setTestStates] = useState(new Map<string, TestState>());

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
      setTestStates(prev =>
        new Map(prev).set(vars.provider, { provider: vars.provider, status: 'idle' }),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (provider: string) => deleteUserTokenApi(provider),
    onSuccess: (_data, provider) => {
      void queryClient.invalidateQueries({ queryKey: ['userTokens'] });
      setTestStates(prev => new Map(prev).set(provider, { provider, status: 'idle' }));
    },
  });

  const handleTest = async (provider: string) => {
    setTestStates(prev => new Map(prev).set(provider, { provider, status: 'testing' }));
    try {
      const data = await testUserTokenApi(provider);
      setTestStates(prev =>
        new Map(prev).set(provider, {
          provider,
          status: 'success',
          username: data.username ?? data.email ?? 'unknown user',
        }),
      );
    } catch (err) {
      setTestStates(prev =>
        new Map(prev).set(provider, {
          error: err instanceof Error ? err.message : 'Test failed',
          provider,
          status: 'error',
        }),
      );
    }
  };

  const handleTestAll = async () => {
    const configured = (tokens ?? []).filter(tok => tok.isConfigured);
    await Promise.allSettled(configured.map(tok => handleTest(tok.provider)));
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <Card>
      <CardTitle>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsSm' }}
            >
              <KeyIcon />
              <span>Your Personal Tokens</span>
            </Flex>
          </FlexItem>
          <FlexItem align={{ default: 'alignRight' }}>
            <Button
              icon={<SyncAltIcon />}
              size="sm"
              variant="link"
              onClick={() => handleTestAll().catch(Boolean)}
            >
              Test All
            </Button>
          </FlexItem>
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
          {(tokens ?? []).map((tokenInfo: UserTokenInfo) => {
            const testState = testStates.get(tokenInfo.provider);
            return (
              <DescriptionListGroup key={tokenInfo.provider}>
                <DescriptionListTerm>
                  {providerLabels[tokenInfo.provider] ?? tokenInfo.provider}
                </DescriptionListTerm>
                <DescriptionListDescription>
                  <TokenRow
                    inputValue={tokenInputs[tokenInfo.provider] ?? ''}
                    isSaving={saveMutation.isPending}
                    isTesting={testState?.status === 'testing'}
                    providerLabel={providerLabels[tokenInfo.provider] ?? tokenInfo.provider}
                    testResult={testState}
                    tokenInfo={tokenInfo}
                    onDelete={() => deleteMutation.mutate(tokenInfo.provider)}
                    onInputChange={val =>
                      setTokenInputs(prev => ({ ...prev, [tokenInfo.provider]: val }))
                    }
                    onSave={() =>
                      saveMutation.mutate({
                        provider: tokenInfo.provider,
                        token: tokenInputs[tokenInfo.provider] ?? '',
                      })
                    }
                    onTest={() => handleTest(tokenInfo.provider).catch(Boolean)}
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
            );
          })}
        </DescriptionList>
      </CardBody>
    </Card>
  );
};
