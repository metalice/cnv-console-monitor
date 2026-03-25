import React, { useState } from 'react';

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
  InputGroup,
  InputGroupItem,
  Label,
  Spinner,
  TextInput,
} from '@patternfly/react-core';
import { CheckCircleIcon, KeyIcon, TimesCircleIcon, TrashIcon } from '@patternfly/react-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  deleteUserTokenApi,
  fetchUserTokens,
  saveUserTokenApi,
  testUserTokenApi,
} from '../../api/userTokens';

const providerLabels: Record<string, string> = {
  github: 'GitHub Access Token',
  gitlab: 'GitLab Access Token',
  jira: 'Jira API Token',
};

export const PersonalTokensSection: React.FC = () => {
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
                <Flex
                  alignItems={{ default: 'alignItemsCenter' }}
                  spaceItems={{ default: 'spaceItemsSm' }}
                >
                  {tokenInfo.isConfigured ? (
                    <>
                      <FlexItem>
                        <Label
                          color={tokenInfo.isValid ? 'green' : 'red'}
                          icon={tokenInfo.isValid ? <CheckCircleIcon /> : <TimesCircleIcon />}
                        >
                          {tokenInfo.isValid ? tokenInfo.providerUsername || 'Valid' : 'Invalid'}
                        </Label>
                      </FlexItem>
                      <FlexItem>
                        <Button
                          isLoading={testMutation.isPending}
                          size="sm"
                          variant="secondary"
                          onClick={() => testMutation.mutate(tokenInfo.provider)}
                        >
                          Test
                        </Button>
                      </FlexItem>
                      <FlexItem>
                        <Button
                          icon={<TrashIcon />}
                          size="sm"
                          variant="plain"
                          onClick={() => deleteMutation.mutate(tokenInfo.provider)}
                        />
                      </FlexItem>
                    </>
                  ) : (
                    <FlexItem grow={{ default: 'grow' }}>
                      <InputGroup>
                        <InputGroupItem isFill>
                          <TextInput
                            placeholder={`Enter ${providerLabels[tokenInfo.provider] || tokenInfo.provider} token`}
                            type="password"
                            value={tokenInputs[tokenInfo.provider] || ''}
                            onChange={(_e, val) =>
                              setTokenInputs(prev => ({ ...prev, [tokenInfo.provider]: val }))
                            }
                          />
                        </InputGroupItem>
                        <InputGroupItem>
                          <Button
                            isDisabled={!tokenInputs[tokenInfo.provider] || saveMutation.isPending}
                            isLoading={saveMutation.isPending}
                            variant="control"
                            onClick={() =>
                              saveMutation.mutate({
                                provider: tokenInfo.provider,
                                token: tokenInputs[tokenInfo.provider] || '',
                              })
                            }
                          >
                            Save
                          </Button>
                        </InputGroupItem>
                      </InputGroup>
                    </FlexItem>
                  )}
                </Flex>
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
