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
import { SearchableSelect } from '../common/SearchableSelect';
import type { SettingsSectionProps, TokenEditHandlers, AlertMessage } from './types';
import { toOptions } from './types';

type ReportPortalSettingsProps = SettingsSectionProps &
  TokenEditHandlers & {
    rpProjectOptions: string[];
    rpTestMsg: AlertMessage | null;
    onTestConnection: () => void;
    isTestPending: boolean;
  };

export const ReportPortalSettings: React.FC<ReportPortalSettingsProps> = ({
  val,
  set,
  adminOnly,
  tokenEditing,
  startTokenEdit,
  endTokenEdit,
  rpProjectOptions,
  rpTestMsg,
  onTestConnection,
  isTestPending,
}) => (
  <>
    <Content component="small" className="app-text-muted app-mb-md">
      Connection to your ReportPortal instance for fetching test launches and results. Get your API token from ReportPortal &gt; User Profile &gt; API Keys.
    </Content>
    <Form>
      <FormGroup label="URL" fieldId="rp-url">
        <TextInput id="rp-url" value={val('reportportal.url')} onChange={(_e, v) => set('reportportal.url', v)} placeholder="https://reportportal.example.com" isDisabled={adminOnly} />
      </FormGroup>
      <FormGroup label="Project" fieldId="rp-project">
        <SearchableSelect id="rp-project" value={val('reportportal.project')} options={toOptions(rpProjectOptions)} onChange={(v) => set('reportportal.project', v)} placeholder="Select project" isDisabled={adminOnly} />
      </FormGroup>
      <FormGroup label="Token" fieldId="rp-token">
        <Flex alignItems={{ default: 'alignItemsFlexEnd' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem className="app-flex-1">
            <TextInput id="rp-token" type={tokenEditing['reportportal.token'] ? 'text' : 'password'} value={val('reportportal.token')}
              onFocus={() => startTokenEdit('reportportal.token')} onBlur={() => endTokenEdit('reportportal.token')}
              onChange={(_e, v) => set('reportportal.token', v)} placeholder="Bearer token" isDisabled={adminOnly} />
          </FlexItem>
          <FlexItem>
            <Button variant="secondary" size="sm" onClick={onTestConnection} isLoading={isTestPending} isDisabled={adminOnly}>Test Connection</Button>
          </FlexItem>
        </Flex>
        {rpTestMsg && <Alert variant={rpTestMsg.type} isInline isPlain title={rpTestMsg.text} className="app-mt-sm" />}
      </FormGroup>
    </Form>
  </>
);
