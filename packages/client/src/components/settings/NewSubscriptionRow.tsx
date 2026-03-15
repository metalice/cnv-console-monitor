import React from 'react';
import {
  TextInput,
  Button,
  Alert,
  Flex,
  FlexItem,
  Label,
} from '@patternfly/react-core';
import { Tr, Td } from '@patternfly/react-table';
import { ComponentMultiSelect } from '../common/ComponentMultiSelect';
import { ScheduleInlineEditor } from './ScheduleInlineEditor';
import type { AlertMessage } from './types';

export type NewRowState = {
  name: string;
  components: string[];
  slackWebhook: string;
  jiraWebhook: string;
  emailRecipients: string;
  schedule: string;
  enabled: boolean;
};

type NewSubscriptionRowProps = {
  newRow: NewRowState;
  setNewRow: React.Dispatch<React.SetStateAction<NewRowState | null>>;
  setNewRowTested: (v: boolean) => void;
  newRowTested: boolean;
  availableComponents: string[];
  testingSubId: number | string | null;
  subTestMessages: Record<number | string, AlertMessage>;
  userEmail: string;
  onTest: () => void;
  onSave: () => void;
  onCancel: () => void;
  isCreatePending: boolean;
};

export const NewSubscriptionRow: React.FC<NewSubscriptionRowProps> = ({
  newRow, setNewRow, setNewRowTested, newRowTested, availableComponents,
  testingSubId, subTestMessages, userEmail, onTest, onSave, onCancel, isCreatePending,
}) => {
  const updateField = <K extends keyof NewRowState>(field: K, value: NewRowState[K]) => {
    setNewRow(prev => prev ? { ...prev, [field]: value } : prev);
    setNewRowTested(false);
  };

  return (
    <Tr>
      <Td><TextInput value={newRow.name} onChange={(_e, inputValue) => updateField('name', inputValue)} placeholder="Name" aria-label="Name" /></Td>
      <Td>
        <ComponentMultiSelect
          id="new-sub-comp"
          selected={new Set(newRow.components || [])}
          options={availableComponents}
          onChange={(selected) => updateField('components', [...selected])}
        />
      </Td>
      <Td><TextInput value={newRow.slackWebhook} onChange={(_e, inputValue) => updateField('slackWebhook', inputValue)} placeholder="https://hooks.slack.com/..." aria-label="Webhook" /></Td>
      <Td><TextInput value={newRow.jiraWebhook} onChange={(_e, inputValue) => updateField('jiraWebhook', inputValue)} placeholder="Jira bug webhook" aria-label="Jira Webhook" /></Td>
      <Td><TextInput value={newRow.emailRecipients} onChange={(_e, inputValue) => updateField('emailRecipients', inputValue)} placeholder="a@b.com, c@d.com" aria-label="Emails" /></Td>
      <Td><ScheduleInlineEditor schedule={newRow.schedule} onChange={(schedule) => updateField('schedule', schedule)} /></Td>
      <Td><Label color="green" isCompact>Yes</Label></Td>
      <Td><Label color="grey" isCompact>{userEmail.split('@')[0]}</Label></Td>
      <Td>
        <Flex spaceItems={{ default: 'spaceItemsXs' }} flexWrap={{ default: 'nowrap' }}>
          <FlexItem>
            <Button variant="secondary" size="sm" onClick={onTest} isLoading={testingSubId === 'new'} isDisabled={!newRow.name.trim() || (!newRow.slackWebhook && !newRow.emailRecipients)}>
              Test
            </Button>
          </FlexItem>
          <FlexItem>
            <Button variant="primary" size="sm" isDisabled={!newRowTested} isLoading={isCreatePending} onClick={onSave}>
              Save
            </Button>
          </FlexItem>
          <FlexItem><Button variant="link" size="sm" onClick={onCancel}>Cancel</Button></FlexItem>
        </Flex>
        {subTestMessages['new'] && <Alert variant={subTestMessages['new'].type} isInline isPlain title={subTestMessages['new'].text} className="app-mt-sm" />}
      </Td>
    </Tr>
  );
};
