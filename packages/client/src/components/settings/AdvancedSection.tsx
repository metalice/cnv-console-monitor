import {
  ExpandableSection,
  FormGroup,
  FormSection,
  HelperText,
  HelperTextItem,
  NumberInput,
  Switch,
  TextInput,
} from '@patternfly/react-core';

import { deriveDisplayName } from './repositoryUrlUtils';
import type { RepositoryFormReturn } from './useRepositoryForm';

const MIN_CACHE_MINUTES = 1;
const MAX_CACHE_MINUTES = 1440;

type AdvancedSectionProps = {
  form: RepositoryFormReturn;
};

export const AdvancedSection = ({ form }: AdvancedSectionProps) => (
  <ExpandableSection
    isExpanded={form.showAdvanced}
    toggleText={form.showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
    onToggle={(_e, expanded) => form.setShowAdvanced(expanded)}
  >
    <FormSection titleElement="h3">
      <FormGroup fieldId="repo-name" label="Display Name">
        <TextInput
          id="repo-name"
          placeholder={deriveDisplayName(form.url) || 'Auto-detected from URL'}
          value={form.name}
          onChange={(_e, val) => form.setName(val)}
        />
        <HelperText>
          <HelperTextItem>
            Override the auto-detected name. Leave empty to use the repository path.
          </HelperTextItem>
        </HelperText>
      </FormGroup>

      <FormGroup fieldId="repo-api" label="API Base URL">
        <TextInput
          id="repo-api"
          placeholder={form.effectiveApiUrl || 'Auto-detected from repository URL'}
          value={form.apiBaseUrl}
          onChange={(_e, val) => form.setApiBaseUrl(val)}
        />
        <HelperText>
          <HelperTextItem>Override only if using a custom API gateway or proxy.</HelperTextItem>
        </HelperText>
      </FormGroup>

      <FormGroup fieldId="repo-token" label="Access Token Key">
        <TextInput
          id="repo-token"
          placeholder={form.effectiveTokenKey}
          value={form.globalTokenKey}
          onChange={(_e, val) => form.setGlobalTokenKey(val)}
        />
        <HelperText>
          <HelperTextItem>
            The settings key storing the read-only token. Default: {form.effectiveTokenKey}
          </HelperTextItem>
        </HelperText>
      </FormGroup>

      <FormGroup fieldId="repo-cache" label="Cache Duration">
        <NumberInput
          id="repo-cache"
          max={MAX_CACHE_MINUTES}
          min={MIN_CACHE_MINUTES}
          unit="minutes"
          value={form.cacheTtlMin}
          onChange={e => form.setCacheTtlMin(Number((e.target as HTMLInputElement).value))}
          onMinus={() => form.setCacheTtlMin(Math.max(MIN_CACHE_MINUTES, form.cacheTtlMin - 1))}
          onPlus={() => form.setCacheTtlMin(form.cacheTtlMin + 1)}
        />
        <HelperText>
          <HelperTextItem>How long to cache the file tree before re-fetching.</HelperTextItem>
        </HelperText>
      </FormGroup>

      <FormGroup fieldId="repo-enabled" label="Enabled">
        <Switch
          id="repo-enabled"
          isChecked={form.enabled}
          label="Sync and display this repository"
          onChange={(_e, checked) => form.setEnabled(checked)}
        />
      </FormGroup>
    </FormSection>
  </ExpandableSection>
);
