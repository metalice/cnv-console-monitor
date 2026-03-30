import { type Ref, useState } from 'react';

import {
  FormGroup,
  MenuToggle,
  type MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';

import { type AIStatus } from '../../api/ai';
import { HelpLabel } from '../common/HelpLabel';

const PROVIDERS = [
  { label: 'Google Gemini', value: 'gemini' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic Claude (Direct)', value: 'anthropic' },
  { label: 'Claude via Vertex AI', value: 'vertex-claude' },
  { label: 'Ollama (Local)', value: 'ollama' },
];

type AIModelSelectorsProps = {
  defaultModel: string;
  defaultModelId: string;
  status: AIStatus | undefined;
  onModelChange: (value: string) => void;
  onModelIdChange: (value: string) => void;
};

export const AIModelSelectors = ({
  defaultModel,
  defaultModelId,
  onModelChange,
  onModelIdChange,
  status,
}: AIModelSelectorsProps) => {
  const [providerOpen, setProviderOpen] = useState(false);
  const [modelIdOpen, setModelIdOpen] = useState(false);

  const filteredModels = (status?.models ?? []).filter(mod => mod.provider === defaultModel);
  const providerLabel = PROVIDERS.find(prov => prov.value === defaultModel)?.label ?? defaultModel;
  const modelIdLabel = defaultModelId
    ? (status?.models.find(mod => mod.id === defaultModelId)?.name ?? defaultModelId)
    : 'Provider default';

  return (
    <>
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
          isOpen={providerOpen}
          // eslint-disable-next-line react/no-unstable-nested-components
          toggle={(ref: Ref<MenuToggleElement>) => (
            <MenuToggle
              className="app-max-w-250"
              isExpanded={providerOpen}
              ref={ref}
              onClick={() => setProviderOpen(prev => !prev)}
            >
              {providerLabel}
            </MenuToggle>
          )}
          onOpenChange={setProviderOpen}
          onSelect={(_e, val) => {
            onModelChange(val as string);
            setProviderOpen(false);
          }}
        >
          <SelectList>
            {PROVIDERS.map(prov => (
              <SelectOption
                isSelected={defaultModel === prov.value}
                key={prov.value}
                value={prov.value}
              >
                {prov.label}
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
          isOpen={modelIdOpen}
          // eslint-disable-next-line react/no-unstable-nested-components
          toggle={(ref: Ref<MenuToggleElement>) => (
            <MenuToggle
              className="app-max-w-350"
              isExpanded={modelIdOpen}
              ref={ref}
              onClick={() => setModelIdOpen(prev => !prev)}
            >
              {modelIdLabel}
            </MenuToggle>
          )}
          onOpenChange={setModelIdOpen}
          onSelect={(_e, val) => {
            onModelIdChange(val as string);
            setModelIdOpen(false);
          }}
        >
          <SelectList>
            <SelectOption isSelected={!defaultModelId} value="">
              Provider default
            </SelectOption>
            {filteredModels.map(mod => (
              <SelectOption isSelected={defaultModelId === mod.id} key={mod.id} value={mod.id}>
                {mod.name}
              </SelectOption>
            ))}
          </SelectList>
        </Select>
      </FormGroup>
    </>
  );
};
