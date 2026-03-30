import {
  Badge,
  Button,
  Flex,
  FlexItem,
  Label,
  Switch,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';

import { SearchableSelect, type SearchableSelectOption } from '../common/SearchableSelect';

import { type MappingDraft } from './MappingsTable';

type NewMappingRowProps = {
  draft: MappingDraft;
  componentOptions: SearchableSelectOption[];
  previewCount: number | null;
  upsertPending: boolean;
  onDraftChange: (draft: MappingDraft | null) => void;
  onSave: () => void;
};

export const NewMappingRow = ({
  componentOptions,
  draft,
  onDraftChange,
  onSave,
  previewCount,
  upsertPending,
}: NewMappingRowProps) => (
  <Tr>
    <Td>
      <TextInput
        aria-label="New pattern"
        placeholder="Jenkins team or pattern"
        value={draft.pattern}
        onChange={(_ev, value) => onDraftChange({ ...draft, pattern: value })}
      />
    </Td>
    <Td>
      <SearchableSelect
        id="new-mapping-comp"
        options={componentOptions}
        placeholder="Select Jira component"
        value={draft.component}
        onChange={value => onDraftChange({ ...draft, component: value })}
      />
    </Td>
    <Td>
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        flexWrap={{ default: 'nowrap' }}
        spaceItems={{ default: 'spaceItemsXs' }}
      >
        <FlexItem>{previewCount !== null ? <Badge isRead>{previewCount}</Badge> : '—'}</FlexItem>
        <FlexItem>
          <Tooltip content="Include launches from deleted Jenkins jobs in the match">
            <Switch
              hasCheckIcon
              isReversed
              id="include-deleted"
              isChecked={draft.includeDeleted ?? false}
              label="+ deleted"
              onChange={(_ev, checked) => onDraftChange({ ...draft, includeDeleted: checked })}
            />
          </Tooltip>
        </FlexItem>
      </Flex>
    </Td>
    <Td>
      <Label isCompact color="green">
        manual
      </Label>
    </Td>
    <Td>
      <Flex flexWrap={{ default: 'nowrap' }} spaceItems={{ default: 'spaceItemsXs' }}>
        <FlexItem>
          <Button
            aria-label="Save"
            icon={<CheckIcon />}
            isDisabled={!draft.pattern.trim() || !draft.component.trim()}
            isLoading={upsertPending}
            size="sm"
            variant="plain"
            onClick={onSave}
          />
        </FlexItem>
        <FlexItem>
          <Button
            aria-label="Cancel"
            icon={<TimesIcon />}
            size="sm"
            variant="plain"
            onClick={() => onDraftChange(null)}
          />
        </FlexItem>
      </Flex>
    </Td>
  </Tr>
);
