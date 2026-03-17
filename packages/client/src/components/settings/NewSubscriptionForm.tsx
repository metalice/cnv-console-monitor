import React from 'react';
import {
  Card, CardBody, CardTitle,
  TextInput, Button, Alert, Switch,
  Flex, FlexItem, Content,
  DescriptionList, DescriptionListGroup, DescriptionListTerm, DescriptionListDescription,
} from '@patternfly/react-core';
import { PlusCircleIcon, TimesIcon } from '@patternfly/react-icons';
import { HelpLabel } from '../common/HelpLabel';
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
  reminderEnabled: boolean;
  reminderTime: string;
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
            <DescriptionListTerm><HelpLabel label="Name" help='A friendly name to identify this subscription, e.g. "CNV 4.17 Daily" or "Networking Team".' /></DescriptionListTerm>
            <DescriptionListDescription>
              <div className="app-max-w-350">
                <TextInput value={newRow.name} onChange={(_e, v) => updateField('name', v)} placeholder="e.g. CNV 4.17 Daily Report" aria-label="Subscription name" />
              </div>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm><HelpLabel label="Components" help="Filter the report to only include specific components. Leave empty to include all components." /></DescriptionListTerm>
            <DescriptionListDescription>
              <div className="app-max-w-350">
                <ComponentMultiSelect
                  id="new-sub-comp"
                  selected={new Set(newRow.components || [])}
                  options={availableComponents}
                  onChange={(selected) => updateField('components', [...selected])}
                />
              </div>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm><HelpLabel label="Slack Webhook" help="Incoming Webhook URL for a Slack channel. The daily test report will be posted here. Create one at: Slack > Apps > Incoming Webhooks." /></DescriptionListTerm>
            <DescriptionListDescription>
              <div className="app-max-w-350">
                <TextInput value={newRow.slackWebhook} onChange={(_e, v) => updateField('slackWebhook', v)} placeholder="https://hooks.slack.com/services/..." aria-label="Slack Webhook" />
              </div>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm><HelpLabel label="Jira Webhook" help="Slack Incoming Webhook URL for Jira bug alerts. New bugs created from this dashboard will be posted here." /></DescriptionListTerm>
            <DescriptionListDescription>
              <div className="app-max-w-350">
                <TextInput value={newRow.jiraWebhook} onChange={(_e, v) => updateField('jiraWebhook', v)} placeholder="Jira bug alert webhook URL" aria-label="Jira Webhook" />
              </div>
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm><HelpLabel label="Email Recipients" help="Comma-separated list of email addresses to receive the daily report via email." /></DescriptionListTerm>
            <DescriptionListDescription>
              <div className="app-max-w-350">
                <TextInput value={newRow.emailRecipients} onChange={(_e, v) => updateField('emailRecipients', v)} placeholder="a@b.com, c@d.com" aria-label="Email Recipients" />
              </div>
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

        <DescriptionList isCompact isHorizontal columnModifier={{ default: '1Col' }} className="app-mt-sm">
          <DescriptionListGroup>
            <DescriptionListTerm><HelpLabel label="Ack Reminder" help="Send a Slack reminder if the daily report has not been acknowledged by the configured time. Only triggers on selected days." /></DescriptionListTerm>
            <DescriptionListDescription>
              <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Switch id="new-sub-reminder" isChecked={newRow.reminderEnabled} onChange={(_e, checked) => updateField('reminderEnabled', checked)} label="Enabled" hasCheckIcon isReversed />
                </FlexItem>
                {newRow.reminderEnabled && (
                  <FlexItem>
                    <input type="time" className="app-time-input-sm" value={newRow.reminderTime} onChange={(e) => updateField('reminderTime', e.target.value)} />
                  </FlexItem>
                )}
              </Flex>
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>

        {subTestMessages['new'] && (
          <Alert variant={subTestMessages['new'].type} isInline isPlain title={subTestMessages['new'].text} className="app-mt-sm" />
        )}

        <Flex className="app-mt-md" spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Button variant="secondary" size="sm" onClick={onTest} isLoading={testingSubId === 'new'} isDisabled={!newRow.name.trim() || !hasDestination}>
              Test Delivery
            </Button>
          </FlexItem>
          <FlexItem>
            <Button variant="primary" size="sm" isDisabled={!newRowTested} isLoading={isCreatePending} onClick={onSave}>
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
