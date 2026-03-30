import { Content, FormGroup, TextInput } from '@patternfly/react-core';

import { HelpLabel } from '../common/HelpLabel';

type AIApiKeyFieldsProps = {
  geminiKey: string;
  openaiKey: string;
  anthropicKey: string;
  ollamaUrl: string;
  onGeminiKeyChange: (value: string) => void;
  onOpenaiKeyChange: (value: string) => void;
  onAnthropicKeyChange: (value: string) => void;
  onOllamaUrlChange: (value: string) => void;
};

export const AIApiKeyFields = ({
  anthropicKey,
  geminiKey,
  ollamaUrl,
  onAnthropicKeyChange,
  onGeminiKeyChange,
  onOllamaUrlChange,
  onOpenaiKeyChange,
  openaiKey,
}: AIApiKeyFieldsProps) => (
  <>
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
        onChange={(_e, value) => onGeminiKeyChange(value)}
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
        onChange={(_e, value) => onOpenaiKeyChange(value)}
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
        onChange={(_e, value) => onAnthropicKeyChange(value)}
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
        onChange={(_e, value) => onOllamaUrlChange(value)}
      />
    </FormGroup>
  </>
);
