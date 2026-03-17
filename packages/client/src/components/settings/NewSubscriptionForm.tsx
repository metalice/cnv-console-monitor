import React from 'react';
import {
  Card, CardBody, CardTitle,
  TextInput, Button, Alert,
  Flex, FlexItem, Content,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
} from '@patternfly/react-core';
import { PlusCircleIcon, TimesIcon } from '@patternfly/react-icons';
import { ComponentMultiSelect } from '../common/ComponentMultiSelect';
import { ScheduleEditor } from './ScheduleEditor';
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

type NewSubscriptionFormProps = {
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

export const NewSubscriptionForm: React.FC<NewSubscriptionFormProps> = ({
  newRow, setNewRow, setNewRowTested, newRowTested, availableComponents,
  testingSubId, subTestMessages, userEmail, onTest, onSave, onCancel, isCreatePending,
}) => {
  const updateField = <K extends keyof NewRowState>(field: K, value: NewRowState[K]) => {
    setNewRow(prev => prev ? { ...prev, [field]: value } : prev);
    setNewRowTested(false);
  };

  const hasDestination = !!(newRow.slackWebhook || newRow.emailRecipients);

  return (
    <Card className="app-sub-card app-sub-card--new" isCompact>
      <CardTitle>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem><PlusCircleIcon className="app-sub-new-icon" /></FlexItem>
              <FlexItem>New Subscription</FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem>
            <Button variant="plain" size="sm" onClick={onCancel} aria-label="Cancel">
              <TimesIcon />
            </Button>
          </FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Content component="small" className="app-text-muted app-mb-md">
          Set up a new notification channel. You must test delivery before saving.
        </Content>

        <DescriptionList isCompact isHorizontal columnModifier={{ default: '1Col' }}>
          <DescriptionListGroup>
            <DescriptionListTerm>Name</DescriptionListTerm>
            <DescriptionListDescription>
              <TextInput value={newRow.name} onChange={(_e, v) => updateField('name', v)} placeholder="e.g. CNV 4.17 Daily Report" aria-label="Subscription name" />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Components</DescriptionListTerm>
            <DescriptionListDescription>
              <ComponentMultiSelect
                id="new-sub-comp"
                selected={new Set(newRow.components || [])}
                options={availableComponents}
                onChange={(selected) => updateField('components', [...selected])}
              />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Slack Webhook</DescriptionListTerm>
            <DescriptionListDescription>
              <TextInput value={newRow.slackWebhook} onChange={(_e, v) => updateField('slackWebhook', v)} placeholder="https://hooks.slack.com/services/..." aria-label="Slack Webhook" />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Jira Webhook</DescriptionListTerm>
            <DescriptionListDescription>
              <TextInput value={newRow.jiraWebhook} onChange={(_e, v) => updateField('jiraWebhook', v)} placeholder="Jira bug alert webhook URL" aria-label="Jira Webhook" />
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm>Email Recipients</DescriptionListTerm>
            <DescriptionListDescription>
              <TextInput value={newRow.emailRecipients} onChange={(_e, v) => updateField('emailRecipients', v)} placeholder="a@b.com, c@d.com" aria-label="Email Recipients" />
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        <ScheduleEditor
          subId={0}
          schedule={newRow.schedule}
          timezone="Asia/Jerusalem"
          onScheduleChange={(s) => updateField('schedule', s)}
          onTimezoneChange={() => {}}
        />

        {subTestMessages['new'] && (
          <Alert variant={subTestMessages['new'].type} isInline isPlain title={subTestMessages['new'].text} className="app-mt-sm" />
        )}

        <Flex className="app-mt-md" spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Button
              variant="secondary"
              size="sm"
              onClick={onTest}
              isLoading={testingSubId === 'new'}
              isDisabled={!newRow.name.trim() || !hasDestination}
            >
              Test Delivery
            </Button>
          </FlexItem>
          <FlexItem>
            <Button
              variant="primary"
              size="sm"
              isDisabled={!newRowTested}
              isLoading={isCreatePending}
              onClick={onSave}
            >
              Save
            </Button>
          </FlexItem>
          <FlexItem>
            <Button variant="link" size="sm" onClick={onCancel}>Cancel</Button>
          </FlexItem>
          {!newRowTested && newRow.name.trim() && hasDestination && (
            <FlexItem>
              <Content component="small" className="app-text-muted">Test delivery first to enable Save</Content>
            </FlexItem>
          )}
        </Flex>
      </CardBody>
    </Card>
  );
};
