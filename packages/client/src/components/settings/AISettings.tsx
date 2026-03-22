import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button, Flex, FlexItem, FormGroup, TextInput,
  Select, SelectOption, SelectList, MenuToggle, type MenuToggleElement,
  Switch, Label, Alert, Content, Spinner,
} from '@patternfly/react-core';
import { fetchAIStatus, configureAI, testAIConnection, clearAICache, fetchAIUsage } from '../../api/ai';
import { HelpLabel } from '../common/HelpLabel';

const PROVIDERS = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude (Direct)' },
  { value: 'vertex-claude', label: 'Claude via Vertex AI' },
  { value: 'ollama', label: 'Ollama (Local)' },
];

export const AISettings: React.FC = () => {
  const queryClient = useQueryClient();
  const [modelSelectOpen, setModelSelectOpen] = useState(false);
  const [modelIdSelectOpen, setModelIdSelectOpen] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; model?: string } | null>(null);

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
    queryKey: ['aiStatus'],
    queryFn: fetchAIStatus,
    staleTime: 30 * 1000,
  });

  const { data: usage } = useQuery({
    queryKey: ['aiUsage'],
    queryFn: fetchAIUsage,
    staleTime: 30 * 1000,
  });

  React.useEffect(() => {
    if (status && !initialized) {
      setEnabled(status.enabled);
      if (status.defaultModel) setDefaultModel(status.defaultModel);
      if (status.defaultModelId) setDefaultModelId(status.defaultModelId);
      setInitialized(true);
    }
  }, [status, initialized]);

  const saveMutation = useMutation({
    mutationFn: () => configureAI({
      enabled, defaultModel, defaultModelId: defaultModelId || undefined,
      geminiKey: geminiKey || undefined, openaiKey: openaiKey || undefined,
      anthropicKey: anthropicKey || undefined, ollamaUrl: ollamaUrl || undefined,
      vertexProjectId: vertexProjectId || undefined, vertexRegion: vertexRegion || undefined,
      vertexAccessToken: vertexAccessToken || undefined,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['aiStatus'] }); setTestResult(null); },
  });

  const testMutation = useMutation({
    mutationFn: (provider: string) => testAIConnection(provider),
    onSuccess: (data) => setTestResult(data),
  });

  const cacheMutation = useMutation({
    mutationFn: clearAICache,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['aiUsage'] }),
  });

  if (isLoading) return <Spinner size="lg" />;

  return (
    <div>
      <Content component="h4" className="app-mb-md">
        <HelpLabel label="AI Configuration" help="Configure AI model providers for intelligent features like changelog generation, failure analysis, smart triage, and natural language search." />
      </Content>

      <FormGroup label="Enable AI" className="app-mb-md">
        <Switch id="ai-enabled" isChecked={enabled} onChange={(_e, v) => setEnabled(v)} label={enabled ? 'AI features enabled' : 'AI features disabled'} />
      </FormGroup>

      <FormGroup label={<HelpLabel label="Default Model" help="Which AI provider to use by default for all AI features." />} className="app-mb-md">
        <Select
          isOpen={modelSelectOpen}
          onOpenChange={setModelSelectOpen}
          toggle={(ref: React.Ref<MenuToggleElement>) => (
            <MenuToggle ref={ref} onClick={() => setModelSelectOpen(o => !o)} isExpanded={modelSelectOpen} className="app-max-w-250">
              {PROVIDERS.find(p => p.value === defaultModel)?.label || defaultModel}
            </MenuToggle>
          )}
          onSelect={(_e, val) => { setDefaultModel(val as string); setModelSelectOpen(false); }}
        >
          <SelectList>
            {PROVIDERS.map(p => (
              <SelectOption key={p.value} value={p.value} isSelected={defaultModel === p.value}>{p.label}</SelectOption>
            ))}
          </SelectList>
        </Select>
      </FormGroup>

      <FormGroup label={<HelpLabel label="Model" help="Specific model to use within the selected provider. Each provider offers models with different speed/quality tradeoffs." />} className="app-mb-md">
        <Select
          isOpen={modelIdSelectOpen}
          onOpenChange={setModelIdSelectOpen}
          toggle={(ref: React.Ref<MenuToggleElement>) => (
            <MenuToggle ref={ref} onClick={() => setModelIdSelectOpen(o => !o)} isExpanded={modelIdSelectOpen} className="app-max-w-350">
              {defaultModelId ? (status?.models.find(m => m.id === defaultModelId)?.name || defaultModelId) : 'Provider default'}
            </MenuToggle>
          )}
          onSelect={(_e, val) => { setDefaultModelId(val as string); setModelIdSelectOpen(false); }}
        >
          <SelectList>
            <SelectOption value="" isSelected={!defaultModelId}>Provider default</SelectOption>
            {(status?.models ?? [])
              .filter(m => m.provider === defaultModel)
              .map(m => (
                <SelectOption key={m.id} value={m.id} isSelected={defaultModelId === m.id}>
                  {m.name}
                </SelectOption>
              ))}
          </SelectList>
        </Select>
      </FormGroup>

      <Content component="h5" className="app-mb-sm app-mt-md">API Keys</Content>

      <FormGroup label={<HelpLabel label="Gemini API Key" help="Get from aistudio.google.com. Free tier: 60 requests/min." />} className="app-mb-sm">
        <TextInput type="password" value={geminiKey} onChange={(_e, v) => setGeminiKey(v)} placeholder="AIza..." className="app-max-w-350" />
      </FormGroup>

      <FormGroup label={<HelpLabel label="OpenAI API Key" help="Get from platform.openai.com. Pay-per-token." />} className="app-mb-sm">
        <TextInput type="password" value={openaiKey} onChange={(_e, v) => setOpenaiKey(v)} placeholder="sk-..." className="app-max-w-350" />
      </FormGroup>

      <FormGroup label={<HelpLabel label="Anthropic API Key" help="Get from console.anthropic.com. Pay-per-token." />} className="app-mb-sm">
        <TextInput type="password" value={anthropicKey} onChange={(_e, v) => setAnthropicKey(v)} placeholder="sk-ant-..." className="app-max-w-350" />
      </FormGroup>

      <FormGroup label={<HelpLabel label="Ollama URL" help="URL of your local Ollama server. Default: http://localhost:11434" />} className="app-mb-md">
        <TextInput value={ollamaUrl} onChange={(_e, v) => setOllamaUrl(v)} placeholder="http://localhost:11434" className="app-max-w-350" />
      </FormGroup>

      <Content component="h5" className="app-mb-sm app-mt-md">Vertex AI (Claude)</Content>

      <FormGroup label={<HelpLabel label="GCP Project ID" help="Your Google Cloud project ID that has Vertex AI and Claude models enabled." />} className="app-mb-sm">
        <TextInput value={vertexProjectId} onChange={(_e, v) => setVertexProjectId(v)} placeholder="my-gcp-project" className="app-max-w-350" />
      </FormGroup>

      <FormGroup label={<HelpLabel label="Region" help="Vertex AI region. Claude is available in us-east5, europe-west1, etc." />} className="app-mb-sm">
        <TextInput value={vertexRegion} onChange={(_e, v) => setVertexRegion(v)} placeholder="us-east5" className="app-max-w-350" />
      </FormGroup>

      <FormGroup label={<HelpLabel label="Access Token" help="GCP access token. Get via: gcloud auth print-access-token. Tokens expire after 1 hour." />} className="app-mb-sm">
        <TextInput type="password" value={vertexAccessToken} onChange={(_e, v) => setVertexAccessToken(v)} placeholder="ya29...." className="app-max-w-350" />
      </FormGroup>
      {status?.vertexTokenInfo && (
        <div className="app-mb-md">
          <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }} flexWrap={{ default: 'wrap' }}>
            <FlexItem>
              <Content component="small" className="app-text-muted">
                ADC:{' '}
                {status.vertexTokenInfo.adcAvailable
                  ? <Label color="green" isCompact>Available (auto-refresh)</Label>
                  : <Label color="grey" isCompact>Not found</Label>}
              </Content>
            </FlexItem>
            <FlexItem>
              <Content component="small" className="app-text-muted">
                Token:{' '}
                {!status.vertexTokenInfo.hasManualToken ? (
                  <Label color="grey" isCompact>Not set</Label>
                ) : status.vertexTokenInfo.expiresIn !== null && status.vertexTokenInfo.expiresIn <= 0 ? (
                  <Label color="red" isCompact>Expired</Label>
                ) : status.vertexTokenInfo.expiresIn !== null && status.vertexTokenInfo.expiresIn > 0 ? (
                  <Label color={status.vertexTokenInfo.expiresIn < 300 ? 'orange' : 'green'} isCompact>
                    {Math.floor(status.vertexTokenInfo.expiresIn / 60)}m {status.vertexTokenInfo.expiresIn % 60}s
                  </Label>
                ) : <Label color="grey" isCompact>Unknown</Label>}
              </Content>
            </FlexItem>
            <FlexItem>
              <Content component="small" className="app-text-muted">
                Active:{' '}
                <Label color={status.vertexTokenInfo.authMode === 'none' ? 'red' : 'blue'} isCompact>
                  {status.vertexTokenInfo.authMode === 'adc' ? 'ADC' : status.vertexTokenInfo.authMode === 'manual' ? 'Manual token' : 'None'}
                </Label>
              </Content>
            </FlexItem>
            {status.vertexTokenInfo.email && (
              <FlexItem><Content component="small" className="app-text-muted">{status.vertexTokenInfo.email}</Content></FlexItem>
            )}
          </Flex>
        </div>
      )}

      <Flex spaceItems={{ default: 'spaceItemsSm' }} className="app-mb-md">
        <FlexItem>
          <Button variant="primary" onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>
            Save AI Configuration
          </Button>
        </FlexItem>
        <FlexItem>
          <Button variant="secondary" onClick={() => testMutation.mutate(defaultModel)} isLoading={testMutation.isPending} isDisabled={!enabled}>
            Test Connection
          </Button>
        </FlexItem>
        <FlexItem>
          <Button variant="link" onClick={() => cacheMutation.mutate()} isLoading={cacheMutation.isPending}>
            Clear AI Cache
          </Button>
        </FlexItem>
      </Flex>

      {testResult && (
        <Alert variant={testResult.success ? 'success' : 'danger'} isInline title={testResult.success ? `Connected to ${testResult.model}` : `Connection failed: ${testResult.error}`} className="app-mb-md" />
      )}

      {status && (
        <div className="app-mb-md">
          <Content component="small" className="app-text-muted">
            Status: {status.enabled ? <Label color="green" isCompact>Enabled</Label> : <Label color="grey" isCompact>Disabled</Label>}
            {' \u00b7 '}Providers: {status.providers.length > 0 ? status.providers.join(', ') : 'None configured'}
            {' \u00b7 '}Prompts: {status.prompts.length}
          </Content>
        </div>
      )}

      {usage && usage.total > 0 && (
        <div>
          <Content component="small" className="app-text-muted">
            Usage: {usage.total} requests ({usage.last24h} today) \u00b7 {usage.totalTokens.toLocaleString()} tokens
            {Object.entries(usage.byProvider).map(([p, c]) => ` \u00b7 ${p}: ${c}`).join('')}
          </Content>
        </div>
      )}
    </div>
  );
};
