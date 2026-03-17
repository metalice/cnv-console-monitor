import React from 'react';
import {
  Form,
  FormGroup,
  TextInput,
  Button,
  Alert,
  Flex,
  FlexItem,
  Content,
} from '@patternfly/react-core';
import { SearchableSelect, type SearchableSelectOption } from '../common/SearchableSelect';
import type { SettingsSectionProps, TokenEditHandlers, AlertMessage } from './types';

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
  val,
  set,
  adminOnly,
  tokenEditing,
  startTokenEdit,
  endTokenEdit,
  jiraProjectSelectOptions,
  issueTypeSelectOptions,
  jiraTestMsg,
  onTokenChange,
  onTestConnection,
  isTestPending,
}) => (
  <>
    <Content component="small" className="app-text-muted app-mb-md">
      Jira Cloud integration. Create an API token at id.atlassian.com &gt; Security &gt; API tokens.
    </Content>
    <Form>
      <FormGroup label="URL" fieldId="jira-url">
        <TextInput id="jira-url" value={val('jira.url')} onChange={(_e, v) => set('jira.url', v)} placeholder="https://redhat.atlassian.net" isDisabled={adminOnly} />
      </FormGroup>
      <FormGroup label="Email" fieldId="jira-email">
        <TextInput id="jira-email" value={val('jira.email')} onChange={(_e, v) => set('jira.email', v)} placeholder="you@redhat.com" isDisabled={adminOnly} />
      </FormGroup>
      <FormGroup label="API Token" fieldId="jira-token">
        <Flex alignItems={{ default: 'alignItemsFlexEnd' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem className="app-flex-1">
            <TextInput id="jira-token" type={tokenEditing['jira.token'] ? 'text' : 'password'} value={val('jira.token')}
              onFocus={() => startTokenEdit('jira.token')} onBlur={() => endTokenEdit('jira.token')}
              onChange={(_e, v) => onTokenChange(v)} placeholder="API token" isDisabled={adminOnly} />
          </FlexItem>
          <FlexItem>
            <Button variant="secondary" size="sm" onClick={onTestConnection} isLoading={isTestPending} isDisabled={adminOnly}>Test Connection</Button>
          </FlexItem>
        </Flex>
        {jiraTestMsg && <Alert variant={jiraTestMsg.type} isInline isPlain title={jiraTestMsg.text} className="app-mt-sm" />}
      </FormGroup>
      <FormGroup label="Project" fieldId="jira-project">
        <SearchableSelect id="jira-project" value={val('jira.projectKey')} options={jiraProjectSelectOptions} onChange={(v) => set('jira.projectKey', v)} placeholder="Select project" isDisabled={adminOnly} />
      </FormGroup>
      <FormGroup label="Issue Type" fieldId="jira-type">
        <SearchableSelect id="jira-type" value={val('jira.issueType')} options={issueTypeSelectOptions} onChange={(v) => set('jira.issueType', v)} placeholder="Select issue type" isDisabled={adminOnly} />
      </FormGroup>
    </Form>
  </>
);
