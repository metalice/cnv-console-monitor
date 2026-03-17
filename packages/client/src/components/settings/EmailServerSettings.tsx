import React from 'react';
import {
  Form,
  FormGroup,
  TextInput,
  Content,
} from '@patternfly/react-core';
import type { SettingsSectionProps } from './types';

type EmailServerSettingsProps = SettingsSectionProps & {
  emailEnabled: boolean;
};

export const EmailServerSettings: React.FC<EmailServerSettingsProps> = ({
  val,
  set,
  adminOnly,
}) => (
  <>
    <Content component="small" className="app-text-muted app-mb-md">
      SMTP server for sending email notifications. For Red Hat internal, use smtp.corp.redhat.com on port 587.
    </Content>
    <Form>
      <FormGroup label="SMTP Host" fieldId="email-host">
        <TextInput id="email-host" value={val('email.host')} onChange={(_e, v) => set('email.host', v)} placeholder="smtp.corp.redhat.com" isDisabled={adminOnly} />
      </FormGroup>
      <FormGroup label="SMTP Port" fieldId="email-port">
        <TextInput id="email-port" value={val('email.port')} onChange={(_e, v) => set('email.port', v)} placeholder="587" isDisabled={adminOnly} />
      </FormGroup>
      <FormGroup label="SMTP User" fieldId="email-user">
        <TextInput id="email-user" value={val('email.user')} onChange={(_e, v) => set('email.user', v)} placeholder="Optional SMTP username" isDisabled={adminOnly} />
      </FormGroup>
      <FormGroup label="SMTP Password" fieldId="email-pass">
        <TextInput id="email-pass" type="password" value={val('email.pass')} onChange={(_e, v) => set('email.pass', v)} placeholder="Optional SMTP password" isDisabled={adminOnly} />
      </FormGroup>
      <FormGroup label="From Address" fieldId="email-from">
        <TextInput id="email-from" value={val('email.from')} onChange={(_e, v) => set('email.from', v)} placeholder="noreply@example.com" isDisabled={adminOnly} />
      </FormGroup>
    </Form>
  </>
);
