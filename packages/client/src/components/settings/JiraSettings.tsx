import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  TextInput,
  Button,
  Alert,
  Flex,
  FlexItem,
  Label,
  Content,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
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
  sourceLabel,
  adminOnly,
  tokenEditing,
  startTokenEdit,
  endTokenEdit,
  jiraEnabled,
  jiraProjectSelectOptions,
  issueTypeSelectOptions,
  jiraTestMsg,
  onTokenChange,
  onTestConnection,
  isTestPending,
}) => (
  <Card>
    <CardTitle>
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>Jira</FlexItem>
        <FlexItem>
          <Label color={jiraEnabled ? 'green' : 'grey'} isCompact icon={jiraEnabled ? <CheckCircleIcon /> : <ExclamationCircleIcon />}>
            {jiraEnabled ? 'Enabled' : 'Disabled'}
          </Label>
        </FlexItem>
      </Flex>
    </CardTitle>
    <CardBody>
      <Content component="small" className="app-text-muted app-mb-md">
        Jira Cloud integration. Create an API token at id.atlassian.com &gt; Security &gt; API tokens. Enter your Atlassian email and the token below.
      </Content>
      <Form>
        <FormGroup label={<>URL {sourceLabel('jira.url')}</>} fieldId="jira-url">
          <TextInput id="jira-url" value={val('jira.url')} onChange={(_e, inputValue) => set('jira.url', inputValue)} placeholder="https://redhat.atlassian.net" isDisabled={adminOnly} />
        </FormGroup>
        <FormGroup label={<>Email {sourceLabel('jira.email')}</>} fieldId="jira-email">
          <TextInput id="jira-email" value={val('jira.email')} onChange={(_e, inputValue) => set('jira.email', inputValue)} placeholder="you@redhat.com" isDisabled={adminOnly} />
        </FormGroup>
        <FormGroup label={<>API Token {sourceLabel('jira.token')}</>} fieldId="jira-token">
          <Flex alignItems={{ default: 'alignItemsFlexEnd' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem className="app-flex-1">
              <TextInput
                id="jira-token"
                type={tokenEditing['jira.token'] ? 'text' : 'password'}
                value={val('jira.token')}
                onFocus={() => startTokenEdit('jira.token')}
                onBlur={() => endTokenEdit('jira.token')}
                onChange={(_e, inputValue) => onTokenChange(inputValue)}
                placeholder="API token"
                isDisabled={adminOnly}
              />
            </FlexItem>
            <FlexItem>
              <Button variant="secondary" size="sm" onClick={onTestConnection} isLoading={isTestPending} isDisabled={adminOnly}>
                Test Connection
              </Button>
            </FlexItem>
          </Flex>
          {jiraTestMsg && <Alert variant={jiraTestMsg.type} isInline isPlain title={jiraTestMsg.text} className="app-mt-sm" />}
        </FormGroup>
        <FormGroup label={<>Project {sourceLabel('jira.projectKey')}</>} fieldId="jira-project">
          <SearchableSelect
            id="jira-project"
            value={val('jira.projectKey')}
            options={jiraProjectSelectOptions}
            onChange={(selected) => set('jira.projectKey', selected)}
            placeholder="Select project"
            isDisabled={adminOnly}
          />
        </FormGroup>
        <FormGroup label={<>Issue Type {sourceLabel('jira.issueType')}</>} fieldId="jira-type">
          <SearchableSelect
            id="jira-type"
            value={val('jira.issueType')}
            options={issueTypeSelectOptions}
            onChange={(selected) => set('jira.issueType', selected)}
            placeholder="Select issue type"
            isDisabled={adminOnly}
          />
        </FormGroup>
      </Form>
    </CardBody>
  </Card>
);
