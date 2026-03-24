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

import { SearchableSelect, type SearchableSelectOption } from '../common/SearchableSelect';

import type { AlertMessage, SettingsSectionProps, TokenEditHandlers } from './types';

type JiraSettingsProps = SettingsSectionProps &
  TokenEditHandlers & {
    jiraEnabled: boolean;
    jiraProjectSelectOptions: SearchableSelectOption[];
    issueTypeSelectOptions: SearchableSelectOption[];
    jiraTestMsg: AlertMessage | null;
    onTokenChange: (value: string) => void;
    onTestConnection: () => void;
    isTestPending: boolean;
  };

export const JiraSettings: React.FC<JiraSettingsProps> = ({
  adminOnly,
  endTokenEdit,
  issueTypeSelectOptions,
  isTestPending,
  jiraProjectSelectOptions,
  jiraTestMsg,
  onTestConnection,
  onTokenChange,
  set,
  startTokenEdit,
  tokenEditing,
  val,
}) => (
  <>
    <Content className="app-text-muted app-mb-md" component="small">
      Jira Cloud integration. Create an API token at id.atlassian.com &gt; Security &gt; API tokens.
    </Content>
    <Form>
      <FormGroup fieldId="jira-url" label="URL">
        <TextInput
          id="jira-url"
          isDisabled={adminOnly}
          placeholder="https://redhat.atlassian.net"
          value={val('jira.url')}
          onChange={(_e, v) => set('jira.url', v)}
        />
      </FormGroup>
      <FormGroup fieldId="jira-email" label="Email">
        <TextInput
          id="jira-email"
          isDisabled={adminOnly}
          placeholder="you@redhat.com"
          value={val('jira.email')}
          onChange={(_e, v) => set('jira.email', v)}
        />
      </FormGroup>
      <FormGroup fieldId="jira-token" label="API Token">
        <Flex
          alignItems={{ default: 'alignItemsFlexEnd' }}
          spaceItems={{ default: 'spaceItemsSm' }}
        >
          <FlexItem className="app-flex-1">
            <TextInput
              id="jira-token"
              isDisabled={adminOnly}
              placeholder="API token"
              type={tokenEditing['jira.token'] ? 'text' : 'password'}
              value={val('jira.token')}
              onBlur={() => endTokenEdit('jira.token')}
              onChange={(_e, v) => onTokenChange(v)}
              onFocus={() => startTokenEdit('jira.token')}
            />
          </FlexItem>
          <FlexItem>
            <Button
              isDisabled={adminOnly}
              isLoading={isTestPending}
              size="sm"
              variant="secondary"
              onClick={onTestConnection}
            >
              Test Connection
            </Button>
          </FlexItem>
        </Flex>
        {jiraTestMsg && (
          <Alert
            isInline
            isPlain
            className="app-mt-sm"
            title={jiraTestMsg.text}
            variant={jiraTestMsg.type}
          />
        )}
      </FormGroup>
      <FormGroup fieldId="jira-project" label="Project">
        <SearchableSelect
          id="jira-project"
          isDisabled={adminOnly}
          options={jiraProjectSelectOptions}
          placeholder="Select project"
          value={val('jira.projectKey')}
          onChange={v => set('jira.projectKey', v)}
        />
      </FormGroup>
      <FormGroup fieldId="jira-type" label="Issue Type">
        <SearchableSelect
          id="jira-type"
          isDisabled={adminOnly}
          options={issueTypeSelectOptions}
          placeholder="Select issue type"
          value={val('jira.issueType')}
          onChange={v => set('jira.issueType', v)}
        />
      </FormGroup>
    </Form>
  </>
);
