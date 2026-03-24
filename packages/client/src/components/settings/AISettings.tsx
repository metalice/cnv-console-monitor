import React, { useState } from 'react';

import {
  Alert,
  Button,
  Content,
  Flex,
  FlexItem,
  FormGroup,
  Label,
  MenuToggle,
  type MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Switch,
  TextInput,
} from '@patternfly/react-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  clearAICache,
  configureAI,
  fetchAIStatus,
  fetchAIUsage,
  testAIConnection,
} from '../../api/ai';
import { HelpLabel } from '../common/HelpLabel';

const PROVIDERS = [
  { label: 'Google Gemini', value: 'gemini' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic Claude (Direct)', value: 'anthropic' },
  { label: 'Claude via Vertex AI', value: 'vertex-claude' },
  { label: 'Ollama (Local)', value: 'ollama' },
];

export const AISettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [modelSelectOpen, setModelSelectOpen] = useState(false);
  const [modelIdSelectOpen, setModelIdSelectOpen] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
    model?: string;
  } | null>(null);

  const [enabled, setEnabled] = useState(false);
  const [defaultModel, setDefaultModel] = useState('gemini');
  const [defaultModelId, setDefaultModelId] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('');
  const [vertexProjectId, setVertexProjectId] = useState('');
  const [vertexRegion, setVertexRegion] = useState('us-east5');
  const [vertexAccessToken, setVertexAccessToken] = useState('');
  const [initialized, setInitialized] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryFn: fetchAIStatus,
    queryKey: ['aiStatus'],
    staleTime: 2 * 60 * 1000,
  });

  const { data: usage } = useQuery({
    queryFn: fetchAIUsage,
    queryKey: ['aiUsage'],
    staleTime: 2 * 60 * 1000,
  });

  React.useEffect(() => {
    if (status && !initialized) {
      setEnabled(status.enabled);
      if (status.defaultModel) {
        setDefaultModel(status.defaultModel);
      }
      if (status.defaultModelId) {
        setDefaultModelId(status.defaultModelId);
      }
      setInitialized(true);
    }
  }, [status, initialized]);

  const saveMutation = useMutation({
    mutationFn: () =>
      configureAI({
        anthropicKey: anthropicKey || undefined,
        defaultModel,
        defaultModelId: defaultModelId || undefined,
        enabled,
        geminiKey: geminiKey || undefined,
        ollamaUrl: ollamaUrl || undefined,
        openaiKey: openaiKey || undefined,
        vertexAccessToken: vertexAccessToken || undefined,
        vertexProjectId: vertexProjectId || undefined,
        vertexRegion: vertexRegion || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['aiStatus'] });
      setTestResult(null);
    },
  });

  const testMutation = useMutation({
    mutationFn: (provider: string) => testAIConnection(provider),
    onSuccess: data => setTestResult(data),
  });

  const cacheMutation = useMutation({
    mutationFn: clearAICache,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aiUsage'] }),
  });

  if (isLoading) {
    return <Spinner size="lg" />;
  }

  return (
    <div>
      <Content className="app-mb-md" component="h4">
        <HelpLabel
          help="Configure AI model providers for intelligent features like changelog generation, failure analysis, smart triage, and natural language search."
          label="AI Configuration"
        />
      </Content>

      <FormGroup className="app-mb-md" label="Enable AI">
        <Switch
          id="ai-enabled"
          isChecked={enabled}
          label={enabled ? 'AI features enabled' : 'AI features disabled'}
          onChange={(_e, v) => setEnabled(v)}
        />
      </FormGroup>

      <FormGroup
        className="app-mb-md"
        label={
          <HelpLabel
            help="Which AI provider to use by default for all AI features."
            label="Default Model"
          />
        }
      >
        <Select
          isOpen={modelSelectOpen}
          // eslint-disable-next-line react/no-unstable-nested-components
          toggle={(ref: React.Ref<MenuToggleElement>) => (
            <MenuToggle
              className="app-max-w-250"
              isExpanded={modelSelectOpen}
              ref={ref}
              onClick={() => setModelSelectOpen(o => !o)}
            >
              {PROVIDERS.find(p => p.value === defaultModel)?.label || defaultModel}
            </MenuToggle>
          )}
          onOpenChange={setModelSelectOpen}
          onSelect={(_e, val) => {
            setDefaultModel(val as string);
            setModelSelectOpen(false);
          }}
        >
          <SelectList>
            {PROVIDERS.map(p => (
              <SelectOption isSelected={defaultModel === p.value} key={p.value} value={p.value}>
                {p.label}
              </SelectOption>
            ))}
          </SelectList>
        </Select>
      </FormGroup>

      <FormGroup
        className="app-mb-md"
        label={
          <HelpLabel
            help="Specific model to use within the selected provider. Each provider offers models with different speed/quality tradeoffs."
            label="Model"
          />
        }
      >
        <Select
          isOpen={modelIdSelectOpen}
          // eslint-disable-next-line react/no-unstable-nested-components
          toggle={(ref: React.Ref<MenuToggleElement>) => (
            <MenuToggle
              className="app-max-w-350"
              isExpanded={modelIdSelectOpen}
              ref={ref}
              onClick={() => setModelIdSelectOpen(o => !o)}
            >
              {defaultModelId
                ? status?.models.find(m => m.id === defaultModelId)?.name || defaultModelId
                : 'Provider default'}
            </MenuToggle>
          )}
          onOpenChange={setModelIdSelectOpen}
          onSelect={(_e, val) => {
            setDefaultModelId(val as string);
            setModelIdSelectOpen(false);
          }}
        >
          <SelectList>
            <SelectOption isSelected={!defaultModelId} value="">
              Provider default
            </SelectOption>
            {(status?.models ?? [])
              .filter(m => m.provider === defaultModel)
              .map(m => (
                <SelectOption isSelected={defaultModelId === m.id} key={m.id} value={m.id}>
                  {m.name}
                </SelectOption>
              ))}
          </SelectList>
        </Select>
      </FormGroup>

      <Content className="app-mb-sm app-mt-md" component="h5">
        API Keys
      </Content>

      <FormGroup
        className="app-mb-sm"
        label={
          <HelpLabel
            help="Get from aistudio.google.com. Free tier: 60 requests/min."
            label="Gemini API Key"
          />
        }
      >
        <TextInput
          className="app-max-w-350"
          placeholder="AIza..."
          type="password"
          value={geminiKey}
          onChange={(_e, v) => setGeminiKey(v)}
        />
      </FormGroup>

      <FormGroup
        className="app-mb-sm"
        label={
          <HelpLabel help="Get from platform.openai.com. Pay-per-token." label="OpenAI API Key" />
        }
      >
        <TextInput
          className="app-max-w-350"
          placeholder="sk-..."
          type="password"
          value={openaiKey}
          onChange={(_e, v) => setOpenaiKey(v)}
        />
      </FormGroup>

      <FormGroup
        className="app-mb-sm"
        label={
          <HelpLabel
            help="Get from console.anthropic.com. Pay-per-token."
            label="Anthropic API Key"
          />
        }
      >
        <TextInput
          className="app-max-w-350"
          placeholder="sk-ant-..."
          type="password"
          value={anthropicKey}
          onChange={(_e, v) => setAnthropicKey(v)}
        />
      </FormGroup>

      <FormGroup
        className="app-mb-md"
        label={
          <HelpLabel
            help="URL of your local Ollama server. Default: http://localhost:11434"
            label="Ollama URL"
          />
        }
      >
        <TextInput
          className="app-max-w-350"
          placeholder="http://localhost:11434"
          value={ollamaUrl}
          onChange={(_e, v) => setOllamaUrl(v)}
        />
      </FormGroup>

      <Content className="app-mb-sm app-mt-md" component="h5">
        Vertex AI (Claude)
      </Content>

      <FormGroup
        className="app-mb-sm"
        label={
          <HelpLabel
            help="Your Google Cloud project ID that has Vertex AI and Claude models enabled."
            label="GCP Project ID"
          />
        }
      >
        <TextInput
          className="app-max-w-350"
          placeholder="my-gcp-project"
          value={vertexProjectId}
          onChange={(_e, v) => setVertexProjectId(v)}
        />
      </FormGroup>

      <FormGroup
        className="app-mb-sm"
        label={
          <HelpLabel
            help="Vertex AI region. Claude is available in us-east5, europe-west1, etc."
            label="Region"
          />
        }
      >
        <TextInput
          className="app-max-w-350"
          placeholder="us-east5"
          value={vertexRegion}
          onChange={(_e, v) => setVertexRegion(v)}
        />
      </FormGroup>

      <FormGroup
        className="app-mb-sm"
        label={
          <HelpLabel
            help="GCP access token. Get via: gcloud auth print-access-token. Tokens expire after 1 hour."
            label="Access Token"
          />
        }
      >
        <TextInput
          className="app-max-w-350"
          placeholder="ya29...."
          type="password"
          value={vertexAccessToken}
          onChange={(_e, v) => setVertexAccessToken(v)}
        />
      </FormGroup>
      {status?.vertexTokenInfo && (
        <div className="app-mb-md">
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            flexWrap={{ default: 'wrap' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <Content className="app-text-muted" component="small">
                ADC:{' '}
                {status.vertexTokenInfo.adcAvailable ? (
                  <Label isCompact color="green">
                    Available (auto-refresh)
                  </Label>
                ) : (
                  <Label isCompact color="grey">
                    Not found
                  </Label>
                )}
              </Content>
            </FlexItem>
            <FlexItem>
              <Content className="app-text-muted" component="small">
                Token:{' '}
                {!status.vertexTokenInfo.hasManualToken ? (
                  <Label isCompact color="grey">
                    Not set
                  </Label>
                ) : status.vertexTokenInfo.expiresIn !== null &&
                  status.vertexTokenInfo.expiresIn <= 0 ? (
                  <Label isCompact color="red">
                    Expired
                  </Label>
                ) : status.vertexTokenInfo.expiresIn !== null &&
                  status.vertexTokenInfo.expiresIn > 0 ? (
                  <Label
                    isCompact
                    color={status.vertexTokenInfo.expiresIn < 300 ? 'orange' : 'green'}
                  >
                    {Math.floor(status.vertexTokenInfo.expiresIn / 60)}m{' '}
                    {status.vertexTokenInfo.expiresIn % 60}s
                  </Label>
                ) : (
                  <Label isCompact color="grey">
                    Unknown
                  </Label>
                )}
              </Content>
            </FlexItem>
            <FlexItem>
              <Content className="app-text-muted" component="small">
                Active:{' '}
                <Label
                  isCompact
                  color={status.vertexTokenInfo.authMode === 'none' ? 'red' : 'blue'}
                >
                  {status.vertexTokenInfo.authMode === 'adc'
                    ? 'ADC'
                    : status.vertexTokenInfo.authMode === 'manual'
                      ? 'Manual token'
                      : 'None'}
                </Label>
              </Content>
            </FlexItem>
            {status.vertexTokenInfo.email && (
              <FlexItem>
                <Content className="app-text-muted" component="small">
                  {status.vertexTokenInfo.email}
                </Content>
              </FlexItem>
            )}
          </Flex>
        </div>
      )}

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
              .map(([p, c]) => ` \u00b7 ${p}: ${c}`)
              .join('')}
          </Content>
        </div>
      )}
    </div>
  );
};
