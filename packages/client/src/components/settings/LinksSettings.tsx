import React from 'react';

import { Content, Form, FormGroup, TextInput } from '@patternfly/react-core';

import type { SettingsSectionProps } from './types';

export const LinksSettings: React.FC<SettingsSectionProps> = ({ adminOnly, set, val }) => (
  <>
    <Content className="app-text-muted app-mb-md" component="small">
      External URLs used in email/Slack notifications and Polarion test case links.
    </Content>
    <Form>
      <FormGroup fieldId="dashboard-url" label="Dashboard URL">
        <TextInput
          id="dashboard-url"
          isDisabled={adminOnly}
          placeholder="https://your-dashboard.example.com"
          value={val('dashboard.url')}
          onChange={(_e, v) => set('dashboard.url', v)}
        />
      </FormGroup>
      <FormGroup fieldId="polarion-url" label="Polarion URL">
        <TextInput
          id="polarion-url"
          isDisabled={adminOnly}
          placeholder="https://polarion.example.com/..."
          value={val('polarion.url')}
          onChange={(_e, v) => set('polarion.url', v)}
        />
      </FormGroup>
    </Form>
  </>
);
