import { Alert, Button, Content, Flex, FlexItem, Label } from '@patternfly/react-core';
import { type UseMutationResult } from '@tanstack/react-query';

import { type AIStatus } from '../../api/ai';

import { type AITestResult } from './useAiSettings';

type AIStatusFooterProps = {
  enabled: boolean;
  defaultModel: string;
  testResult: AITestResult | null;
  status: AIStatus | undefined;
  usage:
    | { total: number; last24h: number; totalTokens: number; byProvider: Record<string, number> }
    | undefined;
  saveMutation: UseMutationResult<{ success: boolean; providers: string[] }, Error, void>;
  testMutation: UseMutationResult<
    { success: boolean; model?: string; error?: string },
    Error,
    string
  >;
  cacheMutation: UseMutationResult<{ success: boolean }, Error, void>;
};

export const AIStatusFooter = ({
  cacheMutation,
  defaultModel,
  enabled,
  saveMutation,
  status,
  testMutation,
  testResult,
  usage,
}: AIStatusFooterProps) => (
  <>
    <Flex className="app-mb-md" spaceItems={{ default: 'spaceItemsSm' }}>
      <FlexItem>
        <Button
          isLoading={saveMutation.isPending}
          variant="primary"
          onClick={() => saveMutation.mutate()}
        >
          Save AI Configuration
        </Button>
      </FlexItem>
      <FlexItem>
        <Button
          isDisabled={!enabled}
          isLoading={testMutation.isPending}
          variant="secondary"
          onClick={() => testMutation.mutate(defaultModel)}
        >
          Test Connection
        </Button>
      </FlexItem>
      <FlexItem>
        <Button
          isLoading={cacheMutation.isPending}
          variant="link"
          onClick={() => cacheMutation.mutate()}
        >
          Clear AI Cache
        </Button>
      </FlexItem>
    </Flex>

    {testResult && (
      <Alert
        isInline
        className="app-mb-md"
        title={
          testResult.success
            ? `Connected to ${testResult.model}`
            : `Connection failed: ${testResult.error}`
        }
        variant={testResult.success ? 'success' : 'danger'}
      />
    )}

    {status && (
      <div className="app-mb-md">
        <Content className="app-text-muted" component="small">
          Status:{' '}
          {status.enabled ? (
            <Label isCompact color="green">
              Enabled
            </Label>
          ) : (
            <Label isCompact color="grey">
              Disabled
            </Label>
          )}
          {' \u00b7 '}Providers:{' '}
          {status.providers.length > 0 ? status.providers.join(', ') : 'None configured'}
          {' \u00b7 '}Prompts: {status.prompts.length}
        </Content>
      </div>
    )}

    {usage && usage.total > 0 && (
      <div>
        <Content className="app-text-muted" component="small">
          Usage: {usage.total} requests ({usage.last24h} today) \u00b7{' '}
          {usage.totalTokens.toLocaleString()} tokens
          {Object.entries(usage.byProvider)
            .map(([provider, count]) => ` \u00b7 ${provider}: ${count}`)
            .join('')}
        </Content>
      </div>
    )}
  </>
);
