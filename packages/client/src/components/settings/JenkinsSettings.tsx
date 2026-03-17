import React from 'react';
import {
  Form, FormGroup, TextInput, Content,
  Flex, FlexItem, Button, Alert,
} from '@patternfly/react-core';
import { useMutation } from '@tanstack/react-query';
import { testJenkinsConnection } from '../../api/settings';
import type { SettingsSectionProps, TokenEditHandlers, AlertMessage } from './types';

type JenkinsSettingsProps = SettingsSectionProps & TokenEditHandlers;

export const JenkinsSettings: React.FC<JenkinsSettingsProps> = ({
  val, set, adminOnly, tokenEditing, startTokenEdit, endTokenEdit,
}) => {
  const [testMsg, setTestMsg] = React.useState<AlertMessage | null>(null);

  const testMutation = useMutation({
    mutationFn: () => testJenkinsConnection({ user: val('jenkins.user'), token: val('jenkins.token') }),
    onSuccess: (result) => setTestMsg({ type: 'success', text: result.message }),
    onError: (error) => setTestMsg({ type: 'danger', text: error instanceof Error ? error.message : 'Connection failed' }),
  });

  return (
    <>
      <Content component="small" className="app-text-muted app-mb-md">
        Jenkins credentials for fetching build metadata. Go to Jenkins &gt; Profile &gt; Configure &gt; API Token to generate one.
      </Content>
      <Form>
        <FormGroup label="Username" fieldId="jenkins-user">
          <TextInput id="jenkins-user" value={val('jenkins.user')} onChange={(_e, v) => set('jenkins.user', v)} placeholder="your-kerberos-id" isDisabled={adminOnly} />
        </FormGroup>
        <FormGroup label="API Token" fieldId="jenkins-token">
          <Flex alignItems={{ default: 'alignItemsFlexEnd' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem className="app-flex-1">
              <TextInput id="jenkins-token" type={tokenEditing['jenkins.token'] ? 'text' : 'password'} value={val('jenkins.token')}
                onFocus={() => startTokenEdit('jenkins.token')} onBlur={() => endTokenEdit('jenkins.token')}
                onChange={(_e, v) => set('jenkins.token', v)} placeholder="API token" isDisabled={adminOnly} />
            </FlexItem>
            <FlexItem>
              <Button variant="secondary" size="sm" onClick={() => testMutation.mutate()} isLoading={testMutation.isPending} isDisabled={adminOnly}>Test Connection</Button>
            </FlexItem>
          </Flex>
          {testMsg && <Alert variant={testMsg.type} isInline isPlain title={testMsg.text} className="app-mt-sm" />}
        </FormGroup>
      </Form>
    </>
  );
};
