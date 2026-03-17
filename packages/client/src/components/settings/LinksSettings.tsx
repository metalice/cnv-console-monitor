import React from 'react';
import {
  Form,
  FormGroup,
  TextInput,
  Content,
} from '@patternfly/react-core';
import type { SettingsSectionProps } from './types';

export const LinksSettings: React.FC<SettingsSectionProps> = ({
  val,
  set,
  adminOnly,
}) => (
  <>
    <Content component="small" className="app-text-muted app-mb-md">
      External URLs used in email/Slack notifications and Polarion test case links.
    </Content>
    <Form>
      <FormGroup label="Dashboard URL" fieldId="dashboard-url">
        <TextInput id="dashboard-url" value={val('dashboard.url')} onChange={(_e, v) => set('dashboard.url', v)} placeholder="https://your-dashboard.example.com" isDisabled={adminOnly} />
      </FormGroup>
      <FormGroup label="Polarion URL" fieldId="polarion-url">
        <TextInput id="polarion-url" value={val('polarion.url')} onChange={(_e, v) => set('polarion.url', v)} placeholder="https://polarion.example.com/..." isDisabled={adminOnly} />
      </FormGroup>
    </Form>
  </>
);
