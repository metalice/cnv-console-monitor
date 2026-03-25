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

import { testJenkinsConnection } from '../../api/settings';

import type { AlertMessage, SettingsSectionProps, TokenEditHandlers } from './types';

type JenkinsSettingsProps = SettingsSectionProps & TokenEditHandlers;

export const JenkinsSettings: React.FC<JenkinsSettingsProps> = ({
  adminOnly,
  endTokenEdit,
  set,
  startTokenEdit,
  tokenEditing,
  val,
}) => {
  const [testMsg, setTestMsg] = React.useState<AlertMessage | null>(null);

  const testMutation = useMutation({
    mutationFn: () =>
      testJenkinsConnection({ token: val('jenkins.token'), user: val('jenkins.user') }),
    onError: error =>
      setTestMsg({
        text: error instanceof Error ? error.message : 'Connection failed',
        type: 'danger',
      }),
    onSuccess: result => setTestMsg({ text: result.message, type: 'success' }),
  });

  return (
    <>
      <Content className="app-text-muted app-mb-md" component="small">
        Jenkins credentials for fetching build metadata. Go to Jenkins &gt; Profile &gt; Configure
        &gt; API Token to generate one.
      </Content>
      <Form>
        <FormGroup fieldId="jenkins-user" label="Username">
          <TextInput
            id="jenkins-user"
            isDisabled={adminOnly}
            placeholder="your-kerberos-id"
            value={val('jenkins.user')}
            onChange={(_e, value) => set('jenkins.user', value)}
          />
        </FormGroup>
        <FormGroup fieldId="jenkins-token" label="API Token">
          <Flex
            alignItems={{ default: 'alignItemsFlexEnd' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem className="app-flex-1">
              <TextInput
                id="jenkins-token"
                isDisabled={adminOnly}
                placeholder="API token"
                type={tokenEditing['jenkins.token'] ? 'text' : 'password'}
                value={val('jenkins.token')}
                onBlur={() => endTokenEdit('jenkins.token')}
                onChange={(_e, value) => set('jenkins.token', value)}
                onFocus={() => startTokenEdit('jenkins.token')}
              />
            </FlexItem>
            <FlexItem>
              <Button
                isDisabled={adminOnly}
                isLoading={testMutation.isPending}
                size="sm"
                variant="secondary"
                onClick={() => testMutation.mutate()}
              >
                Test Connection
              </Button>
            </FlexItem>
          </Flex>
          {testMsg && (
            <Alert
              isInline
              isPlain
              className="app-mt-sm"
              title={testMsg.text}
              variant={testMsg.type}
            />
          )}
        </FormGroup>
      </Form>
    </>
  );
};
