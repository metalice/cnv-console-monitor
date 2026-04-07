import { useState } from 'react';

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

import { apiFetch } from '../../api/client';

import type { SettingsSectionProps, TokenEditHandlers } from './types';

type SmartsheetSettingsProps = SettingsSectionProps & TokenEditHandlers;

export const SmartsheetSettings = ({
  adminOnly,
  endTokenEdit,
  set,
  startTokenEdit,
  tokenEditing,
  val,
}: SmartsheetSettingsProps) => {
  const [testMsg, setTestMsg] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  const testMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ connected: boolean; sheetCount: number; error?: string }>(
        '/releases/smartsheet/test',
      ),
    onError: (err: Error) => {
      setTestMsg({ text: err.message, type: 'danger' });
    },
    onSuccess: data => {
      setTestMsg(
        data.connected
          ? { text: `Connected — ${data.sheetCount} CNV sheets found`, type: 'success' }
          : { text: data.error ?? 'Connection failed', type: 'danger' },
      );
    },
  });

  return (
    <>
      <Content className="app-text-muted app-mb-md" component="small">
        Smartsheet integration for release milestones (FF, CF, BO, GA, z-stream batches). Get an API
        token from Smartsheet &gt; Account &gt; Personal Settings &gt; API Access.
      </Content>
      <Form>
        <FormGroup fieldId="smartsheet-token" label="API Token">
          <Flex
            alignItems={{ default: 'alignItemsFlexEnd' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem className="app-flex-1">
              <TextInput
                id="smartsheet-token"
                isDisabled={adminOnly}
                placeholder="Smartsheet API token"
                type={tokenEditing['smartsheet.token'] ? 'text' : 'password'}
                value={val('smartsheet.token')}
                onBlur={() => endTokenEdit('smartsheet.token')}
                onChange={(_e, value) => {
                  set('smartsheet.token', value);
                  setTestMsg(null);
                }}
                onFocus={() => startTokenEdit('smartsheet.token')}
              />
            </FlexItem>
            <FlexItem>
              <Button
                isDisabled={adminOnly || !val('smartsheet.token')}
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
