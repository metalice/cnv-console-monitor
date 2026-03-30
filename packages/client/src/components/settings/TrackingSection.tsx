import {
  FormGroup,
  FormSection,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';

import { ComponentMultiSelect } from '../common/ComponentMultiSelect';
import { SearchableSelect } from '../common/SearchableSelect';

import type { RepositoryFormReturn } from './useRepositoryForm';

type TrackingSectionProps = {
  form: RepositoryFormReturn;
};

export const TrackingSection = ({ form }: TrackingSectionProps) => (
  <FormSection title="What to Track" titleElement="h3">
    <FormGroup isRequired fieldId="repo-branches" label="Branches">
      {form.availableBranches.length > 0 ? (
        <ComponentMultiSelect
          id="repo-branches"
          isDisabled={form.branchesLoading}
          itemLabel="branches"
          options={form.availableBranches}
          placeholder={form.branchesLoading ? 'Loading branches...' : 'Select branches...'}
          selected={form.selectedBranches}
          onChange={form.setSelectedBranches}
        />
      ) : (
        <TextInput
          id="repo-branches-text"
          isDisabled={form.branchesLoading}
          placeholder={form.branchesLoading ? 'Loading branches...' : 'main'}
          value={[...form.selectedBranches].join(', ')}
          onChange={(_e, val) =>
            form.setSelectedBranches(
              new Set<string>(
                val
                  .split(',')
                  .map(str => str.trim())
                  .filter(Boolean),
              ),
            )
          }
        />
      )}
      <HelperText>
        <HelperTextItem>
          {form.availableBranches.length > 0
            ? `${form.availableBranches.length} branches available. Select which ones to track.`
            : form.branchesLoading
              ? 'Fetching branches from the repository...'
              : 'Branches will be loaded once the repository URL is resolved.'}
        </HelperTextItem>
      </HelperText>
    </FormGroup>

    <FormGroup fieldId="repo-component" label="Component">
      <SearchableSelect
        id="repo-component"
        options={form.componentOptions.map(comp => ({ label: comp, value: comp }))}
        placeholder="Select a component..."
        value={form.selectedComponent}
        onChange={form.setSelectedComponent}
      />
      <HelperText>
        <HelperTextItem>The Jira component this repository belongs to.</HelperTextItem>
      </HelperText>
    </FormGroup>
  </FormSection>
);
