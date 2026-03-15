import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  TextInput,
  Flex,
  FlexItem,
  Label,
  Content,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import type { SettingsSectionProps } from './types';

type EmailServerSettingsProps = SettingsSectionProps & {
  emailEnabled: boolean;
};

export const EmailServerSettings: React.FC<EmailServerSettingsProps> = ({
  val,
  set,
  sourceLabel,
  adminOnly,
  emailEnabled,
}) => (
  <Card>
    <CardTitle>
      <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>Email Server</FlexItem>
        <FlexItem>
          <Label color={emailEnabled ? 'green' : 'grey'} isCompact icon={emailEnabled ? <CheckCircleIcon /> : <ExclamationCircleIcon />}>
            {emailEnabled ? 'Configured' : 'Not configured'}
          </Label>
        </FlexItem>
      </Flex>
    </CardTitle>
    <CardBody>
      <Content component="small" className="app-text-muted app-mb-md">
        SMTP server for sending email notifications. For Red Hat internal, use smtp.corp.redhat.com on port 587. Authentication is optional for internal SMTP relays.
      </Content>
      <Form>
        <FormGroup label={<>SMTP Host {sourceLabel('email.host')}</>} fieldId="email-host">
          <TextInput id="email-host" value={val('email.host')} onChange={(_e, inputValue) => set('email.host', inputValue)} placeholder="smtp.corp.redhat.com" isDisabled={adminOnly} />
        </FormGroup>
        <FormGroup label={<>SMTP User {sourceLabel('email.user')}</>} fieldId="email-user">
          <TextInput id="email-user" value={val('email.user')} onChange={(_e, inputValue) => set('email.user', inputValue)} placeholder="Optional SMTP username" isDisabled={adminOnly} />
        </FormGroup>
        <FormGroup label={<>SMTP Password {sourceLabel('email.pass')}</>} fieldId="email-pass">
          <TextInput id="email-pass" type="password" value={val('email.pass')} onChange={(_e, inputValue) => set('email.pass', inputValue)} placeholder="Optional SMTP password" isDisabled={adminOnly} />
        </FormGroup>
        <FormGroup label={<>From {sourceLabel('email.from')}</>} fieldId="email-from">
          <TextInput id="email-from" value={val('email.from')} onChange={(_e, inputValue) => set('email.from', inputValue)} isDisabled={adminOnly} />
        </FormGroup>
      </Form>
    </CardBody>
  </Card>
);
