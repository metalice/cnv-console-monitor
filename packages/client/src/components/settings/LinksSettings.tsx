import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  TextInput,
  Content,
} from '@patternfly/react-core';
import type { SettingsSectionProps } from './types';

export const LinksSettings: React.FC<SettingsSectionProps> = ({
  val,
  set,
  sourceLabel,
  adminOnly,
}) => (
  <Card>
    <CardTitle>Links</CardTitle>
    <CardBody>
      <Content component="small" className="app-text-muted app-mb-md">
        External URLs used in email/Slack notifications and Polarion test case links.
      </Content>
      <Form>
        <FormGroup label={<>Dashboard URL {sourceLabel('dashboard.url')}</>} fieldId="dashboard-url">
          <TextInput id="dashboard-url" value={val('dashboard.url')} onChange={(_e, inputValue) => set('dashboard.url', inputValue)} placeholder="https://your-dashboard.example.com" isDisabled={adminOnly} />
        </FormGroup>
        <FormGroup label={<>Polarion URL {sourceLabel('polarion.url')}</>} fieldId="polarion-url">
          <TextInput id="polarion-url" value={val('polarion.url')} onChange={(_e, inputValue) => set('polarion.url', inputValue)} placeholder="https://polarion.example.com/..." isDisabled={adminOnly} />
        </FormGroup>
      </Form>
    </CardBody>
  </Card>
);
