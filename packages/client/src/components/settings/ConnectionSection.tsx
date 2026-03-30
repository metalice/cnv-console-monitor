import {
  Button,
  FormGroup,
  FormSection,
  FormSelect,
  FormSelectOption,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';

import type { RepositoryFormReturn } from './useRepositoryForm';

type ConnectionSectionProps = {
  form: RepositoryFormReturn;
};

export const ConnectionSection = ({ form }: ConnectionSectionProps) => (
  <FormSection title="Connection" titleElement="h3">
    <FormGroup isRequired fieldId="repo-provider" label="Provider">
      <FormSelect id="repo-provider" value={form.provider} onChange={form.handleProviderChange}>
        <FormSelectOption label="GitLab" value="gitlab" />
        <FormSelectOption label="GitHub" value="github" />
      </FormSelect>
    </FormGroup>

    <FormGroup isRequired fieldId="repo-url" label="Repository URL">
      <TextInput
        id="repo-url"
        placeholder={
          form.provider === 'gitlab'
            ? 'https://gitlab.cee.redhat.com/group/repo'
            : 'https://github.com/owner/repo'
        }
        value={form.url}
        onChange={form.handleUrlChange}
      />
      <HelperText>
        <HelperTextItem>
          {form.resolving
            ? 'Resolving project...'
            : form.projectId
              ? `Resolved: project ID ${form.projectId}`
              : 'Paste the repository URL. Everything else will be auto-detected.'}
        </HelperTextItem>
        {form.resolveError && (
          <HelperTextItem variant="error">
            {form.resolveError}. You can enter the project ID manually below.
          </HelperTextItem>
        )}
      </HelperText>
    </FormGroup>

    {form.needsToken && <TokenField form={form} />}

    {(form.resolveError || (!form.resolving && !form.projectId && form.url && !form.needsToken)) &&
      form.provider === 'gitlab' && (
        <FormGroup isRequired fieldId="repo-project" label="Project ID">
          <TextInput
            id="repo-project"
            placeholder="12345"
            value={form.projectId}
            onChange={(_e, val) => form.setProjectId(val)}
          />
          <HelperText>
            <HelperTextItem>
              The numeric project ID from GitLab (Settings &gt; General).
            </HelperTextItem>
          </HelperText>
        </FormGroup>
      )}
  </FormSection>
);

const TokenField = ({ form }: ConnectionSectionProps) => {
  const providerLabel = form.provider === 'gitlab' ? 'GitLab' : 'GitHub';

  return (
    <FormGroup isRequired fieldId="repo-inline-token" label={`${providerLabel} Access Token`}>
      <TextInput
        id="repo-inline-token"
        placeholder={`Paste your ${providerLabel} access token`}
        type="password"
        value={form.inlineToken}
        onChange={(_e, val) => form.setInlineToken(val)}
      />
      <HelperText>
        <HelperTextItem>
          A read-only access token is needed to fetch repository info.{' '}
          {form.provider === 'gitlab'
            ? 'Needs at least read_api scope.'
            : 'Needs repo read access.'}{' '}
          This token will be saved to settings for future use.
        </HelperTextItem>
      </HelperText>
      {form.inlineToken && (
        <Button
          className="app-mt-sm"
          isDisabled={form.resolving}
          isLoading={form.resolving}
          size="sm"
          variant="secondary"
          onClick={form.handleTokenConnect}
        >
          Connect
        </Button>
      )}
    </FormGroup>
  );
};
