import { Content, FormGroup, Spinner, Switch } from '@patternfly/react-core';

import { HelpLabel } from '../common/HelpLabel';

import { AIApiKeyFields } from './AIApiKeyFields';
import { AIModelSelectors } from './AIModelSelectors';
import { AIStatusFooter } from './AIStatusFooter';
import { AIVertexSection } from './AIVertexSection';
import { useAISettings } from './useAiSettings';

export const AISettings = () => {
  const ai = useAISettings();

  if (ai.isLoading) {
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
          isChecked={ai.enabled}
          label={ai.enabled ? 'AI features enabled' : 'AI features disabled'}
          onChange={(_e, value) => ai.setEnabled(value)}
        />
      </FormGroup>

      <AIModelSelectors
        defaultModel={ai.defaultModel}
        defaultModelId={ai.defaultModelId}
        status={ai.status}
        onModelChange={ai.setDefaultModel}
        onModelIdChange={ai.setDefaultModelId}
      />

      <AIApiKeyFields
        anthropicKey={ai.anthropicKey}
        geminiKey={ai.geminiKey}
        ollamaUrl={ai.ollamaUrl}
        openaiKey={ai.openaiKey}
        onAnthropicKeyChange={ai.setAnthropicKey}
        onGeminiKeyChange={ai.setGeminiKey}
        onOllamaUrlChange={ai.setOllamaUrl}
        onOpenaiKeyChange={ai.setOpenaiKey}
      />

      <AIVertexSection
        tokenInfo={ai.status?.vertexTokenInfo}
        vertexAccessToken={ai.vertexAccessToken}
        vertexProjectId={ai.vertexProjectId}
        vertexRegion={ai.vertexRegion}
        onAccessTokenChange={ai.setVertexAccessToken}
        onProjectIdChange={ai.setVertexProjectId}
        onRegionChange={ai.setVertexRegion}
      />

      <AIStatusFooter
        cacheMutation={ai.cacheMutation}
        defaultModel={ai.defaultModel}
        enabled={ai.enabled}
        saveMutation={ai.saveMutation}
        status={ai.status}
        testMutation={ai.testMutation}
        testResult={ai.testResult}
        usage={ai.usage}
      />
    </div>
  );
};
