import React from 'react';

import { Content, Form, FormGroup, TextInput } from '@patternfly/react-core';

import type { SettingsSectionProps } from './types';

type EmailServerSettingsProps = SettingsSectionProps & {
  emailEnabled: boolean;
};

export const EmailServerSettings: React.FC<EmailServerSettingsProps> = ({
  adminOnly,
  set,
  val,
}) => (
  <>
    <Content className="app-text-muted app-mb-md" component="small">
      SMTP server for sending email notifications. For Red Hat internal, use smtp.corp.redhat.com on
      port 587.
    </Content>
    <Form>
      <FormGroup fieldId="email-host" label="SMTP Host">
        <TextInput
          id="email-host"
          isDisabled={adminOnly}
          placeholder="smtp.corp.redhat.com"
          value={val('email.host')}
          onChange={(_e, v) => set('email.host', v)}
        />
      </FormGroup>
      <FormGroup fieldId="email-port" label="SMTP Port">
        <TextInput
          id="email-port"
          isDisabled={adminOnly}
          placeholder="587"
          value={val('email.port')}
          onChange={(_e, v) => set('email.port', v)}
        />
      </FormGroup>
      <FormGroup fieldId="email-user" label="SMTP User">
        <TextInput
          id="email-user"
          isDisabled={adminOnly}
          placeholder="Optional SMTP username"
          value={val('email.user')}
          onChange={(_e, v) => set('email.user', v)}
        />
      </FormGroup>
      <FormGroup fieldId="email-pass" label="SMTP Password">
        <TextInput
          id="email-pass"
          isDisabled={adminOnly}
          placeholder="Optional SMTP password"
          type="password"
          value={val('email.pass')}
          onChange={(_e, v) => set('email.pass', v)}
        />
      </FormGroup>
      <FormGroup fieldId="email-from" label="From Address">
        <TextInput
          id="email-from"
          isDisabled={adminOnly}
          placeholder="noreply@example.com"
          value={val('email.from')}
          onChange={(_e, v) => set('email.from', v)}
        />
      </FormGroup>
    </Form>
  </>
);
