import React from 'react';

import {
  Alert,
  Button,
  Content,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  TextInput,
} from '@patternfly/react-core';
import { useMutation } from '@tanstack/react-query';

import { testGitHubConnection, testGitLabConnection } from '../../api/settings';

import type { AlertMessage, SettingsSectionProps, TokenEditHandlers } from './types';

type GitSettingsProps = SettingsSectionProps & TokenEditHandlers;

export const GitSettings: React.FC<GitSettingsProps> = ({
  adminOnly,
  endTokenEdit,
  set,
  startTokenEdit,
  tokenEditing,
  val,
}) => {
  const [gitlabMsg, setGitlabMsg] = React.useState<AlertMessage | null>(null);
  const [githubMsg, setGithubMsg] = React.useState<AlertMessage | null>(null);

  const gitlabTest = useMutation({
    mutationFn: () => testGitLabConnection({ token: val('gitlab.token') }),
    onError: error =>
      setGitlabMsg({
        text: error instanceof Error ? error.message : 'Connection failed',
        type: 'danger',
      }),
    onSuccess: result =>
      setGitlabMsg({ text: result.message, type: result.success ? 'success' : 'danger' }),
  });

  const githubTest = useMutation({
    mutationFn: () => testGitHubConnection({ token: val('github.token') }),
    onError: error =>
      setGithubMsg({
        text: error instanceof Error ? error.message : 'Connection failed',
        type: 'danger',
      }),
    onSuccess: result =>
      setGithubMsg({ text: result.message, type: result.success ? 'success' : 'danger' }),
  });

  return (
    <>
      <Content className="app-text-muted app-mb-md" component="small">
        Read-only access tokens for syncing repository trees in the Test Explorer. These are shared
        across all users.
      </Content>
      <Form>
        <FormGroup fieldId="gitlab-token" label="GitLab Access Token">
          <Flex
            alignItems={{ default: 'alignItemsFlexEnd' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem className="app-flex-1">
              <TextInput
                id="gitlab-token"
                isDisabled={adminOnly}
                placeholder="GitLab token with read_api scope"
                type={tokenEditing['gitlab.token'] ? 'text' : 'password'}
                value={val('gitlab.token')}
                onBlur={() => endTokenEdit('gitlab.token')}
                onChange={(_e, v) => {
                  set('gitlab.token', v);
                  setGitlabMsg(null);
                }}
                onFocus={() => startTokenEdit('gitlab.token')}
              />
            </FlexItem>
            <FlexItem>
              <Button
                isDisabled={adminOnly || !val('gitlab.token')}
                isLoading={gitlabTest.isPending}
                size="sm"
                variant="secondary"
                onClick={() => gitlabTest.mutate()}
              >
                Test Connection
              </Button>
            </FlexItem>
          </Flex>
          {gitlabMsg && (
            <Alert
              isInline
              isPlain
              className="app-mt-sm"
              title={gitlabMsg.text}
              variant={gitlabMsg.type}
            />
          )}
          <Content className="app-text-muted app-mt-xs" component="small">
            Used to sync repository trees from GitLab. Needs at least <strong>read_api</strong>{' '}
            scope.
          </Content>
        </FormGroup>
        <FormGroup fieldId="github-token" label="GitHub Access Token">
          <Flex
            alignItems={{ default: 'alignItemsFlexEnd' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem className="app-flex-1">
              <TextInput
                id="github-token"
                isDisabled={adminOnly}
                placeholder="GitHub token with repo read access"
                type={tokenEditing['github.token'] ? 'text' : 'password'}
                value={val('github.token')}
                onBlur={() => endTokenEdit('github.token')}
                onChange={(_e, v) => {
                  set('github.token', v);
                  setGithubMsg(null);
                }}
                onFocus={() => startTokenEdit('github.token')}
              />
            </FlexItem>
            <FlexItem>
              <Button
                isDisabled={adminOnly || !val('github.token')}
                isLoading={githubTest.isPending}
                size="sm"
                variant="secondary"
                onClick={() => githubTest.mutate()}
              >
                Test Connection
              </Button>
            </FlexItem>
          </Flex>
          {githubMsg && (
            <Alert
              isInline
              isPlain
              className="app-mt-sm"
              title={githubMsg.text}
              variant={githubMsg.type}
            />
          )}
          <Content className="app-text-muted app-mt-xs" component="small">
            Used to sync repository trees from GitHub. Fine-grained token with{' '}
            <strong>Contents: read</strong> permission.
          </Content>
        </FormGroup>
      </Form>
    </>
  );
};
