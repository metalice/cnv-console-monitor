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

import { SearchableSelect } from '../common/SearchableSelect';

import type { AlertMessage, SettingsSectionProps, TokenEditHandlers } from './types';
import { toOptions } from './types';

type ReportPortalSettingsProps = SettingsSectionProps &
  TokenEditHandlers & {
    rpProjectOptions: string[];
    rpTestMsg: AlertMessage | null;
    onTestConnection: () => void;
    isTestPending: boolean;
  };

export const ReportPortalSettings: React.FC<ReportPortalSettingsProps> = ({
  adminOnly,
  endTokenEdit,
  isTestPending,
  onTestConnection,
  rpProjectOptions,
  rpTestMsg,
  set,
  startTokenEdit,
  tokenEditing,
  val,
}) => (
  <>
    <Content className="app-text-muted app-mb-md" component="small">
      Connection to your ReportPortal instance for fetching test launches and results. Get your API
      token from ReportPortal &gt; User Profile &gt; API Keys.
    </Content>
    <Form>
      <FormGroup fieldId="rp-url" label="URL">
        <TextInput
          id="rp-url"
          isDisabled={adminOnly}
          placeholder="https://reportportal.example.com"
          value={val('reportportal.url')}
          onChange={(_e, value) => set('reportportal.url', value)}
        />
      </FormGroup>
      <FormGroup fieldId="rp-project" label="Project">
        <SearchableSelect
          id="rp-project"
          isDisabled={adminOnly}
          options={toOptions(rpProjectOptions)}
          placeholder="Select project"
          value={val('reportportal.project')}
          onChange={value => set('reportportal.project', value)}
        />
      </FormGroup>
      <FormGroup fieldId="rp-token" label="Token">
        <Flex
          alignItems={{ default: 'alignItemsFlexEnd' }}
          spaceItems={{ default: 'spaceItemsSm' }}
        >
          <FlexItem className="app-flex-1">
            <TextInput
              id="rp-token"
              isDisabled={adminOnly}
              placeholder="Bearer token"
              type={tokenEditing['reportportal.token'] ? 'text' : 'password'}
              value={val('reportportal.token')}
              onBlur={() => endTokenEdit('reportportal.token')}
              onChange={(_e, value) => set('reportportal.token', value)}
              onFocus={() => startTokenEdit('reportportal.token')}
            />
          </FlexItem>
          <FlexItem>
            <Button
              isDisabled={adminOnly}
              isLoading={isTestPending}
              size="sm"
              variant="secondary"
              onClick={onTestConnection}
            >
              Test Connection
            </Button>
          </FlexItem>
        </Flex>
        {rpTestMsg && (
          <Alert
            isInline
            isPlain
            className="app-mt-sm"
            title={rpTestMsg.text}
            variant={rpTestMsg.type}
          />
        )}
      </FormGroup>
    </Form>
  </>
);
