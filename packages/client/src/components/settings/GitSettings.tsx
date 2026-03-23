import React from 'react';
import {
  Form, FormGroup, TextInput, Content,
  Flex, FlexItem,
} from '@patternfly/react-core';
import type { SettingsSectionProps, TokenEditHandlers } from './types';

type GitSettingsProps = SettingsSectionProps & TokenEditHandlers;

export const GitSettings: React.FC<GitSettingsProps> = ({
  val, set, adminOnly, tokenEditing, startTokenEdit, endTokenEdit,
}) => {
  return (
    <>
      <Content component="small" className="app-text-muted app-mb-md">
        Read-only access tokens for syncing repository trees in the Test Explorer. These are shared across all users.
      </Content>
      <Form>
        <FormGroup label="GitLab Access Token" fieldId="gitlab-token">
          <TextInput
            id="gitlab-token"
            type={tokenEditing['gitlab.token'] ? 'text' : 'password'}
            value={val('gitlab.token')}
            onFocus={() => startTokenEdit('gitlab.token')}
            onBlur={() => endTokenEdit('gitlab.token')}
            onChange={(_e, v) => set('gitlab.token', v)}
            placeholder="GitLab token with read_api scope"
            isDisabled={adminOnly}
          />
          <Content component="small" className="app-text-muted app-mt-xs">
            Used to sync repository trees from GitLab. Needs at least <strong>read_api</strong> scope.
          </Content>
        </FormGroup>
        <FormGroup label="GitHub Access Token" fieldId="github-token">
          <TextInput
            id="github-token"
            type={tokenEditing['github.token'] ? 'text' : 'password'}
            value={val('github.token')}
            onFocus={() => startTokenEdit('github.token')}
            onBlur={() => endTokenEdit('github.token')}
            onChange={(_e, v) => set('github.token', v)}
            placeholder="GitHub token with repo read access"
            isDisabled={adminOnly}
          />
          <Content component="small" className="app-text-muted app-mt-xs">
            Used to sync repository trees from GitHub. Fine-grained token with <strong>Contents: read</strong> permission.
          </Content>
        </FormGroup>
      </Form>
    </>
  );
};
