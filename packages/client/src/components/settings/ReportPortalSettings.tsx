import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Form,
  FormGroup,
  TextInput,
  Button,
  Alert,
  Flex,
  FlexItem,
  Label,
  Content,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
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
  sourceLabel,
  adminOnly,
  tokenEditing,
  startTokenEdit,
  endTokenEdit,
  rpProjectOptions,
  rpTestMsg,
  onTestConnection,
  isTestPending,
}) => {
  const rpEnabled = Boolean(val('reportportal.url') && val('reportportal.token'));

  return (
    <Card>
      <CardTitle>
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>ReportPortal</FlexItem>
          <FlexItem>
            <Label color={rpEnabled ? 'green' : 'grey'} isCompact icon={rpEnabled ? <CheckCircleIcon /> : <ExclamationCircleIcon />}>
              {rpEnabled ? 'Configured' : 'Missing'}
            </Label>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Content component="small" className="app-text-muted app-mb-md">
          Connection to your ReportPortal instance for fetching test launches and results. Get your API token from ReportPortal &gt; User Profile &gt; API Keys.
        </Content>
        <Form>
          <FormGroup label={<>URL {sourceLabel('reportportal.url')}</>} fieldId="rp-url">
            <TextInput id="rp-url" value={val('reportportal.url')} onChange={(_e, inputValue) => set('reportportal.url', inputValue)} placeholder="https://reportportal.example.com" isDisabled={adminOnly} />
          </FormGroup>
          <FormGroup label={<>Project {sourceLabel('reportportal.project')}</>} fieldId="rp-project">
            <SearchableSelect
              id="rp-project"
              value={val('reportportal.project')}
              options={toOptions(rpProjectOptions)}
              onChange={(selected) => set('reportportal.project', selected)}
              placeholder="Select project"
              isDisabled={adminOnly}
            />
          </FormGroup>
          <FormGroup label={<>Token {sourceLabel('reportportal.token')}</>} fieldId="rp-token">
            <Flex alignItems={{ default: 'alignItemsFlexEnd' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem className="app-flex-1">
                <TextInput
                  id="rp-token"
                  type={tokenEditing['reportportal.token'] ? 'text' : 'password'}
                  value={val('reportportal.token')}
                  onFocus={() => startTokenEdit('reportportal.token')}
                  onBlur={() => endTokenEdit('reportportal.token')}
                  onChange={(_e, inputValue) => set('reportportal.token', inputValue)}
                  placeholder="Bearer token"
                  isDisabled={adminOnly}
                />
              </FlexItem>
              <FlexItem>
                <Button variant="secondary" size="sm" onClick={onTestConnection} isLoading={isTestPending} isDisabled={adminOnly}>
                  Test Connection
                </Button>
              </FlexItem>
            </Flex>
            {rpTestMsg && <Alert variant={rpTestMsg.type} isInline isPlain title={rpTestMsg.text} className="app-mt-sm" />}
          </FormGroup>
        </Form>
      </CardBody>
    </Card>
  );
};
