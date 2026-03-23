import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardBody,
  CardTitle,
  Button,
  TextInput,
  Label,
  Spinner,
  Alert,
  Flex,
  FlexItem,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  InputGroup,
  InputGroupItem,
} from '@patternfly/react-core';
import { CheckCircleIcon, TimesCircleIcon, KeyIcon, TrashIcon } from '@patternfly/react-icons';
import type { UserTokenInfo } from '@cnv-monitor/shared';
import { fetchUserTokens, saveUserTokenApi, deleteUserTokenApi, testUserTokenApi } from '../../api/userTokens';

const providerLabels: Record<string, string> = {
  gitlab: 'GitLab Access Token',
  github: 'GitHub Access Token',
  jira: 'Jira API Token',
};

export const PersonalTokensSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [tokenInputs, setTokenInputs] = useState<Record<string, string>>({});

  const { data: tokens, isLoading } = useQuery({
    queryKey: ['userTokens'],
    queryFn: fetchUserTokens,
  });

  const saveMutation = useMutation({
    mutationFn: ({ provider, token }: { provider: string; token: string }) => saveUserTokenApi(provider, token),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['userTokens'] });
      setTokenInputs(prev => ({ ...prev, [vars.provider]: '' }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (provider: string) => deleteUserTokenApi(provider),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userTokens'] }),
  });

  const testMutation = useMutation({
    mutationFn: (provider: string) => testUserTokenApi(provider),
  });

  if (isLoading) return <Spinner />;

  return (
    <Card>
      <CardTitle>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <KeyIcon />
          <span>Your Personal Tokens</span>
        </Flex>
      </CardTitle>
      <CardBody>
        <p className="app-mb-md">Used for creating PRs and Jira tickets when quarantining tests. Write access required. Actions are attributed to you.</p>

        {saveMutation.isError && <Alert variant="danger" isInline title="Save failed" className="app-mb-md">{(saveMutation.error as Error).message}</Alert>}

        <DescriptionList isHorizontal>
          {(tokens || []).map((t: UserTokenInfo) => (
            <DescriptionListGroup key={t.provider}>
              <DescriptionListTerm>{providerLabels[t.provider] || t.provider}</DescriptionListTerm>
              <DescriptionListDescription>
                <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                  {t.isConfigured ? (
                    <>
                      <FlexItem>
                        <Label
                          color={t.isValid ? 'green' : 'red'}
                          icon={t.isValid ? <CheckCircleIcon /> : <TimesCircleIcon />}
                        >
                          {t.isValid ? (t.providerUsername || 'Valid') : 'Invalid'}
                        </Label>
                      </FlexItem>
                      <FlexItem>
                        <Button variant="secondary" size="sm" onClick={() => testMutation.mutate(t.provider)} isLoading={testMutation.isPending}>Test</Button>
                      </FlexItem>
                      <FlexItem>
                        <Button variant="plain" size="sm" icon={<TrashIcon />} onClick={() => deleteMutation.mutate(t.provider)} />
                      </FlexItem>
                    </>
                  ) : (
                    <FlexItem grow={{ default: 'grow' }}>
                      <InputGroup>
                        <InputGroupItem isFill>
                          <TextInput
                            type="password"
                            value={tokenInputs[t.provider] || ''}
                            onChange={(_e, val) => setTokenInputs(prev => ({ ...prev, [t.provider]: val }))}
                            placeholder={`Enter ${providerLabels[t.provider] || t.provider} token`}
                          />
                        </InputGroupItem>
                        <InputGroupItem>
                          <Button
                            variant="control"
                            onClick={() => saveMutation.mutate({ provider: t.provider, token: tokenInputs[t.provider] || '' })}
                            isDisabled={!tokenInputs[t.provider] || saveMutation.isPending}
                            isLoading={saveMutation.isPending}
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
          <Alert variant="success" isInline title="Token valid" className="app-mt-md">
            Connected as {String((testMutation.data as Record<string, unknown>).username)}
          </Alert>
        )}
      </CardBody>
    </Card>
  );
};
