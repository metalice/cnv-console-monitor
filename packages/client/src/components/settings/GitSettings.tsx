import React from 'react';
import {
  Form, FormGroup, TextInput, Content,
  Flex, FlexItem, Button, Alert,
} from '@patternfly/react-core';
import { useMutation } from '@tanstack/react-query';
import { testGitLabConnection, testGitHubConnection } from '../../api/settings';
import type { SettingsSectionProps, TokenEditHandlers, AlertMessage } from './types';

type GitSettingsProps = SettingsSectionProps & TokenEditHandlers;

export const GitSettings: React.FC<GitSettingsProps> = ({
  val, set, adminOnly, tokenEditing, startTokenEdit, endTokenEdit,
}) => {
  const [gitlabMsg, setGitlabMsg] = React.useState<AlertMessage | null>(null);
  const [githubMsg, setGithubMsg] = React.useState<AlertMessage | null>(null);

  const gitlabTest = useMutation({
    mutationFn: () => testGitLabConnection({ token: val('gitlab.token') }),
    onSuccess: (result) => setGitlabMsg({ type: result.success ? 'success' : 'danger', text: result.message }),
    onError: (error) => setGitlabMsg({ type: 'danger', text: error instanceof Error ? error.message : 'Connection failed' }),
  });

  const githubTest = useMutation({
    mutationFn: () => testGitHubConnection({ token: val('github.token') }),
    onSuccess: (result) => setGithubMsg({ type: result.success ? 'success' : 'danger', text: result.message }),
    onError: (error) => setGithubMsg({ type: 'danger', text: error instanceof Error ? error.message : 'Connection failed' }),
  });

  return (
    <>
      <Content component="small" className="app-text-muted app-mb-md">
        Read-only access tokens for syncing repository trees in the Test Explorer. These are shared across all users.
      </Content>
      <Form>
        <FormGroup label="GitLab Access Token" fieldId="gitlab-token">
          <Flex alignItems={{ default: 'alignItemsFlexEnd' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem className="app-flex-1">
              <TextInput
                id="gitlab-token"
                type={tokenEditing['gitlab.token'] ? 'text' : 'password'}
                value={val('gitlab.token')}
                onFocus={() => startTokenEdit('gitlab.token')}
                onBlur={() => endTokenEdit('gitlab.token')}
                onChange={(_e, v) => { set('gitlab.token', v); setGitlabMsg(null); }}
                placeholder="GitLab token with read_api scope"
                isDisabled={adminOnly}
              />
            </FlexItem>
            <FlexItem>
              <Button variant="secondary" size="sm" onClick={() => gitlabTest.mutate()} isLoading={gitlabTest.isPending} isDisabled={adminOnly || !val('gitlab.token')}>Test Connection</Button>
            </FlexItem>
          </Flex>
          {gitlabMsg && <Alert variant={gitlabMsg.type} isInline isPlain title={gitlabMsg.text} className="app-mt-sm" />}
          <Content component="small" className="app-text-muted app-mt-xs">
            Used to sync repository trees from GitLab. Needs at least <strong>read_api</strong> scope.
          </Content>
        </FormGroup>
        <FormGroup label="GitHub Access Token" fieldId="github-token">
          <Flex alignItems={{ default: 'alignItemsFlexEnd' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem className="app-flex-1">
              <TextInput
                id="github-token"
                type={tokenEditing['github.token'] ? 'text' : 'password'}
                value={val('github.token')}
                onFocus={() => startTokenEdit('github.token')}
                onBlur={() => endTokenEdit('github.token')}
                onChange={(_e, v) => { set('github.token', v); setGithubMsg(null); }}
                placeholder="GitHub token with repo read access"
                isDisabled={adminOnly}
              />
            </FlexItem>
            <FlexItem>
              <Button variant="secondary" size="sm" onClick={() => githubTest.mutate()} isLoading={githubTest.isPending} isDisabled={adminOnly || !val('github.token')}>Test Connection</Button>
            </FlexItem>
          </Flex>
          {githubMsg && <Alert variant={githubMsg.type} isInline isPlain title={githubMsg.text} className="app-mt-sm" />}
          <Content component="small" className="app-text-muted app-mt-xs">
            Used to sync repository trees from GitHub. Fine-grained token with <strong>Contents: read</strong> permission.
          </Content>
        </FormGroup>
      </Form>
    </>
  );
};
